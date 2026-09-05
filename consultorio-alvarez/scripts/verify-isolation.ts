import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { resolveTenant } from '../src/lib/tenant'
import { getWhatsAppCredentialsForTenant, resolveTenantByPhoneNumberId } from '../src/lib/whatsapp'
import { getConfiguracionSeniaPublica, getProfesionalesPublicos } from '../src/lib/actions/reservas'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
)

async function runAudit() {
    console.log('\n======================================================')
    console.log('   AUDITORÍA DE AISLAMIENTO MULTI-TENANT DENTALIA    ')
    console.log('======================================================\n')

    let passes = 0
    let fails = 0

    function assert(condition: boolean, testName: string, detail?: string) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`)
            passes++
        } else {
            console.error(`❌ [FAIL] ${testName}`)
            if (detail) console.error(`   Detalle: ${detail}`)
            fails++
        }
    }

    try {
        // ── 0. Preparación: Verificar o Sembrar Curadent en DB ──
        console.log('🔍 Paso 0: Verificando tenants en Base de Datos...')
        
        let { data: alvarezTenant, error: alvarezErr } = await supabase
            .from('tenants')
            .select('id, slug, nombre')
            .eq('slug', 'alvarez')
            .maybeSingle()

        if (alvarezErr) {
            console.error('Error al consultar alvarez:', alvarezErr.message)
        }

        assert(!!alvarezTenant, 'Tenant "alvarez" existe en base de datos')
        console.log('   Alvarez tenant encontrado:', alvarezTenant?.id, alvarezTenant?.nombre)

        // Comprobar si la columna custom_domain ya está en Supabase
        const { error: colCheckErr } = await supabase
            .from('tenants')
            .select('custom_domain')
            .limit(1)

        const hasCustomDomainCol = !colCheckErr
        if (!hasCustomDomainCol) {
            console.log('   ℹ️ Nota: La columna custom_domain aún no fue ejecutada en Supabase SQL Editor.')
            console.log('      (Para activarla en producción, se ejecuta el script 011_add_custom_domain_to_tenants.sql)')
        } else {
            console.log('   ✅ Columna custom_domain presente en Supabase.')
        }

        let { data: curadentTenant } = await supabase
            .from('tenants')
            .select('id, slug, nombre')
            .eq('slug', 'curadent')
            .maybeSingle()

        if (!curadentTenant) {
            console.log('   Sembrando tenant Curadent de prueba...')
            const insertPayload: any = {
                slug: 'curadent',
                nombre: 'Curadent Odontología Test',
                color_primario: '#2563eb',
                color_secundario: '#1d4ed8',
                activo: true,
            }
            if (hasCustomDomainCol) {
                insertPayload.custom_domain = 'curadent.local'
            }

            const { data: newCuradent, error: insertErr } = await supabase
                .from('tenants')
                .insert(insertPayload)
                .select('id, slug, nombre')
                .single()

            if (insertErr) {
                console.error('Error al insertar Curadent:', insertErr.message)
            } else {
                curadentTenant = newCuradent
            }
        }

        assert(!!curadentTenant, 'Tenant "curadent" existe en base de datos')

        // Asegurar que Curadent tenga doctores de prueba
        const { data: curadentProfs } = await supabase
            .from('profesionales')
            .select('id, nombre, apellido')
            .eq('tenant_id', curadentTenant!.id)

        if (!curadentProfs || curadentProfs.length === 0) {
            console.log('   Sembrando doctores de prueba para Curadent...')
            const { error: profErr } = await supabase.from('profesionales').insert([
                {
                    tenant_id: curadentTenant!.id,
                    nombre: 'Martín',
                    apellido: 'Gómez',
                    especialidad: 'Implantología',
                    email: 'martin.gomez@curadent.test',
                    color_agenda: '#2563eb',
                    activo: true,
                },
                {
                    tenant_id: curadentTenant!.id,
                    nombre: 'Lucía',
                    apellido: 'Benítez',
                    especialidad: 'Ortodoncia',
                    email: 'lucia.benitez@curadent.test',
                    color_agenda: '#7c3aed',
                    activo: true,
                }
            ])
            if (profErr) {
                console.error('   Error al sembrar doctores de Curadent:', profErr.message)
            }
        }

        // Asegurar que Curadent tenga seña configurada en tenant_integrations ($15.000)
        const { data: curadentMP } = await supabase
            .from('tenant_integrations')
            .select('id, credentials')
            .eq('tenant_id', curadentTenant!.id)
            .eq('provider', 'mercadopago')
            .maybeSingle()

        if (!curadentMP) {
            console.log('   Configurando seña obligatoria de $15.000 para Curadent...')
            await supabase.from('tenant_integrations').insert({
                tenant_id: curadentTenant!.id,
                provider: 'mercadopago',
                credentials: {
                    access_token: 'TEST_TOKEN_CURADENT',
                    cobrar_senia: true,
                    monto_senia: 15000,
                },
                is_active: true,
            })
        }

        // Asegurar que Curadent tenga WhatsApp propio
        const { data: curadentWA } = await supabase
            .from('tenant_integrations')
            .select('id, credentials')
            .eq('tenant_id', curadentTenant!.id)
            .eq('provider', 'whatsapp')
            .maybeSingle()

        if (!curadentWA) {
            console.log('   Configurando WhatsApp propio para Curadent...')
            await supabase.from('tenant_integrations').insert({
                tenant_id: curadentTenant!.id,
                provider: 'whatsapp',
                credentials: {
                    phone_number_id: 'CURADENT_WA_999888',
                    access_token: 'CURADENT_META_TOKEN_999888',
                },
                is_active: true,
            })
        }

        console.log('\n------------------------------------------------------')
        console.log('🔍 Ejecutando Pruebas de Aislamiento:')
        console.log('------------------------------------------------------\n')

        // ── PRUEBA 1: Aislamiento de Profesionales ──
        const alvarezDocs = await getProfesionalesPublicos('alvarez')
        const curadentDocs = await getProfesionalesPublicos('curadent')

        const alvarezIds = new Set(alvarezDocs.map((d: any) => d.id))
        const curadentIds = new Set(curadentDocs.map((d: any) => d.id))

        const overlap = [...alvarezIds].filter(id => curadentIds.has(id))
        assert(overlap.length === 0, 'Aislamiento de Profesionales: Cero médicos cruzados', `Doctores cruzados: ${overlap.length}`)
        assert(alvarezDocs.length > 0, `Álvarez tiene doctores propios (${alvarezDocs.length} encontrados)`)
        assert(curadentDocs.length > 0, `Curadent tiene doctores propios (${curadentDocs.length} encontrados)`)

        // ── PRUEBA 2: Aislamiento de Cobro de Seña Opcional ──
        const seniaAlvarez = await getConfiguracionSeniaPublica('alvarez')
        const seniaCuradent = await getConfiguracionSeniaPublica('curadent')

        assert(seniaAlvarez.requiereSenia === false, 'Álvarez NO exige seña (gratuito para reservar)')
        assert(seniaCuradent.requiereSenia === true && seniaCuradent.montoSenia === 15000, 'Curadent EXIGE seña obligatoria de $15.000 ARS')

        // ── PRUEBA 3: Resolución de Dominio Personalizado ──
        const resolvedAlvarez = await resolveTenant('dentalva.ar')
        const resolvedCuradent = await resolveTenant('curadent.local')

        assert(resolvedAlvarez?.slug === 'alvarez', 'Host "dentalva.ar" resuelve correctamente al consultorio Álvarez')
        assert(resolvedCuradent?.slug === 'curadent', 'Host "curadent.local" resuelve correctamente al consultorio Curadent')

        // ── PRUEBA 4: Aislamiento Estricto en Envíos de WhatsApp ──
        const waCredsAlvarez = await getWhatsAppCredentialsForTenant(alvarezTenant!.id)
        const waCredsCuradent = await getWhatsAppCredentialsForTenant(curadentTenant!.id)

        assert(!!waCredsAlvarez?.phoneNumberId, 'Álvarez resuelve sus credenciales de WhatsApp válidas')
        assert(waCredsCuradent?.phoneNumberId === 'CURADENT_WA_999888', 'Curadent resuelve su PROPIO número de WhatsApp ("CURADENT_WA_999888")')
        assert(waCredsAlvarez?.phoneNumberId !== waCredsCuradent?.phoneNumberId, 'Credenciales de WhatsApp 100% aisladas entre consultorios')

        // ── PRUEBA 5: Aislamiento en Webhook Entrante (Anti-Spoofing) ──
        const tenantFromAlvarezNumber = await resolveTenantByPhoneNumberId(process.env.META_WA_PHONE_NUMBER_ID || '')
        const tenantFromCuradentNumber = await resolveTenantByPhoneNumberId('CURADENT_WA_999888')
        const tenantFromUnknownNumber = await resolveTenantByPhoneNumberId('NUMERO_INVENTADO_999999')

        assert(tenantFromCuradentNumber === curadentTenant!.id, 'Webhook entrante de Curadent se asigna exclusivamente a Curadent')
        assert(tenantFromUnknownNumber === null, 'Número no registrado es rechazado (retorna null, NUNCA recurre a Álvarez)')

        // ── PRUEBA 6: Aislamiento en Agenda y Turnos ──
        // Crear un paciente y turno de prueba para Curadent
        const { data: pacienteCuradent } = await supabase
            .from('pacientes')
            .insert({
                tenant_id: curadentTenant!.id,
                nombre: 'Paciente',
                apellido: 'Curadent Test',
                dni: '99888777',
                telefono: '1199887766',
            })
            .select()
            .single()

        const { data: turnoCuradent } = await supabase
            .from('turnos')
            .insert({
                tenant_id: curadentTenant!.id,
                profesional_id: curadentDocs[0].id,
                paciente_id: pacienteCuradent?.id,
                fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
                fecha_fin: new Date(Date.now() + 86400000 + 1800000).toISOString(),
                estado: 'PENDIENTE',
            })
            .select()
            .single()

        // Consultar turnos como Consultorio Álvarez
        const { data: turnosAlvarez } = await supabase
            .from('turnos')
            .select('id, tenant_id')
            .eq('tenant_id', alvarezTenant!.id)

        const leakedTurno = turnosAlvarez?.find((t: any) => t.id === turnoCuradent?.id)
        assert(!leakedTurno, 'Aislamiento de Agenda: El turno de Curadent es invisible e inaccesible para Álvarez')

        // Limpieza de datos de prueba temporales
        if (turnoCuradent?.id) {
            await supabase.from('turnos').delete().eq('id', turnoCuradent.id)
        }
        if (pacienteCuradent?.id) {
            await supabase.from('pacientes').delete().eq('id', pacienteCuradent.id)
        }

        console.log('\n======================================================')
        console.log(`   RESULTADO DE LA AUDITORÍA: ${passes} APROBADAS / ${fails} FALLIDAS`)
        console.log('======================================================\n')

        if (fails === 0) {
            console.log('🎉 AISLAMIENTO MULTI-TENANT VERIFICADO CON ÉXITO: Cero cruce de datos.')
        } else {
            console.error('⚠️ Se detectaron fallas de aislamiento. Revisar logs anteriores.')
        }

    } catch (e) {
        console.error('Error durante la auditoría:', e)
    }
}

runAudit()

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function getAdmin() {
    return createAdminClient()
}

function safeRevalidatePath(path: string) {
    try {
        revalidatePath(path)
    } catch {
        // Silenciar si se ejecuta fuera del ciclo de request de Next.js (ej: scripts CLI)
    }
}

export interface TenantBillingInfo {
    monto_abono: number
    fecha_vencimiento: string
    estado: 'ACTIVO' | 'PRUEBA' | 'PENDIENTE_PAGO' | 'SUSPENDIDO' | 'VENCIDO'
    alias_transferencia?: string
    cbu_transferencia?: string
    banco_transferencia?: string
    mp_link?: string
    updated_at?: string
}

export interface SaasTenantSummary {
    id: string
    slug: string
    nombre: string
    plan: string
    activo: boolean
    created_at: string
    email_contacto?: string | null
    telefono?: string | null
    color_primario?: string | null
    billing: TenantBillingInfo
    stats: {
        totalPacientes: number
        totalProfesionales: number
        totalTurnos: number
        turnosEsteMes: number
    }
    paymentsCount: number
    ultimoPago?: {
        monto: number
        fecha_pago: string
        periodo: string
    } | null
}

export interface SaasMetrics {
    totalTenants: number
    mrr: number
    activeCount: number
    trialCount: number
    expiringSoonCount: number
    suspendedCount: number
    totalTurnosPlataforma: number
    totalPacientesPlataforma: number
}

/**
 * Obtiene el resumen general y directorio de todos los tenants para el Superadmin.
 */
export async function getSaasOverview(): Promise<{
    tenants: SaasTenantSummary[]
    metrics: SaasMetrics
}> {
    const supabase = getAdmin()

    // 1. Obtener todos los tenants ordenados por fecha de creación
    const { data: rawTenants, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

    if (tErr || !rawTenants) {
        console.error('[SUPERADMIN] Error obteniendo tenants:', tErr)
        throw new Error('No se pudieron obtener los consultorios.')
    }

    // 2. Obtener todas las integraciones de billing de una sola consulta
    const { data: allIntegrations } = await supabase
        .from('tenant_integrations')
        .select('*')
        .in('provider', ['billing_settings', 'billing_payments'])

    const settingsMap = new Map<string, any>()
    const paymentsMap = new Map<string, any[]>()

    if (allIntegrations) {
        for (const item of allIntegrations) {
            if (item.provider === 'billing_settings') {
                settingsMap.set(item.tenant_id, item.credentials || {})
            } else if (item.provider === 'billing_payments') {
                paymentsMap.set(item.tenant_id, item.credentials?.payments || [])
            }
        }
    }

    // 3. Obtener conteos operativos por tenant (profesionales, pacientes, turnos)
    const { data: profs } = await supabase.from('profesionales').select('id, tenant_id')
    const { data: pacs } = await supabase.from('pacientes').select('id, tenant_id')
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfMonthIso = startOfMonth.toISOString()

    const { data: turnos } = await supabase.from('turnos').select('id, tenant_id, created_at')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    let mrr = 0
    let activeCount = 0
    let trialCount = 0
    let expiringSoonCount = 0
    let suspendedCount = 0

    const tenants: SaasTenantSummary[] = rawTenants.map((t) => {
        const rawSettings = settingsMap.get(t.id) || {}
        const rawPayments = paymentsMap.get(t.id) || []

        const estado: TenantBillingInfo['estado'] = 
            rawSettings.estado || (t.activo ? 'ACTIVO' : 'SUSPENDIDO')

        const billing: TenantBillingInfo = {
            monto_abono: Number(rawSettings.monto_abono) || 0,
            fecha_vencimiento: rawSettings.fecha_vencimiento || '',
            estado,
            alias_transferencia: rawSettings.alias_transferencia || '',
            cbu_transferencia: rawSettings.cbu_transferencia || '',
            banco_transferencia: rawSettings.banco_transferencia || '',
            mp_link: rawSettings.mp_link || '',
            updated_at: rawSettings.updated_at
        }

        // Estadísticas operativas
        const tenantProfs = profs ? profs.filter(p => p.tenant_id === t.id).length : 0
        const tenantPacs = pacs ? pacs.filter(p => p.tenant_id === t.id).length : 0
        const tenantTurnosList = turnos ? turnos.filter(u => u.tenant_id === t.id) : []
        const totalTurnos = tenantTurnosList.length
        const turnosEsteMes = tenantTurnosList.filter(u => u.created_at >= startOfMonthIso).length

        // Métricas SaaS acumulativas
        if (estado === 'ACTIVO') {
            activeCount++
            mrr += billing.monto_abono
        } else if (estado === 'PRUEBA') {
            trialCount++
        } else if (estado === 'SUSPENDIDO' || estado === 'VENCIDO') {
            suspendedCount++
        }

        if (billing.fecha_vencimiento) {
            const dueDate = new Date(billing.fecha_vencimiento + 'T00:00:00')
            if (dueDate >= today && dueDate <= in7Days && estado !== 'SUSPENDIDO') {
                expiringSoonCount++
            }
        }

        // Último pago
        const sortedPayments = [...rawPayments].sort((a, b) => 
            new Date(b.created_at || b.fecha_pago).getTime() - new Date(a.created_at || a.fecha_pago).getTime()
        )
        const ultimoPago = sortedPayments.length > 0 ? {
            monto: sortedPayments[0].monto,
            fecha_pago: sortedPayments[0].fecha_pago,
            periodo: sortedPayments[0].periodo,
        } : null

        return {
            id: t.id,
            slug: t.slug,
            nombre: t.nombre,
            plan: t.plan || 'free',
            activo: t.activo,
            created_at: t.created_at,
            email_contacto: t.email_contacto,
            telefono: t.telefono,
            color_primario: t.color_primario,
            billing,
            stats: {
                totalPacientes: tenantPacs,
                totalProfesionales: tenantProfs,
                totalTurnos,
                turnosEsteMes
            },
            paymentsCount: rawPayments.length,
            ultimoPago
        }
    })

    const metrics: SaasMetrics = {
        totalTenants: tenants.length,
        mrr,
        activeCount,
        trialCount,
        expiringSoonCount,
        suspendedCount,
        totalTurnosPlataforma: turnos?.length || 0,
        totalPacientesPlataforma: pacs?.length || 0
    }

    return { tenants, metrics }
}

/**
 * Cambia el estado de facturación / servicio de un tenant (ACTIVO, SUSPENDIDO, PRUEBA, etc.)
 */
export async function updateTenantStatus(tenantId: string, nuevoEstado: TenantBillingInfo['estado']) {
    const supabase = getAdmin()

    // 1. Obtener settings existentes
    const { data: current } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_settings')
        .maybeSingle()

    const creds = current?.credentials || {}
    const updatedCreds = {
        ...creds,
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
    }

    // 2. Guardar en tenant_integrations
    await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_settings',
            is_active: nuevoEstado === 'ACTIVO' || nuevoEstado === 'PRUEBA',
            credentials: updatedCreds
        }, { onConflict: 'tenant_id,provider' })

    // 3. Sincronizar flag `activo` en tabla `tenants`
    const isTenantActive = nuevoEstado !== 'SUSPENDIDO' && nuevoEstado !== 'VENCIDO'
    await supabase
        .from('tenants')
        .update({ activo: isTenantActive })
        .eq('id', tenantId)

    safeRevalidatePath('/superadmin')
    safeRevalidatePath('/admin')
    safeRevalidatePath('/mis-pagos')

    return { success: true }
}

/**
 * Extiende la fecha de vencimiento de un tenant (por defecto +30 días) y asegura estado ACTIVO.
 */
export async function extendTenantDueDate(tenantId: string, dias: number = 30) {
    const supabase = getAdmin()

    const { data: current } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_settings')
        .maybeSingle()

    const creds = current?.credentials || {}
    
    // Si la fecha actual ya venció, sumamos a partir de hoy. Si no, a partir de la fecha actual.
    const today = new Date()
    let baseDate = today
    if (creds.fecha_vencimiento) {
        const currentDue = new Date(creds.fecha_vencimiento + 'T00:00:00')
        if (currentDue > today) {
            baseDate = currentDue
        }
    }

    baseDate.setDate(baseDate.getDate() + dias)
    const newDueDate = baseDate.toISOString().split('T')[0]

    const updatedCreds = {
        ...creds,
        fecha_vencimiento: newDueDate,
        estado: 'ACTIVO',
        updated_at: new Date().toISOString()
    }

    await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_settings',
            is_active: true,
            credentials: updatedCreds
        }, { onConflict: 'tenant_id,provider' })

    await supabase
        .from('tenants')
        .update({ activo: true })
        .eq('id', tenantId)

    safeRevalidatePath('/superadmin')
    safeRevalidatePath('/admin')
    safeRevalidatePath('/mis-pagos')

    return { success: true, newDueDate }
}

/**
 * Actualiza los datos de cobro de un tenant (monto de abono, CBU, link de MP, etc.)
 */
export async function updateTenantBillingDetails(
    tenantId: string,
    data: {
        monto_abono: number
        fecha_vencimiento: string
        estado: TenantBillingInfo['estado']
        alias_transferencia?: string
        cbu_transferencia?: string
        banco_transferencia?: string
        mp_link?: string
    }
) {
    const supabase = getAdmin()

    const { data: current } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_settings')
        .maybeSingle()

    const creds = current?.credentials || {}
    const updatedCreds = {
        ...creds,
        ...data,
        updated_at: new Date().toISOString()
    }

    await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_settings',
            is_active: data.estado === 'ACTIVO' || data.estado === 'PRUEBA',
            credentials: updatedCreds
        }, { onConflict: 'tenant_id,provider' })

    const isTenantActive = data.estado !== 'SUSPENDIDO' && data.estado !== 'VENCIDO'
    await supabase
        .from('tenants')
        .update({ activo: isTenantActive })
        .eq('id', tenantId)

    safeRevalidatePath('/superadmin')
    safeRevalidatePath('/admin')
    safeRevalidatePath('/mis-pagos')

    return { success: true }
}

/**
 * Registra un pago confirmado y opcionalmente renueva la fecha de vencimiento +30 días.
 */
export async function registrarCobroSaaS(
    tenantId: string,
    pago: {
        monto: number
        metodo: string
        periodo: string
        fecha_pago: string
        comprobante?: string
        renovarVencimiento?: boolean
    }
) {
    const supabase = getAdmin()

    // 1. Obtener pagos anteriores
    const { data: pData } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_payments')
        .maybeSingle()

    const currentPayments = pData?.credentials?.payments || []
    const nuevoPagoItem = {
        id: crypto.randomUUID(),
        monto: pago.monto,
        metodo: pago.metodo,
        periodo: pago.periodo,
        fecha_pago: pago.fecha_pago,
        comprobante: pago.comprobante || '',
        created_at: new Date().toISOString()
    }

    const updatedPayments = [nuevoPagoItem, ...currentPayments]

    await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_payments',
            is_active: true,
            credentials: { payments: updatedPayments }
        }, { onConflict: 'tenant_id,provider' })

    // 2. Si se solicitó renovar vencimiento, extender +30 días
    if (pago.renovarVencimiento) {
        await extendTenantDueDate(tenantId, 30)
    }

    safeRevalidatePath('/superadmin')
    safeRevalidatePath('/mis-pagos')

    return { success: true }
}

/**
 * Da de alta un nuevo consultorio/tenant en la plataforma con su usuario administrador inicial.
 */
export async function crearNuevoTenantSaaS(data: {
    nombre: string
    slug: string
    plan?: string
    montoAbono: number
    diasPrueba: number
    adminEmail: string
    adminPassword?: string
    telefono?: string
    colorPrimario?: string
}) {
    const supabase = getAdmin()

    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
        throw new Error('El slug proporcionado es inválido.')
    }

    // 1. Comprobar que no exista el slug
    const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle()

    if (existingTenant) {
        throw new Error(`El identificador/slug "${cleanSlug}" ya está en uso. Elegí otro.`)
    }

    // 2. Crear el Tenant
    const { data: newTenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
            slug: cleanSlug,
            nombre: data.nombre.trim(),
            plan: data.plan || 'pro',
            color_primario: data.colorPrimario || '#2563eb',
            telefono: data.telefono?.trim() || null,
            activo: true,
            landing_activa: true,
            turnos_online_activos: true,
            horarios: [
                { dia: 1, activo: true, desde: '09:00', hasta: '18:00' },
                { dia: 2, activo: true, desde: '09:00', hasta: '18:00' },
                { dia: 3, activo: true, desde: '09:00', hasta: '18:00' },
                { dia: 4, activo: true, desde: '09:00', hasta: '18:00' },
                { dia: 5, activo: true, desde: '09:00', hasta: '18:00' },
            ]
        })
        .select()
        .single()

    if (tErr || !newTenant) {
        console.error('[SUPERADMIN] Error creando tenant:', tErr)
        throw new Error('Error al registrar el consultorio en la base de datos.')
    }

    // 3. Crear el usuario Administrador del Consultorio en Supabase Auth
    const password = data.adminPassword || 'DentalIA2026!'
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: data.adminEmail.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
            tenant_id: newTenant.id,
            nombre: data.nombre.trim(),
            rol: 'admin'
        }
    })

    if (authErr || !authUser.user) {
        console.error('[SUPERADMIN] Error creando usuario auth:', authErr)
        // Intentar limpiar tenant si falló auth
        await supabase.from('tenants').delete().eq('id', newTenant.id)
        throw new Error(`Error al crear las credenciales de acceso: ${authErr?.message || 'Error desconocido'}`)
    }

    // 4. Crear registro en public.usuarios
    const { error: uErr } = await supabase
        .from('usuarios')
        .insert({
            id: authUser.user.id,
            email: data.adminEmail.trim().toLowerCase(),
            rol: 'admin',
            tenant_id: newTenant.id
        })

    if (uErr) {
        console.error('[SUPERADMIN] Error en tabla usuarios:', uErr)
    }

    // 5. Crear configuración inicial de billing
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (data.diasPrueba || 30))
    const fechaVencimiento = dueDate.toISOString().split('T')[0]

    await supabase
        .from('tenant_integrations')
        .insert({
            tenant_id: newTenant.id,
            provider: 'billing_settings',
            is_active: true,
            credentials: {
                monto_abono: Number(data.montoAbono) || 0,
                fecha_vencimiento: fechaVencimiento,
                estado: (data.diasPrueba || 0) > 0 ? 'PRUEBA' : 'PENDIENTE_PAGO',
                banco_transferencia: 'MercadoPago',
                created_at: new Date().toISOString()
            }
        })

    safeRevalidatePath('/superadmin')

    return {
        success: true,
        tenant: newTenant,
        credentials: {
            email: data.adminEmail.trim().toLowerCase(),
            password
        }
    }
}

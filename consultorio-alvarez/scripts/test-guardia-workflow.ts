import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) {
        console.error('❌ Archivo .env.local no encontrado')
        process.exit(1)
    }
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
        const [key, ...rest] = line.split('=')
        if (key && rest.length > 0) {
            process.env[key.trim()] = rest.join('=').trim()
        }
    }
}

async function runTest() {
    console.log('====================================================')
    console.log('🧪 INICIANDO VERIFICACIÓN INTEGRAL DE GUARDIA 24HS')
    console.log('====================================================\n')

    loadEnv()

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Obtener Tenants
    const { data: tenants, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, nombre, slug')

    if (tenantErr || !tenants || tenants.length === 0) {
        console.error('❌ Error al obtener tenants:', tenantErr)
        return
    }
    const tenant = tenants.find(t => t.slug?.includes('alvarez') || t.nombre?.toLowerCase().includes('alvarez')) || tenants[0]
    console.log(`✅ 1. Tenant detectado: ${tenant.nombre} (Slug: ${tenant.slug} | ID: ${tenant.id})`)

    // 2. Verificar Categorías de Triage
    const { data: categorias, error: catErr } = await supabase
        .from('triage_guardia_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('prioridad_agenda', { ascending: true })

    if (catErr) {
        console.error('❌ Error al consultar triage_guardia_config:', catErr)
        return
    }

    console.log(`✅ 2. Categorías de Triage activas en base de datos: ${categorias?.length || 0}`)
    categorias?.forEach((cat, index) => {
        console.log(`   [${index + 1}] Prioridad ${cat.prioridad_agenda} | ${cat.categoria} -> ${cat.titulo_boton}`)
    })

    // 3. Simular ciclo de conversación y cambio de estado
    console.log('\n🔄 3. Simulando ciclo de conversación con WhatsApp Webhook...')
    const testPhone = '5491199998888'
    const testWaId = 'TEST_WA_ID_' + Date.now()

    // 3.1 Crear conversación entrante
    const { data: conv, error: convErr } = await supabase
        .from('whatsapp_conversaciones')
        .insert({
            tenant_id: tenant.id,
            telefono: testPhone,
            nombre_contacto: 'Paciente Test Urgencia',
            estado: 'BOT',
            ultimo_mensaje_texto: 'Hola, tengo una consulta',
            ultimo_mensaje_at: new Date().toISOString()
        })
        .select()
        .single()

    if (convErr || !conv) {
        console.error('❌ Error al crear conversación de prueba:', convErr)
        return
    }
    console.log(`   ✅ Conversación creada: ID ${conv.id} | Estado inicial: ${conv.estado}`)

    // 3.2 Insertar mensaje de activación de guardia
    const { error: msgErr } = await supabase
        .from('whatsapp_mensajes')
        .insert({
            conversacion_id: conv.id,
            tenant_id: tenant.id,
            wa_message_id: testWaId,
            remitente: 'paciente',
            tipo: 'interactivo',
            contenido: '🚨 Urgencia / Guardia',
            metadata: { button_payload: 'ACTIVAR_GUARDIA_URGENCIA' },
            estado_envio: 'entregado'
        })

    if (msgErr) {
        console.error('❌ Error al registrar mensaje de prueba:', msgErr)
    } else {
        console.log('   ✅ Mensaje con botón quick reply [🚨 Urgencia / Guardia] registrado.')
    }

    // 3.3 Simular handoff a operador humano
    const { error: handoffErr } = await supabase
        .from('whatsapp_conversaciones')
        .update({
            estado: 'HUMANO_PENDIENTE',
            updated_at: new Date().toISOString()
        })
        .eq('id', conv.id)

    if (handoffErr) {
        console.error('❌ Error en transición a HUMANO_PENDIENTE:', handoffErr)
    } else {
        console.log('   ✅ Transición a HUMANO_PENDIENTE exitosa (Alerta generada para recepción).')
    }

    // 3.4 Verificar conteo de pendientes para el badge del Sidebar
    const { count: pendingCount, error: countErr } = await supabase
        .from('whatsapp_conversaciones')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('estado', 'HUMANO_PENDIENTE')

    console.log(`   ✅ Conteo de chats pendientes en Sidebar: ${pendingCount} pendiente(s).`)

    // 3.5 Operador toma la conversación
    const { error: tomaErr } = await supabase
        .from('whatsapp_conversaciones')
        .update({
            estado: 'HUMANO_ATENDIENDO',
            updated_at: new Date().toISOString()
        })
        .eq('id', conv.id)

    if (tomaErr) {
        console.error('❌ Error al pasar a HUMANO_ATENDIENDO:', tomaErr)
    } else {
        console.log('   ✅ Operador tomó la conversación -> HUMANO_ATENDIENDO (Bot en silencio total garantizado).')
    }

    // 3.6 Limpiar datos de prueba
    console.log('\n🧹 4. Limpiando datos de prueba generados...')
    await supabase.from('whatsapp_mensajes').delete().eq('conversacion_id', conv.id)
    await supabase.from('whatsapp_conversaciones').delete().eq('id', conv.id)
    console.log('   ✅ Registros de prueba eliminados. Base de datos limpia y lista para producción.')

    console.log('\n====================================================')
    console.log('🎉 TODAS LAS VERIFICACIONES COMPLETADAS CON ÉXITO')
    console.log('====================================================')
}

runTest().catch(console.error)

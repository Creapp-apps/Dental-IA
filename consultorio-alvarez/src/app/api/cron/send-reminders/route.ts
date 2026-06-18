import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
    return handleSendReminders(request)
}

export async function POST(request: NextRequest) {
    return handleSendReminders(request)
}

async function handleSendReminders(request: NextRequest) {
    try {
        // Validación de API Key para protección del cron
        const { searchParams } = new URL(request.url)
        const keyParam = searchParams.get('key')
        const authHeader = request.headers.get('Authorization')
        
        const cronSecret = process.env.CRON_SECRET || 'ALVAREZ_CRON_SECRET_KEY'
        
        if (keyParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
            return NextResponse.json({ error: 'Variables de entorno de WhatsApp no configuradas' }, { status: 500 })
        }

        const admin = createAdminClient()

        // Calcular el rango del día de mañana en huso horario de Argentina
        const tomorrowStart = new Date()
        tomorrowStart.setDate(tomorrowStart.getDate() + 1)
        tomorrowStart.setHours(0, 0, 0, 0)

        const tomorrowEnd = new Date(tomorrowStart)
        tomorrowEnd.setHours(23, 59, 59, 999)

        console.log(`🔍 Buscando turnos para mañana entre: ${tomorrowStart.toISOString()} y ${tomorrowEnd.toISOString()}`)

        // 1. Buscar turnos de mañana en estado PENDIENTE
        const { data: turnos, error: errTurnos } = await admin
            .from('turnos')
            .select(`
                id,
                fecha_inicio,
                tenant_id,
                estado,
                paciente:pacientes(id, nombre, apellido, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_treatment:tipos_tratamiento(nombre)
            `)
            .eq('estado', 'PENDIENTE')
            .gte('fecha_inicio', tomorrowStart.toISOString())
            .lte('fecha_inicio', tomorrowEnd.toISOString())

        if (errTurnos) {
            throw new Error(`Error consultando turnos: ${errTurnos.message}`)
        }

        if (!turnos || turnos.length === 0) {
            return NextResponse.json({ success: true, message: 'No hay turnos pendientes para mañana.' })
        }

        console.log(`📅 Se encontraron ${turnos.length} turnos pendientes para mañana.`)
        const results = []

        for (const t of turnos) {
            const pct = t.paciente as any
            const prof = t.profesional as any
            const trat = (t as any).tipo_treatment?.nombre || 'Consulta'

            if (!pct?.telefono) {
                results.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Paciente sin teléfono' })
                continue
            }

            // 2. Evitar envíos duplicados comprobando la tabla de recordatorios
            const { data: existingRec } = await admin
                .from('recordatorios')
                .select('id')
                .eq('turno_id', t.id)
                .maybeSingle()

            if (existingRec) {
                results.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Recordatorio ya enviado previamente' })
                continue
            }

            // 3. Sanitizar teléfono para Meta API (regla de Argentina: reemplazar 549 por 54)
            let cleanPhone = pct.telefono.replace(/\D/g, '')
            if (cleanPhone.startsWith('11') || cleanPhone.length === 10) {
                cleanPhone = `54${cleanPhone}`
            } else if (cleanPhone.startsWith('549')) {
                cleanPhone = cleanPhone.replace(/^549/, '54')
            }

            // 4. Dar formato amigable local a la fecha y hora
            const fechaObj = new Date(t.fecha_inicio)
            
            const fechaStr = fechaObj.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'America/Argentina/Buenos_Aires'
            })
            // Capitalizar la primera letra del día
            const fechaStrFormatted = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)

            const horaStr = fechaObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/Argentina/Buenos_Aires'
            })

            const nombreProf = prof ? `Dr/a. ${prof.nombre} ${prof.apellido}` : 'el especialista'

            console.log(`📤 Enviando recordatorio a ${pct.nombre} (${cleanPhone}) para turno ${t.id}`)

            try {
                // 5. Llamada a Meta Cloud API con la plantilla recordatorio_turno
                const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'template',
                        template: {
                            name: 'recordatorio_turno',
                            language: { code: 'es_AR' },
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: pct.nombre },
                                        { type: 'text', text: fechaStrFormatted },
                                        { type: 'text', text: horaStr },
                                        { type: 'text', text: nombreProf }
                                    ]
                                },
                                {
                                    type: 'button',
                                    sub_type: 'quick_reply',
                                    index: '0',
                                    parameters: [
                                        { type: 'payload', payload: `CONFIRMAR_TURNO_${t.id}` }
                                    ]
                                },
                                {
                                    type: 'button',
                                    sub_type: 'quick_reply',
                                    index: '1',
                                    parameters: [
                                        { type: 'payload', payload: `CANCELAR_TURNO_${t.id}` }
                                    ]
                                },
                                {
                                    type: 'button',
                                    sub_type: 'quick_reply',
                                    index: '2',
                                    parameters: [
                                        { type: 'payload', payload: `REPROGRAMAR_TURNO_${t.id}` }
                                    ]
                                }
                            ]
                        }
                    })
                })

                const resData = await response.json()

                if (!response.ok) {
                    console.error(`❌ Error de Meta para turno ${t.id}:`, JSON.stringify(resData, null, 2))
                    
                    // Registrar el fallo en recordatorios
                    await admin.from('recordatorios').insert({
                        tenant_id: t.tenant_id,
                        turno_id: t.id,
                        canal: 'WHATSAPP',
                        estado_envio: 'FALLIDO',
                        telefono: cleanPhone,
                        mensaje_enviado: `Nombre: ${pct.nombre}, Fecha: ${fechaStrFormatted}, Hora: ${horaStr}, Profesional: ${nombreProf}`,
                        error_detalle: resData?.error?.message || 'Error al invocar Meta API'
                    })

                    results.push({ turno_id: t.id, status: 'FAILED', error: resData?.error?.message })
                } else {
                    // Registrar el envío exitoso
                    await admin.from('recordatorios').insert({
                        tenant_id: t.tenant_id,
                        turno_id: t.id,
                        canal: 'WHATSAPP',
                        estado_envio: 'ENVIADO',
                        telefono: cleanPhone,
                        mensaje_enviado: `Nombre: ${pct.nombre}, Fecha: ${fechaStrFormatted}, Hora: ${horaStr}, Profesional: ${nombreProf}`,
                        fecha_envio: new Date().toISOString()
                    })

                    results.push({ turno_id: t.id, status: 'SUCCESS' })
                }
            } catch (err: any) {
                console.error(`❌ Excepción al procesar recordatorio de turno ${t.id}:`, err)
                
                await admin.from('recordatorios').insert({
                    tenant_id: t.tenant_id,
                    turno_id: t.id,
                    canal: 'WHATSAPP',
                    estado_envio: 'FALLIDO',
                    telefono: cleanPhone,
                    error_detalle: err.message || 'Excepción interna'
                })

                results.push({ turno_id: t.id, status: 'FAILED', error: err.message })
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (err: any) {
        console.error('❌ Excepción global en el cron de recordatorios:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

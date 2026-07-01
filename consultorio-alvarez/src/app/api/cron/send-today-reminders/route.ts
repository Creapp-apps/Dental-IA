import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { limpiarTituloProfesional, normalizarTelefonoArgentino } from '@/lib/utils'

export async function GET(request: NextRequest) {
    return handleSendTodayReminders(request)
}

export async function POST(request: NextRequest) {
    return handleSendTodayReminders(request)
}

async function handleSendTodayReminders(request: NextRequest) {
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

        // Calcular el rango del día de hoy en huso horario de Argentina (America/Argentina/Buenos_Aires)
        const targetStart = new Date()
        targetStart.setHours(0, 0, 0, 0)

        const targetEnd = new Date(targetStart)
        targetEnd.setHours(23, 59, 59, 999)

        console.log(`🔍 Cron Hoy: Buscando turnos pendientes para hoy entre: ${targetStart.toISOString()} y ${targetEnd.toISOString()}`)

        // 1. Buscar turnos de hoy en estado PENDIENTE
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
            .gte('fecha_inicio', targetStart.toISOString())
            .lte('fecha_inicio', targetEnd.toISOString())

        if (errTurnos) {
            throw new Error(`Error consultando turnos de hoy: ${errTurnos.message}`)
        }

        if (!turnos || turnos.length === 0) {
            return NextResponse.json({ success: true, message: 'No hay turnos pendientes para el día de hoy.' })
        }

        console.log(`📅 Se encontraron ${turnos.length} turnos pendientes para hoy.`)
        const results = []

        for (const t of turnos) {
            const pct = t.paciente as any
            const prof = t.profesional as any
            const trat = (t as any).tipo_treatment?.nombre || 'Consulta'

            if (!pct?.telefono) {
                results.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Paciente sin teléfono' })
                continue
            }

            // 2. Evitar envíos duplicados de recordatorios del mismo día (dentro de las últimas 12 horas)
            const doceHorasAtras = new Date()
            doceHorasAtras.setHours(doceHorasAtras.getHours() - 12)

            const { data: existingRec } = await admin
                .from('recordatorios')
                .select('id')
                .eq('turno_id', t.id)
                .gte('created_at', doceHorasAtras.toISOString())
                .maybeSingle()

            if (existingRec) {
                results.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Recordatorio del mismo día ya enviado recientemente' })
                continue
            }

            // 3. Sanitizar teléfono usando el helper oficial
            const cleanPhone = normalizarTelefonoArgentino(pct.telefono)

            // 4. Formatear hora local de Argentina
            const fechaObj = new Date(t.fecha_inicio)
            const horaStr = fechaObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/Argentina/Buenos_Aires'
            })

            const nombreProf = prof ? `${limpiarTituloProfesional(prof.nombre)} ${prof.apellido.trim()}` : 'el especialista'

            console.log(`📤 Enviando recordatorio HOY a ${pct.nombre} (${cleanPhone}) para turno ${t.id}`)

            try {
                // 5. Llamada a Meta Cloud API con la plantilla 'recordatorio_hoy'
                // Parámetros esperados en la plantilla:
                // {{1}} = Nombre paciente
                // {{2}} = Hora del turno
                // {{3}} = Nombre profesional
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
                            name: 'recordatorio_hoy',
                            language: { code: 'es_AR' },
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: pct.nombre },
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
                    console.error(`❌ Error de Meta para turno hoy ${t.id}:`, JSON.stringify(resData, null, 2))
                    
                    await admin.from('recordatorios').insert({
                        tenant_id: t.tenant_id,
                        turno_id: t.id,
                        canal: 'WHATSAPP',
                        estado_envio: 'FALLIDO',
                        telefono: cleanPhone,
                        mensaje_enviado: `Nombre: ${pct.nombre}, Hora: ${horaStr}, Profesional: ${nombreProf} (Recordatorio HOY)`,
                        error_detalle: resData?.error?.message || 'Error al invocar Meta API'
                    })

                    results.push({ turno_id: t.id, status: 'FAILED', error: resData?.error?.message })
                } else {
                    await admin.from('recordatorios').insert({
                        tenant_id: t.tenant_id,
                        turno_id: t.id,
                        canal: 'WHATSAPP',
                        estado_envio: 'ENVIADO',
                        telefono: cleanPhone,
                        mensaje_enviado: `Nombre: ${pct.nombre}, Hora: ${horaStr}, Profesional: ${nombreProf} (Recordatorio HOY)`,
                        fecha_envio: new Date().toISOString()
                    })

                    results.push({ turno_id: t.id, status: 'SUCCESS' })
                }
            } catch (err: any) {
                console.error(`❌ Excepción al procesar recordatorio hoy del turno ${t.id}:`, err)
                
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
        console.error('❌ Excepción global en el cron de recordatorios de hoy:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

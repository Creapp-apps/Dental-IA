import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
    return handleDailyCron(request)
}

export async function POST(request: NextRequest) {
    return handleDailyCron(request)
}

async function handleDailyCron(request: NextRequest) {
    try {
        // 1. Validación de API Key para protección del cron
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
        const results = {
            cumpleanos: [] as any[],
            seguimiento: [] as any[]
        }

        // ==========================================
        // PROCESO 1: SALUDOS DE CUMPLEAÑOS
        // ==========================================
        console.log('🎂 Iniciando proceso de saludos de cumpleaños...')
        const today = new Date()
        // Ajuste manual para el mes/día en Argentina
        const formatter = new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires'
        })
        const parts = formatter.formatToParts(today)
        const dayPart = parts.find(p => p.type === 'day')?.value || ''
        const monthPart = parts.find(p => p.type === 'month')?.value || ''
        const matchStr = `-${monthPart}-${dayPart}`

        console.log(`Buscando cumpleaños del día: ${matchStr}`)

        // Buscar todos los pacientes con fecha_nacimiento registrada
        const { data: pacientes, error: errPacientes } = await admin
            .from('pacientes')
            .select('id, nombre, apellido, telefono, fecha_nacimiento, tenant_id')
            .not('fecha_nacimiento', 'is', null)

        if (errPacientes) {
            console.error('Error al consultar pacientes para cumpleaños:', errPacientes)
        } else if (pacientes) {
            const cumpleañeros = pacientes.filter(p => p.fecha_nacimiento?.endsWith(matchStr))
            console.log(`Se encontraron ${cumpleañeros.length} cumpleañeros hoy.`)

            for (const pct of cumpleañeros) {
                if (!pct.telefono) {
                    results.cumpleanos.push({ paciente_id: pct.id, status: 'SKIPPED', reason: 'Sin teléfono' })
                    continue
                }

                // Sanitizar teléfono (regla de Argentina)
                let cleanPhone = pct.telefono.replace(/\D/g, '')
                if (cleanPhone.startsWith('11') || cleanPhone.length === 10) {
                    cleanPhone = `54${cleanPhone}`
                } else if (cleanPhone.startsWith('549')) {
                    cleanPhone = cleanPhone.replace(/^549/, '54')
                }

                try {
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
                                name: 'saludo_cumpleanos',
                                language: { code: 'es_AR' },
                                components: [
                                    {
                                        type: 'body',
                                        parameters: [
                                            { type: 'text', text: pct.nombre }
                                        ]
                                    }
                                ]
                            }
                        })
                    })

                    const resData = await response.json()
                    if (!response.ok) {
                        console.error(`❌ Error enviando cumpleaños a ${pct.nombre}:`, resData)
                        results.cumpleanos.push({ paciente_id: pct.id, status: 'FAILED', error: resData?.error?.message })
                    } else {
                        console.log(`✅ Saludo de cumpleaños enviado a ${pct.nombre} (${cleanPhone})`)
                        results.cumpleanos.push({ paciente_id: pct.id, status: 'SUCCESS' })
                    }
                } catch (waErr: any) {
                    console.error(`❌ Excepción enviando cumpleaños a ${pct.nombre}:`, waErr)
                    results.cumpleanos.push({ paciente_id: pct.id, status: 'FAILED', error: waErr.message })
                }
            }
        }

        // ==========================================
        // PROCESO 2: SEGUIMIENTO POST-TRATAMIENTO
        // ==========================================
        console.log('🩺 Iniciando proceso de seguimiento post-tratamiento...')
        
        // Calcular el rango del día de ayer en huso horario de Argentina
        const yesterdayStart = new Date()
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)
        yesterdayStart.setHours(0, 0, 0, 0)

        const yesterdayEnd = new Date(yesterdayStart)
        yesterdayEnd.setHours(23, 59, 59, 999)

        console.log(`🔍 Buscando turnos atendidos ayer entre: ${yesterdayStart.toISOString()} y ${yesterdayEnd.toISOString()}`)

        const { data: turnosAtendidos, error: errTurnos } = await admin
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
            .eq('estado', 'ATENDIDO')
            .gte('fecha_inicio', yesterdayStart.toISOString())
            .lte('fecha_inicio', yesterdayEnd.toISOString())

        if (errTurnos) {
            console.error('Error al consultar turnos atendidos para seguimiento:', errTurnos)
        } else if (turnosAtendidos) {
            console.log(`Se encontraron ${turnosAtendidos.length} turnos atendidos ayer.`)

            for (const t of turnosAtendidos) {
                const pct = t.paciente as any
                const prof = t.profesional as any
                const trat = (t as any).tipo_treatment?.nombre || 'Consulta'

                if (!pct?.telefono) {
                    results.seguimiento.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Paciente sin teléfono' })
                    continue
                }

                // Evitar duplicar el mensaje de seguimiento
                const { data: existingRec } = await admin
                    .from('recordatorios')
                    .select('id')
                    .eq('turno_id', t.id)
                    .eq('canal', 'WHATSAPP_SEGUIMIENTO')
                    .maybeSingle()

                if (existingRec) {
                    results.seguimiento.push({ turno_id: t.id, status: 'SKIPPED', reason: 'Seguimiento ya enviado' })
                    continue
                }

                // Sanitizar teléfono
                let cleanPhone = pct.telefono.replace(/\D/g, '')
                if (cleanPhone.startsWith('11') || cleanPhone.length === 10) {
                    cleanPhone = `54${cleanPhone}`
                } else if (cleanPhone.startsWith('549')) {
                    cleanPhone = cleanPhone.replace(/^549/, '54')
                }

                const nombreProf = prof ? `Dr. ${prof.nombre} ${prof.apellido}` : 'el especialista'

                try {
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
                                name: 'seguimiento_paciente',
                                language: { code: 'es_AR' },
                                components: [
                                    {
                                        type: 'body',
                                        parameters: [
                                            { type: 'text', text: pct.nombre },
                                            { type: 'text', text: trat },
                                            { type: 'text', text: nombreProf }
                                        ]
                                    }
                                ]
                            }
                        })
                    })

                    const resData = await response.json()
                    if (!response.ok) {
                        console.error(`❌ Error enviando seguimiento para turno ${t.id}:`, resData)
                        
                        await admin.from('recordatorios').insert({
                            tenant_id: t.tenant_id,
                            turno_id: t.id,
                            canal: 'WHATSAPP_SEGUIMIENTO',
                            estado_envio: 'FALLIDO',
                            telefono: cleanPhone,
                            mensaje_enviado: `Nombre: ${pct.nombre}, Tratamiento: ${trat}, Profesional: ${nombreProf}`,
                            error_detalle: resData?.error?.message || 'Error en Meta API'
                        })

                        results.seguimiento.push({ turno_id: t.id, status: 'FAILED', error: resData?.error?.message })
                    } else {
                        console.log(`✅ Seguimiento enviado para turno ${t.id} a ${pct.nombre} (${cleanPhone})`)
                        
                        await admin.from('recordatorios').insert({
                            tenant_id: t.tenant_id,
                            turno_id: t.id,
                            canal: 'WHATSAPP_SEGUIMIENTO',
                            estado_envio: 'ENVIADO',
                            telefono: cleanPhone,
                            mensaje_enviado: `Nombre: ${pct.nombre}, Tratamiento: ${trat}, Profesional: ${nombreProf}`,
                            fecha_envio: new Date().toISOString()
                        })

                        results.seguimiento.push({ turno_id: t.id, status: 'SUCCESS' })
                    }
                } catch (waErr: any) {
                    console.error(`❌ Excepción enviando seguimiento para turno ${t.id}:`, waErr)
                    
                    await admin.from('recordatorios').insert({
                        tenant_id: t.tenant_id,
                        turno_id: t.id,
                        canal: 'WHATSAPP_SEGUIMIENTO',
                        estado_envio: 'FALLIDO',
                        telefono: cleanPhone,
                        error_detalle: waErr.message || 'Excepción interna'
                    })

                    results.seguimiento.push({ turno_id: t.id, status: 'FAILED', error: waErr.message })
                }
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (err: any) {
        console.error('❌ Excepción global en el cron diario:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

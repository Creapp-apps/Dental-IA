import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { normalizarTelefonoArgentino } from '@/lib/utils'
import { notificarTurnoPorWhatsApp } from '@/lib/actions/turnos'


// GET: Webhook Verification (Meta Verification Challenge)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // Read the secret verification token from environment variables
    const verifyToken = process.env.META_WA_VERIFY_TOKEN || 'ALVAREZ_WA_WEBHOOK_VERIFY_TOKEN'

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook de WhatsApp verificado con éxito por Meta.')
        return new Response(challenge, { status: 200 })
    }
    
    console.warn('⚠️ Intento de verificación de webhook fallido o no autorizado.')
    return new Response('Forbidden', { status: 403 })
}

async function logDebug(event: string, detail: any, tenantId?: string) {
    try {
        const admin = createAdminClient()
        // Buscar si existe el registro de logs
        let query = admin
            .from('tenant_integrations')
            .select('*')
            .eq('provider', 'whatsapp')

        if (tenantId) {
            query = query.eq('tenant_id', tenantId)
        }

        const { data: results } = await query.limit(1)
        const existing = results?.[0]

        let logs = []
        if (existing && existing.credentials && typeof existing.credentials === 'object' && Array.isArray((existing.credentials as any).logs)) {
            logs = (existing.credentials as any).logs
        }

        logs.push({
            timestamp: new Date().toISOString(),
            event,
            detail
        })

        // Limitar a los últimos 50 logs
        if (logs.length > 50) {
            logs = logs.slice(logs.length - 50)
        }

        // Obtener un tenant_id válido
        let finalTenantId = tenantId || existing?.tenant_id
        if (!finalTenantId) {
            const { data: tenant } = await admin.from('tenants').select('id').limit(1).single()
            finalTenantId = tenant?.id
        }

        if (finalTenantId) {
            if (existing) {
                // Preservar credenciales existentes y actualizar logs
                const existingCreds = typeof existing.credentials === 'object' ? existing.credentials : {}
                const newCredentials = {
                    ...existingCreds,
                    logs
                }
                await admin
                    .from('tenant_integrations')
                    .update({ credentials: newCredentials })
                    .eq('id', existing.id)
            } else {
                await admin
                    .from('tenant_integrations')
                    .insert({
                        tenant_id: finalTenantId,
                        provider: 'whatsapp',
                        credentials: { logs },
                        is_active: false
                    })
            }
        }
    } catch (err) {
        console.error('Error logging webhook debug:', err)
    }
}

function normalizeTextForMatch(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
        .trim()
}

// POST: Recepción de Eventos de Mensajes de Meta
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        
        // Registrar payload para depuración
        console.log('📬 Webhook WhatsApp recibido:', JSON.stringify(body, null, 2))
        await logDebug('webhook_received', body)

        const change = body.entry?.[0]?.changes?.[0]?.value
        const message = change?.messages?.[0]

        // Solo procesamos si hay un mensaje entrante
        if (!message) {
            await logDebug('no_message_in_payload', change)
            return NextResponse.json({ success: true, message: 'No message in payload' })
        }

        const from = message.from // Número del paciente (ej: 5491130174859)
        const cleanPhone = normalizarTelefonoArgentino(from)
        const messageId = message.id
        
        // Identificar tipo de mensaje
        const type = message.type
        let buttonPayload = ''
        let textBody = ''
        let buttonTextFallback = ''

        if (type === 'button') {
            buttonPayload = message.button?.payload || ''
            buttonTextFallback = message.button?.text || ''
        } else if (type === 'interactive') {
            buttonPayload = message.interactive?.button_reply?.id || ''
            buttonTextFallback = message.interactive?.button_reply?.title || ''
        } else if (type === 'text') {
            textBody = message.text?.body?.trim() || ''
        }

        console.log(`📱 Mensaje recibido de ${from}. Tipo: ${type}. Payload: "${buttonPayload}". Texto: "${textBody}". Fallback de botón: "${buttonTextFallback}"`)

        // Instanciar cliente administrador para eludir RLS y operar en base de datos
        const admin = createAdminClient()

        let turnoIdToUpdate = ''
        let respuestaPaciente: 'CONFIRMAR' | 'CANCELAR' | 'REPROGRAMAR' | null = null

        // 1. Analizar respuesta de botón rápido
        if (buttonPayload) {
            const confirmMatch = buttonPayload.match(/^CONFIRMAR_TURNO_(.+)$/)
            const cancelMatch = buttonPayload.match(/^CANCELAR_TURNO_(.+)$/)
            const reprogramMatch = buttonPayload.match(/^REPROGRAMAR_TURNO_(.+)$/)

            if (confirmMatch) {
                turnoIdToUpdate = confirmMatch[1]
                respuestaPaciente = 'CONFIRMAR'
            } else if (cancelMatch) {
                turnoIdToUpdate = cancelMatch[1]
                respuestaPaciente = 'CANCELAR'
            } else if (reprogramMatch) {
                turnoIdToUpdate = reprogramMatch[1]
                respuestaPaciente = 'REPROGRAMAR'
            }
        } 

        // 2. Si no se identificó por payload, intentar deducir por texto (mensaje de texto o texto del botón clickeado)
        if (!turnoIdToUpdate || !respuestaPaciente) {
            const textToAnalyze = textBody || buttonTextFallback
            if (textToAnalyze) {
                const normalized = normalizeTextForMatch(textToAnalyze)
                console.log(`🔍 Intentando deducir acción de texto normalizado: "${normalized}"`)

                // Encontrar el último recordatorio enviado a este teléfono que esté pendiente de respuesta
                const { data: lastRem } = await admin
                    .from('recordatorios')
                    .select('id, turno_id, tenant_id')
                    .eq('telefono', cleanPhone)
                    .eq('estado_envio', 'ENVIADO')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (lastRem?.turno_id) {
                    const matchesConfirm = 
                        normalized === 'si' || 
                        normalized === 'ok' || 
                        normalized === 'si confirmo' ||
                        normalized === 'confirmo' ||
                        normalized === 'confirmar' ||
                        normalized === 'confirmado' ||
                        normalized.includes('confirm') ||
                        (normalized.startsWith('si ') && normalized.length <= 15);

                    const matchesCancel = 
                        normalized === 'no' || 
                        normalized === 'no cancelar' ||
                        normalized === 'cancelar' ||
                        normalized === 'cancelo' ||
                        normalized.includes('cancel') ||
                        normalized.includes('no asisto') ||
                        normalized.includes('no voy') ||
                        (normalized.startsWith('no ') && normalized.length <= 15);

                    const matchesReprogram = 
                        normalized.includes('reprogram') ||
                        normalized.includes('cambi') ||
                        normalized.includes('modif') ||
                        normalized.includes('otro horario') ||
                        normalized.includes('otro dia') ||
                        normalized.includes('otra fecha') ||
                        normalized.includes('reprogramar el turno');

                    if (matchesConfirm) {
                        turnoIdToUpdate = lastRem.turno_id
                        respuestaPaciente = 'CONFIRMAR'
                    } else if (matchesCancel) {
                        turnoIdToUpdate = lastRem.turno_id
                        respuestaPaciente = 'CANCELAR'
                    } else if (matchesReprogram) {
                        turnoIdToUpdate = lastRem.turno_id
                        respuestaPaciente = 'REPROGRAMAR'
                    }
                }
            }
        }

        // 3. Si se identificó un turno y una acción válida, actualizamos base de datos
        if (turnoIdToUpdate && respuestaPaciente) {
            // Traer información del turno antes de actualizar
            const { data: turno } = await admin
                .from('turnos')
                .select(`
                    tenant_id,
                    fecha_inicio,
                    profesional_id,
                    paciente:pacientes(nombre, apellido),
                    tipo_treatment:tipos_tratamiento(nombre)
                `)
                .eq('id', turnoIdToUpdate)
                .single()

            // Si no es solicitud de reprogramar, actualizamos el estado físico del turno en la grilla
            if (respuestaPaciente !== 'REPROGRAMAR') {
                const nuevoEstado = respuestaPaciente === 'CONFIRMAR' ? 'CONFIRMADO' : 'CANCELADO'
                await admin
                    .from('turnos')
                    .update({ estado: nuevoEstado })
                    .eq('id', turnoIdToUpdate)
                console.log(`✅ Turno ${turnoIdToUpdate} actualizado a ${nuevoEstado}`)
            } else {
                console.log(`🔄 Turno ${turnoIdToUpdate} mantiene estado PENDIENTE, registrado pedido de reprogramación`)
            }

            // Actualizar tabla de recordatorios en base de datos
            await admin
                .from('recordatorios')
                .update({
                    estado_envio: 'RESPONDIDO',
                    respuesta_paciente: respuestaPaciente,
                    fecha_respuesta: new Date().toISOString()
                })
                .eq('turno_id', turnoIdToUpdate)

            // --- Enviar mensaje de respuesta automática (Plantilla de WhatsApp) al paciente ---
            if (process.env.META_WA_ACCESS_TOKEN && process.env.META_WA_PHONE_NUMBER_ID) {
                try {
                    let templateName: 'turno_confirmado' | 'turno_cancelado' | 'turno_reprogramado' = 'turno_confirmado'
                    if (respuestaPaciente === 'CONFIRMAR') {
                        templateName = 'turno_confirmado'
                    } else if (respuestaPaciente === 'CANCELAR') {
                        templateName = 'turno_cancelado'
                    } else if (respuestaPaciente === 'REPROGRAMAR') {
                        templateName = 'turno_reprogramado'
                    }

                    console.log(`[WA WEBHOOK] Despachando plantilla automática "${templateName}" para turno ${turnoIdToUpdate}`)
                    await notificarTurnoPorWhatsApp(turnoIdToUpdate, templateName)
                } catch (waErr) {
                    console.error('❌ Error al enviar respuesta de confirmación a WhatsApp:', waErr)
                }
            }

            // --- Enviar Push Notification al profesional asignado ---
            try {
                const { data: usuarioProf } = await admin
                    .from('usuarios')
                    .select('id')
                    .eq('profesional_id', turno?.profesional_id)
                    .eq('activo', true)
                    .maybeSingle()

                if (usuarioProf?.id) {
                    const pct = turno?.paciente as any
                    const trat = (turno as any)?.tipo_treatment?.nombre || 'Consulta'
                    const fechaObj = new Date(turno?.fecha_inicio || '')
                    const horaStr = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                    
                    let title = ''
                    let body = ''

                    if (respuestaPaciente === 'CONFIRMAR') {
                        title = '📅 Turno Confirmado'
                        body = `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} a las ${horaStr} hs.`
                    } else if (respuestaPaciente === 'CANCELAR') {
                        title = '❌ Turno Cancelado'
                        body = `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} a las ${horaStr} hs.`
                    } else {
                        title = '🔄 Turno a Reprogramar'
                        body = `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} a las ${horaStr} hs solicita cambio de horario.`
                    }

                    const { sendPushToUser } = await import('@/lib/push-notifications/send-push')
                    await sendPushToUser(usuarioProf.id, title, body, '/agenda')
                }
            } catch (pushErr) {
                console.error('❌ Error al despachar push al profesional:', pushErr)
            }

            // Revalidar las vistas de la agenda
            revalidatePath('/agenda')
            revalidatePath('/admin')
            
            await logDebug('webhook_processed_success', {
                turnoIdToUpdate,
                respuestaPaciente,
                paciente: turno?.paciente,
                fecha_inicio: turno?.fecha_inicio
            }, turno?.tenant_id)
        } else {
            console.log(`[WA WEBHOOK] Mensaje de texto libre o no reconocido de ${from}. Enviando auto-respuesta defensiva...`)
            await enviarAutoRespuestaMeta(from)
            await logDebug('webhook_auto_reply_sent', {
                type,
                buttonPayload,
                textBody,
                from
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('❌ Error en webhook handler:', error)
        await logDebug('webhook_error', {
            message: error.message,
            stack: error.stack
        })
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

async function enviarAutoRespuestaMeta(toPhone: string) {
    if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
        console.warn('⚠️ No se puede enviar auto-respuesta: Variables META_WA faltantes en entorno.')
        return
    }

    const autoReplyText = `🤖*Consultorio Alvarez - Clinica Odontologica*
⚠️Te informamos que este numero es exclusiva para el envío automático de *notificaciones de turnos*.⚠️

🗓️En caso de requerir alguna información especifica o personalizada, podes comunicarte con Administración a través del siguiente numero de Whatsapp:

📲 11-6103-9248

Muchas Gracias!❤️🦷`

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'text',
                text: {
                    preview_url: false,
                    body: autoReplyText
                }
            })
        })

        const resData = await response.json()
        if (!response.ok) {
            console.error('❌ Error al enviar auto-respuesta Meta API:', JSON.stringify(resData, null, 2))
        } else {
            console.log(`✅ Auto-respuesta de Meta enviada con éxito a ${toPhone}`)
        }
    } catch (err) {
        console.error('❌ Excepción al enviar auto-respuesta Meta API:', err)
    }
}

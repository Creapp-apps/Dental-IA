import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { normalizarTelefonoArgentino } from '@/lib/utils'
import { notificarTurnoPorWhatsApp } from '@/lib/actions/turnos'
import { resolveTenantByPhoneNumberId, getWhatsAppCredentialsForTenant, descargarYGuardarMediaWhatsApp } from '@/lib/whatsapp'
import { 
    esMensajeDeUrgencia, 
    esHorarioFueraDeAtencion, 
    getTriageCategorias, 
    getTriagePorCategoria, 
    buscarPrimerTurnoLibre, 
    enviarMenuPrincipalWhatsApp,
    enviarMenuTriageWhatsApp, 
    enviarTipsYPropuestaTurno 
} from '@/lib/whatsapp-guardia'


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

        const change = body.entry?.[0]?.changes?.[0]?.value
        const message = change?.messages?.[0]

        // Solo procesamos si hay un mensaje entrante
        if (!message) {
            await logDebug('no_message_in_payload', change)
            return NextResponse.json({ success: true, message: 'No message in payload' })
        }

        // ── AISLAMIENTO MULTI-TENANT ESTRICTO POR PHONE_NUMBER_ID ──
        const incomingPhoneNumberId = change?.metadata?.phone_number_id
        if (!incomingPhoneNumberId) {
            console.warn('[WA WEBHOOK] ⚠️ Payload sin metadata.phone_number_id. Petición ignorada por seguridad.')
            return NextResponse.json({ success: true, message: 'No phone_number_id' })
        }

        const tenantId = await resolveTenantByPhoneNumberId(incomingPhoneNumberId)
        if (!tenantId) {
            console.warn(`[WA WEBHOOK] ⚠️ phone_number_id "${incomingPhoneNumberId}" no pertenece a ningún consultorio registrado. Petición ignorada para proteger aislamiento.`)
            return NextResponse.json({ success: true, message: 'Unrecognized tenant ignored' })
        }

        await logDebug('webhook_received', body, tenantId)

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
        } else if (type === 'image') {
            textBody = message.image?.caption?.trim() || '📷 [Foto adjunta]'
        } else if (type === 'audio') {
            textBody = '🎙️ [Nota de voz]'
        } else if (type === 'video') {
            textBody = message.video?.caption?.trim() || '🎥 [Video adjunto]'
        } else if (type === 'document') {
            textBody = message.document?.filename || '📄 [Documento adjunto]'
        }

        console.log(`📱 Mensaje recibido de ${from}. Tipo: ${type}. Payload: "${buttonPayload}". Texto: "${textBody}". Fallback de botón: "${buttonTextFallback}"`)

        // Instanciar cliente administrador para eludir RLS y operar en base de datos
        const admin = createAdminClient()

        // ── PERSISTENCIA DEFENSIVA DE CONVERSACIÓN Y MENSAJE (Fase 1 Handoff Humano) ──
        let conversacionId: string | null = null
        let estadoConversacion = 'BOT'

        try {
            const { data: conv } = await admin
                .from('whatsapp_conversaciones')
                .select('id, estado, no_leidos_operador')
                .eq('tenant_id', tenantId)
                .eq('telefono', cleanPhone)
                .maybeSingle()

            if (conv) {
                conversacionId = conv.id
                estadoConversacion = conv.estado
            } else {
                const { data: paciente } = await admin
                    .from('pacientes')
                    .select('id, nombre, apellido')
                    .eq('tenant_id', tenantId)
                    .eq('telefono', cleanPhone)
                    .maybeSingle()

                const { data: newConv } = await admin
                    .from('whatsapp_conversaciones')
                    .insert({
                        tenant_id: tenantId,
                        paciente_id: paciente?.id || null,
                        telefono: cleanPhone,
                        nombre_contacto: paciente ? `${paciente.nombre} ${paciente.apellido}` : null,
                        estado: 'BOT',
                        ultimo_mensaje_at: new Date().toISOString(),
                        ultimo_mensaje_texto: textBody || buttonTextFallback || buttonPayload || 'Mensaje interactivo',
                        no_leidos_operador: 1
                    })
                    .select('id, estado')
                    .maybeSingle()

                if (newConv) {
                    conversacionId = newConv.id
                    estadoConversacion = newConv.estado
                }
            }

            if (conversacionId) {
                // Descargar archivo si es imagen o audio
                let mediaUrl: string | null = null
                const waCredsForMedia = await getWhatsAppCredentialsForTenant(tenantId)

                if (waCredsForMedia) {
                    if (type === 'image' && message.image?.id) {
                        mediaUrl = await descargarYGuardarMediaWhatsApp(message.image.id, waCredsForMedia.accessToken, tenantId, 'jpg')
                    } else if (type === 'audio' && message.audio?.id) {
                        mediaUrl = await descargarYGuardarMediaWhatsApp(message.audio.id, waCredsForMedia.accessToken, tenantId, 'ogg')
                    }
                }

                const tipoFinal = type === 'image' ? 'imagen' : (type === 'audio' ? 'audio' : (type === 'button' || type === 'interactive' ? 'interactivo' : 'texto'))

                await admin.from('whatsapp_mensajes').insert({
                    tenant_id: tenantId,
                    conversacion_id: conversacionId,
                    tipo: tipoFinal,
                    remitente: 'paciente',
                    contenido: textBody || buttonTextFallback || buttonPayload || 'Mensaje recibido',
                    wa_message_id: messageId,
                    metadata: { raw: message, media_url: mediaUrl }
                })

                await admin.from('whatsapp_conversaciones').update({
                    ultimo_mensaje_at: new Date().toISOString(),
                    ultimo_mensaje_texto: textBody || buttonTextFallback || buttonPayload || 'Mensaje recibido',
                    no_leidos_operador: (conv?.no_leidos_operador || 0) + 1
                }).eq('id', conversacionId)
            }
        } catch (persistErr) {
            console.warn('[WA WEBHOOK] Advertencia de persistencia (tablas pendientes o error no bloqueante):', persistErr)
        }

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

                // Encontrar el último recordatorio enviado a este teléfono que esté pendiente de respuesta dentro de este consultorio
                const { data: lastRem } = await admin
                    .from('recordatorios')
                    .select('id, turno_id, tenant_id')
                    .eq('tenant_id', tenantId)
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
            // Traer información del turno antes de actualizar asegurando pertenencia al consultorio del webhook
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
                .eq('tenant_id', tenantId)
                .maybeSingle()

            if (!turno) {
                console.warn(`[WA WEBHOOK] ⚠️ Turno ${turnoIdToUpdate} no encontrado o no pertenece al consultorio ${tenantId}. Acción ignorada por seguridad.`)
                return NextResponse.json({ success: true, message: 'Turno not found or tenant mismatch' })
            }

            // Si no es solicitud de reprogramar, actualizamos el estado físico del turno en la grilla
            if (respuestaPaciente !== 'REPROGRAMAR') {
                const nuevoEstado = respuestaPaciente === 'CONFIRMAR' ? 'CONFIRMADO' : 'CANCELADO'
                await admin
                    .from('turnos')
                    .update({ estado: nuevoEstado })
                    .eq('id', turnoIdToUpdate)
                    .eq('tenant_id', tenantId)
                console.log(`✅ Turno ${turnoIdToUpdate} de consultorio ${tenantId} actualizado a ${nuevoEstado}`)
            } else {
                console.log(`🔄 Turno ${turnoIdToUpdate} de consultorio ${tenantId} mantiene estado PENDIENTE, registrado pedido de reprogramación`)
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
                .eq('tenant_id', tenantId)

            // --- Enviar mensaje de respuesta automática (Plantilla de WhatsApp) al paciente ---
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

            // --- Insertar Notificación Realtime en la base de datos para Dashboard y Toasts ---
            if (turno?.tenant_id) {
                try {
                    const pct = turno?.paciente as any
                    const apellido = pct?.apellido ? pct.apellido.trim() : ''
                    const nombre = pct?.nombre ? pct.nombre.trim() : ''
                    const pacienteDisplay = apellido
                        ? `**${apellido.toUpperCase()}** ${nombre}`.trim()
                        : `**${nombre || 'Paciente'}**`

                    const trat = (turno as any)?.tipo_treatment?.nombre || 'Consulta'
                    const fechaObj = new Date(turno?.fecha_inicio || '')
                    const horaStr = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
                    const fechaStr = fechaObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })

                    let notifTitulo = ''
                    let notifMensaje = ''
                    let notifTipo: 'turno_confirmado' | 'turno_cancelado' | 'turno_reprogramado' = 'turno_confirmado'

                    if (respuestaPaciente === 'CONFIRMAR') {
                        notifTitulo = '✅ Turno Confirmado por WhatsApp'
                        notifMensaje = `${pacienteDisplay} confirmó su turno de ${trat} para el ${fechaStr} a las ${horaStr} hs.`
                        notifTipo = 'turno_confirmado'
                    } else if (respuestaPaciente === 'CANCELAR') {
                        notifTitulo = '❌ Turno Cancelado por Paciente'
                        notifMensaje = `${pacienteDisplay} canceló su turno de ${trat} del ${fechaStr} a las ${horaStr} hs.`
                        notifTipo = 'turno_cancelado'
                    } else {
                        notifTitulo = '🔄 Solicitud de Reprogramación'
                        notifMensaje = `${pacienteDisplay} solicita reprogramar su turno de ${trat} (${fechaStr} ${horaStr} hs).`
                        notifTipo = 'turno_reprogramado'
                    }

                    await admin.from('notificaciones').insert({
                        tenant_id: turno.tenant_id,
                        titulo: notifTitulo,
                        mensaje: notifMensaje,
                        tipo: notifTipo,
                        referencia_id: turnoIdToUpdate,
                        leida: false
                    })
                    console.log(`🔔 Notificación realtime registrada: "${notifTitulo}"`)
                } catch (notifErr) {
                    console.error('❌ Error insertando registro en tabla notificaciones:', notifErr)
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
            console.log(`[WA WEBHOOK] Mensaje libre o interactivo de ${from}. Procesando máquina de estados...`)

            // 1. Si la conversación está tomada por un operador humano, el bot guarda silencio absoluto
            if (estadoConversacion === 'HUMANO_ATENDIENDO') {
                console.log(`[WA WEBHOOK] Conversación ${conversacionId} atendida activamente por operador humano. Bot en silencio.`)
                return NextResponse.json({ success: true })
            }

            const waCreds = await getWhatsAppCredentialsForTenant(tenantId)

            // 2. Si el paciente presiona el botón "🚨 Urgencia / Guardia"
            if (buttonPayload === 'ACTIVAR_GUARDIA_URGENCIA' && waCreds) {
                console.log(`[WA WEBHOOK] Paciente ${from} activó protocolo de Guardia por botón Quick Reply.`)

                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '🚨 Protocolo de Guardia Activado',
                    mensaje: `El paciente (+${cleanPhone}) activó la Guardia Odontológica por WhatsApp.`,
                    tipo: 'turno_reprogramado',
                    referencia_id: conversacionId || '',
                    leida: false
                })

                // Despachar Push Notification a administradores, secretarias y profesionales
                try {
                    const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                    await sendPushToRole('admin', tenantId, '🚨 Guardia Odontológica Activada', `Paciente (+${cleanPhone}) activó la guardia por WhatsApp.`, '/mensajes')
                    await sendPushToRole('secretaria', tenantId, '🚨 Guardia Odontológica Activada', `Paciente (+${cleanPhone}) activó la guardia por WhatsApp.`, '/mensajes')
                    await sendPushToRole('profesional', tenantId, '🚨 Guardia Odontológica Activada', `Paciente (+${cleanPhone}) activó la guardia por WhatsApp.`, '/mensajes')
                } catch (pushErr) {
                    console.error('Error al despachar push de guardia:', pushErr)
                }

                const categoriasTriage = await getTriageCategorias(tenantId)
                if (categoriasTriage.length > 0) {
                    await enviarMenuTriageWhatsApp(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        categoriasTriage
                    )
                    return NextResponse.json({ success: true })
                }
            }

            // 3. Si el paciente solicita hablar con una recepcionista
            if (buttonPayload === 'HABLAR_RECEPCIONISTA') {
                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                }

                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '💬 Paciente solicita Recepción',
                    mensaje: `El paciente (+${cleanPhone}) solicitó atención personalizada por WhatsApp.`,
                    tipo: 'turno_reprogramado',
                    referencia_id: conversacionId || '',
                    leida: false
                })

                // Despachar Push Notification a administradores y secretarias
                try {
                    const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                    await sendPushToRole('admin', tenantId, '💬 Solicitud de Recepción', `Paciente (+${cleanPhone}) solicitó hablar con recepción por WhatsApp.`, '/mensajes')
                    await sendPushToRole('secretaria', tenantId, '💬 Solicitud de Recepción', `Paciente (+${cleanPhone}) solicitó hablar con recepción por WhatsApp.`, '/mensajes')
                } catch (pushErr) {
                    console.error('Error al despachar push de recepción:', pushErr)
                }

                if (waCreds) {
                    try {
                        await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${waCreds.accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messaging_product: 'whatsapp',
                                recipient_type: 'individual',
                                to: cleanPhone,
                                type: 'text',
                                text: {
                                    preview_url: false,
                                    body: '¡Recibido! 💬 Un asesor de nuestro equipo de recepción te responderá a la brevedad por este medio.'
                                }
                            })
                        })
                    } catch (replyErr) {
                        console.error('Error al responder confirmación de recepcionista:', replyErr)
                    }
                }
                return NextResponse.json({ success: true })
            }

            // 4. Si el paciente seleccionó una categoría de triage de guardia 24hs
            if (buttonPayload.startsWith('TRIAGE_CAT_') && waCreds) {
                const categoria = buttonPayload.replace('TRIAGE_CAT_', '')
                const triageConfig = await getTriagePorCategoria(tenantId, categoria)
                const primerTurno = await buscarPrimerTurnoLibre(tenantId)

                if (triageConfig) {
                    await enviarTipsYPropuestaTurno(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        triageConfig,
                        primerTurno
                    )
                    return NextResponse.json({ success: true })
                }
            }

            // 5. Si el paciente confirma el turno propuesto de guardia
            if (buttonPayload.startsWith('CONFIRMAR_GUARDIA_') && waCreds) {
                const parts = buttonPayload.replace('CONFIRMAR_GUARDIA_', '').split('_')
                const fecha = parts[0] || ''
                const hora = parts[1] || ''

                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '✅ Turno de Urgencia Confirmado',
                    mensaje: `El paciente (+${cleanPhone}) confirmó turno de guardia para el ${fecha} a las ${hora} hs.`,
                    tipo: 'turno_confirmado',
                    referencia_id: conversacionId || '',
                    leida: false
                })

                try {
                    await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${waCreds.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
                            to: cleanPhone,
                            type: 'text',
                            text: {
                                preview_url: false,
                                body: `✅ *¡Turno de Urgencia Confirmado!*\n\nTe esperamos el día *${fecha} a las ${hora} hs* en Consultorio Álvarez.\n📍 Av. Rivadavia 1234.\n\nPor favor concurrí 5 minutos antes con tu DNI.\nCualquier consulta podés escribirnos directamente por este chat.`
                            }
                        })
                    })
                } catch (confErr) {
                    console.error('Error al responder confirmación de turno de guardia:', confErr)
                }
                return NextResponse.json({ success: true })
            }

            // 6. Si la conversación ya está en espera de un operador
            if (estadoConversacion === 'HUMANO_PENDIENTE') {
                console.log(`[WA WEBHOOK] Conversación ${conversacionId} en espera de operador. Bot en silencio.`)
                return NextResponse.json({ success: true })
            }

            // 7. Si es mensaje con palabras clave de urgencia / dolor, ofrecer menú de triage de guardia directamente
            const textToAnalyze = textBody || buttonTextFallback
            const esUrgencia = esMensajeDeUrgencia(textToAnalyze)

            if (esUrgencia && waCreds) {
                const categoriasTriage = await getTriageCategorias(tenantId)
                if (categoriasTriage.length > 0) {
                    console.log(`[WA WEBHOOK] Urgencia detectada de ${from} por palabras clave. Enviando menú de triage...`)
                    const enviado = await enviarMenuTriageWhatsApp(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        categoriasTriage
                    )
                    if (enviado) {
                        return NextResponse.json({ success: true })
                    }
                }
            }

            // 8. Para mensajes generales, saludos o consultas libres: Enviar Menú Principal con botones Quick Reply
            if (waCreds) {
                console.log(`[WA WEBHOOK] Enviando Menú Principal interactivo con botones a ${from}...`)
                const enviadoMenu = await enviarMenuPrincipalWhatsApp(
                    waCreds.phoneNumberId,
                    waCreds.accessToken,
                    cleanPhone
                )
                if (enviadoMenu) {
                    return NextResponse.json({ success: true })
                }
            }

            // 9. Fallback defensivo habitual (manteniendo el comportamiento histórico intacto)
            console.log(`[WA WEBHOOK] Enviando auto-respuesta habitual a ${from}...`)
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

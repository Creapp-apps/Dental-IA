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
    enviarTipsYPropuestaTurno,
    agendarTurnoGuardiaWhatsApp
} from '@/lib/whatsapp-guardia'
import { procesarMensajeAutonomo, enviarTextoWhatsApp, enviarBotonesWhatsApp } from '@/lib/whatsapp-auto-flow'
import { debeEstampar, MOTIVOS, type Prioridad } from '@/lib/mensajes/triage'


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

/**
 * Registra en el inbox (whatsapp_mensajes) un mensaje interactivo que el bot
 * envió en el flujo de guardia (menú de triage, tips). Sin esto el admin ve el
 * chat incompleto: el paciente recibía el menú/tips por WhatsApp pero el panel
 * no mostraba nada, y parecía que "el protocolo no hizo nada".
 */
async function registrarMensajeBotGuardia(
    tenantId: string,
    conversacionId: string | null,
    contenido: string,
    waMessageId: string | null,
    accion: string
) {
    if (!conversacionId) return
    try {
        const admin = createAdminClient()
        await admin.from('whatsapp_mensajes').insert({
            tenant_id: tenantId,
            conversacion_id: conversacionId,
            tipo: 'interactivo',
            remitente: 'bot',
            contenido,
            wa_message_id: waMessageId,
            estado_envio: 'enviado',
            metadata: { accion }
        })
        await admin.from('whatsapp_conversaciones').update({
            ultimo_mensaje_at: new Date().toISOString(),
            ultimo_mensaje_texto: `🤖 ${contenido.slice(0, 80)}`,
        }).eq('id', conversacionId)
    } catch (err) {
        console.error('[WA GUARDIA] No se pudo registrar el mensaje del bot en el inbox:', err)
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

// Afirmaciones que, como respuesta a un recordatorio de turno, significan
// "confirmo asistencia". Normalizadas (min\u00fasculas, sin acentos ni signos).
// Antes muchas de estas s\u00f3lo recib\u00edan un cort\u00e9s "\u00a1Perfecto!" sin confirmar el turno.
const AFIRMACIONES_CONFIRMA = new Set([
    'si', 'sii', 'siii', 'sip', 'simon', 'si si', 'sisi', 'sep', 'dale', 'dale si',
    'ok', 'oka', 'okey', 'okis', 'okay', 'ok dale', 'dale ok', 'ok gracias', 'dale gracias',
    'listo', 'listo gracias', 'perfecto', 'perfe', 'perfecto dale', 'de una', 'genial',
    'barbaro', 'buenisimo', 'joya', 'excelente', 'obvio', 'obvio si', 'claro', 'claro que si',
    'por supuesto', 'de acuerdo', 'confirmo', 'confirmado', 'confirmar', 'si confirmo',
    'confirmo turno', 'confirmo mi turno', 'confirmo asistencia', 'asisto', 'si asisto',
    'asistire', 'si asistire', 'ahi estare', 'alli estare', 'ahi estoy', 'ahi voy', 'ahi vamos',
    'voy', 'si voy', 'cuenten conmigo', 'ahi estaremos', 'ahi nos vemos', 'nos vemos', 'buenisimo gracias',
])

// Emojis que, como respuesta a un recordatorio de turno, cuentan como confirmación:
// 👍 pulgar, 👌 ok, ✅ / ✔️ check, 🆗, 🙆 persona OK. Los modificadores de tono de
// piel siguen al emoji base, así que basta con detectar el codepoint base.
const EMOJI_CONFIRMA = /[\u{1F44D}\u{1F44C}\u{2705}\u{2714}\u{1F197}\u{1F646}]/u

// Emojis que, cuando el paciente REACCIONA (👍/❤️) al recordatorio, cuentan como
// confirmación de asistencia. Más amplio que EMOJI_CONFIRMA porque reaccionar con
// un corazón o aplausos es, en WhatsApp, un "sí, dale" natural. Solo emojis
// inequívocamente positivos: un 👎 o 😡 NO confirma (queda registrado sin accionar).
// 👍 👌 ✅ ✔️ 🆗 🙆 ❤️ 🙌 👏 💖 💕 😊 😁 😄 🙏 💪 🫡 💯 🤝
const EMOJI_REACCION_CONFIRMA = /[\u{1F44D}\u{1F44C}\u{2705}\u{2714}\u{1F197}\u{1F646}\u{2764}\u{1F64C}\u{1F44F}\u{1F496}\u{1F495}\u{1F60A}\u{1F601}\u{1F604}\u{1F64F}\u{1F4AA}\u{1FAE1}\u{1F4AF}\u{1F91D}]/u

// Preguntas por copago / coseguro: el bot no conoce el monto (depende de la obra
// social y el plan), así que no las responde: las acusa y deriva a administración.
const REGEX_COPAGO = /\bcopago|\bco-?pago|\bcoseguro|\bco-?seguro|\bco seguro|\bco pago\b/i

// Preguntas de ubicación / dirección (solo-lectura, suelen ser urgentes: el paciente
// va al turno). Deliberadamente SIN "horario" para no pisar "cambiar el horario".
const REGEX_UBICACION = /\bdireccion\b|\bubicacion\b|donde (estan|queda|quedan|esta|es el consultorio)|como (llego|llegar|se llega)|en que lugar|\bmapa\b|pasarias la direccion|ir hoy al turno/i

/** Link wa.me directo a la administración (teléfono del consultorio). */
async function linkWaAdministracion(admin: any, tenantId: string): Promise<string> {
    try {
        const { data: tnt } = await admin.from('tenants').select('telefono').eq('id', tenantId).maybeSingle()
        if (tnt?.telefono) {
            const norm = normalizarTelefonoArgentino(tnt.telefono)
            const waPhone = norm.startsWith('54') ? `549${norm.substring(2)}` : norm
            if (waPhone) return `https://wa.me/${waPhone}`
        }
    } catch {}
    return ''
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
            // button_reply = botones; list_reply = selección de un mensaje tipo lista
            // (ej: elegir profesional en consultorios con muchos profesionales).
            buttonPayload = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || ''
            buttonTextFallback = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ''
        } else if (type === 'text') {
            textBody = message.text?.body?.trim() || ''
        } else if (type === 'image') {
            textBody = message.image?.caption?.trim() || '📷 [Foto adjunta]'
        } else if (type === 'audio') {
            textBody = '🎙️ [Nota de voz]'
        } else if (type === 'video') {
            textBody = message.video?.caption?.trim() || '🎥 [Video adjunto]'
        } else if (type === 'document') {
            // No usamos el nombre del archivo como texto de intención: evita que una
            // fecha en el nombre (ej. "comprobante-15-10-2026.pdf") se interprete
            // como un DNI o dispare flujos equivocados.
            textBody = '📄 [Documento adjunto]'
        }

        // Resumen legible para reacciones y stickers: así el operador ve en la bandeja
        // "Reaccionó: 👍" en vez del placeholder genérico "Mensaje recibido".
        let resumenEntrante = ''
        if (type === 'reaction') {
            const emoji = message.reaction?.emoji || ''
            resumenEntrante = emoji ? `Reaccionó: ${emoji}` : 'Quitó su reacción'
        } else if (type === 'sticker') {
            resumenEntrante = '[Sticker]'
        }

        console.log(`📱 Mensaje recibido de ${from}. Tipo: ${type}. Payload: "${buttonPayload}". Texto: "${textBody}". Fallback de botón: "${buttonTextFallback}"`)

        // Instanciar cliente administrador para eludir RLS y operar en base de datos
        const admin = createAdminClient()

        // ── DEDUPE POR wa_message_id (RC3) ──
        // Meta reintenta la entrega del webhook; si ya procesamos este message id,
        // no lo reprocesamos (evita respuestas y acciones duplicadas).
        if (messageId) {
            const { data: yaProcesado } = await admin
                .from('whatsapp_mensajes')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('wa_message_id', messageId)
                .maybeSingle()
            if (yaProcesado) {
                console.log(`[WA WEBHOOK] Mensaje ${messageId} ya procesado antes. Ignorado por dedupe.`)
                return NextResponse.json({ success: true, message: 'Duplicate message ignored' })
            }
        }

        // Datos del consultorio para personalizar mensajes (multi-tenant, sin hardcodear Álvarez)
        const { data: tenantInfo } = await admin
            .from('tenants')
            .select('nombre, direccion, ciudad, slug')
            .eq('id', tenantId)
            .maybeSingle()
        const tenantSlug = tenantInfo?.slug || ''
        const nombreConsultorio = tenantInfo?.nombre || 'tu consultorio odontológico'
        const direccionConsultorio = tenantInfo?.direccion
            ? `${tenantInfo.direccion}${tenantInfo.ciudad ? `, ${tenantInfo.ciudad}` : ''}`
            : null

        // ── PERSISTENCIA DEFENSIVA DE CONVERSACIÓN Y MENSAJE (Fase 1 Handoff Humano) ──
        let conversacionId: string | null = null
        let estadoConversacion = 'BOT'
        let prioridadActual: Prioridad | null = null
        let motivoActual: string | null = null
        let reabrirConversacion = false

        try {
            const { data: conv } = await admin
                .from('whatsapp_conversaciones')
                .select('id, estado, no_leidos_operador, prioridad, motivo')
                .eq('tenant_id', tenantId)
                .eq('telefono', cleanPhone)
                .maybeSingle()

            if (conv) {
                conversacionId = conv.id
                estadoConversacion = conv.estado
                prioridadActual = (conv as any).prioridad ?? null
                motivoActual = (conv as any).motivo ?? null
                // Reapertura: si el chat se había auto-cerrado por inactividad y el
                // paciente vuelve a escribir, lo reactivamos (vuelve a la bandeja y el
                // bot lo gestiona). Se persiste en el UPDATE de abajo.
                if (conv.estado === 'CERRADO') {
                    estadoConversacion = 'BOT'
                    reabrirConversacion = true
                }
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
                        ultimo_mensaje_texto: textBody || buttonTextFallback || buttonPayload || resumenEntrante || 'Mensaje interactivo',
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
                    } else if (type === 'document' && message.document?.id) {
                        mediaUrl = await descargarYGuardarMediaWhatsApp(message.document.id, waCredsForMedia.accessToken, tenantId, 'pdf')
                    }
                }

                const tipoFinal = type === 'image'
                    ? 'imagen'
                    : type === 'audio'
                        ? 'audio'
                        : type === 'document'
                            ? 'documento'
                            : (type === 'button' || type === 'interactive' ? 'interactivo' : 'texto')

                await admin.from('whatsapp_mensajes').insert({
                    tenant_id: tenantId,
                    conversacion_id: conversacionId,
                    tipo: tipoFinal,
                    remitente: 'paciente',
                    contenido: textBody || buttonTextFallback || buttonPayload || resumenEntrante || 'Mensaje recibido',
                    wa_message_id: messageId,
                    metadata: { raw: message, media_url: mediaUrl, doc_filename: type === 'document' ? (message.document?.filename || null) : null }
                })

                await admin.from('whatsapp_conversaciones').update({
                    ultimo_mensaje_at: new Date().toISOString(),
                    ultimo_mensaje_texto: textBody || buttonTextFallback || buttonPayload || resumenEntrante || 'Mensaje recibido',
                    no_leidos_operador: (conv?.no_leidos_operador || 0) + 1,
                    // Reapertura de un chat auto-cerrado: vuelve a BOT y se limpia el triage.
                    ...(reabrirConversacion ? { estado: 'BOT', prioridad: null, motivo: null } : {})
                }).eq('id', conversacionId)
            }
        } catch (persistErr) {
            console.warn('[WA WEBHOOK] Advertencia de persistencia (tablas pendientes o error no bloqueante):', persistErr)
        }

        // ── RC2: Eventos NO accionables no disparan respuesta del bot ──
        // Stickers y eventos de sistema/errores quedan registrados en el inbox pero
        // NO generan ninguna respuesta automática. Las reacciones se tratan aparte
        // (abajo): un 👍/❤️ sobre el recordatorio SÍ confirma el turno.
        if (type === 'sticker' || type === 'system' || type === 'unsupported' || message.errors) {
            console.log(`[WA WEBHOOK] Evento no accionable (tipo "${type}"). Persistido sin responder.`)
            return NextResponse.json({ success: true, message: 'Non-actionable event, no reply' })
        }

        let turnoIdToUpdate = ''
        let respuestaPaciente: 'CONFIRMAR' | 'CANCELAR' | 'REPROGRAMAR' | null = null

        // Recordatorio "objetivo": el turno al que el paciente probablemente le está
        // respondiendo por texto. Antes se tomaba el ÚLTIMO recordatorio ENVIADO del
        // teléfono (podía ser de un turno viejo → confirmar el equivocado). Ahora lo
        // atamos al turno PENDIENTE más próximo (futuro) que tenga recordatorio enviado.
        // Memoizado: a lo sumo una consulta por webhook.
        let _objetivoCache: { turnoId: string; fechaInicio: string } | null | undefined
        const getRecordatorioObjetivo = async (): Promise<{ turnoId: string; fechaInicio: string } | null> => {
            if (_objetivoCache !== undefined) return _objetivoCache
            const { data: rems } = await admin
                .from('recordatorios')
                .select('turno_id')
                .eq('tenant_id', tenantId)
                .eq('telefono', cleanPhone)
                .eq('estado_envio', 'ENVIADO')
                .order('created_at', { ascending: false })
                .limit(20)
            const turnoIds = [...new Set((rems ?? []).map(r => r.turno_id).filter(Boolean))]
            if (turnoIds.length === 0) { _objetivoCache = null; return null }
            // Gracia de 2hs: un turno que acaba de empezar todavía es "confirmable".
            const graciaDesde = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            const { data: turnos } = await admin
                .from('turnos')
                .select('id, fecha_inicio')
                .in('id', turnoIds)
                .eq('tenant_id', tenantId)
                .eq('estado', 'PENDIENTE')
                .gte('fecha_inicio', graciaDesde)
                .order('fecha_inicio', { ascending: true })
                .limit(1)
            const t = turnos?.[0]
            _objetivoCache = t ? { turnoId: t.id, fechaInicio: t.fecha_inicio } : null
            return _objetivoCache
        }

        // 0. Reacción (👍/❤️) sobre el recordatorio = confirmación de asistencia.
        // Un emoji positivo cuenta como "sí, voy", igual que escribir "confirmo". Solo
        // confirma si hay un turno PENDIENTE próximo con recordatorio enviado (reusa la
        // misma lógica que el texto). Reacción negativa o sin turno objetivo: queda
        // registrada sin que el bot responda.
        if (type === 'reaction') {
            const emoji = message.reaction?.emoji || ''
            if (emoji && EMOJI_REACCION_CONFIRMA.test(emoji)) {
                const objetivo = await getRecordatorioObjetivo()
                if (objetivo?.turnoId) {
                    turnoIdToUpdate = objetivo.turnoId
                    respuestaPaciente = 'CONFIRMAR'
                    console.log(`[WA WEBHOOK] Reacción "${emoji}" interpretada como CONFIRMAR del turno ${objetivo.turnoId}.`)
                }
            }
            if (!turnoIdToUpdate || !respuestaPaciente) {
                console.log(`[WA WEBHOOK] Reacción "${emoji || '(removida)'}" sin acción (emoji no afirmativo o sin turno pendiente). Persistida sin responder.`)
                return NextResponse.json({ success: true, message: 'Reaction, no actionable intent' })
            }
            // Con la acción ya resuelta, saltamos el parseo de texto/botón y vamos al paso 3.
        }

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

                // Atar la respuesta al turno PENDIENTE más próximo con recordatorio enviado
                // (no al último recordatorio del teléfono, que podía ser de un turno viejo).
                const objetivo = await getRecordatorioObjetivo()

                if (objetivo?.turnoId) {
                    const matchesConfirm =
                        AFIRMACIONES_CONFIRMA.has(normalized) ||
                        normalized.includes('confirm') ||
                        EMOJI_CONFIRMA.test(textToAnalyze) ||
                        (normalized.startsWith('si ') && normalized.length <= 15);

                    const matchesReprogram =
                        normalized.includes('reprogram') ||
                        normalized.includes('cambi') ||
                        normalized.includes('modif') ||
                        normalized.includes('otro horario') ||
                        normalized.includes('otro dia') ||
                        normalized.includes('otra fecha') ||
                        normalized.includes('mas horario') ||
                        normalized.includes('a partir del') ||
                        normalized.includes('re programar') ||
                        normalized.includes('reprogramar el turno');

                    // RC1: CANCELAR solo con lenguaje EXPLÍCITO de cancelación.
                    // Los síntomas / excusas ("fiebre", "no llego", "se me complica",
                    // "accidente", etc.) NO cancelan acá: caen al auto-flow que ofrece
                    // botones para que el paciente elija (sin acción en falso).
                    // "no cancelar" / "cancelar para reprogramar" NO cuentan como cancelar.
                    const matchesCancel =
                        !matchesReprogram && (
                            normalized === 'no' ||
                            normalized === 'no asisto' ||
                            normalized === 'no, cancelar' ||
                            normalized.includes('anular') ||
                            normalized.includes('dar de baja') ||
                            (normalized.includes('cancel') && !normalized.includes('no cancel'))
                        );

                    if (matchesConfirm) {
                        turnoIdToUpdate = objetivo.turnoId
                        respuestaPaciente = 'CONFIRMAR'
                    } else if (matchesReprogram) {
                        turnoIdToUpdate = objetivo.turnoId
                        respuestaPaciente = 'REPROGRAMAR'
                    } else if (matchesCancel) {
                        // NUNCA cancelamos un turno desde texto libre: puede ser una
                        // condicional o pregunta (ej. "¿si pago copago? cancelo turno").
                        // Ofrecemos los botones para que el paciente elija explícitamente.
                        const creds = await getWhatsAppCredentialsForTenant(tenantId)
                        if (creds) {
                            const fechaTurno = new Date(objetivo.fechaInicio).toLocaleString('es-AR', {
                                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                                timeZone: 'America/Argentina/Buenos_Aires'
                            })
                            await enviarBotonesWhatsApp(creds, cleanPhone,
                                `Sobre tu turno del *${fechaTurno} hs* 👇\n¿Qué querés hacer?`,
                                [
                                    { id: `CONFIRMAR_TURNO_${objetivo.turnoId}`, title: '✅ Mantenerlo' },
                                    { id: `REPROGRAMAR_TURNO_${objetivo.turnoId}`, title: '🔄 Reprogramar' },
                                    { id: `CANCELAR_TURNO_${objetivo.turnoId}`, title: '❌ Cancelar' },
                                ],
                                conversacionId ? { tenantId, conversacionId, accion: 'cancelar_ofrece_botones' } : undefined
                            )
                            return NextResponse.json({ success: true })
                        }
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

            // ── DEDUPE ANTI RAGE-CLICK ──
            // El dedupe por wa_message_id (arriba) solo frena reintentos de Meta del
            // MISMO mensaje. Si el paciente toca el botón "Si, confirmo" varias veces,
            // son mensajes distintos: cada uno reconfirmaba y re-enviaba plantilla +
            // notificación (se vieron 6 confirmaciones del mismo turno). Si el último
            // recordatorio de este turno ya fue respondido con la MISMA acción, es un
            // reclick: lo ignoramos (no re-notificamos ni re-despachamos plantilla).
            const { data: ultimoRecordatorio } = await admin
                .from('recordatorios')
                .select('estado_envio, respuesta_paciente')
                .eq('turno_id', turnoIdToUpdate)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (ultimoRecordatorio?.estado_envio === 'RESPONDIDO' &&
                ultimoRecordatorio?.respuesta_paciente === respuestaPaciente) {
                console.log(`[WA WEBHOOK] Reclick de "${respuestaPaciente}" en turno ${turnoIdToUpdate} ya respondido. Ignorado (anti rage-click).`)
                return NextResponse.json({ success: true, message: 'Duplicate action ignored' })
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

            // Triage de bandeja: turno confirmado = "bajo control" (verde).
            // Resolvemos la conversación cuando el paciente confirma, en dos casos:
            //  - estado BOT: el bot sigue gestionando, lo marcamos verde/confirmado.
            //  - estado HUMANO_PENDIENTE pero SIN motivo real (el cajón genérico que la
            //    bandeja muestra como "📋 Revisar"): la confirmación lo resuelve, así que
            //    lo sacamos de pendiente (estado BOT) y lo marcamos verde/confirmado.
            // NO tocamos: una conversación que un humano atiende (HUMANO_ATENDIENDO), un
            // pendiente ROJO (urgencia/queja/guardia), ni un pendiente con motivo real
            // (adjunto, dato clínico, etc.), para no tapar algo que de verdad requiere acción.
            if (respuestaPaciente === 'CONFIRMAR' && conversacionId && estadoConversacion !== 'HUMANO_ATENDIENDO') {
                const motivoEsGenerico = !motivoActual || !MOTIVOS[motivoActual] || motivoActual === 'revisar'
                const resolver =
                    estadoConversacion === 'BOT' ||
                    (estadoConversacion === 'HUMANO_PENDIENTE' && motivoEsGenerico && prioridadActual !== 'rojo')
                if (resolver) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'BOT', prioridad: 'verde', motivo: 'turno_confirmado' })
                        .eq('id', conversacionId)
                }
            }

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

                // ACK anti-silencio: si la plantilla falló (p. ej. #132001 plantilla en
                // revisión, o #131047 fuera de ventana), el paciente se queda sin acuse y
                // parece que "el bot no respondió". Como su propio mensaje abre la ventana
                // de 24hs, reintentamos con TEXTO LIBRE para que SIEMPRE reciba confirmación.
                const { data: ultimoRecEnvio } = await admin
                    .from('recordatorios')
                    .select('estado_envio')
                    .eq('turno_id', turnoIdToUpdate)
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (ultimoRecEnvio?.estado_envio === 'FALLIDO') {
                    const creds = await getWhatsAppCredentialsForTenant(tenantId)
                    if (creds) {
                        const ackTexto =
                            respuestaPaciente === 'CONFIRMAR'
                                ? '✅ ¡Listo! Tu turno quedó *confirmado*. ¡Te esperamos! 🦷'
                                : respuestaPaciente === 'CANCELAR'
                                    ? 'Tu turno fue *cancelado*. Si querés reprogramar, escribinos por acá cuando quieras. 🦷'
                                    : 'Recibimos tu pedido de *reprogramación* 🙏 Un asesor de recepción te va a contactar a la brevedad por este chat.'
                        console.log(`[WA WEBHOOK] Plantilla "${templateName}" falló. Enviando ACK por texto libre.`)
                        await enviarTextoWhatsApp(creds, cleanPhone, ackTexto,
                            conversacionId ? { tenantId, conversacionId, accion: 'ack_texto_fallback' } : undefined)
                    }
                }
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
                        prioridad: 'verde',
                        motivo: notifTipo === 'turno_confirmado' ? 'turno_confirmado' : notifTipo === 'turno_cancelado' ? 'turno_cancelado' : 'turno_reprogramado_real',
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
                    const horaStr = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
                    
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

            // Triage no-degradante: estos handlers de botón corren ANTES del early-return
            // de HUMANO_PENDIENTE, así que pueden ejecutarse sobre un pendiente ya activo.
            // Sólo estampamos prioridad/motivo si la nueva prioridad NO es menor que la
            // actual (p. ej. "pide recepción" amarillo no pisa una urgencia roja activa).
            // El cambio de estado y el resto de campos del UPDATE se mantienen siempre.
            const camposTriageNoDegradante = (nueva: Prioridad, motivoNuevo: string): { prioridad?: Prioridad; motivo?: string } =>
                debeEstampar(prioridadActual, nueva) ? { prioridad: nueva, motivo: motivoNuevo } : {}

            // RC4: deriva una urgencia/dolor a un humano cuando NO hay triage
            // configurado. Nunca dejamos un dolor en el menú genérico ni en silencio.
            const derivarUrgenciaAHumano = async (motivoTexto: string) => {
                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', ...camposTriageNoDegradante('rojo', 'urgencia'), updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                }
                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '🚨 Urgencia / Dolor — atención inmediata',
                    mensaje: `Paciente (+${cleanPhone}): "${(motivoTexto || '').slice(0, 120)}"`,
                    tipo: 'turno_reprogramado',
                    referencia_id: conversacionId || '',
                    prioridad: 'rojo',
                    motivo: 'urgencia',
                    leida: false
                })
                try {
                    const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                    await sendPushToRole('admin', tenantId, '🚨 Urgencia odontológica', `Paciente (+${cleanPhone}) reporta dolor/urgencia por WhatsApp.`, '/mensajes')
                    await sendPushToRole('profesional', tenantId, '🚨 Urgencia odontológica', `Paciente (+${cleanPhone}) reporta dolor/urgencia por WhatsApp.`, '/mensajes')
                } catch {}
                if (waCreds) {
                    await enviarTextoWhatsApp(waCreds, cleanPhone,
                        `🚨 Recibimos tu urgencia. Un profesional de nuestro equipo te va a contactar lo antes posible por este chat.\n\nSi el dolor es muy intenso o hay sangrado que no cede, por favor acercate a una guardia médica.`,
                        conversacionId ? { tenantId, conversacionId, accion: 'urgencia_derivada_humano' } : undefined
                    )
                }
            }

            // 2. Si el paciente presiona el botón "🚨 Urgencia / Guardia"
            if (buttonPayload === 'ACTIVAR_GUARDIA_URGENCIA' && waCreds) {
                console.log(`[WA WEBHOOK] Paciente ${from} activó protocolo de Guardia por botón Quick Reply.`)

                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '🚨 Protocolo de Guardia Activado',
                    mensaje: `El paciente (+${cleanPhone}) activó la Guardia Odontológica por WhatsApp.`,
                    tipo: 'turno_reprogramado',
                    referencia_id: conversacionId || '',
                    prioridad: 'rojo',
                    motivo: 'guardia',
                    leida: false
                })

                // Despachar Push Notification a administradores y profesionales
                try {
                    const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                    await sendPushToRole('admin', tenantId, '🚨 Guardia Odontológica Activada', `Paciente (+${cleanPhone}) activó la guardia por WhatsApp.`, '/mensajes')
                    await sendPushToRole('profesional', tenantId, '🚨 Guardia Odontológica Activada', `Paciente (+${cleanPhone}) activó la guardia por WhatsApp.`, '/mensajes')
                } catch (pushErr) {
                    console.error('Error al despachar push de guardia:', pushErr)
                }

                const categoriasTriage = await getTriageCategorias(tenantId)
                if (categoriasTriage.length > 0) {
                    const envio = await enviarMenuTriageWhatsApp(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        categoriasTriage
                    )
                    if (envio.ok) {
                        await registrarMensajeBotGuardia(tenantId, conversacionId, envio.texto, envio.waMessageId, 'menu_triage_guardia')
                        return NextResponse.json({ success: true })
                    }
                    // Si el envío del menú falló, no dejamos la urgencia sin respuesta:
                    // caemos a la derivación a humano de abajo.
                }
                // RC4: sin triage configurado (o si falló el envío), no caemos al
                // menú genérico: derivamos la urgencia a un humano.
                await derivarUrgenciaAHumano('Activó el botón de Urgencia / Guardia')
                return NextResponse.json({ success: true })
            }

            // 3. Si el paciente solicita hablar con una recepcionista
            if (buttonPayload === 'HABLAR_RECEPCIONISTA') {
                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', ...camposTriageNoDegradante('amarillo', 'pide_recepcion'), updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                }

                await admin.from('notificaciones').insert({
                    tenant_id: tenantId,
                    titulo: '💬 Paciente solicita Recepción',
                    mensaje: `El paciente (+${cleanPhone}) solicitó atención personalizada por WhatsApp.`,
                    tipo: 'turno_reprogramado',
                    referencia_id: conversacionId || '',
                    prioridad: 'amarillo',
                    motivo: 'pide_recepcion',
                    leida: false
                })

                // Despachar Push Notification a administradores (recepción)
                try {
                    const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                    await sendPushToRole('admin', tenantId, '💬 Solicitud de Recepción', `Paciente (+${cleanPhone}) solicitó hablar con recepción por WhatsApp.`, '/mensajes')
                } catch (pushErr) {
                    console.error('Error al despachar push de recepción:', pushErr)
                }

                if (waCreds) {
                    try {
                        const textoRecepcion = '¡Recibido! 💬 Un asesor de nuestro equipo de recepción te responderá a la brevedad por este medio.'
                        const res = await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
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
                                    body: textoRecepcion
                                }
                            })
                        })
                        const resData = await res.json()
                        if (conversacionId) {
                            await admin.from('whatsapp_mensajes').insert({
                                tenant_id: tenantId,
                                conversacion_id: conversacionId,
                                tipo: 'texto',
                                remitente: 'bot',
                                contenido: textoRecepcion,
                                wa_message_id: resData?.messages?.[0]?.id || null,
                                estado_envio: 'enviado',
                                metadata: { accion: 'derivado_recepcion' }
                            })
                            await admin.from('whatsapp_conversaciones').update({
                                ultimo_mensaje_at: new Date().toISOString(),
                                ultimo_mensaje_texto: `🤖 ${textoRecepcion.slice(0, 80)}`,
                            }).eq('id', conversacionId)
                        }
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
                    const envio = await enviarTipsYPropuestaTurno(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        triageConfig,
                        primerTurno
                    )
                    if (envio.ok) {
                        await registrarMensajeBotGuardia(tenantId, conversacionId, envio.texto, envio.waMessageId, 'tips_guardia')
                        return NextResponse.json({ success: true })
                    }
                    // Falló el envío de los tips: derivamos a un humano para no
                    // dejar al paciente en urgencia sin ninguna respuesta.
                    await derivarUrgenciaAHumano(`Seleccionó triage "${categoria}" pero no se pudieron enviar los consejos`)
                    return NextResponse.json({ success: true })
                }
            }

            // 5. Si el paciente confirma el turno propuesto de guardia
            if (buttonPayload.startsWith('CONFIRMAR_GUARDIA_') && waCreds) {
                const parts = buttonPayload.replace('CONFIRMAR_GUARDIA_', '').split('_')
                const fecha = parts[0] || ''
                const hora = parts[1] || ''
                // Formatear la fecha cruda YYYY-MM-DD a algo legible en español.
                let fechaLegible = fecha
                try {
                    const d = new Date(`${fecha}T12:00:00-03:00`)
                    if (!isNaN(d.getTime())) {
                        const f = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
                        fechaLegible = f.charAt(0).toUpperCase() + f.slice(1)
                    }
                } catch {}

                // D: agenda de verdad el turno de guardia (sobreturno prioritario,
                // PENDIENTE) con el primer profesional libre; crea la ficha del
                // paciente si no existía. Siempre deja la conversación en espera de
                // un humano para que recepción valide.
                const agend = await agendarTurnoGuardiaWhatsApp({ tenantId, tenantSlug, telefono: cleanPhone, fecha, hora })

                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', ...camposTriageNoDegradante('rojo', 'guardia'), updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                }

                if (agend.ok) {
                    await admin.from('notificaciones').insert({
                        tenant_id: tenantId,
                        titulo: '🚨 Turno de guardia agendado',
                        mensaje: `Guardia: se reservó un sobreturno prioritario para +${cleanPhone} el ${fechaLegible} a las ${hora} hs. Revisar y confirmar con el paciente.`,
                        tipo: 'turno_nuevo',
                        referencia_id: agend.turnoId,
                        prioridad: 'rojo',
                        motivo: 'guardia',
                        leida: false
                    })
                    try {
                        const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                        await sendPushToRole('admin', tenantId, '🚨 Turno de guardia agendado', `Sobreturno prioritario +${cleanPhone} ${fechaLegible} ${hora} hs. Confirmar.`, '/agenda')
                    } catch {}
                    revalidatePath('/agenda')
                } else {
                    // No se pudo agendar automático (sin profesional libre u otro
                    // problema): dejamos la urgencia para que recepción la cargue.
                    await admin.from('notificaciones').insert({
                        tenant_id: tenantId,
                        titulo: '🚨 Guardia — agendar turno prioritario',
                        mensaje: `El paciente (+${cleanPhone}) eligió el horario de guardia ${fechaLegible} a las ${hora} hs, pero no se pudo agendar automático (${agend.motivo}). Cargar el turno a mano.`,
                        tipo: 'turno_reprogramado',
                        referencia_id: conversacionId || '',
                        prioridad: 'rojo',
                        motivo: 'guardia',
                        leida: false
                    })
                    try {
                        const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                        await sendPushToRole('admin', tenantId, '🚨 Urgencia a agendar', `Paciente (+${cleanPhone}) eligió guardia ${fechaLegible} ${hora} hs.`, '/mensajes')
                    } catch {}
                }

                try {
                    const lineaDireccion = direccionConsultorio ? `\n📍 ${direccionConsultorio}.` : ''
                    const textoGuardia = agend.ok
                        ? `🚨 *¡Recibimos tu urgencia!*\n\nReservamos tu turno prioritario para el *${fechaLegible} a las ${hora} hs* en ${nombreConsultorio}.${lineaDireccion}\n\nUna recepcionista te va a *confirmar* por este chat a la brevedad. Por favor concurrí 5 minutos antes con tu DNI.`
                        : `🚨 *¡Recibimos tu urgencia!*\n\nRegistramos tu pedido para el *${fechaLegible} a las ${hora} hs* en ${nombreConsultorio}.${lineaDireccion}\n\nUna recepcionista te va a *contactar* por este chat para confirmarte el turno a la brevedad.`
                    const res = await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
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
                                body: textoGuardia
                            }
                        })
                    })
                    const resJson = await res.json()
                    if (conversacionId) {
                        await admin.from('whatsapp_mensajes').insert({
                            tenant_id: tenantId,
                            conversacion_id: conversacionId,
                            tipo: 'texto',
                            remitente: 'bot',
                            contenido: textoGuardia,
                            wa_message_id: resJson?.messages?.[0]?.id || null,
                            estado_envio: 'enviado',
                            metadata: { accion: 'confirmacion_guardia', turnoId: agend.ok ? agend.turnoId : null }
                        })
                        await admin.from('whatsapp_conversaciones').update({
                            ultimo_mensaje_at: new Date().toISOString(),
                            ultimo_mensaje_texto: `🤖 ${textoGuardia.slice(0, 80)}`,
                        }).eq('id', conversacionId)
                    }
                } catch (confErr) {
                    console.error('Error al responder confirmación de turno de guardia:', confErr)
                }
                return NextResponse.json({ success: true })
            }

            // 6. Si la conversación ya está en espera de un operador: el bot calla, pero
            //    avisamos (push) cuando el paciente vuelve a escribir, para que no se pierda
            //    el ida y vuelta. Debounce: a lo sumo 1 aviso cada 5 min por conversación.
            if (estadoConversacion === 'HUMANO_PENDIENTE') {
                // Excepción al silencio: una FAQ de ubicación/dirección es solo-lectura y
                // suele ser urgente (el paciente va al turno). La respondemos aunque el
                // chat esté esperando a recepción, sin cambiar el estado. (HUMANO_ATENDIENDO
                // ya retornó antes, así que acá nadie está atendiendo activamente.)
                const textoPend = normalizeTextForMatch(textBody || buttonTextFallback || '')
                if (waCreds && REGEX_UBICACION.test(textoPend)) {
                    const { data: tnt } = await admin
                        .from('tenants').select('nombre, direccion, ciudad').eq('id', tenantId).maybeSingle()
                    const direccionClinica = tnt?.direccion
                        ? `${tnt.direccion}${tnt.ciudad ? `, ${tnt.ciudad}` : ''}`
                        : null
                    if (direccionClinica) {
                        const msgUbic = `📍 *Ubicación de ${tnt?.nombre || 'nuestro consultorio'}*\n\n` +
                            `Estamos en: *${direccionClinica}*.\n\n` +
                            `🕐 *Horarios de atención:*\n` +
                            `• Lunes a Viernes de 09:00 a 20:00 hs.\n` +
                            `• Sábados de 09:00 a 13:00 hs.`
                        console.log(`[WA WEBHOOK] FAQ de ubicación respondida en estado pending (sin tapar al humano).`)
                        await enviarTextoWhatsApp(waCreds, cleanPhone, msgUbic,
                            conversacionId ? { tenantId, conversacionId, accion: 'faq_ubicacion_en_pending' } : undefined)
                        return NextResponse.json({ success: true })
                    }
                }

                console.log(`[WA WEBHOOK] Conversación ${conversacionId} en espera de operador. Bot en silencio.`)
                if (conversacionId) {
                    try {
                        const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString()
                        const { count: avisosRecientes } = await admin
                            .from('notificaciones')
                            .select('id', { count: 'exact', head: true })
                            .eq('referencia_id', conversacionId)
                            .gte('created_at', hace5min)
                        if ((avisosRecientes ?? 0) === 0) {
                            await admin.from('notificaciones').insert({
                                tenant_id: tenantId,
                                titulo: '💬 Paciente esperando respuesta',
                                mensaje: `El paciente (+${cleanPhone}) escribió de nuevo y espera atención: "${(textBody || buttonTextFallback || '').slice(0, 120)}"`,
                                tipo: 'turno_reprogramado',
                                referencia_id: conversacionId,
                                prioridad: 'amarillo',
                                motivo: 'revisar',
                                leida: false
                            })
                            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                            await sendPushToRole('admin', tenantId, '💬 Paciente esperando respuesta', `Paciente (+${cleanPhone}) escribió de nuevo por WhatsApp.`, '/mensajes')
                        }
                    } catch {}
                }
                return NextResponse.json({ success: true })
            }

            // 7. Si es mensaje con palabras clave de urgencia / dolor, ofrecer menú de triage de guardia directamente
            const textToAnalyze = textBody || buttonTextFallback
            const esUrgencia = esMensajeDeUrgencia(textToAnalyze)

            if (esUrgencia && waCreds) {
                const categoriasTriage = await getTriageCategorias(tenantId)
                if (categoriasTriage.length > 0) {
                    console.log(`[WA WEBHOOK] Urgencia detectada de ${from} por palabras clave. Enviando menú de triage...`)
                    const envio = await enviarMenuTriageWhatsApp(
                        waCreds.phoneNumberId,
                        waCreds.accessToken,
                        cleanPhone,
                        categoriasTriage
                    )
                    if (envio.ok) {
                        await registrarMensajeBotGuardia(tenantId, conversacionId, envio.texto, envio.waMessageId, 'menu_triage_guardia')
                        return NextResponse.json({ success: true })
                    }
                }
                // RC4: urgencia/dolor SIN triage configurado (o si falló el envío) no
                // debe terminar en el menú genérico: se deriva a un humano con acuse.
                console.log(`[WA WEBHOOK] Urgencia de ${from} sin triage disponible. Derivando a humano.`)
                await derivarUrgenciaAHumano(textToAnalyze)
                return NextResponse.json({ success: true })
            }

            // 7b. Consulta por copago / coseguro: el bot NO conoce el monto (varía por
            // obra social y plan). La acusa, deriva a administración con el link directo
            // y deja el chat en la bandeja para que recepción responda.
            if (REGEX_COPAGO.test(textToAnalyze) && waCreds) {
                console.log(`[WA WEBHOOK] Consulta de copago/coseguro de ${from}. Derivando a administración.`)
                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', ...camposTriageNoDegradante('amarillo', 'pide_recepcion'), updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                    await admin.from('notificaciones').insert({
                        tenant_id: tenantId,
                        titulo: '💬 Consulta de copago — responder',
                        mensaje: `Paciente (+${cleanPhone}) pregunta por copago/coseguro: "${(textToAnalyze || '').slice(0, 120)}"`,
                        tipo: 'turno_reprogramado',
                        referencia_id: conversacionId || '',
                        prioridad: 'amarillo',
                        motivo: 'pide_recepcion',
                        leida: false
                    })
                    try {
                        const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                        await sendPushToRole('admin', tenantId, '💬 Consulta de copago', `Paciente (+${cleanPhone}) pregunta por copago.`, '/mensajes')
                    } catch {}
                }
                const linkAdmin = await linkWaAdministracion(admin, tenantId)
                const msgCopago = linkAdmin
                    ? `El copago depende de tu obra social y plan 💳\n\nPara darte el monto exacto, comunicate con administración por este link y te lo confirman:\n${linkAdmin}`
                    : `El copago depende de tu obra social y plan 💳 Una persona de administración te va a confirmar el monto a la brevedad por este chat.`
                await enviarTextoWhatsApp(waCreds, cleanPhone, msgCopago,
                    conversacionId ? { tenantId, conversacionId, accion: 'consulta_copago_derivada' } : undefined)
                return NextResponse.json({ success: true })
            }

            // 8. Procesamiento conversacional autónomo (DNI, Turnos, FAQs de Ubicación/Precios/Obras Sociales, Menús)
            if (waCreds) {
                const autoRes = await procesarMensajeAutonomo({
                    tenantId,
                    fromPhone: cleanPhone,
                    textBody: textToAnalyze || '',
                    buttonPayload,
                    creds: waCreds,
                    conversacionId: conversacionId || undefined
                })

                if (autoRes.handled) {
                    console.log(`[WA WEBHOOK] Mensaje auto-resuelto por bot: ${autoRes.action}`)
                    return NextResponse.json({ success: true })
                }

                // Red de seguridad: el bot NO supo resolver el texto, pero el paciente tiene
                // un turno PENDIENTE con recordatorio. En vez del menú genérico, le
                // re-mostramos los botones del turno (Confirmar/Reprogramar/Cancelar) para
                // recuperar la intención de quien escribió a mano en vez de tocar el botón.
                // Debounce: a lo sumo 1 re-prompt cada 10 min por conversación.
                const objetivoNet = await getRecordatorioObjetivo()
                if (objetivoNet && conversacionId) {
                    const desdeReprompt = new Date(Date.now() - 10 * 60 * 1000).toISOString()
                    const { count: repromptsRecientes } = await admin
                        .from('whatsapp_mensajes')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversacion_id', conversacionId)
                        .eq('remitente', 'bot')
                        .contains('metadata', { accion: 'reprompt_botones_turno' })
                        .gte('created_at', desdeReprompt)

                    if ((repromptsRecientes ?? 0) === 0) {
                        const fechaTurno = new Date(objetivoNet.fechaInicio).toLocaleString('es-AR', {
                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                            timeZone: 'America/Argentina/Buenos_Aires'
                        })
                        console.log(`[WA WEBHOOK] Texto no resuelto con turno pendiente. Re-mostrando botones del turno ${objetivoNet.turnoId}.`)
                        await enviarBotonesWhatsApp(waCreds, cleanPhone,
                            `Sobre tu turno del *${fechaTurno} hs* 👇\n¿Qué querés hacer?`,
                            [
                                { id: `CONFIRMAR_TURNO_${objetivoNet.turnoId}`, title: '✅ Confirmar' },
                                { id: `REPROGRAMAR_TURNO_${objetivoNet.turnoId}`, title: '🔄 Reprogramar' },
                                { id: `CANCELAR_TURNO_${objetivoNet.turnoId}`, title: '❌ Cancelar' },
                            ],
                            { tenantId, conversacionId, accion: 'reprompt_botones_turno' }
                        )
                        return NextResponse.json({ success: true })
                    }
                }

                // El bot no entendió el mensaje (auto-flow no lo resolvió y no había
                // turno pendiente para re-ofrecer botones). Al PRIMER intento sin
                // entender derivamos directo a administración con el link — sin menú ni
                // reintentos, para no generar fricción ni loops.
                console.log(`[WA WEBHOOK] Bot no entendió el mensaje de ${from}. Derivando a administración (1er intento).`)
                if (conversacionId) {
                    await admin.from('whatsapp_conversaciones')
                        .update({ estado: 'HUMANO_PENDIENTE', prioridad: 'amarillo', motivo: 'bot_no_entendio', updated_at: new Date().toISOString() })
                        .eq('id', conversacionId)
                    await admin.from('notificaciones').insert({
                        tenant_id: tenantId,
                        titulo: '💬 El bot no pudo ayudar — derivar',
                        mensaje: `Paciente (+${cleanPhone}) escribió algo que el bot no entendió. Mensaje: "${(textBody || buttonTextFallback || '').slice(0, 120)}"`,
                        tipo: 'turno_reprogramado',
                        referencia_id: conversacionId || '',
                        prioridad: 'amarillo',
                        motivo: 'bot_no_entendio',
                        leida: false
                    })
                    try {
                        const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                        await sendPushToRole('admin', tenantId, '💬 El bot no pudo ayudar', `Paciente (+${cleanPhone}) necesita atención: "${(textBody || buttonTextFallback || '').slice(0, 80)}"`, '/mensajes')
                    } catch {}
                }
                if (waCreds) {
                    // Link wa.me directo a la administración/secretaria (teléfono del
                    // consultorio). Le damos al paciente una salida clara en lugar de
                    // dejarlo esperando o repetir un menú que no lo ayudó.
                    let linkSecretaria = ''
                    try {
                        const { data: tnt } = await admin
                            .from('tenants').select('telefono').eq('id', tenantId).maybeSingle()
                        if (tnt?.telefono) {
                            const norm = normalizarTelefonoArgentino(tnt.telefono)
                            const waPhone = norm.startsWith('54') ? `549${norm.substring(2)}` : norm
                            if (waPhone) linkSecretaria = `https://wa.me/${waPhone}`
                        }
                    } catch {}

                    const msgDerivacion = linkSecretaria
                        ? `No pude ayudarte esta vez 🙏\n\nPor favor comunicate directo con administración por este link y te atiende una persona de nuestro equipo:\n${linkSecretaria}`
                        : `No pude ayudarte esta vez 🙏 Ya avisé a una persona de nuestro equipo para que te responda a la brevedad por este chat.`

                    await enviarTextoWhatsApp(waCreds, cleanPhone, msgDerivacion,
                        conversacionId ? { tenantId, conversacionId, accion: 'derivado_por_loop' } : undefined
                    )
                }
                return NextResponse.json({ success: true })
            }

            console.log(`[WA WEBHOOK] Mensaje procesado para ${from}.`)
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

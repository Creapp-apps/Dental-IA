import { createAdminClient } from '@/lib/supabase/admin'
import { esMensajeDeUrgencia, getTriageCategorias, enviarMenuTriageWhatsApp } from '@/lib/whatsapp-guardia'
import { getTurnosDisponibles, crearReservaPublica, getProfesionalesPublicos } from '@/lib/actions/reservas'

export interface WhatsAppCreds {
    phoneNumberId: string
    accessToken: string
}

interface EstadoReservaConversacional {
    paso: 'PIDIENDO_PROFESIONAL' | 'PIDIENDO_NOMBRE' | 'PIDIENDO_DNI' | 'SLOTS_OFRECIDOS'
    fecha: string
    hora: string
    fechaLegible: string
    nombre?: string
    apellido?: string
    // Profesional elegido por el paciente (el cliente exige elegirlo antes de ver horarios).
    profesionalId?: string | null
    profesionalNombre?: string
    // Slots que se le ofrecieron (para mapear respuestas numéricas "1/2/3").
    slots?: { payload: string }[]
    expiresAt: number
}

// RC8: el estado de la reserva conversacional se persiste por conversación en
// whatsapp_conversaciones.reserva_contexto (jsonb). Antes era un Map en memoria
// del proceso, que en serverless se pierde entre requests y cortaba el flujo.
async function getReservaCtx(admin: any, conversacionId?: string): Promise<EstadoReservaConversacional | null> {
    if (!conversacionId) return null
    try {
        const { data } = await admin
            .from('whatsapp_conversaciones')
            .select('reserva_contexto')
            .eq('id', conversacionId)
            .maybeSingle()
        const ctx = (data?.reserva_contexto || null) as EstadoReservaConversacional | null
        if (ctx && typeof ctx.expiresAt === 'number' && ctx.expiresAt > Date.now()) return ctx
        return null
    } catch { return null }
}

async function setReservaCtx(admin: any, conversacionId: string | undefined, ctx: EstadoReservaConversacional | null) {
    if (!conversacionId) return
    try {
        await admin
            .from('whatsapp_conversaciones')
            .update({ reserva_contexto: ctx })
            .eq('id', conversacionId)
    } catch { /* no bloqueante */ }
}

/**
 * Normaliza texto para análisis de intenciones (minúsculas, sin acentos ni signos raros).
 */
export function normalizarTexto(txt: string): string {
    if (!txt) return ''
    return txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

/**
 * Extrae números limpios si el mensaje aparenta ser un DNI argentino (7 a 8 dígitos).
 */
export function extraerDni(texto: string): string | null {
    if (!texto) return null
    const soloNumeros = texto.replace(/\D/g, '')
    if (soloNumeros.length >= 7 && soloNumeros.length <= 8) {
        return soloNumeros
    }
    return null
}

/**
 * Limpia y formatea un nombre ingresado por el usuario.
 */
function limpiarNombreYApellido(input: string): { nombre: string; apellido: string } {
    let limpio = input.trim()
    // Remover frases comunes introductorias
    limpio = limpio.replace(/^(soy|me llamo|mi nombre es|hola soy|hola me llamo)\s+/i, '').trim()

    const partes = limpio.split(/\s+/).filter(Boolean)
    if (partes.length === 0) {
        return { nombre: 'Paciente', apellido: 'Consulta' }
    }
    if (partes.length === 1) {
        const n = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase()
        return { nombre: n, apellido: 'Paciente' }
    }

    const nombre = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase()
    const apellido = partes.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
    return { nombre, apellido }
}

/**
 * Envía un mensaje de texto simple a través de WhatsApp Cloud API y lo persiste para tracking/auditoría.
 */
export async function enviarTextoWhatsApp(
    creds: WhatsAppCreds,
    toPhone: string,
    body: string,
    tracking?: { tenantId?: string; conversacionId?: string; accion?: string }
): Promise<boolean> {
    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'text',
                text: { preview_url: true, body }
            })
        })
        const res = await response.json()
        if (!response.ok) {
            console.error('[WA AUTO-FLOW] Error al enviar mensaje de texto:', res)
            return false
        }

        // Persistencia para tracking y auditoría en /mensajes
        if (tracking?.tenantId && tracking?.conversacionId) {
            try {
                const admin = createAdminClient()
                await admin.from('whatsapp_mensajes').insert({
                    tenant_id: tracking.tenantId,
                    conversacion_id: tracking.conversacionId,
                    tipo: 'texto',
                    remitente: 'bot',
                    contenido: body,
                    wa_message_id: res?.messages?.[0]?.id || null,
                    estado_envio: 'enviado',
                    metadata: { accion: tracking.accion || 'bot_texto' }
                })
                await admin.from('whatsapp_conversaciones').update({
                    ultimo_mensaje_at: new Date().toISOString(),
                    ultimo_mensaje_texto: `🤖 ${body.slice(0, 80)}`,
                }).eq('id', tracking.conversacionId)
            } catch (dbErr) {
                console.warn('[WA TRACKING] Error persistiendo mensaje bot:', dbErr)
            }
        }

        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción al enviar mensaje de texto:', err)
        return false
    }
}

/**
 * Envía un mensaje con botones interactivos (máximo 3 botones permitidos por WhatsApp Cloud API) y lo persiste para tracking.
 */
export async function enviarBotonesWhatsApp(
    creds: WhatsAppCreds,
    toPhone: string,
    textoCuerpo: string,
    botones: { id: string; title: string }[],
    tracking?: { tenantId?: string; conversacionId?: string; accion?: string }
): Promise<boolean> {
    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: textoCuerpo },
                    action: {
                        buttons: botones.slice(0, 3).map(b => ({
                            type: 'reply',
                            reply: {
                                id: b.id,
                                title: b.title.slice(0, 20)
                            }
                        }))
                    }
                }
            })
        })
        const res = await response.json()
        if (!response.ok) {
            console.error('[WA AUTO-FLOW] Error al enviar botones interactivos:', res)
            return false
        }

        // Persistencia para tracking y auditoría en /mensajes
        if (tracking?.tenantId && tracking?.conversacionId) {
            try {
                const admin = createAdminClient()
                const botonesTxt = botones.slice(0, 3).map(b => `[🔘 ${b.title}]`).join(' ')
                const contenidoCompleto = `${textoCuerpo}\n\n${botonesTxt}`
                await admin.from('whatsapp_mensajes').insert({
                    tenant_id: tracking.tenantId,
                    conversacion_id: tracking.conversacionId,
                    tipo: 'interactivo',
                    remitente: 'bot',
                    contenido: contenidoCompleto,
                    wa_message_id: res?.messages?.[0]?.id || null,
                    estado_envio: 'enviado',
                    metadata: { 
                        accion: tracking.accion || 'bot_botones',
                        botones: botones.slice(0, 3) 
                    }
                })
                await admin.from('whatsapp_conversaciones').update({
                    ultimo_mensaje_at: new Date().toISOString(),
                    ultimo_mensaje_texto: `🤖 ${textoCuerpo.slice(0, 80)}`,
                }).eq('id', tracking.conversacionId)
            } catch (dbErr) {
                console.warn('[WA TRACKING] Error persistiendo botones bot:', dbErr)
            }
        }

        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción enviando botones interactivos:', err)
        return false
    }
}

/**
 * Envía un mensaje interactivo tipo LISTA (hasta 10 filas) y lo persiste para tracking.
 * Se usa cuando hay más opciones que los 3 botones que permite WhatsApp (ej: elegir
 * profesional en consultorios con muchos profesionales).
 */
export async function enviarListaWhatsApp(
    creds: WhatsAppCreds,
    toPhone: string,
    textoCuerpo: string,
    botonLista: string,
    filas: { id: string; title: string; description?: string }[],
    tracking?: { tenantId?: string; conversacionId?: string; accion?: string }
): Promise<boolean> {
    try {
        const filasLimitadas = filas.slice(0, 10).map(f => ({
            id: f.id,
            title: f.title.slice(0, 24),
            ...(f.description ? { description: f.description.slice(0, 72) } : {})
        }))
        const response = await fetch(`https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: { text: textoCuerpo },
                    action: {
                        button: botonLista.slice(0, 20),
                        sections: [{ title: 'Profesionales', rows: filasLimitadas }]
                    }
                }
            })
        })
        const res = await response.json()
        if (!response.ok) {
            console.error('[WA AUTO-FLOW] Error al enviar lista interactiva:', res)
            return false
        }

        if (tracking?.tenantId && tracking?.conversacionId) {
            try {
                const admin = createAdminClient()
                const filasTxt = filasLimitadas.map(f => `• ${f.title}`).join('\n')
                const contenidoCompleto = `${textoCuerpo}\n\n[📋 ${botonLista}]\n${filasTxt}`
                await admin.from('whatsapp_mensajes').insert({
                    tenant_id: tracking.tenantId,
                    conversacion_id: tracking.conversacionId,
                    tipo: 'interactivo',
                    remitente: 'bot',
                    contenido: contenidoCompleto,
                    wa_message_id: res?.messages?.[0]?.id || null,
                    estado_envio: 'enviado',
                    metadata: { accion: tracking.accion || 'bot_lista', filas: filasLimitadas }
                })
                await admin.from('whatsapp_conversaciones').update({
                    ultimo_mensaje_at: new Date().toISOString(),
                    ultimo_mensaje_texto: `🤖 ${textoCuerpo.slice(0, 80)}`,
                }).eq('id', tracking.conversacionId)
            } catch (dbErr) {
                console.warn('[WA TRACKING] Error persistiendo lista bot:', dbErr)
            }
        }

        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción enviando lista interactiva:', err)
        return false
    }
}

/**
 * Busca los próximos slots disponibles en la agenda y genera botones interactivos optimizados.
 * profesionalId filtra por un profesional concreto; limite topea cuántos slots devuelve
 * (1 = solo el turno más próximo, para "ocupar el primer turno libre").
 */
export async function obtenerProximosTresSlots(
    tenantSlug: string,
    profesionalId?: string | null,
    limite: number = 3
): Promise<Array<{
    fecha: string
    hora: string
    fechaLegible: string
    btnTitulo: string
    payload: string
}>> {
    const disponibilidad = await getTurnosDisponibles(tenantSlug, profesionalId)
    if (!disponibilidad || disponibilidad.length === 0) return []

    const diasAbrev = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const todayDate = nowStr.split(' ')[0]

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).split(' ')[0]

    const slotsResult: Array<{
        fecha: string
        hora: string
        fechaLegible: string
        btnTitulo: string
        payload: string
    }> = []

    for (const d of disponibilidad) {
        if (!d.slots || d.slots.length === 0) continue

        const [y, m, diaNum] = d.date.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diaSemana = diasAbrev[dateObj.getDay()]
        const mesNombre = mesesAbrev[m - 1]

        let prefijoDia = `${diaSemana} ${diaNum}/${m}`
        if (d.date === todayDate) prefijoDia = 'Hoy'
        else if (d.date === tomorrowStr) prefijoDia = 'Mañ.'

        for (const slot of d.slots) {
            if (slotsResult.length >= limite) break

            const horaCorta = slot.slice(0, 5)
            // Botón de WhatsApp máx 20 caracteres: ej "Mañ. 15:40 hs" o "Vie 26/09 11:00 hs"
            const btnTitulo = `${prefijoDia} ${horaCorta} hs`.slice(0, 20)
            const fechaLegible = `${diaSemana} ${diaNum} de ${mesNombre} a las ${horaCorta} hs`

            slotsResult.push({
                fecha: d.date,
                hora: horaCorta,
                fechaLegible,
                btnTitulo,
                payload: `SLOT_RES_${d.date}_${horaCorta}`
            })
        }

        if (slotsResult.length >= limite) break
    }

    return slotsResult
}

/**
 * Busca si ya existe un paciente registrado con este teléfono para facilitarle la reserva en 1 solo clic.
 */
// RC12: compara dos teléfonos por sus últimos 10 dígitos EXACTOS (área + número),
// tolerando prefijos de país y el 9 de celular de Argentina. Antes se usaba
// cleanPhone.includes(otro.slice(-8)), que cruzaba pacientes con terminaciones
// parecidas (podía mostrar/cancelar el turno de otra persona).
export function mismoTelefonoAR(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false
    const da = a.replace(/\D/g, '')
    const db = b.replace(/\D/g, '')
    if (da.length < 8 || db.length < 8) return false
    return da.slice(-10) === db.slice(-10)
}

export async function buscarPacientePorTelefono(tenantId: string, phone: string) {
    const admin = createAdminClient()

    const { data: pacientes } = await admin
        .from('pacientes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('tenant_id', tenantId)

    const match = (pacientes || []).find(p => mismoTelefonoAR(phone, p.telefono))

    return match || null
}

/**
 * Busca el próximo turno activo de un paciente (por teléfono o por DNI).
 */
export async function buscarProximoTurnoPaciente(tenantId: string, phone: string, dni?: string | null) {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    let query = admin
        .from('turnos')
        .select(`
            id,
            fecha_inicio,
            fecha_fin,
            estado,
            profesional:profesionales(nombre, apellido),
            tipo_treatment:tipos_tratamiento(nombre),
            paciente:pacientes(id, nombre, apellido, dni, telefono)
        `)
        .eq('tenant_id', tenantId)
        .gte('fecha_inicio', nowIso)
        .in('estado', ['PENDIENTE', 'CONFIRMADO'])
        .order('fecha_inicio', { ascending: true })
        .limit(1)

    if (dni) {
        const { data: pct } = await admin
            .from('pacientes')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('dni', dni)
            .maybeSingle()

        if (!pct) return null
        const { data: turno } = await query.eq('paciente_id', pct.id).maybeSingle()
        return turno
    } else {
        const { data: pacientes } = await admin
            .from('pacientes')
            .select('id, telefono')
            .eq('tenant_id', tenantId)

        const matchingIds = (pacientes || [])
            .filter(p => mismoTelefonoAR(phone, p.telefono))
            .map(p => p.id)

        if (matchingIds.length === 0) return null

        const { data: turno } = await query.in('paciente_id', matchingIds).maybeSingle()
        return turno
    }
}

/**
 * Menú principal interactivo mejorado con 3 opciones estratégicas para evitar sobrecarga humana.
 */
export async function enviarMenuPrincipalAutonomo(
    creds: WhatsAppCreds,
    toPhone: string,
    nombreConsultorio: string = 'Consultorio Odontológico',
    tracking?: { tenantId?: string; conversacionId?: string; accion?: string }
): Promise<boolean> {
    const cuerpo = `🦷 *${nombreConsultorio} — Asistente Digital*\n\n` +
        `¡Hola! Bienvenido/a. ¿Cómo podemos ayudarte hoy?\n` +
        `Elegí una opción rápida o escribinos tu consulta:`

    return enviarBotonesWhatsApp(creds, toPhone, cuerpo, [
        { id: 'MENU_TURNOS', title: '📅 Sacar / Ver Turno' },
        { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Urgencia / Dolor' },
        { id: 'FAQ_UBICACION', title: '📍 Ubicación y Horas' }
    ], tracking)
}

/**
 * Cerebro conversacional autónomo: resuelve consultas y reservas de turnos 100% por chat sin derivar.
 */
export async function procesarMensajeAutonomo({
    tenantId,
    fromPhone,
    textBody,
    buttonPayload,
    creds,
    conversacionId
}: {
    tenantId: string
    fromPhone: string
    textBody: string
    buttonPayload?: string
    creds: WhatsAppCreds
    conversacionId?: string
}): Promise<{ handled: boolean; action?: string }> {
    const admin = createAdminClient()
    const cleanPhone = fromPhone.replace(/\D/g, '')
    const normText = normalizarTexto(textBody)
    const dniDetectado = extraerDni(textBody)

    const trackingBase = {
        tenantId,
        conversacionId
    }

    // Traer datos del consultorio para las respuestas de FAQ y reservas
    const { data: tenant } = await admin
        .from('tenants')
        .select('id, slug, nombre, direccion, ciudad, telefono, custom_domain')
        .eq('id', tenantId)
        .single()

    const nombreClinica = tenant?.nombre || 'Consultorio Odontológico'
    const direccionClinica = tenant?.direccion 
        ? `${tenant.direccion}${tenant.ciudad ? `, ${tenant.ciudad}` : ''}`
        : 'nuestro consultorio'

    // Si el tenant tiene dominio propio, se usa; si no, cae al dominio central SaaS
    // (NO al de un consultorio concreto como dentalva.ar).
    const baseUrl = tenant?.custom_domain
        ? `https://${tenant.custom_domain}`
        : `https://dentalia.com.ar`
    const reservaUrl = `${baseUrl}/reservar?slug=${tenant?.slug || ''}`

    // ─────────────────────────────────────────────────────────────
    // ESTADO CONVERSACIONAL EN CURSO (Máquina de estados de reserva)
    // ─────────────────────────────────────────────────────────────
    const estadoActivo = await getReservaCtx(admin, conversacionId)

    // ── PASO 2: Paciente respondió su DNI (Confirmación final del turno) ──
    if (estadoActivo && estadoActivo.paso === 'PIDIENDO_DNI') {
        if (!dniDetectado) {
            await enviarTextoWhatsApp(
                creds,
                cleanPhone,
                `✍️ Por favor escribí solo los números de tu DNI (por ejemplo: *14234567*) para poder registrar tu turno en la agenda médica:`,
                { ...trackingBase, accion: 'reintentar_dni' }
            )
            return { handled: true, action: 'reintentar_dni' }
        }

        console.log(`[WA AUTO-FLOW] Confirmando reserva para ${estadoActivo.nombre} ${estadoActivo.apellido}, DNI: ${dniDetectado}`)
        
        // Llamar a crearReservaPublica
        const resultado = await crearReservaPublica({
            tenantSlug: tenant?.slug || '',
            fecha: estadoActivo.fecha,
            hora: estadoActivo.hora,
            profesionalId: estadoActivo.profesionalId ?? null, // Profesional elegido por el paciente
            nombre: estadoActivo.nombre || 'Paciente',
            apellido: estadoActivo.apellido || 'Reserva',
            dni: dniDetectado,
            telefono: cleanPhone,
            es_nuevo: 'si'
        })

        await setReservaCtx(admin, conversacionId, null)

        if ((resultado as any)?.error) {
            console.warn('[WA AUTO-FLOW] Conflicto o error al confirmar turno:', (resultado as any).error)
            const msgError = `⚠️ El horario de las ${estadoActivo.hora} hs acaba de ser ocupado. No te preocupes, ¿te gustaría consultar los siguientes lugares disponibles?`
            await enviarBotonesWhatsApp(creds, cleanPhone, msgError, [
                { id: 'MENU_TURNOS', title: '📅 Ver otros turnos' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ], { ...trackingBase, accion: 'conflicto_reserva' })
            return { handled: true, action: 'conflicto_reserva' }
        }

        const msgExito = `✅ *¡Tu Turno quedó CONFIRMADO con éxito!* 🦷✨\n\n` +
            `👤 Paciente: *${estadoActivo.nombre} ${estadoActivo.apellido}* (DNI ${dniDetectado})\n` +
            `📅 Fecha: *${estadoActivo.fechaLegible}*\n` +
            `📍 Lugar: *${direccionClinica}*\n\n` +
            `🔔 Te enviaremos un recordatorio por este mismo chat el día anterior.\n` +
            `¡Te esperamos con gusto!`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgExito, [
            { id: 'FAQ_UBICACION', title: '📍 Cómo llegar' },
            { id: 'MENU_PRINCIPAL', title: '👍 ¡Muchas gracias!' }
        ], { ...trackingBase, accion: 'turno_creado_con_exito' })
        return { handled: true, action: 'turno_creado_con_exito' }
    }

    // ── PASO 1: Paciente respondió su Nombre y Apellido ──
    if (estadoActivo && estadoActivo.paso === 'PIDIENDO_NOMBRE') {
        const { nombre, apellido } = limpiarNombreYApellido(textBody)
        console.log(`[WA AUTO-FLOW] Nombre recibido: ${nombre} ${apellido}`)

        // Actualizar estado a PIDIENDO_DNI
        await setReservaCtx(admin, conversacionId, {
            ...estadoActivo,
            paso: 'PIDIENDO_DNI',
            nombre,
            apellido,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        const msgPideDni = `🪪 ¡Muchas gracias, *${nombre}*!\n\n` +
            `Por último, por favor escribí tu número de **DNI** (sin puntos ni letras) para generar tu ficha médica:`

        await enviarTextoWhatsApp(creds, cleanPhone, msgPideDni, { ...trackingBase, accion: 'pidiendo_dni' })
        return { handled: true, action: 'nombre_recibido_pidiendo_dni' }
    }

    // ── CLIC EN SLOT (botón SLOT_RES_...) o SELECCIÓN NUMÉRICA ("1"/"2"/"3") ──
    // RC9: si el bot acaba de ofrecer slots y el paciente responde con un número,
    // lo mapeamos al slot correspondiente que quedó guardado en el contexto.
    let slotPayloadEfectivo = buttonPayload?.startsWith('SLOT_RES_') ? buttonPayload : ''
    if (!slotPayloadEfectivo && estadoActivo?.paso === 'SLOTS_OFRECIDOS' && estadoActivo.slots?.length) {
        const mNum = normText.match(/^(?:opcion\s*)?([123])$/)
        if (mNum) {
            slotPayloadEfectivo = estadoActivo.slots[Number(mNum[1]) - 1]?.payload || ''
        }
    }

    if (slotPayloadEfectivo) {
        const parts = slotPayloadEfectivo.replace('SLOT_RES_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]
        // Profesional elegido en el paso previo (viene en el contexto SLOTS_OFRECIDOS).
        const profesionalId = estadoActivo?.profesionalId ?? null
        const profesionalNombre = estadoActivo?.profesionalNombre

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        // Verificar si el teléfono ya pertenece a un paciente registrado
        const pacienteExistente = await buscarPacientePorTelefono(tenantId, cleanPhone)

        if (pacienteExistente && pacienteExistente.dni) {
            // Ofrecer confirmación directa en 1 clic
            await setReservaCtx(admin, conversacionId, {
                paso: 'PIDIENDO_NOMBRE', // Por si decide ingresar otro
                fecha,
                hora,
                fechaLegible,
                profesionalId,
                profesionalNombre,
                nombre: pacienteExistente.nombre,
                apellido: pacienteExistente.apellido,
                expiresAt: Date.now() + 30 * 60 * 1000
            })

            const msgAutoPct = `📋 *Reserva de Turno*\n\n` +
                `Elegiste el turno para el:\n📅 *${fechaLegible}*\n\n` +
                `Detectamos que ya sos paciente de la clínica:\n` +
                `👤 *${pacienteExistente.nombre} ${pacienteExistente.apellido}* (DNI ${pacienteExistente.dni})\n\n` +
                `¿Deseás confirmar el turno a tu nombre o es para otra persona?`

            await enviarBotonesWhatsApp(creds, cleanPhone, msgAutoPct, [
                { id: `CONFIRMAR_AUTO_${fecha}_${hora}_${pacienteExistente.dni}_${profesionalId || 'auto'}`, title: '✅ A mi nombre' },
                { id: `RESERVA_OTRA_PERSONA_${fecha}_${hora}_${profesionalId || 'auto'}`, title: '👤 Para otra persona' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Volver' }
            ], { ...trackingBase, accion: 'ofrecida_confirmacion_auto_pct' })
            return { handled: true, action: 'ofrecida_confirmacion_auto_pct' }
        }

        // Si es un paciente nuevo o no registrado: Pedir Nombre
        await setReservaCtx(admin, conversacionId, {
            paso: 'PIDIENDO_NOMBRE',
            fecha,
            hora,
            fechaLegible,
            profesionalId,
            profesionalNombre,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        const msgPideNombre = `✍️ *¡Excelente elección!*\n\n` +
            `Reservamos para el:\n📅 *${fechaLegible}*\n\n` +
            `Para anotarte en la agenda del consultorio, por favor **escribí tu Nombre y Apellido**:`

        await enviarTextoWhatsApp(creds, cleanPhone, msgPideNombre, { ...trackingBase, accion: 'slot_elegido_pidiendo_nombre' })
        return { handled: true, action: 'slot_elegido_pidiendo_nombre' }
    }

    // ── NINGUNO DE ESOS SLOTS / PIDE OTRA FECHA EN TEXTO ──
    // Si recién ofrecimos los 3 próximos slots y el paciente responde en texto
    // pidiendo una fecha más adelante ("semana próxima", "pasada esa fecha",
    // "para noviembre"), hoy no sabemos ofrecer esa fecha: en vez de tirarle el
    // menú genérico, lo pasamos a una persona para coordinar. (No pisa números
    // ni clics de slot: eso ya se resolvió arriba.)
    if (estadoActivo?.paso === 'SLOTS_OFRECIDOS') {
        const pideOtraFecha =
            normText.includes('semana proxima') ||
            normText.includes('semana que viene') ||
            normText.includes('proxima semana') ||
            normText.includes('la que viene') ||
            normText.includes('mes que viene') ||
            normText.includes('mas adelante') ||
            normText.includes('mas tarde') ||
            normText.includes('pasada esa fecha') ||
            normText.includes('despues de') ||
            normText.includes('otra fecha') ||
            normText.includes('otro dia') ||
            normText.includes('otra semana') ||
            normText.includes('mas lejos') ||
            normText.includes('ninguno') ||
            normText.includes('ninguna') ||
            normText.includes('no me sirve') ||
            normText.includes('no me sirven') ||
            /para (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/.test(normText)

        if (pideOtraFecha) {
            console.log(`[WA AUTO-FLOW] ${cleanPhone} pide una fecha fuera de los slots ofrecidos. Derivando a humano.`)
            if (conversacionId) {
                await admin.from('whatsapp_conversaciones').update({
                    estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString()
                }).eq('id', conversacionId)
                await setReservaCtx(admin, conversacionId, null)
            }
            await admin.from('notificaciones').insert({
                tenant_id: tenantId,
                titulo: '📅 Paciente pide otra fecha de turno',
                mensaje: `El paciente (+${cleanPhone}) no quiere los próximos horarios y pidió: "${textBody.slice(0, 120)}". Coordinar fecha por chat.`,
                tipo: 'turno_reprogramado',
                referencia_id: conversacionId || '',
                leida: false
            })
            try {
                const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
                await sendPushToRole('admin', tenantId, '📅 Pide otra fecha', `Paciente +${cleanPhone} quiere un turno más adelante.`, '/mensajes')
            } catch (e) {}
            await enviarTextoWhatsApp(creds, cleanPhone,
                `¡Dale! 🙏 Para buscarte una fecha más adelante te paso con una persona de nuestro equipo, que te va a escribir por acá para coordinarla.`,
                { ...trackingBase, accion: 'pide_otra_fecha_derivado' }
            )
            return { handled: true, action: 'pide_otra_fecha_derivado' }
        }
    }

    // ── CONFIRMACIÓN AUTOMÁTICA EN 1 CLIC PARA PACIENTE EXISTENTE ──
    if (buttonPayload?.startsWith('CONFIRMAR_AUTO_')) {
        const parts = buttonPayload.replace('CONFIRMAR_AUTO_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]
        const dni = parts[2]
        const profesionalId = parts[3] && parts[3] !== 'auto' ? parts[3] : null

        const pacienteExistente = await buscarPacientePorTelefono(tenantId, cleanPhone)
        const nombre = pacienteExistente?.nombre || 'Paciente'
        const apellido = pacienteExistente?.apellido || ''

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        const resultado = await crearReservaPublica({
            tenantSlug: tenant?.slug || '',
            fecha,
            hora,
            profesionalId, // Profesional elegido por el paciente
            nombre,
            apellido,
            dni,
            telefono: cleanPhone,
            es_nuevo: 'no'
        })

        await setReservaCtx(admin, conversacionId, null)

        const msgExito = `✅ *¡Tu Turno quedó CONFIRMADO con éxito!* 🦷✨\n\n` +
            `👤 Paciente: *${nombre} ${apellido}* (DNI ${dni})\n` +
            `📅 Fecha: *${fechaLegible}*\n` +
            `📍 Lugar: *${direccionClinica}*\n\n` +
            `🔔 Te enviaremos un recordatorio por este mismo chat el día anterior.\n` +
            `¡Te esperamos!`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgExito, [
            { id: 'FAQ_UBICACION', title: '📍 Cómo llegar' },
            { id: 'MENU_PRINCIPAL', title: '👍 ¡Muchas gracias!' }
        ], { ...trackingBase, accion: 'reserva_auto_confirmada_1click' })
        return { handled: true, action: 'reserva_auto_confirmada_1click' }
    }

    // ── RESERVA PARA OTRA PERSONA (FAMILIAR) ──
    if (buttonPayload?.startsWith('RESERVA_OTRA_PERSONA_')) {
        const parts = buttonPayload.replace('RESERVA_OTRA_PERSONA_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]
        const profesionalId = parts[2] && parts[2] !== 'auto' ? parts[2] : null

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        await setReservaCtx(admin, conversacionId, {
            paso: 'PIDIENDO_NOMBRE',
            fecha,
            hora,
            fechaLegible,
            profesionalId,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        await enviarTextoWhatsApp(
            creds,
            cleanPhone,
            `✍️ Perfecto. Por favor escribí el **Nombre y Apellido del paciente** que va a asistir a la consulta:`,
            { ...trackingBase, accion: 'pidiendo_nombre_familiar' }
        )
        return { handled: true, action: 'pidiendo_nombre_familiar' }
    }

    // ── PASO PREVIO: PACIENTE ELIGIÓ PROFESIONAL (botón/lista SEL_PROF_<id>) ──
    // El cliente exige elegir profesional antes de ver horarios, y que se devuelva
    // UN SOLO turno (el más próximo de ese profesional) para ocupar el primer hueco.
    // Va acá (antes de los detectores de texto) para que el título de la opción
    // elegida no dispare otra intención por coincidencia de palabras.
    if (buttonPayload?.startsWith('SEL_PROF_')) {
        const profId = buttonPayload.replace('SEL_PROF_', '')
        const profs = await getProfesionalesPublicos(tenant?.slug || '')
        const profElegido = (profs as any[]).find(p => p.id === profId)
        const profNombre = profElegido
            ? `${profElegido.nombre} ${profElegido.apellido}`.trim()
            : 'el profesional'

        // Solo el turno MÁS PRÓXIMO de ese profesional (limite = 1).
        const slotsCandidatos = await obtenerProximosTresSlots(tenant?.slug || '', profId, 1)

        if (slotsCandidatos.length > 0) {
            const s = slotsCandidatos[0]
            const textoPropuesta = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
                `El primer turno libre con *Dr/a. ${profNombre}* es:\n\n` +
                `📅 *${s.fechaLegible}*\n\n` +
                `👇 Tocá *Confirmar* para reservarlo, o elegí otro profesional:`

            await enviarBotonesWhatsApp(creds, cleanPhone, textoPropuesta, [
                { id: s.payload, title: '✅ Confirmar' },
                { id: 'MENU_TURNOS', title: '🔄 Otro profesional' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ], { ...trackingBase, accion: 'ofrecido_primer_slot_profesional' })

            await setReservaCtx(admin, conversacionId, {
                paso: 'SLOTS_OFRECIDOS',
                fecha: '', hora: '', fechaLegible: '',
                profesionalId: profId,
                profesionalNombre: profNombre,
                slots: [{ payload: s.payload }],
                expiresAt: Date.now() + 30 * 60 * 1000
            })
            return { handled: true, action: 'ofrecido_primer_slot_profesional' }
        }

        // El profesional elegido no tiene turnos próximos.
        const msgSinSlotsProf = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
            `Por ahora *Dr/a. ${profNombre}* no tiene turnos próximos disponibles.\n\n` +
            `Podés elegir otro profesional o ver las semanas siguientes en nuestro portal:\n` +
            `👉 ${reservaUrl}`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgSinSlotsProf, [
            { id: 'MENU_TURNOS', title: '🔄 Otro profesional' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ], { ...trackingBase, accion: 'sin_slots_profesional' })
        await setReservaCtx(admin, conversacionId, null)
        return { handled: true, action: 'sin_slots_profesional' }
    }

    // ── OPT-OUT "BAJA" DE RECORDATORIOS DE CONTROL (RECALL) ──
    // Las plantillas de recall ofrecen darse de baja respondiendo "BAJA".
    // Desactivamos todos los recall del paciente en este tenant (compliance Marketing).
    if (normText === 'baja' || normText === 'darme de baja' || normText.includes('no quiero recibir') || normText.includes('no me manden mas')) {
        console.log(`[WA AUTO-FLOW] Opt-out BAJA de ${cleanPhone}. Desactivando recall...`)
        const pacienteBaja = await buscarPacientePorTelefono(tenantId, cleanPhone)
        if (pacienteBaja) {
            await admin
                .from('recall_configs')
                .update({ activo: false })
                .eq('tenant_id', tenantId)
                .eq('paciente_id', pacienteBaja.id)
        }
        await enviarTextoWhatsApp(creds, cleanPhone,
            `Listo ✅ No vas a recibir más recordatorios automáticos de control. Si en algún momento querés un turno, escribinos por acá cuando quieras. 🦷`,
            { ...trackingBase, accion: 'recall_opt_out_baja' }
        )
        return { handled: true, action: 'recall_opt_out_baja' }
    }

    // ─────────────────────────────────────────────────────────────
    // PARCHE 1: ACUSE DE RECIBO INTELIGENTE DE FOTOS / ESTUDIOS
    // ─────────────────────────────────────────────────────────────
    // Nota de voz: WhatsApp no transcribe el audio, así que el bot no puede
    // "entenderlo". En vez de tirar el menú genérico, acusamos recibo y lo
    // derivamos a una persona (igual que una foto/estudio).
    const esNotaVoz = textBody.includes('[Nota de voz]') || textBody.includes('🎙️')

    if (
        esNotaVoz ||
        textBody.includes('[Foto adjunta]') || textBody.includes('📷') ||
        textBody.includes('[Documento adjunto]') || textBody.includes('📄') ||
        textBody.includes('[Video adjunto]') || textBody.includes('🎥') ||
        (normText.includes('foto') && (normText.includes('envio') || normText.includes('adjunt') || normText.includes('mando')))
    ) {
        console.log(`[WA AUTO-FLOW] Archivo (${esNotaVoz ? 'nota de voz' : 'foto/estudio/documento'}) recibido de ${cleanPhone}. Acusando recibo y alertando recepción...`)

        if (conversacionId) {
            await admin.from('whatsapp_conversaciones').update({
                estado: 'HUMANO_PENDIENTE',
                updated_at: new Date().toISOString()
            }).eq('id', conversacionId)
        }

        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: esNotaVoz ? '🎙️ Nota de voz de Paciente' : '📸 Foto enviada por Paciente',
            mensaje: esNotaVoz
                ? `El paciente (+${cleanPhone}) envió una nota de voz por WhatsApp. Escuchar y responder en mensajes.`
                : `El paciente (+${cleanPhone}) envió una foto/estudio por WhatsApp. Revisar en mensajes.`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })

        try {
            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
            await sendPushToRole('admin', tenantId,
                esNotaVoz ? '🎙️ Nota de voz recibida' : '📸 Foto Clínica Recibida',
                `Paciente +${cleanPhone} envió ${esNotaVoz ? 'una nota de voz' : 'una foto'} por WhatsApp.`, '/mensajes')
        } catch (e) {}

        const msgFoto = esNotaVoz
            ? `¡Recibimos tu nota de voz! 🎙️✨\n\n` +
              `Una persona de nuestro equipo la va a escuchar y te responde a la brevedad por este medio.`
            : `¡Recibido correctamente! 📎✨\n\n` +
              `Ya lo adjuntamos a tu ficha para que el equipo odontológico pueda verlo y evaluarlo.\n` +
              `Un profesional o asesor de nuestro equipo te responderá a la brevedad por este medio.`

        await enviarTextoWhatsApp(creds, cleanPhone, msgFoto, {
            ...trackingBase,
            accion: esNotaVoz ? 'nota_voz_recibida_acuse' : 'foto_recibida_acuse'
        })
        return { handled: true, action: esNotaVoz ? 'nota_voz_recibida_acuse' : 'foto_recibida_acuse' }
    }

    // ─────────────────────────────────────────────────────────────
    // PARCHE 2.A (RC5): NÚMERO EQUIVOCADO / OPT-OUT
    // El contacto dice que el número no corresponde o que no pidió turno.
    // No seguimos con flujos automáticos: derivamos a un humano para corregir
    // el contacto y dejamos de responder automáticamente a esta conversación.
    // ─────────────────────────────────────────────────────────────
    const esNumeroEquivocado =
        normText.includes('numero equivocado') ||
        normText.includes('numero incorrecto') ||
        normText.includes('se confundieron de numero') ||
        normText.includes('se equivocaron de numero') ||
        normText.includes('equivocaron de numero') ||
        normText.includes('esta mal el telefono') ||
        normText.includes('esta mal el numero') ||
        normText.includes('no pedi ningun turno') ||
        normText.includes('no pedi turno') ||
        normText.includes('no soy ')

    if (esNumeroEquivocado) {
        console.log(`[WA AUTO-FLOW] Posible número equivocado / opt-out de ${cleanPhone}. Derivando a humano.`)
        if (conversacionId) {
            await admin.from('whatsapp_conversaciones').update({
                estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString()
            }).eq('id', conversacionId)
        }
        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: '⚠️ Número equivocado — verificar contacto',
            mensaje: `El contacto (+${cleanPhone}) indica que el número no corresponde: "${textBody.slice(0, 120)}". Revisar/corregir el teléfono del paciente para no seguir contactándolo.`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })
        await enviarTextoWhatsApp(creds, cleanPhone,
            `¡Gracias por avisar y disculpá la molestia! 🙏 Le pasamos esto a una persona de nuestro equipo para corregir el contacto.`,
            { ...trackingBase, accion: 'numero_equivocado_derivado' }
        )
        return { handled: true, action: 'numero_equivocado_derivado' }
    }

    // ─────────────────────────────────────────────────────────────
    // PARCHE 2: CORTESÍA Y AGRADECIMIENTOS (Cierre cálido sin loops)
    // ─────────────────────────────────────────────────────────────
    // Texto sin emojis, para que "perfecto 👌 allí estaré" matchee igual que
    // "perfecto allí estaré". Un flujo activo (reserva/DNI) ya retornó arriba,
    // así que acá un "ok"/"dale" suelto es cierre de charla, no un paso perdido.
    const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️]/gu
    const soloTexto = normText.replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim()

    // 2.0 Reacción que llega como texto (solo emojis, sin palabras): silencio.
    // No tiene sentido responder el menú a un 👍 / 🙏 / 🫰 de cierre.
    if (textBody.trim() !== '' && soloTexto === '') {
        console.log(`[WA AUTO-FLOW] Mensaje solo-emoji de ${cleanPhone}. Silencio (sin menú).`)
        return { handled: true, action: 'reaccion_emoji_silenciada' }
    }

    const esAgradecimiento =
        soloTexto === 'gracias' ||
        soloTexto.startsWith('gracias') ||
        soloTexto.startsWith('muchas gracias') ||
        soloTexto.startsWith('mil gracias') ||
        soloTexto.includes('muchas gracias') ||
        soloTexto === 'perfecto gracias' ||
        soloTexto === 'muy bien gracias' ||
        soloTexto.includes('excelente estado') ||
        soloTexto === 'buen dia' ||
        soloTexto === 'buenas tardes'

    // Cierre conforme / aviso de que asiste: "ok", "dale", "perfecto",
    // "allí estaré", "estoy yendo", etc. No es una consulta: no va al menú.
    const esCierreConforme =
        ['ok', 'oka', 'okis', 'okey', 'dale', 'listo', 'perfecto', 'perfe',
         'genial', 'barbaro', 'buenisimo', 'joya', 'de una', 'ok dale',
         'dale gracias', 'ok gracias', 'listo gracias', 'perfecto dale',
         'ok perfecto', 'buenisimo gracias', 'excelente', 'excelente gracias'
        ].includes(soloTexto) ||
        soloTexto.includes('alli estare') ||
        soloTexto.includes('ahi estare') ||
        soloTexto.includes('ahi estoy') ||
        soloTexto.includes('estoy yendo') ||
        soloTexto.includes('ya estoy yendo') ||
        soloTexto.includes('voy en camino') ||
        soloTexto.includes('voy para alla') ||
        soloTexto.includes('ahi voy') ||
        soloTexto.includes('estoy llegando') ||
        soloTexto.includes('ya estoy aca') ||
        soloTexto.includes('ya llegue')

    if ((esAgradecimiento || esCierreConforme) && !soloTexto.includes('turno') && !soloTexto.includes('dolor')) {
        const msgAgradecimiento = esAgradecimiento
            ? `¡De nada! Que tengas un excelente día. Quedamos a tu entera disposición ante cualquier duda o consulta 😊🦷✨`
            : `¡Perfecto! 😊🦷 Cualquier cosa, quedamos a tu disposición por acá.`
        await enviarTextoWhatsApp(creds, cleanPhone, msgAgradecimiento, {
            ...trackingBase,
            accion: 'cortesia_agradecimiento'
        })
        return { handled: true, action: 'cortesia_agradecimiento' }
    }

    // ─────────────────────────────────────────────────────────────
    // PARCHE 3 (RC1): POSIBLE IMPEDIMENTO / PEDIDO DE CAMBIO DE TURNO
    // NUNCA cancelamos desde texto libre. Si el paciente menciona que no
    // puede asistir o pide cancelar/cambiar, ofrecemos botones para que
    // elija explícitamente, o derivamos a un humano. La cancelación solo
    // ocurre si toca el botón Cancelar (payload CANCELAR_TURNO_<id>).
    // ─────────────────────────────────────────────────────────────
    const mencionaImpedimento =
        normText.includes('accidente') ||
        normText.includes('reposo') ||
        normText.includes('antibiotico') ||
        normText.includes('infeccion') ||
        normText.includes('lastime') ||
        normText.includes('enfermo') ||
        normText.includes('enferma') ||
        normText.includes('imposible ir') ||
        normText.includes('no puedo asistir') ||
        normText.includes('no voy a poder') ||
        normText.includes('no llego') ||
        normText.includes('no voy a llegar') ||
        normText.includes('no voy a ir') ||
        normText.includes('no puedo ir') ||
        normText.includes('se me complica') ||
        normText.includes('fiebre') ||
        normText.includes('operaron') ||
        normText.includes('cancelar el turno') ||
        normText.includes('cancelar mi turno') ||
        normText.includes('podrias cancelar')

    if (mencionaImpedimento) {
        console.log(`[WA AUTO-FLOW] Posible impedimento/pedido de cambio en ${cleanPhone}. Ofreciendo opciones (sin acción automática).`)
        const turnoActivo = await buscarProximoTurnoPaciente(tenantId, cleanPhone, null)

        if (turnoActivo) {
            const fechaTurno = new Date(turnoActivo.fecha_inicio).toLocaleString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Argentina/Buenos_Aires'
            })
            await enviarBotonesWhatsApp(
                creds,
                cleanPhone,
                `Entendemos 🙏 Vemos que tenés un turno el *${fechaTurno} hs*.\n\n¿Qué querés hacer con ese turno?`,
                [
                    { id: `REPROGRAMAR_TURNO_${turnoActivo.id}`, title: '🔄 Reprogramar' },
                    { id: `CANCELAR_TURNO_${turnoActivo.id}`, title: '❌ Cancelar' },
                    { id: `CONFIRMAR_TURNO_${turnoActivo.id}`, title: '✅ Mantenerlo' },
                ],
                { ...trackingBase, accion: 'impedimento_ofrece_opciones' }
            )
            return { handled: true, action: 'impedimento_ofrece_opciones' }
        }

        // Sin turno identificado: derivamos a un humano, sin afirmar nada en falso.
        if (conversacionId) {
            await admin.from('whatsapp_conversaciones').update({
                estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString()
            }).eq('id', conversacionId)
        }
        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: '📩 Paciente quiere cambiar o cancelar un turno',
            mensaje: `Paciente (+${cleanPhone}) escribió: "${textBody.slice(0, 120)}"`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })
        await enviarTextoWhatsApp(creds, cleanPhone,
            `Recibimos tu mensaje 🙏 Un asesor de recepción te va a contactar a la brevedad por este chat para ayudarte con tu turno.`,
            { ...trackingBase, accion: 'impedimento_derivado_humano' }
        )
        return { handled: true, action: 'impedimento_derivado_humano' }
    }

    // ─────────────────────────────────────────────────────────────
    // DATO CLÍNICO RELEVANTE (medicación / condición de salud)
    // Ej.: "tomo anticoagulantes", "soy alérgico a la penicilina",
    // "estoy embarazada", "soy diabético". El profesional tiene que verlo
    // antes del procedimiento: en vez del menú genérico, lo acusamos y lo
    // dejamos a la vista del equipo (NO afirmamos nada clínico).
    // (No cubre marcas sueltas mal escritas; sí las menciones comunes.)
    // ─────────────────────────────────────────────────────────────
    const mencionaDatoClinico =
        normText.includes('anticoagul') ||
        normText.includes('antiagreg') ||
        normText.includes('sintrom') ||
        normText.includes('acenocumarol') ||
        normText.includes('warfarina') ||
        normText.includes('clexane') ||
        normText.includes('alergi') ||
        normText.includes('embaraz') ||
        normText.includes('diabet') ||
        normText.includes('insulina') ||
        normText.includes('marcapaso') ||
        normText.includes('hipertens') ||
        normText.includes('presion alta') ||
        normText.includes('tomo medic') ||
        normText.includes('tomando medic') ||
        normText.includes('mi medicacion') ||
        normText.includes('estoy medicad')

    if (mencionaDatoClinico) {
        console.log(`[WA AUTO-FLOW] Dato clínico de ${cleanPhone}. Acuse + derivar al equipo (no menú).`)
        if (conversacionId) {
            await admin.from('whatsapp_conversaciones').update({
                estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString()
            }).eq('id', conversacionId)
        }
        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: '🩺 Dato clínico del paciente — revisar',
            mensaje: `El paciente (+${cleanPhone}) informó un dato de salud/medicación: "${textBody.slice(0, 160)}". Que lo vea el profesional antes del turno.`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })
        try {
            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
            await sendPushToRole('admin', tenantId, '🩺 Dato clínico recibido', `Paciente +${cleanPhone} informó medicación/condición. Revisar en mensajes.`, '/mensajes')
        } catch (e) {}
        await enviarTextoWhatsApp(creds, cleanPhone,
            `¡Gracias por avisarnos! 🙏 Tomamos nota y se lo pasamos al profesional para que lo tenga en cuenta antes de tu turno. Si tenés una urgencia, avisanos por acá.`,
            { ...trackingBase, accion: 'dato_clinico_derivado' }
        )
        return { handled: true, action: 'dato_clinico_derivado' }
    }

    // ─────────────────────────────────────────────────────────────
    // PARCHE 4: TURNOS ESPECIALES / MAYOR DURACIÓN (Evita turno corto)
    // ─────────────────────────────────────────────────────────────
    const esTratamientoComplejo = 
        normText.includes('incrustacion') ||
        normText.includes('protesis') ||
        normText.includes('implante') ||
        normText.includes('cirugia') ||
        normText.includes('extraccion') ||
        normText.includes('conducto') ||
        normText.includes('perno') ||
        normText.includes('corona') ||
        normText.includes('40 minutos') ||
        normText.includes('45 minutos') ||
        normText.includes('1 hora') ||
        normText.includes('tiempo especial')

    if (esTratamientoComplejo) {
        console.log(`[WA AUTO-FLOW] Tratamiento especial o tiempo extendido detectado en ${cleanPhone}.`)
        
        if (conversacionId) {
            await admin.from('whatsapp_conversaciones').update({
                estado: 'HUMANO_PENDIENTE',
                updated_at: new Date().toISOString()
            }).eq('id', conversacionId)
        }

        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: '🦷 Solicitud de Turno Especial / Extenso',
            mensaje: `Paciente (+${cleanPhone}) solicita turno especial: "${textBody.slice(0, 100)}"`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })

        try {
            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
            await sendPushToRole('admin', tenantId, '🦷 Turno Especial Solicitado', `Paciente (+${cleanPhone}) requiere turno especial/extenso.`, '/mensajes')
        } catch (e) {}

        const msgTratamiento = `¡Recibido! 🦷✨\n\n` +
            `Al tratarse de un procedimiento que requiere un tiempo especial en el sillón odontológico o preparación de instrumental, derivamos tu solicitud directamente al equipo de recepción.\n\n` +
            `Te responderemos a la brevedad con los días y horarios que mejor se adapten a tu caso.`

        await enviarTextoWhatsApp(creds, cleanPhone, msgTratamiento, {
            ...trackingBase,
            accion: 'derivado_turno_especial'
        })
        return { handled: true, action: 'derivado_turno_especial' }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DNI DETECTADO (Localizador de Turnos existente)
    // ─────────────────────────────────────────────────────────────
    if (dniDetectado) {
        console.log(`[WA AUTO-FLOW] DNI detectado: ${dniDetectado}. Buscando turno...`)
        const turno = await buscarProximoTurnoPaciente(tenantId, cleanPhone, dniDetectado)

        if (turno) {
            const pct = turno.paciente as any
            const prof = turno.profesional as any
            const trat = turno.tipo_treatment as any
            const fechaObj = new Date(turno.fecha_inicio)
            
            const fechaStr = fechaObj.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'America/Argentina/Buenos_Aires'
            })
            const horaStr = fechaObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Argentina/Buenos_Aires'
            })

            const mensajeTurno = `✅ *Turno Encontrado en el Sistema*\n\n` +
                `👤 Paciente: *${pct?.nombre} ${pct?.apellido}*\n` +
                `📅 Fecha: *${fechaStr}*\n` +
                `⏰ Horario: *${horaStr} hs*\n` +
                `👨‍⚕️ Profesional: *Dr/a. ${prof?.apellido || 'Asignado'}*\n` +
                `🦷 Motivo: *${trat?.nombre || 'Consulta odontológica'}*\n` +
                `📍 Dirección: *${direccionClinica}*\n\n` +
                `¿Deseás confirmar tu asistencia o reprogramar?`

            await enviarBotonesWhatsApp(creds, cleanPhone, mensajeTurno, [
                { id: `CONFIRMAR_TURNO_${turno.id}`, title: '✅ Confirmar' },
                { id: `REPROGRAMAR_TURNO_${turno.id}`, title: '🔄 Reprogramar' },
                { id: `CANCELAR_TURNO_${turno.id}`, title: '❌ Cancelar' }
            ], { ...trackingBase, accion: 'turno_dni_encontrado' })
            return { handled: true, action: 'turno_dni_encontrado' }
        } else {
            // El DNI es válido pero no tiene turno activo futuro: ofrecer sacar turno inmediatamente
            const msgNoTurno = `🔎 *Información de Turnos*\n\n` +
                `No encontramos turnos pendientes para el DNI *${dniDetectado}*.\n\n` +
                `¿Deseás agendar una consulta ahora directamente por acá?`

            await enviarBotonesWhatsApp(creds, cleanPhone, msgNoTurno, [
                { id: 'MENU_TURNOS', title: '📅 Sacar Turno Aquí' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ], { ...trackingBase, accion: 'dni_sin_turno' })
            return { handled: true, action: 'dni_sin_turno' }
        }
    }

    // (RC6) El radar de "pedir turno" se movió DESPUÉS de las FAQ y de
    // "consultar mi turno", para que preguntas como "cuándo es mi turno",
    // "cuánto sale" o "dónde quedan" no terminen ofreciendo slots nuevos.

    // ─────────────────────────────────────────────────────────────
    // 2. INTENCIÓN: CONSULTAR "¿CUÁNDO ES MI TURNO?" O "¿A QUÉ HORA?"
    // ─────────────────────────────────────────────────────────────
    const pideConsultarTurno = 
        normText.includes('a que hora') ||
        normText.includes('cuando es mi turno') ||
        normText.includes('cuando era mi turno') ||
        normText.includes('mi turno') ||
        normText.includes('tengo turno') ||
        buttonPayload === 'CONSULTAR_MI_TURNO'

    if (pideConsultarTurno) {
        console.log(`[WA AUTO-FLOW] Consulta de horario de turno por ${cleanPhone}...`)
        const turnoPorTelefono = await buscarProximoTurnoPaciente(tenantId, cleanPhone, null)

        if (turnoPorTelefono) {
            const pct = turnoPorTelefono.paciente as any
            const prof = turnoPorTelefono.profesional as any
            const trat = turnoPorTelefono.tipo_treatment as any
            const fechaObj = new Date(turnoPorTelefono.fecha_inicio)

            const fechaStr = fechaObj.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'America/Argentina/Buenos_Aires'
            })
            const horaStr = fechaObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Argentina/Buenos_Aires'
            })

            const mensaje = `📅 *Tu Próximo Turno Programado*\n\n` +
                `Hola *${pct?.nombre}*! Tu turno está registrado para el:\n` +
                `🗓️ *${fechaStr} a las ${horaStr} hs*\n` +
                `👨‍⚕️ Con: *Dr/a. ${prof?.apellido || 'Asignado'}*\n` +
                `🦷 Motivo: *${trat?.nombre || 'Consulta'}*\n` +
                `📍 Lugar: *${direccionClinica}*`

            await enviarBotonesWhatsApp(creds, cleanPhone, mensaje, [
                { id: `CONFIRMAR_TURNO_${turnoPorTelefono.id}`, title: '✅ Confirmar' },
                { id: `REPROGRAMAR_TURNO_${turnoPorTelefono.id}`, title: '🔄 Reprogramar' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ], { ...trackingBase, accion: 'turno_consultado_por_telefono' })
            return { handled: true, action: 'turno_consultado_por_telefono' }
        }

        const pedirDniMsg = `📋 *Localizador de Turnos*\n\n` +
            `Para ubicar tu turno en la agenda al instante, por favor **escribí tu número de DNI** (sin puntos ni letras).\n\n` +
            `_Ejemplo: 38452109_`

        await enviarTextoWhatsApp(creds, cleanPhone, pedirDniMsg, { ...trackingBase, accion: 'solicito_dni_localizador' })
        return { handled: true, action: 'solicito_dni_localizador' }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. INTENCIÓN: FAQ - DIRECCIÓN, UBICACIÓN Y CÓMO LLEGAR (SIN RODEOS)
    // ─────────────────────────────────────────────────────────────
    const pideUbicacion = 
        normText.includes('donde queda') ||
        normText.includes('donde estan') ||
        normText.includes('direccion') ||
        normText.includes('ubicacion') ||
        normText.includes('como llego') ||
        normText.includes('calle') ||
        normText.includes('pasar la direccion') ||
        normText.includes('pasarias la direccion') ||
        normText.includes('ir hoy al turno') ||
        normText.includes('en que lugar') ||
        normText.includes('que lugar') ||
        normText.includes('como llegar') ||
        buttonPayload === 'FAQ_UBICACION' ||
        buttonPayload === 'MENU_INFO_GENERAL'

    if (pideUbicacion) {
        // Verificar si el paciente tiene turno hoy para darle respuesta directa
        const turnoHoy = await buscarProximoTurnoPaciente(tenantId, cleanPhone, null)
        let encabezadoTurno = ''

        if (turnoHoy) {
            const fechaObj = new Date(turnoHoy.fecha_inicio)
            const horaStr = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
            const fechaStr = fechaObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
            const prof = turnoHoy.profesional as any

            const profLinea = prof?.apellido ? ` con el/la Dr/a. *${prof.apellido}*` : ''
            encabezadoTurno = `👋 ¡Hola! Te recordamos que tu turno es el *${fechaStr} a las ${horaStr} hs*${profLinea}.\n\n`
        }

        const msgDireccion = `${encabezadoTurno}📍 *Ubicación de ${nombreClinica}*\n\n` +
            `Estamos en: *${direccionClinica}*.\n\n` +
            `🕐 *Horarios de atención:*\n` +
            `• Lunes a Viernes de 09:00 a 20:00 hs.\n` +
            `• Sábados de 09:00 a 13:00 hs.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgDireccion, [
            { id: 'MENU_TURNOS', title: '📅 Sacar Turno' },
            { id: 'FAQ_PRECIOS', title: '💳 Medios de Pago' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ], { ...trackingBase, accion: 'faq_ubicacion' })
        return { handled: true, action: 'faq_ubicacion' }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. INTENCIÓN: FAQ - OBRAS SOCIALES Y PREPAGAS
    // ─────────────────────────────────────────────────────────────
    const pidePrepagas = 
        normText.includes('obra social') ||
        normText.includes('obras sociales') ||
        normText.includes('prepaga') ||
        normText.includes('prepagas') ||
        normText.includes('osde') ||
        normText.includes('swiss') ||
        normText.includes('galeno') ||
        normText.includes('medicus') ||
        normText.includes('particular') ||
        buttonPayload === 'FAQ_PREPAGAS'

    if (pidePrepagas) {
        const { data: obras } = await admin
            .from('obras_sociales')
            .select('nombre')
            .eq('tenant_id', tenantId)
            .eq('activo', true)

        const listaObras = (obras || []).map(o => `• ${o.nombre}`).join('\n')
        const msgObras = `🩺 *Coberturas y Obras Sociales en ${nombreClinica}*\n\n` +
            (listaObras.length > 0 
                ? `Trabajamos con las siguientes prepagas y convenios:\n${listaObras}\n\n` 
                : `Trabajamos con principales prepagas por reintegro y atención particular.\n\n`) +
            `💳 También atendemos de forma particular y emitimos factura oficial para reintegro.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgObras, [
            { id: 'MENU_TURNOS', title: '📅 Sacar Turno' },
            { id: 'FAQ_PRECIOS', title: '💳 Medios de Pago' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ], { ...trackingBase, accion: 'faq_prepagas' })
        return { handled: true, action: 'faq_prepagas' }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. INTENCIÓN: FAQ - PRECIOS, ARANCELES Y MEDIOS DE PAGO
    // ─────────────────────────────────────────────────────────────
    const pidePrecios = 
        normText.includes('cuanto sale') ||
        normText.includes('precio') ||
        normText.includes('precios') ||
        normText.includes('costo') ||
        normText.includes('arancel') ||
        normText.includes('medios de pago') ||
        normText.includes('formas de pago') ||
        normText.includes('tarjeta') ||
        normText.includes('efectivo') ||
        normText.includes('cuotas') ||
        buttonPayload === 'FAQ_PRECIOS'

    if (pidePrecios) {
        const msgPrecios = `💳 *Aranceles y Medios de Pago — ${nombreClinica}*\n\n` +
            `• *Medios de pago:* Efectivo, Transferencia bancaria, Tarjetas de Débito y Crédito en cuotas.\n\n` +
            `🔍 *Presupuestos y Diagnósticos:*\n` +
            `Para tratamientos como ortodoncia, prótesis o implantes, se realiza una primera consulta diagnóstica para evaluar tu caso puntual y darte un presupuesto a medida.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgPrecios, [
            { id: 'MENU_TURNOS', title: '📅 Agendar Consulta' },
            { id: 'FAQ_UBICACION', title: '📍 Dónde estamos' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ], { ...trackingBase, accion: 'faq_precios' })
        return { handled: true, action: 'faq_precios' }
    }

    // ─────────────────────────────────────────────────────────────
    // 6.A (RC6) RADAR: SACAR TURNO / DISPONIBILIDAD CONVERSACIONAL
    // Se evalúa DESPUÉS de "consultar mi turno" y de las FAQ, así una
    // pregunta por un turno existente o por precio/obra social/ubicación no
    // dispara la oferta de slots nuevos. Se quitó 'lugar' (va a Ubicación).
    // ─────────────────────────────────────────────────────────────
    const pideTurno =
        normText.includes('sacar turno') ||
        normText.includes('pedir turno') ||
        normText.includes('quiero turno') ||
        normText.includes('nuevo turno') ||
        normText.includes('agendar') ||
        normText.includes('consulta') ||
        normText.includes('turno') ||
        normText.includes('atenderme') ||
        normText.includes('hacerme ver') ||
        normText.includes('horario disponible') ||
        buttonPayload === 'SACAR_TURNO_NUEVO' ||
        buttonPayload === 'MENU_TURNOS'

    if (pideTurno) {
        console.log(`[WA AUTO-FLOW] Petición de turno conversacional por ${cleanPhone}. Pidiendo elegir profesional...`)

        // El cliente exige elegir profesional ANTES de ver horarios.
        const profs = await getProfesionalesPublicos(tenant?.slug || '') as any[]

        if (!profs || profs.length === 0) {
            // Sin profesionales activos: derivamos al portal / urgencia.
            const msgSinProfs = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
                `En este momento no hay profesionales con agenda abierta. Podés ver el portal digital:\n` +
                `👉 ${reservaUrl}\n\n` +
                `O si tenés dolor, podés activar la guardia de urgencia:`
            await enviarBotonesWhatsApp(creds, cleanPhone, msgSinProfs, [
                { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Tengo Urgencia' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ], { ...trackingBase, accion: 'sin_profesionales_link_portal' })
            return { handled: true, action: 'sin_profesionales_link_portal' }
        }

        const textoElegirProf = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
            `Para darte el primer turno libre, elegí con qué profesional querés atenderte:`

        // ≤3 profesionales → botones (Consultorio Alvarez). 4+ → lista (Curadent Moreno).
        if (profs.length <= 3) {
            const botonesProfs = profs.map(p => ({
                id: `SEL_PROF_${p.id}`,
                title: `👨‍⚕️ ${p.nombre} ${p.apellido}`.trim()
            }))
            await enviarBotonesWhatsApp(creds, cleanPhone, textoElegirProf, botonesProfs, {
                ...trackingBase, accion: 'pidiendo_profesional_botones'
            })
        } else {
            const filasProfs = profs.map(p => ({
                id: `SEL_PROF_${p.id}`,
                title: `${p.nombre} ${p.apellido}`.trim(),
                description: p.especialidad || undefined
            }))
            await enviarListaWhatsApp(creds, cleanPhone, textoElegirProf, 'Elegir profesional', filasProfs, {
                ...trackingBase, accion: 'pidiendo_profesional_lista'
            })
        }

        await setReservaCtx(admin, conversacionId, {
            paso: 'PIDIENDO_PROFESIONAL',
            fecha: '', hora: '', fechaLegible: '',
            expiresAt: Date.now() + 30 * 60 * 1000
        })
        return { handled: true, action: 'pidiendo_profesional' }
    }

    // ─────────────────────────────────────────────────────────────
    // 7. DETECCIÓN DE QUEJA / RECLAMO / ENFADO (Derivación Urgente)
    // ─────────────────────────────────────────────────────────────
    const esQueja = 
        normText.includes('queja') ||
        normText.includes('reclamo') ||
        normText.includes('pesima atencion') ||
        normText.includes('mala atencion') ||
        normText.includes('hace una hora') ||
        normText.includes('nadie me atiende') ||
        normText.includes('estafa') ||
        normText.includes('abogado') ||
        normText.includes('denuncia')

    if (esQueja) {
        console.warn(`[WA AUTO-FLOW] 🚨 Queja o reclamo detectado de ${cleanPhone}. Pausando bot y alertando...`)
        if (conversacionId) {
            await admin.from('whatsapp_conversaciones')
                .update({ estado: 'HUMANO_PENDIENTE', updated_at: new Date().toISOString() })
                .eq('id', conversacionId)
        }

        await admin.from('notificaciones').insert({
            tenant_id: tenantId,
            titulo: '🚨 RECLAMO URGENTE POR WHATSAPP',
            mensaje: `El paciente (+${cleanPhone}) expresó un reclamo o disconformidad: "${textBody.slice(0, 100)}"`,
            tipo: 'turno_reprogramado',
            referencia_id: conversacionId || '',
            leida: false
        })

        try {
            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
            await sendPushToRole('admin', tenantId, '🚨 Reclamo Prioritario WhatsApp', `Reclamo de +${cleanPhone}. Revisar mensajes urgente.`, '/mensajes')
        } catch (e) {}

        const msgEmpatia = `Estimado/a, lamentamos sinceramente cualquier inconveniente.\n\n` +
            `Tu mensaje fue derivado con **prioridad alta** a la administración de ${nombreClinica}. Una persona de nuestro equipo se comunicará por este medio a la brevedad para darte una solución.`

        await enviarTextoWhatsApp(creds, cleanPhone, msgEmpatia, { ...trackingBase, accion: 'queja_derivada_urgente' })
        return { handled: true, action: 'queja_derivada_urgente' }
    }

    // ─────────────────────────────────────────────────────────────
    // 8. PETICIÓN EXPLÍCITA DE HABLAR CON RECEPCIÓN
    // ─────────────────────────────────────────────────────────────
    if (buttonPayload === 'HABLAR_RECEPCIONISTA' || normText === 'recepcion' || normText === 'humano') {
        console.log(`[WA AUTO-FLOW] Petición de recepcionista por ${cleanPhone}.`)
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

        const msgRecepcion = `¡Entendido! 💬 Derivamos tu chat con nuestro equipo de recepción.\n\n` +
            `Para que puedan ayudarte más rápido apenas tomen tu consulta, por favor indicanos tu **nombre y apellido** y el **motivo de tu consulta** ✍️`

        await enviarTextoWhatsApp(creds, cleanPhone, msgRecepcion, { ...trackingBase, accion: 'derivado_recepcion' })
        return { handled: true, action: 'derivado_recepcion' }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. MENÚ PRINCIPAL POR DEFECTO
    // ─────────────────────────────────────────────────────────────
    if (buttonPayload === 'MENU_PRINCIPAL' || normText.includes('menu') || normText.includes('hola')) {
        await enviarMenuPrincipalAutonomo(creds, cleanPhone, nombreClinica, { ...trackingBase, accion: 'menu_principal' })
        return { handled: true, action: 'menu_principal' }
    }

    return { handled: false }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { esMensajeDeUrgencia, getTriageCategorias, enviarMenuTriageWhatsApp } from '@/lib/whatsapp-guardia'

export interface WhatsAppCreds {
    phoneNumberId: string
    accessToken: string
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
    // Quita puntos, espacios y guiones
    const soloNumeros = texto.replace(/\D/g, '')
    if (soloNumeros.length >= 7 && soloNumeros.length <= 8) {
        return soloNumeros
    }
    return null
}

/**
 * Envía un mensaje de texto simple a través de WhatsApp Cloud API.
 */
export async function enviarTextoWhatsApp(
    creds: WhatsAppCreds,
    toPhone: string,
    body: string
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
        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción al enviar mensaje de texto:', err)
        return false
    }
}

/**
 * Envía un mensaje con botones interactivos (máximo 3 botones permitidos por WhatsApp Cloud API).
 */
export async function enviarBotonesWhatsApp(
    creds: WhatsAppCreds,
    toPhone: string,
    textoCuerpo: string,
    botones: { id: string; title: string }[]
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
                                title: b.title.slice(0, 20) // WhatsApp limita a 20 chars
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
        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción enviando botones interactivos:', err)
        return false
    }
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
        // Buscar primero el id del paciente con ese DNI
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
        // Buscar por teléfono en pacientes
        const cleanPhone = phone.replace(/\D/g, '')
        const { data: pacientes } = await admin
            .from('pacientes')
            .select('id, telefono')
            .eq('tenant_id', tenantId)

        const matchingIds = (pacientes || [])
            .filter(p => p.telefono && cleanPhone.includes(p.telefono.replace(/\D/g, '').slice(-8)))
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
    nombreConsultorio: string = 'Consultorio Odontológico'
): Promise<boolean> {
    const cuerpo = `🦷 *${nombreConsultorio} — Asistente Digital*\n\n` +
        `¡Hola! Bienvenido/a. ¿Cómo podemos ayudarte hoy?\n` +
        `Elegí una opción rápida o escribinos tu consulta:`

    return enviarBotonesWhatsApp(creds, toPhone, cuerpo, [
        { id: 'MENU_TURNOS', title: '📅 Turnos / Consultas' },
        { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Urgencia / Dolor' },
        { id: 'MENU_INFO_GENERAL', title: 'ℹ️ Dirección y Precios' }
    ])
}

/**
 * Cerebro conversacional autónomo: resuelve consultas sin derivar a recepcionista a menos que sea crítico.
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

    // Traer datos del consultorio para las respuestas de FAQ
    const { data: tenant } = await admin
        .from('tenants')
        .select('id, slug, nombre, direccion, ciudad, telefono, custom_domain')
        .eq('id', tenantId)
        .single()

    const nombreClinica = tenant?.nombre || 'Consultorio Odontológico'
    const direccionClinica = tenant?.direccion 
        ? `${tenant.direccion}${tenant.ciudad ? `, ${tenant.ciudad}` : ''}`
        : 'nuestro consultorio'

    const baseUrl = tenant?.custom_domain 
        ? `https://${tenant.custom_domain}` 
        : `https://www.dentalva.ar`
    const reservaUrl = `${baseUrl}/reservar?slug=${tenant?.slug || 'alvarez'}`

    // ─────────────────────────────────────────────────────────────
    // 1. GESTIÓN DE DNI DETECTADO (Búsqueda autónoma de turno)
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
                `Estado actual: *${turno.estado}*\n` +
                `¿Deseás confirmar tu asistencia o reprogramar?`

            await enviarBotonesWhatsApp(creds, cleanPhone, mensajeTurno, [
                { id: `CONFIRMAR_TURNO_${turno.id}`, title: '✅ Confirmar Turno' },
                { id: `REPROGRAMAR_TURNO_${turno.id}`, title: '🔄 Reprogramar' },
                { id: `CANCELAR_TURNO_${turno.id}`, title: '❌ Cancelar' }
            ])
            return { handled: true, action: 'turno_dni_encontrado' }
        } else {
            // El DNI es válido pero no tiene turno activo futuro
            const msgNoTurno = `🔎 *Información de Turnos*\n\n` +
                `No encontramos turnos futuros activos asociados al DNI *${dniDetectado}*.\n\n` +
                `¿Querés reservar un nuevo turno ahora? Podés hacerlo de forma inmediata desde nuestro portal online:\n` +
                `👉 ${reservaUrl}`

            await enviarBotonesWhatsApp(creds, cleanPhone, msgNoTurno, [
                { id: 'SACAR_TURNO_NUEVO', title: '📅 Reservar Turno' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ])
            return { handled: true, action: 'dni_sin_turno' }
        }
    }

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
        // Primero intentamos buscarlo automáticamente por su número de WhatsApp
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
                `🦷 Especialidad: *${trat?.nombre || 'Consulta'}*\n` +
                `📍 Lugar: *${direccionClinica}*\n\n` +
                `Por favor concurrí 5 minutos antes con tu DNI.`

            await enviarBotonesWhatsApp(creds, cleanPhone, mensaje, [
                { id: `CONFIRMAR_TURNO_${turnoPorTelefono.id}`, title: '✅ Confirmar' },
                { id: `REPROGRAMAR_TURNO_${turnoPorTelefono.id}`, title: '🔄 Reprogramar' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ])
            return { handled: true, action: 'turno_consultado_por_telefono' }
        }

        // Si no lo encontramos por teléfono (escribe familiar o número distinto):
        const pedirDniMsg = `📋 *Localizador de Turnos*\n\n` +
            `Para ubicar tu turno en la agenda al instante, por favor **escribí tu número de DNI** (o el del paciente si estás consultando por un familiar) sin puntos ni letras.\n\n` +
            `_Ejemplo: 38452109_`

        await enviarTextoWhatsApp(creds, cleanPhone, pedirDniMsg)
        return { handled: true, action: 'solicito_dni_localizador' }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. INTENCIÓN: SACAR TURNO NUEVO
    // ─────────────────────────────────────────────────────────────
    const pideTurnoNuevo = 
        normText.includes('sacar turno') ||
        normText.includes('pedir turno') ||
        normText.includes('nuevo turno') ||
        normText.includes('quiero un turno') ||
        normText.includes('solicitar turno') ||
        normText.includes('turno para') ||
        buttonPayload === 'SACAR_TURNO_NUEVO' ||
        buttonPayload === 'MENU_TURNOS'

    if (pideTurnoNuevo) {
        console.log(`[WA AUTO-FLOW] Petición de turno nuevo por ${cleanPhone}...`)
        const textoTurno = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
            `Podés elegir el día, horario y profesional que más te convenga en tiempo real desde nuestro portal digital:\n\n` +
            `👉 *Reservá tu turno aquí:* ${reservaUrl}\n\n` +
            `✨ Es rápido, elegís el horario exacto y te llega la confirmación automática por WhatsApp.\n\n` +
            `¿O preferís consultar por una urgencia con dolor?`

        await enviarBotonesWhatsApp(creds, cleanPhone, textoTurno, [
            { id: 'CONSULTAR_MI_TURNO', title: '🔎 Ya tengo turno' },
            { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Tengo Urgencia' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ])
        return { handled: true, action: 'enviado_link_reserva' }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. INTENCIÓN: FAQ - DIRECCIÓN, UBICACIÓN Y CÓMO LLEGAR
    // ─────────────────────────────────────────────────────────────
    const pideUbicacion = 
        normText.includes('donde queda') ||
        normText.includes('donde estan') ||
        normText.includes('direccion') ||
        normText.includes('ubicacion') ||
        normText.includes('como llego') ||
        normText.includes('calle') ||
        buttonPayload === 'FAQ_UBICACION'

    if (pideUbicacion) {
        console.log(`[WA AUTO-FLOW] Consulta de ubicación por ${cleanPhone}...`)
        const msgDireccion = `📍 *Ubicación de ${nombreClinica}*\n\n` +
            `Estamos en: *${direccionClinica}*.\n\n` +
            `🕐 *Horarios de atención:*\n` +
            `Lunes a Viernes de 09:00 a 20:00 hs.\n` +
            `Sábados de 09:00 a 13:00 hs.\n\n` +
            `¿En qué más podemos ayudarte?`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgDireccion, [
            { id: 'SACAR_TURNO_NUEVO', title: '📅 Sacar Turno' },
            { id: 'FAQ_PREPAGAS', title: '🩺 Obras Sociales' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ])
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
        console.log(`[WA AUTO-FLOW] Consulta de obras sociales por ${cleanPhone}...`)
        // Consultar obras sociales activas en la BD del tenant
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
            `💳 También atendemos de forma particular y emitimos factura oficial para reintegro con tu cobertura.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgObras, [
            { id: 'SACAR_TURNO_NUEVO', title: '📅 Sacar Turno' },
            { id: 'FAQ_PRECIOS', title: '💳 Medios de Pago' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ])
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
        buttonPayload === 'FAQ_PRECIOS' ||
        buttonPayload === 'MENU_INFO_GENERAL'

    if (pidePrecios) {
        console.log(`[WA AUTO-FLOW] Consulta de precios/pagos por ${cleanPhone}...`)
        const msgPrecios = `💳 *Aranceles y Medios de Pago — ${nombreClinica}*\n\n` +
            `• *Medios de pago aceptados:* Efectivo, Transferencia bancaria, Tarjetas de Débito y Crédito (consultá planes en cuotas).\n\n` +
            `🔍 *Presupuestos y Diagnósticos:*\n` +
            `Para tratamientos como ortodoncia, implantes, prótesis o extracciones, se realiza una primera consulta diagnóstica para evaluar radiografías y darte un presupuesto exacto y a medida.\n\n` +
            `¿Deseás agendar una consulta de valoración inicial?`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgPrecios, [
            { id: 'SACAR_TURNO_NUEVO', title: '📅 Agendar Consulta' },
            { id: 'FAQ_UBICACION', title: '📍 Dónde estamos' },
            { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
        ])
        return { handled: true, action: 'faq_precios' }
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

        // Push a administradores
        try {
            const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
            await sendPushToRole('admin', tenantId, '🚨 Reclamo Prioritario WhatsApp', `Reclamo de +${cleanPhone}. Revisar mensajes urgente.`, '/mensajes')
        } catch (e) {}

        const msgEmpatia = `Estimado/a, lamentamos sinceramente cualquier inconveniente.\n\n` +
            `Tu mensaje fue derivado con **prioridad alta** a la administración de ${nombreClinica}. Una persona de nuestro equipo se comunicará por este medio a la brevedad para darte una solución.`

        await enviarTextoWhatsApp(creds, cleanPhone, msgEmpatia)
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

        await enviarTextoWhatsApp(creds, cleanPhone, msgRecepcion)
        return { handled: true, action: 'derivado_recepcion' }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. MENÚ PRINCIPAL POR DEFECTO
    // ─────────────────────────────────────────────────────────────
    if (buttonPayload === 'MENU_PRINCIPAL' || normText.includes('menu') || normText.includes('hola') || normText.includes('buen dia') || normText.includes('buenas tardes')) {
        await enviarMenuPrincipalAutonomo(creds, cleanPhone, nombreClinica)
        return { handled: true, action: 'menu_principal' }
    }

    return { handled: false }
}

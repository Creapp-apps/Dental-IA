import { createAdminClient } from '@/lib/supabase/admin'
import { esMensajeDeUrgencia, getTriageCategorias, enviarMenuTriageWhatsApp } from '@/lib/whatsapp-guardia'
import { getTurnosDisponibles, crearReservaPublica } from '@/lib/actions/reservas'

export interface WhatsAppCreds {
    phoneNumberId: string
    accessToken: string
}

interface EstadoReservaConversacional {
    paso: 'PIDIENDO_NOMBRE' | 'PIDIENDO_DNI'
    fecha: string
    hora: string
    fechaLegible: string
    nombre?: string
    apellido?: string
    expiresAt: number
}

// Memoria de corto plazo para estados conversacionales (30 min TTL)
const conversacionReservaMemory = new Map<string, EstadoReservaConversacional>()

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
        return true
    } catch (err) {
        console.error('[WA AUTO-FLOW] Excepción enviando botones interactivos:', err)
        return false
    }
}

/**
 * Busca los próximos 3 slots disponibles en la agenda y genera botones interactivos optimizados.
 */
export async function obtenerProximosTresSlots(tenantSlug: string): Promise<Array<{
    fecha: string
    hora: string
    fechaLegible: string
    btnTitulo: string
    payload: string
}>> {
    const disponibilidad = await getTurnosDisponibles(tenantSlug)
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
            if (slotsResult.length >= 3) break

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

        if (slotsResult.length >= 3) break
    }

    return slotsResult
}

/**
 * Busca si ya existe un paciente registrado con este teléfono para facilitarle la reserva en 1 solo clic.
 */
export async function buscarPacientePorTelefono(tenantId: string, phone: string) {
    const admin = createAdminClient()
    const cleanPhone = phone.replace(/\D/g, '')

    const { data: pacientes } = await admin
        .from('pacientes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('tenant_id', tenantId)

    const match = (pacientes || []).find(p => 
        p.telefono && cleanPhone.includes(p.telefono.replace(/\D/g, '').slice(-8))
    )

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
        { id: 'MENU_TURNOS', title: '📅 Sacar / Ver Turno' },
        { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Urgencia / Dolor' },
        { id: 'MENU_INFO_GENERAL', title: 'ℹ️ Dirección y Precios' }
    ])
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

    const baseUrl = tenant?.custom_domain 
        ? `https://${tenant.custom_domain}` 
        : `https://www.dentalva.ar`
    const reservaUrl = `${baseUrl}/reservar?slug=${tenant?.slug || 'alvarez'}`

    // ─────────────────────────────────────────────────────────────
    // ESTADO CONVERSACIONAL EN CURSO (Máquina de estados de reserva)
    // ─────────────────────────────────────────────────────────────
    const estadoEnMemoria = conversacionReservaMemory.get(cleanPhone)
    const estadoActivo = (estadoEnMemoria && estadoEnMemoria.expiresAt > Date.now()) 
        ? estadoEnMemoria 
        : null

    // ── PASO 2: Paciente respondió su DNI (Confirmación final del turno) ──
    if (estadoActivo && estadoActivo.paso === 'PIDIENDO_DNI') {
        if (!dniDetectado) {
            await enviarTextoWhatsApp(
                creds,
                cleanPhone,
                `✍️ Por favor escribí solo los números de tu DNI (por ejemplo: *14234567*) para poder registrar tu turno en la agenda médica:`
            )
            return { handled: true, action: 'reintentar_dni' }
        }

        console.log(`[WA AUTO-FLOW] Confirmando reserva para ${estadoActivo.nombre} ${estadoActivo.apellido}, DNI: ${dniDetectado}`)
        
        // Llamar a crearReservaPublica
        const resultado = await crearReservaPublica({
            tenantSlug: tenant?.slug || 'alvarez',
            fecha: estadoActivo.fecha,
            hora: estadoActivo.hora,
            profesionalId: null, // Asignación automática inteligente
            nombre: estadoActivo.nombre || 'Paciente',
            apellido: estadoActivo.apellido || 'Reserva',
            dni: dniDetectado,
            telefono: cleanPhone,
            es_nuevo: 'si'
        })

        conversacionReservaMemory.delete(cleanPhone)

        if ((resultado as any)?.error) {
            console.warn('[WA AUTO-FLOW] Conflicto o error al confirmar turno:', (resultado as any).error)
            const msgError = `⚠️ El horario de las ${estadoActivo.hora} hs acaba de ser ocupado. No te preocupes, ¿te gustaría consultar los siguientes lugares disponibles?`
            await enviarBotonesWhatsApp(creds, cleanPhone, msgError, [
                { id: 'MENU_TURNOS', title: '📅 Ver otros turnos' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ])
            return { handled: true, action: 'conflicto_reserva' }
        }

        const msgExito = `✅ *¡Tu Turno quedó CONFIRMADO con éxito!* 🦷✨\n\n` +
            `👤 Paciente: *${estadoActivo.nombre} ${estadoActivo.apellido}* (DNI ${dniDetectado})\n` +
            `📅 Fecha: *${estadoActivo.fechaLegible}*\n` +
            `📍 Lugar: *${direccionClinica}*\n\n` +
            `🔔 Te enviaremos un recordatorio por este mismo chat el día anterior.\n` +
            `¡Te esperamos con gusto!`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgExito, [
            { id: 'MENU_INFO_GENERAL', title: '📍 Cómo llegar' },
            { id: 'MENU_PRINCIPAL', title: '👍 ¡Muchas gracias!' }
        ])
        return { handled: true, action: 'turno_creado_con_exito' }
    }

    // ── PASO 1: Paciente respondió su Nombre y Apellido ──
    if (estadoActivo && estadoActivo.paso === 'PIDIENDO_NOMBRE') {
        const { nombre, apellido } = limpiarNombreYApellido(textBody)
        console.log(`[WA AUTO-FLOW] Nombre recibido: ${nombre} ${apellido}`)

        // Actualizar estado a PIDIENDO_DNI
        conversacionReservaMemory.set(cleanPhone, {
            ...estadoActivo,
            paso: 'PIDIENDO_DNI',
            nombre,
            apellido,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        const msgPideDni = `🪪 ¡Muchas gracias, *${nombre}*!\n\n` +
            `Por último, por favor escribí tu número de **DNI** (sin puntos ni letras) para generar tu ficha médica:`

        await enviarTextoWhatsApp(creds, cleanPhone, msgPideDni)
        return { handled: true, action: 'nombre_recibido_pidiendo_dni' }
    }

    // ── CLIC EN BOTÓN DE SLOT DE RESERVA: SLOT_RES_YYYY-MM-DD_HH:MM ──
    if (buttonPayload?.startsWith('SLOT_RES_')) {
        const parts = buttonPayload.replace('SLOT_RES_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        // Verificar si el teléfono ya pertenece a un paciente registrado
        const pacienteExistente = await buscarPacientePorTelefono(tenantId, cleanPhone)

        if (pacienteExistente && pacienteExistente.dni) {
            // Ofrecer confirmación directa en 1 clic
            conversacionReservaMemory.set(cleanPhone, {
                paso: 'PIDIENDO_NOMBRE', // Por si decide ingresar otro
                fecha,
                hora,
                fechaLegible,
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
                { id: `CONFIRMAR_AUTO_${fecha}_${hora}_${pacienteExistente.dni}`, title: '✅ A mi nombre' },
                { id: `RESERVA_OTRA_PERSONA_${fecha}_${hora}`, title: '👤 Para otra persona' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Volver' }
            ])
            return { handled: true, action: 'ofrecida_confirmacion_auto_pct' }
        }

        // Si es un paciente nuevo o no registrado: Pedir Nombre
        conversacionReservaMemory.set(cleanPhone, {
            paso: 'PIDIENDO_NOMBRE',
            fecha,
            hora,
            fechaLegible,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        const msgPideNombre = `✍️ *¡Excelente elección!*\n\n` +
            `Reservamos para el:\n📅 *${fechaLegible}*\n\n` +
            `Para anotarte en la agenda del consultorio, por favor **escribí tu Nombre y Apellido**:`

        await enviarTextoWhatsApp(creds, cleanPhone, msgPideNombre)
        return { handled: true, action: 'slot_elegido_pidiendo_nombre' }
    }

    // ── CONFIRMACIÓN AUTOMÁTICA EN 1 CLIC PARA PACIENTE EXISTENTE ──
    if (buttonPayload?.startsWith('CONFIRMAR_AUTO_')) {
        const parts = buttonPayload.replace('CONFIRMAR_AUTO_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]
        const dni = parts[2]

        const pacienteExistente = await buscarPacientePorTelefono(tenantId, cleanPhone)
        const nombre = pacienteExistente?.nombre || 'Paciente'
        const apellido = pacienteExistente?.apellido || ''

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        const resultado = await crearReservaPublica({
            tenantSlug: tenant?.slug || 'alvarez',
            fecha,
            hora,
            profesionalId: null,
            nombre,
            apellido,
            dni,
            telefono: cleanPhone,
            es_nuevo: 'no'
        })

        conversacionReservaMemory.delete(cleanPhone)

        const msgExito = `✅ *¡Tu Turno quedó CONFIRMADO con éxito!* 🦷✨\n\n` +
            `👤 Paciente: *${nombre} ${apellido}* (DNI ${dni})\n` +
            `📅 Fecha: *${fechaLegible}*\n` +
            `📍 Lugar: *${direccionClinica}*\n\n` +
            `🔔 Te enviaremos un recordatorio por este mismo chat el día anterior.\n` +
            `¡Te esperamos!`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgExito, [
            { id: 'MENU_INFO_GENERAL', title: '📍 Cómo llegar' },
            { id: 'MENU_PRINCIPAL', title: '👍 ¡Muchas gracias!' }
        ])
        return { handled: true, action: 'reserva_auto_confirmada_1click' }
    }

    // ── RESERVA PARA OTRA PERSONA (FAMILIAR) ──
    if (buttonPayload?.startsWith('RESERVA_OTRA_PERSONA_')) {
        const parts = buttonPayload.replace('RESERVA_OTRA_PERSONA_', '').split('_')
        const fecha = parts[0]
        const hora = parts[1]

        const [y, m, diaNum] = fecha.split('-').map(Number)
        const dateObj = new Date(y, m - 1, diaNum)
        const diasAbrev = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const fechaLegible = `${diasAbrev[dateObj.getDay()]} ${diaNum} de ${meses[m - 1]} a las ${hora} hs`

        conversacionReservaMemory.set(cleanPhone, {
            paso: 'PIDIENDO_NOMBRE',
            fecha,
            hora,
            fechaLegible,
            expiresAt: Date.now() + 30 * 60 * 1000
        })

        await enviarTextoWhatsApp(
            creds,
            cleanPhone,
            `✍️ Perfecto. Por favor escribí el **Nombre y Apellido del paciente** que va a asistir a la consulta:`
        )
        return { handled: true, action: 'pidiendo_nombre_familiar' }
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
            ])
            return { handled: true, action: 'turno_dni_encontrado' }
        } else {
            // El DNI es válido pero no tiene turno activo futuro: ofrecer sacar turno inmediatamente
            const msgNoTurno = `🔎 *Información de Turnos*\n\n` +
                `No encontramos turnos pendientes para el DNI *${dniDetectado}*.\n\n` +
                `¿Deseás agendar una consulta ahora directamente por acá?`

            await enviarBotonesWhatsApp(creds, cleanPhone, msgNoTurno, [
                { id: 'MENU_TURNOS', title: '📅 Sacar Turno Aquí' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ])
            return { handled: true, action: 'dni_sin_turno' }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. RADAR AMPLIO: SACAR TURNO / DISPONIBILIDAD CONVERSACIONAL
    // ─────────────────────────────────────────────────────────────
    const pideTurno = 
        normText.includes('sacar turno') ||
        normText.includes('pedir turno') ||
        normText.includes('quiero turno') ||
        normText.includes('nuevo turno') ||
        normText.includes('agendar') ||
        normText.includes('consulta') ||
        normText.includes('turno') ||
        normText.includes('lugar') ||
        normText.includes('atenderme') ||
        normText.includes('hacerme ver') ||
        normText.includes('horario disponible') ||
        buttonPayload === 'SACAR_TURNO_NUEVO' ||
        buttonPayload === 'MENU_TURNOS'

    if (pideTurno) {
        console.log(`[WA AUTO-FLOW] Petición de turno conversacional por ${cleanPhone}...`)
        
        // Obtener los 3 primeros slots reales sin superposición
        const slotsCandidatos = await obtenerProximosTresSlots(tenant?.slug || 'alvarez')

        if (slotsCandidatos.length > 0) {
            const listaTxt = slotsCandidatos.map((s, idx) => `${idx + 1}️⃣ *${s.fechaLegible}*`).join('\n')
            
            const textoPropuesta = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
                `Para que elijas el que más cómodo te quede, estos son los primeros horarios disponibles más cercanos:\n\n` +
                `${listaTxt}\n\n` +
                `👇 *Tocá el botón del horario que prefieras:*`

            const botonesSlots = slotsCandidatos.map(s => ({
                id: s.payload,
                title: s.btnTitulo
            }))

            await enviarBotonesWhatsApp(creds, cleanPhone, textoPropuesta, botonesSlots)
            return { handled: true, action: 'ofrecidos_slots_conversacionales' }
        } else {
            // Fallback si no hay slots en los próximos días
            const msgSinSlots = `🗓️ *Reserva de Turnos — ${nombreClinica}*\n\n` +
                `En este momento los primeros días están completos. Podés ver las semanas siguientes en nuestro portal digital:\n` +
                `👉 ${reservaUrl}\n\n` +
                `O si tenés dolor, podés activar la guardia de urgencia:`

            await enviarBotonesWhatsApp(creds, cleanPhone, msgSinSlots, [
                { id: 'ACTIVAR_GUARDIA_URGENCIA', title: '🚨 Tengo Urgencia' },
                { id: 'MENU_PRINCIPAL', title: '⬅️ Menú Principal' }
            ])
            return { handled: true, action: 'sin_slots_link_portal' }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. INTENCIÓN: CONSULTAR "¿CUÁNDO ES MI TURNO?" O "¿A QUÉ HORA?"
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
            ])
            return { handled: true, action: 'turno_consultado_por_telefono' }
        }

        const pedirDniMsg = `📋 *Localizador de Turnos*\n\n` +
            `Para ubicar tu turno en la agenda al instante, por favor **escribí tu número de DNI** (sin puntos ni letras).\n\n` +
            `_Ejemplo: 38452109_`

        await enviarTextoWhatsApp(creds, cleanPhone, pedirDniMsg)
        return { handled: true, action: 'solicito_dni_localizador' }
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
        const msgDireccion = `📍 *Ubicación de ${nombreClinica}*\n\n` +
            `Estamos en: *${direccionClinica}*.\n\n` +
            `🕐 *Horarios de atención:*\n` +
            `Lunes a Viernes de 09:00 a 20:00 hs.\n` +
            `Sábados de 09:00 a 13:00 hs.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgDireccion, [
            { id: 'MENU_TURNOS', title: '📅 Sacar Turno' },
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
        const msgPrecios = `💳 *Aranceles y Medios de Pago — ${nombreClinica}*\n\n` +
            `• *Medios de pago:* Efectivo, Transferencia bancaria, Tarjetas de Débito y Crédito en cuotas.\n\n` +
            `🔍 *Presupuestos y Diagnósticos:*\n` +
            `Para tratamientos como ortodoncia, prótesis o implantes, se realiza una primera consulta diagnóstica para evaluar tu caso puntual y darte un presupuesto a medida.`

        await enviarBotonesWhatsApp(creds, cleanPhone, msgPrecios, [
            { id: 'MENU_TURNOS', title: '📅 Agendar Consulta' },
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

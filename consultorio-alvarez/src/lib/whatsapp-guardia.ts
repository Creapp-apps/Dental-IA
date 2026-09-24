import { createAdminClient } from '@/lib/supabase/admin'
import { getTurnosDisponibles } from '@/lib/actions/reservas'

export interface TriageItem {
    id: string
    categoria: string
    titulo_boton: string
    tips_alivio: string
    advertencias: string
    prioridad_agenda: number
}

const PALABRAS_CLAVE_URGENCIA = [
    'urgencia',
    'urgente',
    'guardia',
    'dolor',
    'muela',
    'duele',
    'emergencia',
    'sangre',
    'sangrado',
    'fractura',
    'roto',
    'rompio',
    'partio',
    'infeccion',
    'flemón',
    'flemon',
    'hinchado',
    'hinchazon',
    'bracket',
    'alambre',
    'accidente',
    'golpe',
    'calmante'
]

/**
 * Detecta si el texto del paciente sugiere una urgencia o pedido de guardia.
 */
export function esMensajeDeUrgencia(texto: string): boolean {
    if (!texto) return false
    const lower = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    return PALABRAS_CLAVE_URGENCIA.some(palabra => lower.includes(palabra))
}

/**
 * Determina si el momento actual está fuera del horario comercial del consultorio.
 */
export function esHorarioFueraDeAtencion(horarios: any[]): boolean {
    if (!Array.isArray(horarios) || horarios.length === 0) return true

    const now = new Date()
    // Hora local Argentina (UTC-3)
    const localStr = now.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const [, timePart] = localStr.split(' ')
    const [currH, currM] = timePart.split(':').map(Number)
    const currentMinutes = currH * 60 + currM

    // Día de la semana (0: domingo, 1: lunes, ...)
    const dayOfWeek = new Date(localStr.replace(' ', 'T')).getDay()

    const horarioHoy = horarios.find(h => h.dia === dayOfWeek && !h.profesional_id)
    if (!horarioHoy || !horarioHoy.activo) {
        return true // Hoy la clínica está cerrada
    }

    // Verificar franjas horarias
    if (horarioHoy.apertura_manana && horarioHoy.cierre_manana) {
        const [apManH, apManM] = horarioHoy.apertura_manana.split(':').map(Number)
        const [ciManH, ciManM] = horarioHoy.cierre_manana.split(':').map(Number)
        const enManana = currentMinutes >= apManH * 60 + apManM && currentMinutes < ciManH * 60 + ciManM

        let enTarde = false
        if (horarioHoy.apertura_tarde && horarioHoy.cierre_tarde) {
            const [apTarH, apTarM] = horarioHoy.apertura_tarde.split(':').map(Number)
            const [ciTarH, ciTarM] = horarioHoy.cierre_tarde.split(':').map(Number)
            enTarde = currentMinutes >= apTarH * 60 + apTarM && currentMinutes < ciTarH * 60 + ciTarM
        }

        return !enManana && !enTarde
    } else if (horarioHoy.apertura && horarioHoy.cierre) {
        const [apH, apM] = horarioHoy.apertura.split(':').map(Number)
        const [ciH, ciM] = horarioHoy.cierre.split(':').map(Number)
        return currentMinutes < apH * 60 + apM || currentMinutes >= ciH * 60 + ciM
    }

    return false
}

/**
 * Obtiene las categorías de triage configuradas para el tenant.
 */
export async function getTriageCategorias(tenantId: string): Promise<TriageItem[]> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('triage_guardia_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('activo', true)
        .order('prioridad_agenda', { ascending: true })

    return (data as TriageItem[]) || []
}

/**
 * Obtiene el detalle clínico de una categoría específica de triage.
 */
export async function getTriagePorCategoria(tenantId: string, categoria: string): Promise<TriageItem | null> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('triage_guardia_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('categoria', categoria)
        .eq('activo', true)
        .maybeSingle()

    return data || null
}

/**
 * Algoritmo Fast-Slot: Encuentra el primer turno libre disponible en la agenda.
 */
export async function buscarPrimerTurnoLibre(tenantId: string): Promise<{
    fecha: string
    hora: string
    fechaFormateada: string
    nombreDia: string
} | null> {
    const admin = createAdminClient()
    const { data: tenant } = await admin
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .single()

    if (!tenant?.slug) return null

    try {
        const disponibilidad = await getTurnosDisponibles(tenant.slug)
        if (!disponibilidad || disponibilidad.length === 0) return null

        for (const dia of disponibilidad) {
            if (dia.slots && dia.slots.length > 0) {
                const primerSlot = dia.slots[0]
                const [year, month, day] = dia.date.split('-').map(Number)
                const fechaObj = new Date(year, month - 1, day)
                
                const nombreDia = fechaObj.toLocaleDateString('es-AR', { weekday: 'long' })
                const diaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)
                const fechaFormateada = `${diaCapitalizado} ${day}/${month}`

                return {
                    fecha: dia.date,
                    hora: primerSlot,
                    fechaFormateada,
                    nombreDia: diaCapitalizado
                }
            }
        }

        return null
    } catch (err) {
        console.error('[FAST-SLOT] Error al calcular disponibilidad:', err)
        return null
    }
}

/**
 * Envía el menú principal de WhatsApp con botones de acción directa (Urgencia o Recepción).
 */
export async function enviarMenuPrincipalWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    nombreConsultorio: string = 'Consultorio Álvarez'
): Promise<boolean> {
    const texto = `🦷 *${nombreConsultorio} — Asistente Digital*\n\n` +
        `¡Hola! ¿En qué te podemos ayudar hoy?\n` +
        `Por favor seleccioná una opción para brindarte atención inmediata:`

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: texto },
                    action: {
                        buttons: [
                            {
                                type: 'reply',
                                reply: {
                                    id: 'ACTIVAR_GUARDIA_URGENCIA',
                                    title: '🚨 Urgencia / Guardia'
                                }
                            },
                            {
                                type: 'reply',
                                reply: {
                                    id: 'HABLAR_RECEPCIONISTA',
                                    title: '💬 Hablar con Recepción'
                                }
                            }
                        ]
                    }
                }
            })
        })

        const res = await response.json()
        if (!response.ok) {
            console.error('[WA GUARDIA] Error al enviar menú principal interactivo:', res)
            return false
        }
        return true
    } catch (err) {
        console.error('[WA GUARDIA] Excepción al enviar menú principal interactivo:', err)
        return false
    }
}

/**
 * Envía el menú interactivo de triage por WhatsApp Cloud API.
 */
export async function enviarMenuTriageWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    categorias: TriageItem[],
    mensajeBienvenida?: string
): Promise<boolean> {
    const defaultTexto = mensajeBienvenida || 
        `🚨 *Protocolo de Guardia Odontológica Activado*\n\n` +
        `Entendemos tu urgencia y estamos para asistirte de inmediato.\n` +
        `Podés describirnos por este chat qué te está sucediendo (o enviarnos una foto o audio de la zona afectada).\n\n` +
        `Para brindarte consejos médicos de alivio inmediato y asignarte el turno prioritario más cercano, también podés seleccionar tu situación:`

    // Meta permite hasta 3 botones en mensajes interactivos tipo 'button'
    const topCategorias = categorias.slice(0, 3)

    if (topCategorias.length === 0) return false

    const buttons = topCategorias.map((cat) => ({
        type: 'reply',
        reply: {
            id: `TRIAGE_CAT_${cat.categoria}`,
            // Meta limita el título del botón a 20 caracteres
            title: cat.titulo_boton.length > 20 ? cat.titulo_boton.substring(0, 20) : cat.titulo_boton
        }
    }))

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: defaultTexto },
                    action: { buttons }
                }
            })
        })

        const res = await response.json()
        if (!response.ok) {
            console.error('[WA GUARDIA] Error al enviar menú interactivo:', res)
            return false
        }
        return true
    } catch (err) {
        console.error('[WA GUARDIA] Excepción al despachar menú interactivo:', err)
        return false
    }
}

/**
 * Envía mensaje de texto con los tips de alivio y propuesta de turno más cercano.
 */
export async function enviarTipsYPropuestaTurno(
    phoneNumberId: string,
    accessToken: string,
    toPhone: string,
    triageItem: TriageItem,
    primerTurno: { fechaFormateada: string; hora: string; fecha: string } | null
): Promise<boolean> {
    let cuerpoTexto = `🩺 *CONSEJOS DE ALIVIO INMEDIATO:*\n\n`
    cuerpoTexto += `${triageItem.tips_alivio}\n\n`
    cuerpoTexto += `${triageItem.advertencias}\n\n`
    cuerpoTexto += `─────────────────────\n`

    if (primerTurno) {
        cuerpoTexto += `🗓️ *PRIMER TURNO DISPONIBLE:*\n`
        cuerpoTexto += `Te podemos atender el *${primerTurno.fechaFormateada} a las ${primerTurno.hora} hs*.\n\n`
        cuerpoTexto += `¿Deseás confirmar este turno o preferís que una recepcionista te contacte en cuanto inicie la atención?`
    } else {
        cuerpoTexto += `Tu consulta de urgencia quedó registrada. Una recepcionista se comunicará con vos ni bien inicie el horario de atención para asignarte un sobreturno prioritario.`
    }

    const buttons = [
        ...(primerTurno ? [{
            type: 'reply',
            reply: {
                id: `CONFIRMAR_GUARDIA_${primerTurno.fecha}_${primerTurno.hora}`,
                title: '✅ Confirmar Turno'
            }
        }] : []),
        {
            type: 'reply',
            reply: {
                id: 'HABLAR_RECEPCIONISTA',
                title: '💬 Hablar con Recepción'
            }
        }
    ]

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: cuerpoTexto },
                    action: { buttons }
                }
            })
        })

        const res = await response.json()
        if (!response.ok) {
            console.error('[WA GUARDIA] Error al enviar tips y propuesta:', res)
            return false
        }
        return true
    } catch (err) {
        console.error('[WA GUARDIA] Excepción al enviar tips y propuesta:', err)
        return false
    }
}

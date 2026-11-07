// Lógica pura para agrupar, rotular y rutear las notificaciones del Centro de Alertas.
// Reusa el vocabulario de motivos de WhatsApp (triage.ts) y agrega los operativos / de sistema.
import { MOTIVOS, type Prioridad } from './triage'

export type GrupoAlerta = 'urgente' | 'requiere_respuesta' | 'agenda' | 'sistema'

/** Motivos operativos de agenda (grupo verde). */
export const MOTIVOS_AGENDA = ['turno_confirmado', 'turno_cancelado', 'turno_reprogramado_real', 'reserva_web']
/** Motivos de sistema / administrativos (grupo gris). */
export const MOTIVOS_SISTEMA = ['pago_senia', 'vencimiento', 'sistema']

// Etiquetas propias de notificaciones (operativas / sistema).
// Las de WhatsApp (adjunto, dato clínico, etc.) salen de MOTIVOS de triage.
const ETIQUETAS_ALERTA: Record<string, string> = {
    turno_confirmado: '✅ Confirmación',
    turno_cancelado: '❌ Cancelación',
    turno_reprogramado_real: '📅 Reprogramación',
    reserva_web: '✨ Reserva online',
    pago_senia: '💳 Pago / seña',
    vencimiento: '⏳ Vencimiento',
    sistema: '🔔 Sistema',
    revisar: '📋 Revisar',
}

/**
 * Grupo del Centro de Alertas. El orden de las reglas importa: la prioridad roja/amarilla
 * manda (lo que hay que responder), y un motivo de sistema gana sobre el verde operativo.
 */
export function grupoNotificacion(prioridad: Prioridad | null, motivo: string | null): GrupoAlerta {
    if (prioridad === 'rojo') return 'urgente'
    if (prioridad === 'amarillo') return 'requiere_respuesta'
    if (motivo && MOTIVOS_SISTEMA.includes(motivo)) return 'sistema'
    if (prioridad === 'verde' || (motivo && MOTIVOS_AGENDA.includes(motivo))) return 'agenda'
    return 'sistema'
}

/** Badge en palabras para la notificación. */
export function etiquetaNotificacion(prioridad: Prioridad | null, motivo: string | null): string {
    if (motivo && ETIQUETAS_ALERTA[motivo]) return ETIQUETAS_ALERTA[motivo]
    if (motivo && MOTIVOS[motivo]?.etiqueta) return MOTIVOS[motivo].etiqueta
    // Sin motivo clasificado: rótulo genérico por grupo.
    const g = grupoNotificacion(prioridad, motivo)
    return g === 'urgente'
        ? '🚨 Urgente'
        : g === 'requiere_respuesta'
            ? '💬 Requiere respuesta'
            : g === 'agenda'
                ? '📅 Agenda'
                : '🔔 Sistema'
}

/**
 * A dónde navega la notificación: las de conversación abren el chat en Mensajes
 * (`referencia_id` = id de conversación), las de turno abren la Agenda.
 */
export function rutaNotificacion(grupo: GrupoAlerta, referenciaId: string | null): string {
    if (grupo === 'urgente' || grupo === 'requiere_respuesta') {
        return referenciaId ? `/mensajes?c=${referenciaId}` : '/mensajes'
    }
    if (grupo === 'agenda') return referenciaId ? `/agenda?turno=${referenciaId}` : '/agenda'
    return '/dashboard'
}

import type { EsquemaHorario } from '@/types'

export const HORIZONTE_RECURRENTE = 21
export const HORIZONTE_FECHAS = 90

export type ModoDisponibilidad = 'recurrente' | 'fechas'

export function capHorizonte(modo: ModoDisponibilidad): number {
    return modo === 'fechas' ? HORIZONTE_FECHAS : HORIZONTE_RECURRENTE
}

export function horizonteMaximo(modos: ModoDisponibilidad[]): number {
    return modos.includes('fechas') ? HORIZONTE_FECHAS : HORIZONTE_RECURRENTE
}

export function fechaEnLista(fechas: string[] | null | undefined, dateStr: string): boolean {
    if (!fechas || fechas.length === 0) return false
    return fechas.includes(dateStr)
}

export function tieneFechasFuturas(fechas: string[] | null | undefined, todayStr: string): boolean {
    if (!fechas || fechas.length === 0) return false
    return fechas.some((f) => f >= todayStr)
}

export function esquemaFechasAHorario(
    esquema: EsquemaHorario | null | undefined,
): (EsquemaHorario & { activo: boolean }) | null {
    if (!esquema) return null
    return { ...esquema, activo: true }
}

export interface TurnoRango {
    profesional_id: string | null
    startMs: number
    endMs: number
}

/**
 * ¿El slot [slotStartMs, slotEndMs) choca con algún turno existente?
 *
 * Sin sillón compartido la colisión es por profesional: sólo chocan los turnos
 * del MISMO `profId` (agendas paralelas, varios boxes). Con `sillonCompartido`
 * el recurso físico es único: CUALQUIER turno que se solape bloquea el horario
 * para todos los profesionales, aunque esté a nombre de otro (incluidos los
 * turnos sin profesional asignado). Evita el doble-booking de un consultorio de
 * un solo sillón.
 */
export function slotColisiona(
    turnos: TurnoRango[],
    slotStartMs: number,
    slotEndMs: number,
    profId: string,
    sillonCompartido: boolean,
): boolean {
    return turnos.some((t) =>
        (sillonCompartido || t.profesional_id === profId) &&
        t.startMs < slotEndMs &&
        t.endMs > slotStartMs,
    )
}

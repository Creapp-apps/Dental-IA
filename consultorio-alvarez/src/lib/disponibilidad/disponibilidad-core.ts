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

/**
 * Política de reintentos del outbox. Funciones puras: no tocan Dexie ni la red,
 * así se pueden testear y razonar sin levantar nada.
 */

export type EstadoOutbox = 'PENDIENTE' | 'ATASCADO'

export interface ItemElegible {
    status: EstadoOutbox
    next_attempt_at?: string | null
}

/**
 * Espera antes del próximo intento, indexada por el número de intento ya
 * consumido: el primer fallo espera 5 s, el sexto espera 1 h. Agotada la
 * escalera, el item deja de reintentarse.
 */
export const ESPERAS_MS: readonly number[] = [
    5_000,      // 5 s
    15_000,     // 15 s
    60_000,     // 1 m
    300_000,    // 5 m
    900_000,    // 15 m
    3_600_000,  // 1 h
]

/**
 * Momento del próximo intento, o null si ya no quedan.
 * `attempts` es el contador YA incrementado por el fallo actual.
 */
export function calcularProximoIntento(attempts: number, ahora: Date): string | null {
    if (!Number.isInteger(attempts) || attempts < 1) return null

    const espera = ESPERAS_MS[attempts - 1]
    if (espera === undefined) return null

    return new Date(ahora.getTime() + espera).toISOString()
}

/**
 * Un item se sube si está pendiente y su espera venció.
 *
 * Una fecha ilegible cuenta como vencida a propósito: un valor corrupto tiene
 * que provocar un reintento, no dejar el cambio enterrado para siempre.
 */
export function esElegible(item: ItemElegible, ahora: Date): boolean {
    if (item.status !== 'PENDIENTE') return false
    if (!item.next_attempt_at) return true

    const momento = new Date(item.next_attempt_at).getTime()
    if (Number.isNaN(momento)) return true

    return momento <= ahora.getTime()
}

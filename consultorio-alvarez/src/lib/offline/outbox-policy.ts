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

export interface ItemDeEntidad {
    entity: string
    entity_id: string
}

export interface CambioDeEstado {
    status: EstadoOutbox
    attempts: number
    next_attempt_at: string | null
    last_error_code?: string
    error_message?: string
}

/**
 * La cola se sube en el orden en que el odontólogo hizo los cambios. El índice
 * de Dexie no garantiza ese orden, y dos operaciones sobre la misma fila
 * aplicadas al revés dejan la base inconsistente.
 */
export function ordenarCola<T extends { id?: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        if (a.id === undefined) return 1
        if (b.id === undefined) return -1
        return a.id - b.id
    })
}

/**
 * Saca de la tanda los items de una fila que ya tiene algo atascado.
 *
 * Aplicar una modificación encima de una creación que nunca entró deja la base
 * inconsistente. El bloqueo es por par entity + entity_id: dos tablas distintas
 * no se bloquean entre sí aunque compartan el identificador.
 */
export function filtrarBloqueados<T extends ItemDeEntidad>(
    elegibles: T[],
    atascados: ItemDeEntidad[]
): T[] {
    if (atascados.length === 0) return elegibles

    const clave = (i: ItemDeEntidad) => `${i.entity}::${i.entity_id}`
    const bloqueadas = new Set(atascados.map(clave))

    return elegibles.filter(i => !bloqueadas.has(clave(i)))
}

/**
 * Estado del item después de un fallo de subida.
 * `attemptsActuales` es el contador ANTES de contar este fallo.
 */
export function siguienteEstadoTrasFallo(
    attemptsActuales: number,
    retriable: boolean,
    errorCode: string | undefined,
    errorMessage: string | undefined,
    ahora: Date
): CambioDeEstado {
    const attempts = (Number.isInteger(attemptsActuales) ? attemptsActuales : 0) + 1

    const next_attempt_at = retriable ? calcularProximoIntento(attempts, ahora) : null

    return {
        status: next_attempt_at ? 'PENDIENTE' : 'ATASCADO',
        attempts,
        next_attempt_at,
        last_error_code: errorCode,
        error_message: errorMessage,
    }
}

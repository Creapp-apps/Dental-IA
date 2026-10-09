/**
 * Qué fallos de Supabase tiene sentido reintentar.
 *
 * La lista enumera los PERMANENTES y todo lo demás se reintenta. Es a
 * propósito: marcar atascado al primer error raro avisa antes, pero llena el
 * widget de rojo por hipos que se arreglaban solos, y un indicador que alarma
 * de más se vuelve ruido que nadie mira. Como el tope son siete intentos, un
 * error desconocido que además sea permanente igual termina visible en poco
 * más de una hora.
 */
export const CODIGOS_PERMANENTES: ReadonlySet<string> = new Set([
    '23505',    // unique_violation: DNI o N° de historia clínica repetido
    '23503',    // foreign_key_violation: el paciente referenciado ya no existe
    '23502',    // not_null_violation: falta un dato obligatorio
    '23514',    // check_violation: viola una regla de la tabla
    '22P02',    // invalid_text_representation: UUID o número mal formado
    '42501',    // insufficient_privilege: RLS rechazó la operación
    '42703',    // undefined_column: la app quedó vieja respecto del esquema
    '42P01',    // undefined_table: idem
    'PGRST204', // la columna no está en el cache de esquema de PostgREST
])

/**
 * Reintentar un fallo permanente no lo arregla: sólo retrasa el momento en que
 * una persona se entera.
 */
export function esReintentable(code: string | null | undefined): boolean {
    if (!code) return true
    return !CODIGOS_PERMANENTES.has(code)
}

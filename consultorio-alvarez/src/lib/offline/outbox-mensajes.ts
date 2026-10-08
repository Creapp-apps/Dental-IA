import type { SyncOutboxItem } from './db'

/**
 * Códigos de Postgres traducidos a algo que un odontólogo pueda leer y actuar
 * en consecuencia. Un solo lugar, para que el widget no acumule condicionales.
 */
const MENSAJES: Record<string, string> = {
    '23505': 'Ya existe otro registro con ese dato, por ejemplo el mismo DNI o número de historia clínica.',
    '23503': 'El paciente al que pertenece este cambio ya no existe en la nube.',
    '23502': 'Falta completar un dato obligatorio.',
    '23514': 'Alguno de los datos no cumple con las reglas del sistema.',
    '22P02': 'Alguno de los datos tiene un formato inválido.',
    '42501': 'Tu usuario no tiene permiso para hacer este cambio.',
    '42703': 'La aplicación quedó desactualizada. Recargá la página.',
    '42P01': 'La aplicación quedó desactualizada. Recargá la página.',
    'PGRST204': 'La aplicación quedó desactualizada. Recargá la página.',
}

export function mensajeDeError(code: string | undefined, mensajeTecnico: string | undefined): string {
    if (code && MENSAJES[code]) return MENSAJES[code]
    if (mensajeTecnico) return mensajeTecnico
    return 'No se pudo subir el cambio a la nube.'
}

const ENTIDADES: Record<string, string> = {
    pacientes: 'Paciente',
    turnos: 'Turno',
    evoluciones: 'Evolución',
}

const OPERACIONES: Record<string, string> = {
    INSERT: 'alta',
    UPDATE: 'modificación',
    DELETE: 'eliminación',
}

/**
 * `etiqueta` la arma quien llama resolviendo entity_id contra la tabla local:
 * el nombre del paciente, la fecha del turno. Acá sólo se la enmarca.
 */
export function describirItem(
    item: Pick<SyncOutboxItem, 'entity' | 'operation'>,
    etiqueta: string
): string {
    const entidad = ENTIDADES[item.entity] ?? item.entity
    const operacion = OPERACIONES[item.operation] ?? item.operation

    return `${entidad} ${etiqueta} — ${operacion}`
}

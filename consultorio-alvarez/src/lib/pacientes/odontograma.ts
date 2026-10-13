// Notación FDI del odontograma según la dentición del paciente.
// ADULTO = dientes permanentes (11-48). NINO = temporarios / de leche (51-85).
// MIXTO = ambos (dentición mixta). Las marcas se guardan por número de pieza,
// así que un mismo paciente puede tener permanentes y temporarios cargados.

export type OdontogramaTipo = 'ADULTO' | 'NINO' | 'MIXTO'

export interface Cuadrante {
    id: string
    posicion: 'superior' | 'inferior'
    lado: 'derecho' | 'izquierdo'
    denticion: 'permanente' | 'temporaria'
    dientes: string[]
}

// Dientes permanentes (adulto), en el mismo orden espacial que usa la ficha.
const PERMANENTES: Cuadrante[] = [
    { id: 'perm-sd', posicion: 'superior', lado: 'derecho', denticion: 'permanente', dientes: ['18', '17', '16', '15', '14', '13', '12', '11'] },
    { id: 'perm-si', posicion: 'superior', lado: 'izquierdo', denticion: 'permanente', dientes: ['21', '22', '23', '24', '25', '26', '27', '28'] },
    { id: 'perm-ii', posicion: 'inferior', lado: 'izquierdo', denticion: 'permanente', dientes: ['31', '32', '33', '34', '35', '36', '37', '38'] },
    { id: 'perm-id', posicion: 'inferior', lado: 'derecho', denticion: 'permanente', dientes: ['48', '47', '46', '45', '44', '43', '42', '41'] },
]

// Dientes temporarios / de leche (niño).
const TEMPORARIOS: Cuadrante[] = [
    { id: 'temp-sd', posicion: 'superior', lado: 'derecho', denticion: 'temporaria', dientes: ['55', '54', '53', '52', '51'] },
    { id: 'temp-si', posicion: 'superior', lado: 'izquierdo', denticion: 'temporaria', dientes: ['61', '62', '63', '64', '65'] },
    { id: 'temp-ii', posicion: 'inferior', lado: 'izquierdo', denticion: 'temporaria', dientes: ['71', '72', '73', '74', '75'] },
    { id: 'temp-id', posicion: 'inferior', lado: 'derecho', denticion: 'temporaria', dientes: ['85', '84', '83', '82', '81'] },
]

/** Cuadrantes a renderizar según el tipo de dentición. Default: ADULTO. */
export function cuadrantesPorTipo(tipo: OdontogramaTipo): Cuadrante[] {
    if (tipo === 'NINO') return TEMPORARIOS
    if (tipo === 'MIXTO') return [...PERMANENTES, ...TEMPORARIOS]
    return PERMANENTES
}

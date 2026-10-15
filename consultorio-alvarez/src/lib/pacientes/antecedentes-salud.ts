// Anamnesis odontológica ("Antecedentes de Salud").
//
// Fuente única del cuestionario (preguntas + afecciones) y de la lógica pura que
// deriva los campos clínicos y detecta respuestas críticas. La UI y la server
// action leen de acá; así el cuestionario evoluciona sin migración.

/* ──────────── Definición del cuestionario ──────────── */

export interface PreguntaDef {
    id: string
    label: string
    /** Si pide un texto ("¿Cuál?" / "Especificar"). */
    tieneDetalle: boolean
    /** Si al responder "Sí" cuenta como alerta crítica para la seguridad del paciente. */
    critica: boolean
}

export interface AfeccionDef {
    id: string
    label: string
    tieneDetalle?: boolean
    /** Si al marcarla cuenta como alerta crítica. */
    critica?: boolean
}

export const PREGUNTAS: readonly PreguntaDef[] = [
    { id: 'alergias_medicamentos', label: 'Reacciones alérgicas a medicamentos (penicilina, sulfas, aspirinas, anestesias, etc.)', tieneDetalle: true, critica: true },
    { id: 'tratamiento_medico', label: 'Bajo tratamiento médico con alguna enfermedad', tieneDetalle: true, critica: false },
    { id: 'medicacion_diaria', label: 'Toma medicamentos en forma diaria', tieneDetalle: true, critica: true },
    { id: 'sangrado_excesivo', label: 'Sangra excesivamente al lastimarse o extraer un diente', tieneDetalle: false, critica: true },
    { id: 'adiccion_drogas', label: 'Es o ha sido adicto a alguna droga', tieneDetalle: false, critica: false },
    { id: 'terapia_radiante', label: 'Ha recibido terapia radiante', tieneDetalle: true, critica: true },
    { id: 'embarazada', label: 'Está embarazada', tieneDetalle: false, critica: true },
    { id: 'mala_experiencia_odontologica', label: 'Tuvo alguna mala experiencia odontológica', tieneDetalle: true, critica: false },
    { id: 'bifosfonatos', label: 'Toma o tomó bifosfonatos', tieneDetalle: false, critica: true },
] as const

export const AFECCIONES: readonly AfeccionDef[] = [
    { id: 'diabetes', label: 'Diabetes', critica: true },
    { id: 'presion_alta', label: 'Presión alta', critica: true },
    { id: 'presion_baja', label: 'Presión baja' },
    { id: 'problemas_cardiacos', label: 'Problemas cardíacos', critica: true },
    { id: 'marcapasos_protesis', label: 'Portador de marcapasos o prótesis', critica: true },
    { id: 'problemas_neurologicos', label: 'Problemas neurológicos' },
    { id: 'osteoporosis', label: 'Osteoporosis' },
    { id: 'problemas_renales', label: 'Problemas renales', critica: true },
    { id: 'trastornos_gastrointestinales', label: 'Trastornos gastrointestinales' },
    { id: 'sinusitis', label: 'Sinusitis' },
    { id: 'fiebre_reumatica', label: 'Fiebre reumática' },
    { id: 'hepatitis', label: 'Hepatitis', tieneDetalle: true, critica: true },
    { id: 'epilepsia', label: 'Epilepsia', critica: true },
    { id: 'hiv', label: 'HIV', critica: true },
    { id: 'trastornos_psiquiatricos', label: 'Trastornos psiquiátricos o emocionales' },
    { id: 'artritis_reumatoidea', label: 'Artritis reumatoidea' },
] as const

/* ──────────── Tipo del dato guardado (jsonb) ──────────── */

export interface RespuestaPregunta {
    valor: boolean
    detalle?: string
}

export interface Consentimiento {
    aceptado: boolean
    fecha: string
    cargado_por?: string | null
}

export interface AntecedentesSalud {
    preguntas: Record<string, RespuestaPregunta>
    afecciones: string[]
    afecciones_detalle?: Record<string, string>
    consentimiento?: Consentimiento
    actualizado_en?: string
    actualizado_por?: string | null
}

/** Estructura vacía para inicializar el formulario. */
export function anamnesisVacia(): AntecedentesSalud {
    const preguntas: Record<string, RespuestaPregunta> = {}
    for (const p of PREGUNTAS) preguntas[p.id] = { valor: false, detalle: '' }
    return { preguntas, afecciones: [], afecciones_detalle: {} }
}

/* ──────────── Lógica pura ──────────── */

const PREGUNTA_LABEL = new Map(PREGUNTAS.map(p => [p.id, p.label]))
const AFECCION_LABEL = new Map(AFECCIONES.map(a => [a.id, a.label]))

function limpio(s?: string | null): string {
    return (s ?? '').trim()
}

/**
 * Deriva los campos clínicos "sueltos" (alergias / medicacion_actual /
 * antecedentes) a partir de la anamnesis. La anamnesis es la única fuente de
 * estos campos, así que el banner de alertas y el resto de la app siguen
 * funcionando con una sola carga.
 */
export function derivarCamposClinicos(a: AntecedentesSalud | null | undefined): {
    alergias: string | null
    medicacion_actual: string | null
    antecedentes: string | null
} {
    if (!a || !a.preguntas) {
        return { alergias: null, medicacion_actual: null, antecedentes: null }
    }

    const preg = a.preguntas

    // Alergias ← pregunta alergias_medicamentos (detalle si lo hay).
    const alergiasResp = preg['alergias_medicamentos']
    const alergias = alergiasResp?.valor
        ? (limpio(alergiasResp.detalle) || 'Alergia a medicamentos (sin especificar)')
        : null

    // Medicación ← pregunta medicacion_diaria (detalle si lo hay).
    const medResp = preg['medicacion_diaria']
    const medicacion_actual = medResp?.valor
        ? (limpio(medResp.detalle) || 'Toma medicación diaria (sin especificar)')
        : null

    // Antecedentes ← afecciones marcadas + señales relevantes de las preguntas.
    const partes: string[] = []

    for (const id of a.afecciones ?? []) {
        const label = AFECCION_LABEL.get(id)
        if (!label) continue
        const det = limpio(a.afecciones_detalle?.[id])
        partes.push(det ? `${label} (${det})` : label)
    }

    const tto = preg['tratamiento_medico']
    if (tto?.valor) {
        const det = limpio(tto.detalle)
        partes.push(det ? `En tratamiento médico: ${det}` : 'En tratamiento médico')
    }

    if (preg['bifosfonatos']?.valor) partes.push('Toma/tomó bifosfonatos')

    const radiante = preg['terapia_radiante']
    if (radiante?.valor) {
        const det = limpio(radiante.detalle)
        partes.push(det ? `Terapia radiante: ${det}` : 'Recibió terapia radiante')
    }

    if (preg['sangrado_excesivo']?.valor) partes.push('Sangrado excesivo')
    if (preg['embarazada']?.valor) partes.push('Embarazada')

    const antecedentes = partes.length > 0 ? partes.join('. ') : null

    return { alergias, medicacion_actual, antecedentes }
}

/**
 * Respuestas críticas para la seguridad del paciente, como labels legibles para
 * el banner de alertas de la ficha. Vacío si no hay nada crítico.
 */
export function obtenerAlertasCriticas(a: AntecedentesSalud | null | undefined): string[] {
    if (!a) return []
    const alertas: string[] = []

    for (const p of PREGUNTAS) {
        if (!p.critica) continue
        const resp = a.preguntas?.[p.id]
        if (!resp?.valor) continue
        const det = limpio(resp.detalle)
        const label = PREGUNTA_LABEL.get(p.id) ?? p.id
        alertas.push(det ? `${label}: ${det}` : label)
    }

    for (const af of AFECCIONES) {
        if (!af.critica) continue
        if (!(a.afecciones ?? []).includes(af.id)) continue
        const det = limpio(a.afecciones_detalle?.[af.id])
        const label = AFECCION_LABEL.get(af.id) ?? af.id
        alertas.push(det ? `${label}: ${det}` : label)
    }

    return alertas
}

/** ¿La anamnesis tiene al menos una respuesta cargada? (para el estado "sin completar"). */
export function anamnesisTieneDatos(a: AntecedentesSalud | null | undefined): boolean {
    if (!a) return false
    const algunaPregunta = Object.values(a.preguntas ?? {}).some(r => r?.valor)
    const algunaAfeccion = (a.afecciones ?? []).length > 0
    const consent = a.consentimiento?.aceptado === true
    return algunaPregunta || algunaAfeccion || consent
}

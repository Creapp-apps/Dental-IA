// Alcance de pacientes para el rol profesional.
// El profesional sólo ve a los pacientes con los que tuvo turnos asignados;
// el listado y la ficha se acotan a ese conjunto. Admin/superadmin ven todo.
// Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §9

/** IDs de paciente distintos (sin nulos) a partir de los turnos del profesional. */
export function idsPacientesEnScope(
    turnos: Array<{ paciente_id?: string | null }>
): string[] {
    const ids = new Set<string>()
    for (const t of turnos) {
        if (t.paciente_id) ids.add(t.paciente_id)
    }
    return [...ids]
}

/**
 * Une varias listas de IDs de paciente en una sola, sin duplicados ni vacíos.
 * El alcance del profesional es la unión de sus pacientes asignados y los de
 * su agenda (turnos).
 */
export function unirIdsPacientes(...listas: Array<Array<string | null | undefined>>): string[] {
    const ids = new Set<string>()
    for (const lista of listas) {
        for (const id of lista) {
            if (id) ids.add(id)
        }
    }
    return [...ids]
}

/**
 * Autor (profesional) que queda firmando una evolución de la historia clínica.
 * Un profesional sólo puede firmar con su propio id (integridad médico-legal:
 * nadie escribe a nombre de otro). Admin/recepción registra en nombre de quien
 * atendió, así que respeta el autor solicitado.
 */
export function autorEvolucion({
    esProfesional,
    profesionalId,
    autorSolicitado,
}: {
    esProfesional: boolean
    profesionalId: string | null
    autorSolicitado: string | null | undefined
}): string | null | undefined {
    if (esProfesional) return profesionalId
    return autorSolicitado
}

/**
 * ¿Puede ver la ficha de este paciente?
 * - No profesional (admin/superadmin): siempre.
 * - Profesional: sólo si el paciente está en su scope.
 */
export function puedeVerFichaPaciente({
    esProfesional,
    idsEnScope,
    pacienteId,
}: {
    esProfesional: boolean
    idsEnScope: readonly string[]
    pacienteId: string
}): boolean {
    if (!esProfesional) return true
    return idsEnScope.includes(pacienteId)
}

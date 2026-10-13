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

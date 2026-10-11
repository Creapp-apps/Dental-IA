import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================
// Lookup interno de pacientes por DNI. NO es 'use server': no se expone
// como endpoint invocable desde el browser. Sólo lo usan server actions
// server-side (p.ej. el flujo OTP de reserva, DT-001). Reemplaza al export
// anónimo getPacientePorDni, que devolvía PII a cualquiera.
// ============================================================

export interface PacienteReserva {
    id: string
    nombre: string
    apellido: string
    telefono: string | null
    email: string | null
    obra_social_id: string | null
}

/** DNI con puntos (7 u 8 dígitos). Igual que el formato guardado en algunas fichas. */
function formatDniConPuntos(dni: string): string {
    const limpio = dni.replace(/\D/g, '')
    if (limpio.length === 7) {
        return `${limpio.slice(0, 1)}.${limpio.slice(1, 4)}.${limpio.slice(4)}`
    } else if (limpio.length === 8) {
        return `${limpio.slice(0, 2)}.${limpio.slice(2, 5)}.${limpio.slice(5)}`
    }
    return limpio
}

/**
 * Busca un paciente por DNI dentro de UN tenant. Server-side únicamente.
 * Devuelve null si no existe (quien llama no debe revelar esa diferencia al cliente).
 */
export async function buscarPacientePorDniInterno(
    tenantId: string,
    dni: string
): Promise<PacienteReserva | null> {
    const limpio = dni.replace(/\D/g, '')
    if (!tenantId || !limpio) return null

    const supabase = createAdminClient()
    const conPuntos = formatDniConPuntos(limpio)

    const { data } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, telefono, email, obra_social_id')
        .eq('tenant_id', tenantId)
        .or(`dni.eq.${limpio},dni.eq.${conPuntos}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return (data as PacienteReserva | null) ?? null
}

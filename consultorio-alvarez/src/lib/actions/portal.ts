'use server'

import { createClient } from '@/lib/supabase/server'

// ── DASHBOARD DATA ─────────────────────────────────────────────
export async function getPortalDashboardData(pacienteId: string, tenantId: string) {
    const supabase = await createClient()

    // Último turno (pasado o de hoy)
    const { data: ultimoTurno } = await supabase
        .from('turnos')
        .select(`
            id, fecha_inicio, fecha_fin, estado, notas,
            profesionales ( nombre, apellido, especialidad ),
            tipos_tratamiento ( nombre, color )
        `)
        .eq('paciente_id', pacienteId)
        .eq('tenant_id', tenantId)
        .lte('fecha_inicio', new Date().toISOString())
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single()

    // Próximo turno futuro
    const { data: proximoTurno } = await supabase
        .from('turnos')
        .select(`
            id, fecha_inicio, fecha_fin, estado, notas,
            profesionales ( nombre, apellido, especialidad ),
            tipos_tratamiento ( nombre, color )
        `)
        .eq('paciente_id', pacienteId)
        .eq('tenant_id', tenantId)
        .gt('fecha_inicio', new Date().toISOString())
        .in('estado', ['PENDIENTE', 'CONFIRMADO'])
        .order('fecha_inicio', { ascending: true })
        .limit(1)
        .single()

    // Total de visitas
    const { count: totalVisitas } = await supabase
        .from('turnos')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', pacienteId)
        .eq('tenant_id', tenantId)
        .in('estado', ['COMPLETADO', 'ATENDIDO'])

    return {
        ultimoTurno: ultimoTurno ?? null,
        proximoTurno: proximoTurno ?? null,
        totalVisitas: totalVisitas ?? 0,
    }
}

// ── HISTORIAL DE TURNOS ────────────────────────────────────────
export async function getPatientTurnos(pacienteId: string, tenantId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('turnos')
        .select(`
            id, fecha_inicio, fecha_fin, estado, notas,
            profesionales ( nombre, apellido, especialidad ),
            tipos_tratamiento ( nombre, color )
        `)
        .eq('paciente_id', pacienteId)
        .eq('tenant_id', tenantId)
        .order('fecha_inicio', { ascending: false })

    if (error) { console.error('getPatientTurnos:', error); return [] }
    return data ?? []
}

// ── ACTUALIZAR CONTACTO ────────────────────────────────────────
export async function updatePatientContact(
    pacienteId: string,
    formData: { telefono?: string; direccion?: string; ciudad?: string }
) {
    const supabase = await createClient()

    const cleanData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v])
    )

    const { error } = await supabase
        .from('pacientes')
        .update(cleanData)
        .eq('id', pacienteId)

    if (error) return { error: error.message }
    return { success: true }
}

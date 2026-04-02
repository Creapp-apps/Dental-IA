'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// SERVER ACTIONS — Turnos
// ============================================================

// Temporal: obtener tenant_id sin auth
async function getTenantId() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'alvarez')
        .single()
    return data?.id ?? null
}

export async function crearTurno(formData: {
    paciente_id: string
    profesional_id: string
    tipo_tratamiento_id: string
    fecha_inicio: string
    fecha_fin: string
    notas?: string
    prioridad_override?: string
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { data, error } = await supabase
        .from('turnos')
        .insert({
            tenant_id: tenantId,
            paciente_id: formData.paciente_id,
            profesional_id: formData.profesional_id,
            tipo_tratamiento_id: formData.tipo_tratamiento_id,
            fecha_inicio: formData.fecha_inicio,
            fecha_fin: formData.fecha_fin,
            notas: formData.notas || null,
            prioridad_override: formData.prioridad_override || null,
            estado: 'PENDIENTE',
            origen: 'SECRETARIA',
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/dashboard')
    return { data }
}

export async function cambiarEstadoTurno(turnoId: string, nuevoEstado: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId)

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function moverTurno(turnoId: string, nuevaFechaInicio: string, nuevaFechaFin: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .update({
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin,
        })
        .eq('id', turnoId)

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function buscarPacientes(query: string) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const { data, error } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('tenant_id', tenantId)
        .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`)
        .limit(8)

    if (error) { console.error('buscarPacientes:', error); return [] }
    return data ?? []
}

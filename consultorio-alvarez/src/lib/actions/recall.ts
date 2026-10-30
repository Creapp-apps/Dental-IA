'use server'

import { createClient } from '@/lib/supabase/server'
import { requireActor } from '@/lib/auth/actor'
import { revalidatePath } from 'next/cache'

export interface RecallConfigConEstado {
    id: string
    tipo_tratamiento_id: string
    tratamiento_nombre: string
    intervalo_meses: number
    activo: boolean
    ultimo_envio_at: string | null
    ancla_at: string | null            // último turno ATENDIDO de ese tratamiento
    proximo_envio_at: string | null    // ancla + intervalo_meses (null si no hay ancla)
    estado: 'sin_control' | 'al_dia' | 'vencido'
}

// Suma meses cuidando fin de mes (ej: 31-ago + 6 = 28/29-feb, no 2-mar).
function sumarMeses(fechaIso: string, meses: number): Date {
    const d = new Date(fechaIso)
    const diaOriginal = d.getDate()
    d.setMonth(d.getMonth() + meses)
    if (d.getDate() < diaOriginal) d.setDate(0) // se pasó de mes: volver al último día del mes anterior
    return d
}

export async function getRecallConfigsConEstado(pacienteId: string): Promise<RecallConfigConEstado[]> {
    const { ok, actor } = await requireActor()
    if (!ok) return []
    const supabase = await createClient()

    const { data: configs } = await supabase
        .from('recall_configs')
        .select('id, tipo_tratamiento_id, intervalo_meses, activo, ultimo_envio_at, tipo_tratamiento:tipos_tratamiento(nombre)')
        .eq('tenant_id', actor.tenantId)
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: true })

    if (!configs || configs.length === 0) return []

    const hoy = new Date()
    const out: RecallConfigConEstado[] = []
    for (const c of configs as any[]) {
        // Ancla = último turno ATENDIDO de ese paciente + tratamiento.
        const { data: ult } = await supabase
            .from('turnos')
            .select('fecha_inicio')
            .eq('tenant_id', actor.tenantId)
            .eq('paciente_id', pacienteId)
            .eq('tipo_tratamiento_id', c.tipo_tratamiento_id)
            .eq('estado', 'ATENDIDO')
            .order('fecha_inicio', { ascending: false })
            .limit(1)
            .maybeSingle()

        const anclaAt = ult?.fecha_inicio || null
        let proximo: Date | null = null
        let estado: RecallConfigConEstado['estado'] = 'sin_control'
        if (anclaAt) {
            proximo = sumarMeses(anclaAt, c.intervalo_meses)
            estado = hoy >= proximo ? 'vencido' : 'al_dia'
        }

        out.push({
            id: c.id,
            tipo_tratamiento_id: c.tipo_tratamiento_id,
            tratamiento_nombre: c.tipo_tratamiento?.nombre || 'Tratamiento',
            intervalo_meses: c.intervalo_meses,
            activo: c.activo,
            ultimo_envio_at: c.ultimo_envio_at,
            ancla_at: anclaAt,
            proximo_envio_at: proximo ? proximo.toISOString() : null,
            estado,
        })
    }
    return out
}

export async function crearRecallConfig(input: { pacienteId: string; tipoTratamientoId: string; intervaloMeses: number }) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }
    if (!input.tipoTratamientoId) return { error: 'Elegí un tratamiento.' }
    if (!input.intervaloMeses || input.intervaloMeses < 1) return { error: 'Intervalo inválido.' }

    const supabase = await createClient()
    const { error } = await supabase.from('recall_configs').insert({
        tenant_id: actor.tenantId,
        paciente_id: input.pacienteId,
        tipo_tratamiento_id: input.tipoTratamientoId,
        intervalo_meses: input.intervaloMeses,
    })
    if (error) {
        if ((error as any).code === '23505') return { error: 'Ya existe un recordatorio de control para ese tratamiento.' }
        return { error: error.message }
    }
    revalidatePath(`/pacientes/${input.pacienteId}`)
    return { success: true }
}

export async function actualizarRecallConfig(id: string, patch: { intervalo_meses?: number; activo?: boolean }, pacienteId?: string) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }
    const updates: Record<string, any> = {}
    if (typeof patch.intervalo_meses === 'number') {
        if (patch.intervalo_meses < 1 || patch.intervalo_meses > 120) return { error: 'Intervalo inválido.' }
        updates.intervalo_meses = patch.intervalo_meses
    }
    if (typeof patch.activo === 'boolean') updates.activo = patch.activo
    if (Object.keys(updates).length === 0) return { error: 'Nada para actualizar.' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('recall_configs')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    if (pacienteId) revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
}

export async function eliminarRecallConfig(id: string, pacienteId?: string) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase
        .from('recall_configs')
        .delete()
        .eq('id', id)
        .eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    if (pacienteId) revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
}

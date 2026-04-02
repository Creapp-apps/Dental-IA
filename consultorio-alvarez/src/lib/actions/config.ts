'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// All config actions use the admin client (service_role key) to bypass RLS.
// This is safe because these are Server Actions — never exposed to the browser.
// Once Auth is implemented, we'll validate permissions here before executing.

function getAdmin() {
    return createAdminClient()
}

async function getTenantId() {
    const supabase = getAdmin()
    const { data } = await supabase.from('tenants').select('id').eq('slug', 'alvarez').single()
    return data?.id ?? null
}

export async function getTenantConfig() {
    const supabase = getAdmin()
    const { data } = await supabase.from('tenants').select('*').eq('slug', 'alvarez').single()
    return data
}

export async function actualizarTenant(updates: Record<string, any>) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId)
    if (error) return { error: error.message }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarHorarios(horarios: any[]) {
    return actualizarTenant({ horarios })
}

export async function crearProfesional(data: {
    nombre: string; apellido: string; especialidad?: string;
    matricula?: string; email: string; color_agenda?: string
}) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('profesionales').insert({
        tenant_id: tenantId, ...data,
        color_agenda: data.color_agenda || '#2563eb',
    })

    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarProfesional(id: string, data: Record<string, any>) {
    const supabase = getAdmin()
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
    const { error } = await supabase.from('profesionales').update(clean).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleProfesionalEstado(id: string, activo: boolean) {
    const supabase = getAdmin()
    const { error } = await supabase.from('profesionales').update({ activo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function crearObraSocial(data: { nombre: string; codigo?: string }) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('obras_sociales').insert({ tenant_id: tenantId, ...data })
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleObraSocial(id: string, activo: boolean) {
    const supabase = getAdmin()
    const { error } = await supabase.from('obras_sociales').update({ activo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function crearTipoTratamiento(data: {
    nombre: string; duracion_minutos: number; precio_referencia?: number;
    color?: string; descripcion?: string
}) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('tipos_tratamiento').insert({
        tenant_id: tenantId, ...data,
        color: data.color || '#3b82f6',
    })

    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleTipoTratamiento(id: string, activo: boolean) {
    const supabase = getAdmin()
    const { error } = await supabase.from('tipos_tratamiento').update({ activo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

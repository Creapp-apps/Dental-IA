import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// QUERIES — Server-side data fetching
// Usa admin client (service_role) + tenant_id del usuario autenticado.
// ============================================================

function getAdmin() {
    return createAdminClient()
}

// Obtiene el tenant_id del usuario logueado desde public.usuarios
async function getTenantId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = getAdmin()
    const { data } = await admin
        .from('usuarios')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    return data?.tenant_id ?? null
}

// ---- PROFESIONALES ----

export async function getProfesionales(onlyActive: boolean = true) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase.from('profesionales').select('*').eq('tenant_id', tenantId).order('nombre')
    if (onlyActive) query = query.eq('activo', true)
    const { data, error } = await query
    if (error) { console.error('getProfesionales:', error); return [] }
    return data ?? []
}

// ---- OBRAS SOCIALES ----

export async function getObrasSociales(onlyActive: boolean = true) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase.from('obras_sociales').select('*').eq('tenant_id', tenantId).order('nombre')
    if (onlyActive) query = query.eq('activo', true)
    const { data, error } = await query
    if (error) { console.error('getObrasSociales:', error); return [] }
    return data ?? []
}

// ---- TIPOS DE TRATAMIENTO ----

export async function getTiposTratamiento(onlyActive: boolean = true) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase.from('tipos_tratamiento').select('*').eq('tenant_id', tenantId).order('nombre')
    if (onlyActive) query = query.eq('activo', true)
    const { data, error } = await query
    if (error) { console.error('getTiposTratamiento:', error); return [] }
    return data ?? []
}

// ---- PACIENTES ----

export async function getPacientes() {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const { data, error } = await supabase
        .from('pacientes')
        .select('*, obra_social:obras_sociales(*)')
        .eq('tenant_id', tenantId)
        .order('apellido')
    if (error) { console.error('getPacientes:', error); return [] }
    return data ?? []
}

export async function getPacienteById(id: string) {
    const supabase = getAdmin()
    const { data, error } = await supabase
        .from('pacientes')
        .select('*, obra_social:obras_sociales(*)')
        .eq('id', id)
        .single()
    if (error) { console.error('getPacienteById:', error); return null }
    return data
}

// ---- TURNOS ----

export async function getTurnosDelDia(fecha: Date) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const diaStr = fecha.toISOString().split('T')[0]
    const { data, error } = await supabase
        .from('turnos')
        .select(`
            *,
            paciente:pacientes(id, nombre, apellido, telefono, obra_social_id),
            profesional:profesionales(id, nombre, apellido, color_agenda),
            tipo_tratamiento:tipos_tratamiento(id, nombre, duracion_minutos, prioridad, color)
        `)
        .eq('tenant_id', tenantId)
        .gte('fecha_inicio', `${diaStr}T00:00:00`)
        .lt('fecha_inicio', `${diaStr}T23:59:59`)
        .order('fecha_inicio')

    if (error) { console.error('getTurnosDelDia:', error); return [] }
    return data ?? []
}

export async function getTurnosSemana(inicio: Date, fin: Date) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const { data, error } = await supabase
        .from('turnos')
        .select(`
            *,
            paciente:pacientes(id, nombre, apellido, telefono),
            profesional:profesionales(id, nombre, apellido, color_agenda),
            tipo_tratamiento:tipos_tratamiento(id, nombre, duracion_minutos, prioridad, color)
        `)
        .eq('tenant_id', tenantId)
        .gte('fecha_inicio', inicio.toISOString())
        .lte('fecha_inicio', fin.toISOString())
        .order('fecha_inicio')

    if (error) { console.error('getTurnosSemana:', error); return [] }
    return data ?? []
}

// ---- COBROS ----

export async function getCobrosPendientes() {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const { data, error } = await supabase
        .from('cobros')
        .select('*, paciente:pacientes(nombre, apellido)')
        .eq('tenant_id', tenantId)
        .in('estado', ['PENDIENTE', 'PARCIAL'])
        .order('created_at', { ascending: false })

    if (error) { console.error('getCobrosPendientes:', error); return [] }
    return data ?? []
}

// ---- DASHBOARD STATS ----

export async function getDashboardStats() {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { pacientes: 0, turnosHoy: 0, turnosConfirmados: 0, turnosPendientes: 0, montoPendiente: 0 }

    const hoy = new Date().toISOString().split('T')[0]

    const [pacientes, turnos, cobrosPendientes] = await Promise.all([
        supabase
            .from('pacientes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId),
        supabase
            .from('turnos')
            .select('id, estado', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .gte('fecha_inicio', `${hoy}T00:00:00`)
            .lt('fecha_inicio', `${hoy}T23:59:59`),
        supabase
            .from('cobros')
            .select('monto_total, monto_pagado')
            .eq('tenant_id', tenantId)
            .in('estado', ['PENDIENTE', 'PARCIAL']),
    ])

    const turnosData = turnos.data ?? []
    const montoPendiente = (cobrosPendientes.data ?? [])
        .reduce((sum, c) => sum + (c.monto_total - c.monto_pagado), 0)

    return {
        pacientes: pacientes.count ?? 0,
        turnosHoy: turnosData.length,
        turnosConfirmados: turnosData.filter(t => ['CONFIRMADO', 'EN_SALA', 'ATENDIDO'].includes(t.estado)).length,
        turnosPendientes: turnosData.filter(t => t.estado === 'PENDIENTE').length,
        montoPendiente,
    }
}

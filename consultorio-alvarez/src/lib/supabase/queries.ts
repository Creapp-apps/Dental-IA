import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

// ============================================================
// QUERIES — Server-side data fetching
// Usa admin client (service_role) + tenant_id del usuario autenticado.
// ============================================================

function getAdmin() {
    return createAdminClient()
}

// Obtiene el tenant_id del usuario logueado desde public.usuarios (caching por request)
const getTenantId = cache(async (): Promise<string | null> => {
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
})

export const getCurrentUsuario = cache(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = getAdmin()
    const { data } = await admin
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

    return data ?? null
})

// ---- PROFESIONALES ----

export async function getProfesionales(onlyActive: boolean = true) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase.from('profesionales').select('*, usuarios(id)').eq('tenant_id', tenantId).order('nombre')
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

export async function getPacientes(limit: number = 0, offset: number = 0) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const query = supabase
        .from('pacientes')
        .select(`
            id,
            nro_historia_clinica,
            nombre,
            apellido,
            dni,
            cuit,
            fecha_nacimiento,
            genero,
            telefono,
            email,
            direccion,
            ciudad,
            obra_social_id,
            plan_obra_social,
            n_afiliado,
            alergias,
            medicacion_actual,
            antecedentes,
            notas_internas,
            registro_completo,
            foto_url,
            created_at,
            obra_social:obras_sociales(id, nombre)
        `)
        .eq('tenant_id', tenantId)
        .order('apellido', { ascending: true })

    if (limit > 0) {
        query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query
    if (error) {
        console.error('getPacientes error:', error)
        return []
    }

    return data ?? []
}

export async function searchPacientes(searchTerm: string, limit: number = 20) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId || !searchTerm.trim()) return []

    const cleanTerm = searchTerm.trim()
    const tokens = cleanTerm.split(/\s+/).filter(Boolean)

    let query = supabase
        .from('pacientes')
        .select(`
            id,
            nro_historia_clinica,
            nombre,
            apellido,
            dni,
            telefono,
            email,
            obra_social_id,
            plan_obra_social,
            n_afiliado,
            obra_social:obras_sociales(id, nombre)
        `)
        .eq('tenant_id', tenantId)
        .limit(limit)

    if (tokens.length === 1) {
        const term = tokens[0]
        query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%,nro_historia_clinica.ilike.%${term}%`)
    } else {
        // Multi-token: buscar coincidencia en nombre o apellido
        const term1 = tokens[0]
        const term2 = tokens[1]
        query = query.or(`and(nombre.ilike.%${term1}%,apellido.ilike.%${term2}%),and(nombre.ilike.%${term2}%,apellido.ilike.%${term1}%),and(apellido.ilike.%${term1}%,nombre.ilike.%${term2}%)`)
    }

    const { data, error } = await query
    if (error) {
        console.error('searchPacientes error:', error)
        return []
    }

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

export async function getTurnosSinConfirmar() {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    // Obtener fecha de hoy al inicio del día (12:00 AM) para traer todos desde hoy en adelante
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
        .from('turnos')
        .select(`
            *,
            paciente:pacientes(id, nombre, apellido, telefono),
            profesional:profesionales(id, nombre, apellido, color_agenda),
            tipo_tratamiento:tipos_tratamiento(id, nombre, duracion_minutos, prioridad, color),
            recordatorios(id, created_at, estado_envio, error_detalle, mensaje_enviado)
        `)
        .eq('tenant_id', tenantId)
        .in('estado', ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'])
        .gte('fecha_inicio', hoy.toISOString())
        .order('fecha_inicio', { ascending: true })

    if (error) {
        console.error('getTurnosSinConfirmar error:', error)
        return []
    }
    return data ?? []
}

export async function getTodayOperationalSummary() {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { turnosHoy: 0, turnosConfirmados: 0, turnosPendientes: 0, proximoTurno: null }

    const now = new Date()
    const diaStr = now.toISOString().split('T')[0]

    const { data: turnos, error } = await supabase
        .from('turnos')
        .select(`
            id,
            fecha_inicio,
            estado,
            paciente:pacientes(nombre, apellido)
        `)
        .eq('tenant_id', tenantId)
        .gte('fecha_inicio', `${diaStr}T00:00:00`)
        .lt('fecha_inicio', `${diaStr}T23:59:59`)
        .order('fecha_inicio', { ascending: true })

    if (error || !turnos) {
        return { turnosHoy: 0, turnosConfirmados: 0, turnosPendientes: 0, proximoTurno: null }
    }

    const turnosHoy = turnos.length
    const turnosConfirmados = turnos.filter(t => ['CONFIRMADO', 'EN_SALA', 'ATENDIDO'].includes(t.estado)).length
    const turnosPendientes = turnos.filter(t => t.estado === 'PENDIENTE').length

    const nowIso = now.toISOString()
    const proximo = turnos.find(t => t.fecha_inicio >= nowIso && !['CANCELADO', 'ATENDIDO'].includes(t.estado))
        || turnos.find(t => !['CANCELADO', 'ATENDIDO'].includes(t.estado))

    let proximoTurno = null
    if (proximo) {
        const fecha = new Date(proximo.fecha_inicio)
        const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
        const pac = proximo.paciente as any
        const pacienteNombre = pac ? `${pac.nombre || ''} ${pac.apellido || ''}`.trim() : 'Paciente'
        proximoTurno = { hora, pacienteNombre }
    }

    return {
        turnosHoy,
        turnosConfirmados,
        turnosPendientes,
        proximoTurno
    }
}


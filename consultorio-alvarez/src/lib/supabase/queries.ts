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
export const getTenantId = cache(async (): Promise<string | null> => {
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

export const getAuthenticatedTenantId = getTenantId

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

const PACIENTE_SELECT_FIELDS = `
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
`

function formatDniVariants(raw: string): string[] {
    const clean = raw.replace(/\D/g, '')
    const variants = [clean]
    if (clean.length === 8) {
        variants.push(`${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`)
    } else if (clean.length === 7) {
        variants.push(`${clean.slice(0, 1)}.${clean.slice(1, 4)}.${clean.slice(4)}`)
    }
    return variants
}

function getSearchTokenVariants(str: string): string[] {
    const unaccented = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const set = new Set<string>([str, unaccented])
    const commonAccents: Record<string, string> = {
        'leon': 'león',
        'ruben': 'rubén',
        'maria': 'maría',
        'jose': 'josé',
        'perez': 'pérez',
        'gonzalez': 'gonzález',
        'rodriguez': 'rodríguez',
        'lopez': 'lópez',
        'martinez': 'martínez',
        'sanchez': 'sánchez',
        'diaz': 'díaz',
        'gomez': 'gómez',
        'alvarez': 'álvarez',
        'fernandez': 'fernández',
        'hernandez': 'hernández',
        'ramirez': 'ramírez',
    }
    const lower = unaccented.toLowerCase()
    if (commonAccents[lower]) {
        set.add(commonAccents[lower])
    }
    return Array.from(set)
}

export async function getTotalPacientesCount(): Promise<number> {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return 0

    const { count, error } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('getTotalPacientesCount error:', error)
        return 0
    }

    return count ?? 0
}

export async function getPacientes(limit: number = 50, offset: number = 0) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const effectiveLimit = limit > 0 ? limit : 50

    const { data, error } = await supabase
        .from('pacientes')
        .select(PACIENTE_SELECT_FIELDS)
        .eq('tenant_id', tenantId)
        .order('apellido', { ascending: true })
        .range(offset, offset + effectiveLimit - 1)

    if (error) {
        console.error('getPacientes error:', error)
        return []
    }
    return data ?? []
}

export async function searchPacientes(searchTerm: string, limit: number = 50) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId || !searchTerm.trim()) return []

    const cleanTerm = searchTerm.trim()
    const isNumeric = /^\d[\d\.]*$/.test(cleanTerm)
    const digitsOnly = cleanTerm.replace(/\D/g, '')

    let query = supabase
        .from('pacientes')
        .select(PACIENTE_SELECT_FIELDS)
        .eq('tenant_id', tenantId)
        .order('apellido', { ascending: true })
        .limit(limit)

    if (isNumeric && digitsOnly.length >= 2) {
        const variants = formatDniVariants(digitsOnly)
        const clauses = variants.flatMap(v => [
            `dni.ilike.%${v}%`,
            `nro_historia_clinica.ilike.%${v}%`
        ]).concat([`nro_historia_clinica.ilike.%${cleanTerm}%`])
        query = query.or(clauses.join(','))
    } else {
        const tokens = cleanTerm.split(/\s+/).filter(Boolean)
        if (tokens.length === 1) {
            const variants = getSearchTokenVariants(tokens[0])
            const clauses = variants.flatMap(t => [
                `nombre.ilike.%${t}%`,
                `apellido.ilike.%${t}%`,
                `dni.ilike.%${t}%`,
                `nro_historia_clinica.ilike.%${t}%`
            ])
            query = query.or(clauses.join(','))
        } else {
            // Filtrar conectores si hay 3+ tokens, ej: "Ponce de León"
            const significant = tokens.length > 2
                ? tokens.filter(t => t.length > 2 || !['de', 'la', 'el', 'los', 'las', 'del', 'da', 'di', 'y'].includes(t.toLowerCase()))
                : tokens
            const tokensToUse = significant.length > 0 ? significant : tokens

            for (const token of tokensToUse) {
                const variants = getSearchTokenVariants(token)
                const clauses = variants.flatMap(t => [
                    `nombre.ilike.%${t}%`,
                    `apellido.ilike.%${t}%`,
                    `dni.ilike.%${t}%`
                ])
                query = query.or(clauses.join(','))
            }
        }
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
    const tenantId = await getTenantId()
    if (!tenantId) return null

    const { data, error } = await supabase
        .from('pacientes')
        .select('*, obra_social:obras_sociales(*)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
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

export async function getTurnosSemana(inicio: Date, fin: Date, profesionalId?: string) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase
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

    if (profesionalId) {
        query = query.eq('profesional_id', profesionalId)
    }

    const { data, error } = await query.order('fecha_inicio')

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


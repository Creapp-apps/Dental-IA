'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedTenantId } from '@/lib/supabase/queries'
import { LocalPaciente, LocalTurno, LocalProfesional, LocalTratamiento, LocalObraSocial, SyncOutboxItem } from '@/lib/offline/db'

export interface FullSnapshotResult {
    success: boolean
    pacientes: LocalPaciente[]
    turnos: LocalTurno[]
    profesionales: LocalProfesional[]
    tipos_tratamiento: LocalTratamiento[]
    obras_sociales: LocalObraSocial[]
    server_time: string
    error?: string
}

export interface IncrementalPullResult {
    success: boolean
    pacientes: LocalPaciente[]
    turnos: LocalTurno[]
    server_time: string
    error?: string
}

export interface PushResultItem {
    outbox_id: number
    success: boolean
    error?: string
}

/**
 * Descarga una copia limpia e integral de todos los datos clínicos del consultorio para uso offline.
 */
export async function fetchFullSnapshotAction(): Promise<FullSnapshotResult> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
        return {
            success: false,
            pacientes: [],
            turnos: [],
            profesionales: [],
            tipos_tratamiento: [],
            obras_sociales: [],
            server_time: new Date().toISOString(),
            error: 'No autorizado'
        }
    }

    const admin = createAdminClient()
    const server_time = new Date().toISOString()

    try {
        // Rango de turnos: desde hace 90 días hasta 180 días adelante
        const now = new Date()
        const hace90Dias = new Date(now)
        hace90Dias.setDate(hace90Dias.getDate() - 90)
        const en180Dias = new Date(now)
        en180Dias.setDate(en180Dias.getDate() + 180)

        const [
            { data: pacientesData },
            { data: turnosData },
            { data: profesionalesData },
            { data: tratamientosData },
            { data: obrasData }
        ] = await Promise.all([
            admin
                .from('pacientes')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('apellido', { ascending: true }),

            admin
                .from('turnos')
                .select(`
                    *,
                    paciente:pacientes(nombre, apellido, dni, telefono),
                    profesional:profesionales(nombre, apellido),
                    tipo_tratamiento:tipos_tratamiento(nombre, color)
                `)
                .eq('tenant_id', tenantId)
                .gte('fecha_inicio', hace90Dias.toISOString())
                .lte('fecha_inicio', en180Dias.toISOString())
                .order('fecha_inicio', { ascending: true }),

            admin
                .from('profesionales')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('nombre', { ascending: true }),

            admin
                .from('tipos_tratamiento')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('nombre', { ascending: true }),

            admin
                .from('obras_sociales')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('nombre', { ascending: true })
        ])

        // Formatear turnos con relaciones cacheadas
        const turnosMapeados: LocalTurno[] = (turnosData || []).map((t: any) => ({
            id: t.id,
            tenant_id: t.tenant_id,
            paciente_id: t.paciente_id,
            profesional_id: t.profesional_id,
            tipo_tratamiento_id: t.tipo_tratamiento_id,
            fecha_inicio: t.fecha_inicio,
            fecha_fin: t.fecha_fin,
            estado: t.estado,
            prioridad_override: t.prioridad_override,
            notas: t.notas,
            origen: t.origen,
            es_sobreturno: t.es_sobreturno,
            numero_pieza: t.numero_pieza,
            created_at: t.created_at,
            updated_at: t.updated_at,
            paciente_nombre: t.paciente?.nombre,
            paciente_apellido: t.paciente?.apellido,
            paciente_dni: t.paciente?.dni,
            paciente_telefono: t.paciente?.telefono,
            profesional_nombre: t.profesional?.nombre,
            profesional_apellido: t.profesional?.apellido,
            tipo_tratamiento_nombre: t.tipo_tratamiento?.nombre,
            tipo_tratamiento_color: t.tipo_tratamiento?.color
        }))

        return {
            success: true,
            pacientes: (pacientesData as LocalPaciente[]) || [],
            turnos: turnosMapeados,
            profesionales: (profesionalesData as LocalProfesional[]) || [],
            tipos_tratamiento: (tratamientosData as LocalTratamiento[]) || [],
            obras_sociales: (obrasData as LocalObraSocial[]) || [],
            server_time
        }
    } catch (err: any) {
        console.error('[OFFLINE SYNC] Error al generar full snapshot:', err)
        return {
            success: false,
            pacientes: [],
            turnos: [],
            profesionales: [],
            tipos_tratamiento: [],
            obras_sociales: [],
            server_time,
            error: err.message || 'Error de base de datos'
        }
    }
}

/**
 * Descarga únicamente las novedades modificadas en la nube desde la última sincronización.
 */
export async function fetchIncrementalPullAction(sinceIsoDate: string): Promise<IncrementalPullResult> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
        return {
            success: false,
            pacientes: [],
            turnos: [],
            server_time: new Date().toISOString(),
            error: 'No autorizado'
        }
    }

    const admin = createAdminClient()
    const server_time = new Date().toISOString()

    try {
        const [
            { data: pacientesNuevos },
            { data: turnosNuevos }
        ] = await Promise.all([
            admin
                .from('pacientes')
                .select('*')
                .eq('tenant_id', tenantId)
                .gt('updated_at', sinceIsoDate),

            admin
                .from('turnos')
                .select(`
                    *,
                    paciente:pacientes(nombre, apellido, dni, telefono),
                    profesional:profesionales(nombre, apellido),
                    tipo_tratamiento:tipos_tratamiento(nombre, color)
                `)
                .eq('tenant_id', tenantId)
                .gt('updated_at', sinceIsoDate)
        ])

        const turnosMapeados: LocalTurno[] = (turnosNuevos || []).map((t: any) => ({
            id: t.id,
            tenant_id: t.tenant_id,
            paciente_id: t.paciente_id,
            profesional_id: t.profesional_id,
            tipo_tratamiento_id: t.tipo_tratamiento_id,
            fecha_inicio: t.fecha_inicio,
            fecha_fin: t.fecha_fin,
            estado: t.estado,
            prioridad_override: t.prioridad_override,
            notas: t.notas,
            origen: t.origen,
            es_sobreturno: t.es_sobreturno,
            numero_pieza: t.numero_pieza,
            created_at: t.created_at,
            updated_at: t.updated_at,
            paciente_nombre: t.paciente?.nombre,
            paciente_apellido: t.paciente?.apellido,
            paciente_dni: t.paciente?.dni,
            paciente_telefono: t.paciente?.telefono,
            profesional_nombre: t.profesional?.nombre,
            profesional_apellido: t.profesional?.apellido,
            tipo_tratamiento_nombre: t.tipo_tratamiento?.nombre,
            tipo_tratamiento_color: t.tipo_tratamiento?.color
        }))

        return {
            success: true,
            pacientes: (pacientesNuevos as LocalPaciente[]) || [],
            turnos: turnosMapeados,
            server_time
        }
    } catch (err: any) {
        console.error('[OFFLINE SYNC] Error en pull incremental:', err)
        return {
            success: false,
            pacientes: [],
            turnos: [],
            server_time,
            error: err.message
        }
    }
}

/**
 * Recibe y aplica las operaciones acumuladas en la cola local (sync_outbox) en Supabase.
 */
export async function pushOutboxChangesAction(items: SyncOutboxItem[]): Promise<PushResultItem[]> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId || !items || items.length === 0) return []

    const admin = createAdminClient()
    const results: PushResultItem[] = []

    for (const item of items) {
        if (item.tenant_id !== tenantId) {
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: 'Discrepancia de tenant'
            })
            continue
        }

        try {
            if (item.entity === 'turnos') {
                if (item.operation === 'INSERT') {
                    const payload = {
                        ...item.payload,
                        tenant_id: tenantId,
                        updated_at: new Date().toISOString()
                    }
                    const { error } = await admin.from('turnos').insert(payload)
                    results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })
                } else if (item.operation === 'UPDATE') {
                    const { error } = await admin
                        .from('turnos')
                        .update({
                            ...item.payload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })
                } else if (item.operation === 'DELETE') {
                    const { error } = await admin
                        .from('turnos')
                        .delete()
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })
                }
            } else if (item.entity === 'pacientes') {
                if (item.operation === 'INSERT') {
                    const payload = {
                        ...item.payload,
                        tenant_id: tenantId,
                        updated_at: new Date().toISOString()
                    }
                    const { error } = await admin.from('pacientes').insert(payload)
                    results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })
                } else if (item.operation === 'UPDATE') {
                    const { error } = await admin
                        .from('pacientes')
                        .update({
                            ...item.payload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })
                }
            }
        } catch (opErr: any) {
            console.error(`[OFFLINE SYNC] Error ejecutando operación ${item.operation} en ${item.entity}:`, opErr)
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: opErr.message || 'Excepción al sincronizar operación'
            })
        }
    }

    return results
}

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedTenantId, PACIENTE_CLINICO_COLUMNAS, COLUMNAS_CLINICAS_EDITABLES } from '@/lib/supabase/queries'
import { getActor } from '@/lib/auth/actor'
import { LocalPaciente, LocalTurno, LocalProfesional, LocalTratamiento, LocalObraSocial, SyncOutboxItem } from '@/lib/offline/db'
import { esReintentable } from '@/lib/offline/outbox-errors'

/**
 * Qué se baja a la computadora de quien sincroniza.
 * La base local de un profesional no puede contener un teléfono ni un turno
 * ajeno: lo que no se manda, no queda en IndexedDB.
 * Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §8 y §9
 */
async function alcanceDeSincronizacion() {
    const actor = await getActor()
    const esProfesional = actor?.rol === 'profesional' && !actor.esSuperadmin
    return {
        esProfesional,
        profesionalId: actor?.profesionalId ?? null,
        columnasPaciente: esProfesional ? PACIENTE_CLINICO_COLUMNAS : '*',
        pacienteEnTurno: esProfesional
            ? 'nombre, apellido'
            : 'nombre, apellido, dni, telefono',
    }
}

export interface FullSnapshotResult {
    success: boolean
    /**
     * Rol con el que se armó esta copia. Si cambia, lo que ya está en IndexedDB
     * quedó con datos de más o de menos y hay que rehacer la base local (§8).
     */
    rol?: string | null
    pacientes: LocalPaciente[]
    turnos: LocalTurno[]
    profesionales: LocalProfesional[]
    tipos_tratamiento: LocalTratamiento[]
    obras_sociales: LocalObraSocial[]
    server_time: string
    /**
     * Tenant del consultorio. El cliente lo cachea para poder encolar un alta
     * hecha sin conexión, que todavía no tiene fila en la nube de donde sacarlo.
     */
    tenant_id: string
    error?: string
}

export interface IncrementalPullResult {
    success: boolean
    /** Igual que en el snapshot: un cambio de rol invalida la base local. */
    rol?: string | null
    pacientes: LocalPaciente[]
    turnos: LocalTurno[]
    server_time: string
    error?: string
}

export interface PushResultItem {
    outbox_id: number
    success: boolean
    error?: string
    /** Código de Postgres, cuando lo hubo. */
    error_code?: string
    /** Decidido acá: el cliente no interpreta mensajes de error. */
    retriable: boolean
}

/**
 * Helper para paginar y descargar el 100% de los registros de Supabase
 * superando el límite por defecto de 1000 filas de PostgREST.
 */
async function fetchAllRows<T>(
    fetcher: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
    const results: T[] = []
    const pageSize = 1000
    let from = 0

    while (true) {
        const to = from + pageSize - 1
        const { data, error } = await fetcher(from, to)
        if (error) {
            console.error('[OFFLINE SYNC] Error paginando registros:', error)
            break
        }
        if (!data || data.length === 0) break
        results.push(...data)
        if (data.length < pageSize) break
        from += pageSize
    }

    return results
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
            tenant_id: '',
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

        const alcance = await alcanceDeSincronizacion()

        const [
            pacientesData,
            turnosData,
            { data: profesionalesData },
            { data: tratamientosData },
            { data: obrasData }
        ] = await Promise.all([
            fetchAllRows(async (from, to) => {
                return admin
                    .from('pacientes')
                    .select(alcance.columnasPaciente)
                    .eq('tenant_id', tenantId)
                    .order('apellido', { ascending: true })
                    .range(from, to)
            }),

            fetchAllRows(async (from, to) => {
                let query = admin
                    .from('turnos')
                    .select(`
                        *,
                        paciente:pacientes(${alcance.pacienteEnTurno}),
                        profesional:profesionales(nombre, apellido),
                        tipo_tratamiento:tipos_tratamiento(nombre, color)
                    `)
                    .eq('tenant_id', tenantId)
                    .gte('fecha_inicio', hace90Dias.toISOString())
                    .lte('fecha_inicio', en180Dias.toISOString())

                if (alcance.esProfesional && alcance.profesionalId) {
                    query = query.eq('profesional_id', alcance.profesionalId)
                }

                return query
                    .order('fecha_inicio', { ascending: true })
                    .range(from, to)
            }),

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
            rol: alcance.esProfesional ? 'profesional' : 'admin',
            pacientes: (pacientesData as unknown as LocalPaciente[]) || [],
            turnos: turnosMapeados,
            profesionales: (profesionalesData as LocalProfesional[]) || [],
            tipos_tratamiento: (tratamientosData as LocalTratamiento[]) || [],
            obras_sociales: (obrasData as LocalObraSocial[]) || [],
            server_time,
            tenant_id: tenantId
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
            tenant_id: '',
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
        const alcance = await alcanceDeSincronizacion()

        const [
            pacientesNuevos,
            turnosNuevos
        ] = await Promise.all([
            fetchAllRows(async (from, to) => {
                return admin
                    .from('pacientes')
                    .select(alcance.columnasPaciente)
                    .eq('tenant_id', tenantId)
                    .gt('updated_at', sinceIsoDate)
                    .range(from, to)
            }),

            fetchAllRows(async (from, to) => {
                let query = admin
                    .from('turnos')
                    .select(`
                        *,
                        paciente:pacientes(${alcance.pacienteEnTurno}),
                        profesional:profesionales(nombre, apellido),
                        tipo_tratamiento:tipos_tratamiento(nombre, color)
                    `)
                    .eq('tenant_id', tenantId)
                    .gt('updated_at', sinceIsoDate)

                if (alcance.esProfesional && alcance.profesionalId) {
                    query = query.eq('profesional_id', alcance.profesionalId)
                }

                return query.range(from, to)
            })
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
            rol: alcance.esProfesional ? 'profesional' : 'admin',
            pacientes: (pacientesNuevos as unknown as LocalPaciente[]) || [],
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
 * Deja sólo las columnas reales de historial_clinico. La copia local de una
 * evolución arrastra el nombre del profesional cacheado para pintarlo a 0ms,
 * y esas claves no existen en la tabla: si viajan, Postgres rechaza el insert.
 */
function sanitizeEvolucionPayload(payload: any) {
    return {
        paciente_id: payload.paciente_id,
        profesional_id: payload.profesional_id,
        turno_id: payload.turno_id || null,
        fecha: payload.fecha,
        procedimiento_realizado: payload.procedimiento_realizado ?? null,
        observaciones: payload.observaciones ?? null,
        presupuesto: payload.presupuesto ?? null
    }
}

/**
 * Arma el resultado de una operación a partir del error de Supabase, dejando
 * decidido del lado del servidor si vale la pena reintentarla.
 */
function resultado(outboxId: number, error: { code?: string; message?: string } | null): PushResultItem {
    if (!error) return { outbox_id: outboxId, success: true, retriable: false }

    return {
        outbox_id: outboxId,
        success: false,
        error: error.message,
        error_code: error.code,
        retriable: esReintentable(error.code),
    }
}

/**
 * Recibe y aplica las operaciones acumuladas en la cola local (sync_outbox) en Supabase.
 */
export async function pushOutboxChangesAction(items: SyncOutboxItem[]): Promise<PushResultItem[]> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId || !items || items.length === 0) return []

    const admin = createAdminClient()
    const alcance = await alcanceDeSincronizacion()
    const results: PushResultItem[] = []

    // Lo que sube un profesional pasa por el mismo filtro que lo que baja: este
    // camino escribe con service_role, así que RLS no lo frena y el permiso lo
    // hace cumplir el código. Diseño §8 y §9.
    const rechazo = (item: SyncOutboxItem, error: string): PushResultItem => ({
        outbox_id: item.id || 0,
        success: false,
        error,
        retriable: false,
    })

    for (const item of items) {
        // Tenant vacío significa "adoptá el del servidor": un paciente creado
        // sin conexión todavía no tiene tenant del lado del cliente. El payload
        // se reescribe con `tenant_id: tenantId` en el upsert, así que la
        // operación entra en el consultorio correcto. Una discrepancia real
        // —tenant presente y distinto— sigue siendo un rechazo permanente,
        // que es para lo que existe esta guarda.
        if (item.tenant_id && item.tenant_id !== tenantId) {
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: 'Discrepancia de tenant',
                retriable: false,
            })
            continue
        }

        try {
            const resultadosAntes = results.length

            if (item.entity === 'turnos') {
                if (alcance.esProfesional && item.operation !== 'UPDATE') {
                    // Crear, reprogramar y reasignar es de recepción.
                    results.push(rechazo(item, 'Un profesional no puede crear ni borrar turnos'))
                    continue
                }
                if (item.operation === 'INSERT') {
                    const payload = {
                        ...item.payload,
                        tenant_id: tenantId,
                        updated_at: new Date().toISOString()
                    }
                    // upsert y no insert: si la respuesta de un push anterior se
                    // perdió, el reintento no puede fallar por clave duplicada y
                    // marcar como atascado un dato que ya está en la nube.
                    const { error } = await admin.from('turnos').upsert(payload)
                    results.push(resultado(item.id || 0, error))
                } else if (item.operation === 'UPDATE') {
                    // Del turno propio, el profesional sólo mueve el estado
                    // (EN_SALA, ATENDIDO), que es parte de atender.
                    const payload = alcance.esProfesional
                        ? { estado: item.payload?.estado }
                        : item.payload

                    if (alcance.esProfesional && !payload.estado) {
                        results.push(rechazo(item, 'Un profesional sólo puede cambiar el estado de sus turnos'))
                        continue
                    }

                    let query = admin
                        .from('turnos')
                        .update({
                            ...payload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)

                    if (alcance.esProfesional && alcance.profesionalId) {
                        query = query.eq('profesional_id', alcance.profesionalId)
                    }

                    const { error } = await query
                    results.push(resultado(item.id || 0, error))
                } else if (item.operation === 'DELETE') {
                    const { error } = await admin
                        .from('turnos')
                        .delete()
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push(resultado(item.id || 0, error))
                }
            } else if (item.entity === 'pacientes') {
                if (alcance.esProfesional && item.operation !== 'UPDATE') {
                    results.push(rechazo(item, 'Un profesional no puede crear ni borrar pacientes'))
                    continue
                }
                if (item.operation === 'INSERT') {
                    const payload = {
                        ...item.payload,
                        tenant_id: tenantId,
                        updated_at: new Date().toISOString()
                    }
                    // upsert y no insert: si la respuesta de un push anterior se
                    // perdió, el reintento no puede fallar por clave duplicada y
                    // marcar como atascado un dato que ya está en la nube.
                    const { error } = await admin.from('pacientes').upsert(payload)
                    results.push(resultado(item.id || 0, error))
                } else if (item.operation === 'UPDATE') {
                    // El profesional sólo corrige lo clínico. Su copia local no
                    // tiene los datos de contacto, así que mandar el payload
                    // entero además los borraría.
                    const payload = alcance.esProfesional
                        ? Object.fromEntries(
                            Object.entries(item.payload || {})
                                .filter(([columna]) => (COLUMNAS_CLINICAS_EDITABLES as readonly string[]).includes(columna))
                        )
                        : item.payload

                    if (alcance.esProfesional && Object.keys(payload).length === 0) {
                        results.push(rechazo(item, 'Un profesional sólo puede editar motivo de consulta, alergias, medicación y antecedentes'))
                        continue
                    }

                    const { error } = await admin
                        .from('pacientes')
                        .update({
                            ...payload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push(resultado(item.id || 0, error))
                }
            } else if (item.entity === 'evoluciones') {
                if (item.operation === 'INSERT') {
                    const payload = {
                        ...sanitizeEvolucionPayload(item.payload),
                        id: item.entity_id,
                        tenant_id: tenantId,
                        updated_at: new Date().toISOString()
                    }
                    // upsert y no insert: el id lo genera el cliente, así que un
                    // reintento sobre una fila que ya subió no debe fallar por
                    // clave duplicada y dejar el item trabado en la cola.
                    const { error } = await admin.from('historial_clinico').upsert(payload)
                    results.push(resultado(item.id || 0, error))
                } else if (item.operation === 'UPDATE') {
                    const { error } = await admin
                        .from('historial_clinico')
                        .update({
                            ...sanitizeEvolucionPayload(item.payload),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)
                    results.push(resultado(item.id || 0, error))
                } else if (item.operation === 'DELETE') {
                    // Borra las propias; las del colega las borra el admin.
                    let query = admin
                        .from('historial_clinico')
                        .delete()
                        .eq('id', item.entity_id)
                        .eq('tenant_id', tenantId)

                    if (alcance.esProfesional && alcance.profesionalId) {
                        query = query.eq('profesional_id', alcance.profesionalId)
                    }

                    const { error } = await query
                    results.push(resultado(item.id || 0, error))
                }
            }

            // Toda combinación sin rama tiene que devolver un resultado igual:
            // el cliente infiere "sesión vencida" de una respuesta vacía, y un
            // item que no produce resultado rompería esa inferencia en silencio.
            // Se chequea acá, y no con un else por entity, para cubrir de una
            // sola vez la entity desconocida y la operación sin rama.
            if (results.length === resultadosAntes) {
                results.push({
                    outbox_id: item.id || 0,
                    success: false,
                    error: `Operación no soportada: ${item.entity}/${item.operation}`,
                    retriable: false,
                })
            }
        } catch (opErr: any) {
            console.error(`[OFFLINE SYNC] Error ejecutando operación ${item.operation} en ${item.entity}:`, opErr)
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: opErr.message || 'Excepción al sincronizar operación',
                retriable: true,
            })
        }
    }

    return results
}

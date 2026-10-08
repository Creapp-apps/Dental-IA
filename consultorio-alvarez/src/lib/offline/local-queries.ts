import { localDb, LocalPaciente, LocalTurno, LocalEvolucion } from './db'
import { syncManager } from './sync-manager'

/**
 * Normaliza strings para comparación: minúsculas y sin acentos.
 */
function normalizeStr(str: string | undefined | null): string {
    return (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Búsqueda ultra veloz (0ms) en la base de datos local de pacientes.
 * Soporta búsqueda por DNI (con y sin puntos), Apellido, Nombre o Historia Clínica.
 */
export async function searchPacientesLocal(query: string, limit: number = 50): Promise<LocalPaciente[]> {
    if (!query || !query.trim()) {
        return localDb.pacientes.orderBy('apellido').limit(limit).toArray()
    }

    const cleanQuery = normalizeStr(query.trim())
    const tokens = cleanQuery.split(/\s+/).filter(Boolean)

    const results = await localDb.pacientes
        .filter(p => {
            const nom = normalizeStr(p.nombre)
            const ape = normalizeStr(p.apellido)
            const dni = normalizeStr(p.dni)
            const dniClean = dni.replace(/\./g, '')
            const hc = normalizeStr(p.nro_historia_clinica)
            const hcClean = hc.replace(/\./g, '')
            const full = `${ape} ${nom} ${ape}, ${nom} ${nom} ${ape} ${dni} ${dniClean} ${hc} ${hcClean}`

            return tokens.every(token => {
                const tokenClean = token.replace(/\./g, '')
                return full.includes(token) || (tokenClean !== '' && full.includes(tokenClean))
            })
        })
        .limit(limit)
        .toArray()

    return results
}

/**
 * Obtiene un paciente por su ID directamente de IndexedDB a 0ms.
 */
export async function getPacienteLocal(id: string): Promise<LocalPaciente | undefined> {
    return localDb.pacientes.get(id)
}

/**
 * Guarda o actualiza un paciente en la base de datos local y maneja su sincronización con la nube.
 */
export async function guardarPacienteLocal(
    paciente: Partial<LocalPaciente> & { id: string },
    tenantId?: string,
    enqueueOutbox: boolean = true
): Promise<void> {
    const existing = await localDb.pacientes.get(paciente.id)
    const updated: LocalPaciente = {
        ...(existing || {}),
        ...paciente,
        updated_at: new Date().toISOString()
    } as LocalPaciente

    await localDb.pacientes.put(updated)

    if (enqueueOutbox && tenantId) {
        await syncManager.enqueueMutation(
            tenantId,
            'pacientes',
            paciente.id,
            existing ? 'UPDATE' : 'INSERT',
            updated
        )
    }

    await syncManager.refreshLocalMetrics()
}

/**
 * Obtiene los turnos para la vista de agenda en el rango solicitado (0ms).
 * Normaliza las relaciones de paciente, profesional y tratamiento para que la UI
 * los consuma directamente como si vinieran de Supabase.
 */
export async function getTurnosAgendaLocal(
    desdeIso: string,
    hastaIso: string,
    profesionalId?: string | null
): Promise<any[]> {
    try {
        const desdeTime = new Date(desdeIso).getTime()
        const hastaTime = new Date(hastaIso).getTime()

        const all = await localDb.turnos.toArray()
        const filtered = all.filter(t => {
            if (!t.fecha_inicio) return false
            const tTime = new Date(t.fecha_inicio).getTime()
            if (tTime < desdeTime || tTime > hastaTime) return false
            if (profesionalId && profesionalId !== 'todos' && t.profesional_id !== profesionalId) return false
            return true
        })

        return filtered.map(t => ({
            ...t,
            paciente: (t as any).paciente || (t.paciente_nombre || t.paciente_apellido ? {
                id: t.paciente_id,
                nombre: t.paciente_nombre || '',
                apellido: t.paciente_apellido || '',
                dni: t.paciente_dni || '',
                telefono: t.paciente_telefono || '',
            } : null),
            profesional: (t as any).profesional || (t.profesional_nombre ? {
                id: t.profesional_id,
                nombre: t.profesional_nombre || '',
                apellido: t.profesional_apellido || '',
            } : null),
            tipo_tratamiento: (t as any).tipo_tratamiento || (t.tipo_tratamiento_nombre ? {
                id: t.tipo_tratamiento_id,
                nombre: t.tipo_tratamiento_nombre || '',
                color: t.tipo_tratamiento_color || '#3b82f6',
            } : null),
        }))
    } catch (err) {
        console.warn('[LOCAL DB] Error consultando turnos locales:', err)
        return []
    }
}

/**
 * Guarda o actualiza un turno de forma Local-First (0ms).
 * Se actualiza inmediatamente en IndexedDB y se encola para sincronizar con Supabase.
 */
export async function guardarTurnoLocal(turno: LocalTurno, isNew: boolean = false) {
    // 1. Guardado inmediato en IndexedDB
    await localDb.turnos.put(turno)

    // 2. Encolar en Outbox para subir a la nube
    await syncManager.enqueueMutation(
        turno.tenant_id,
        'turnos',
        turno.id,
        isNew ? 'INSERT' : 'UPDATE',
        turno
    )
}

/**
 * Cambia el estado de un turno en 0ms localmente y sincroniza en segundo plano.
 */
export async function actualizarEstadoTurnoLocal(
    tenantId: string,
    turnoId: string,
    nuevoEstado: LocalTurno['estado']
) {
    const existing = await localDb.turnos.get(turnoId)
    if (existing) {
        existing.estado = nuevoEstado
        existing.updated_at = new Date().toISOString()
        await localDb.turnos.put(existing)
    }

    await syncManager.enqueueMutation(
        tenantId,
        'turnos',
        turnoId,
        'UPDATE',
        { estado: nuevoEstado }
    )
}

/* ──────────── Evoluciones (historial clínico) ──────────── */

/**
 * Evoluciones de un paciente desde IndexedDB (0ms), de la más nueva a la más vieja.
 */
export async function getEvolucionesLocal(pacienteId: string): Promise<LocalEvolucion[]> {
    try {
        const rows = await localDb.evoluciones
            .where('paciente_id')
            .equals(pacienteId)
            .toArray()

        return rows.sort((a, b) => {
            const porFecha = (b.fecha || '').localeCompare(a.fecha || '')
            if (porFecha !== 0) return porFecha
            // Dos evoluciones del mismo día: la cargada después va primero.
            return (b.created_at || '').localeCompare(a.created_at || '')
        })
    } catch (err) {
        console.warn('[LOCAL DB] Error consultando evoluciones locales:', err)
        return []
    }
}

/**
 * Guarda o actualiza una evolución de forma Local-First (0ms).
 * Escribe en IndexedDB y encola la operación para subirla a Supabase.
 */
export async function guardarEvolucionLocal(
    evolucion: Partial<LocalEvolucion> & { id: string; tenant_id: string; paciente_id: string },
    isNew: boolean = false
): Promise<LocalEvolucion> {
    const existing = await localDb.evoluciones.get(evolucion.id)
    const ahora = new Date().toISOString()

    const updated: LocalEvolucion = {
        ...(existing || {}),
        ...evolucion,
        created_at: existing?.created_at || evolucion.created_at || ahora,
        updated_at: ahora
    } as LocalEvolucion

    await localDb.evoluciones.put(updated)

    await syncManager.enqueueMutation(
        updated.tenant_id,
        'evoluciones',
        updated.id,
        isNew && !existing ? 'INSERT' : 'UPDATE',
        updated
    )

    return updated
}

/**
 * Elimina una evolución localmente (0ms) y encola el borrado en la nube.
 */
export async function eliminarEvolucionLocal(tenantId: string, evolucionId: string): Promise<void> {
    await localDb.evoluciones.delete(evolucionId)

    // Operaciones encoladas de esta misma evolución que todavía no subieron.
    const encoladas = await localDb.sync_outbox
        .where('entity_id')
        .equals(evolucionId)
        .toArray()

    const nuncaLlegoALaNube = encoladas.some(op => op.operation === 'INSERT')

    if (encoladas.length > 0) {
        await localDb.sync_outbox.bulkDelete(
            encoladas.map(op => op.id).filter((id): id is number => id !== undefined)
        )
    }

    // Si el INSERT nunca se ejecutó, la fila no existe en Supabase y no hay nada
    // que borrar. Encolar el DELETE sería peor: si llegara a correr antes que el
    // INSERT, el upsert posterior recrearía la evolución ya eliminada.
    if (nuncaLlegoALaNube) {
        await syncManager.refreshLocalMetrics()
        return
    }

    await syncManager.enqueueMutation(
        tenantId,
        'evoluciones',
        evolucionId,
        'DELETE',
        {}
    )
}

/**
 * Espera a que la evolución salga de la cola de salida.
 *
 * `enqueueMutation` ya dispara el push en segundo plano, así que acá sólo
 * miramos la cola: 'ok' cuando el item desapareció (subió), 'error' cuando el
 * push lo marcó fallido, 'pendiente' si se agotó la espera.
 */
export async function esperarPushEvolucion(
    evolucionId: string,
    timeoutMs: number = 5000
): Promise<'ok' | 'error' | 'pendiente'> {
    const limite = Date.now() + timeoutMs

    while (Date.now() < limite) {
        const pendiente = await localDb.sync_outbox
            .where('entity_id')
            .equals(evolucionId)
            .first()

        if (!pendiente) return 'ok'
        if (pendiente.status === 'ERROR') return 'error'

        await new Promise(resolve => setTimeout(resolve, 150))
    }

    return 'pendiente'
}

/**
 * Vuelca en IndexedDB las evoluciones que trajo el server para un paciente.
 *
 * Borra las locales que el server ya no tiene (las eliminó otro puesto), pero
 * nunca una que tenga una operación pendiente en el outbox: esa todavía no
 * subió, así que su ausencia en el server es esperable y borrarla perdería
 * lo que el odontólogo acaba de escribir.
 */
export async function reconciliarEvolucionesLocal(
    pacienteId: string,
    serverRows: LocalEvolucion[]
): Promise<void> {
    try {
        const idsServer = new Set(serverRows.map(r => r.id))

        const [locales, pendientes] = await Promise.all([
            localDb.evoluciones.where('paciente_id').equals(pacienteId).toArray(),
            localDb.sync_outbox.where('entity').equals('evoluciones').toArray()
        ])

        const idsPendientes = new Set(pendientes.map(p => p.entity_id))

        const aBorrar = locales
            .filter(l => !idsServer.has(l.id) && !idsPendientes.has(l.id))
            .map(l => l.id)

        await localDb.transaction('rw', localDb.evoluciones, async () => {
            if (aBorrar.length > 0) await localDb.evoluciones.bulkDelete(aBorrar)
            // Tampoco pisamos con la versión del server una fila con cambios
            // locales sin subir: el push todavía no corrió, el server está viejo.
            const aEscribir = serverRows.filter(r => !idsPendientes.has(r.id))
            if (aEscribir.length > 0) await localDb.evoluciones.bulkPut(aEscribir)
        })
    } catch (err) {
        console.warn('[LOCAL DB] Error reconciliando evoluciones:', err)
    }
}

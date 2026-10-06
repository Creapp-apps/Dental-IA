import { localDb, LocalPaciente, LocalTurno } from './db'
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
 */
export async function getTurnosAgendaLocal(
    desdeIso: string,
    hastaIso: string,
    profesionalId?: string | null
): Promise<LocalTurno[]> {
    let collection = localDb.turnos
        .where('fecha_inicio')
        .between(desdeIso, hastaIso, true, true)

    if (profesionalId && profesionalId !== 'todos') {
        return collection.filter(t => t.profesional_id === profesionalId).toArray()
    }

    return collection.toArray()
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

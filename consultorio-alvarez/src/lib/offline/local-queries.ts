import { localDb, LocalPaciente, LocalTurno } from './db'
import { syncManager } from './sync-manager'

/**
 * Búsqueda ultra veloz (0ms) en la base de datos local de pacientes.
 * Soporta búsqueda por DNI (números), Apellido o Nombre.
 */
export async function searchPacientesLocal(query: string, limit: number = 30): Promise<LocalPaciente[]> {
    if (!query || !query.trim()) {
        return localDb.pacientes.limit(limit).toArray()
    }

    const clean = query.trim().toLowerCase()
    const isNum = /^\d+$/.test(clean)

    if (isNum) {
        // Búsqueda por DNI con índice de prefijo
        return localDb.pacientes
            .where('dni')
            .startsWith(clean)
            .limit(limit)
            .toArray()
    }

    // Búsqueda combinada por Apellido o Nombre
    const results = await localDb.pacientes
        .filter(p => {
            const nom = (p.nombre || '').toLowerCase()
            const ape = (p.apellido || '').toLowerCase()
            return ape.includes(clean) || nom.includes(clean)
        })
        .limit(limit)
        .toArray()

    return results
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

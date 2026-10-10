import Dexie, { type EntityTable } from 'dexie'
import type { EstadoOutbox } from './outbox-policy'

export interface LocalPaciente {
    id: string
    tenant_id: string
    nro_historia_clinica?: string | null
    nombre: string
    apellido: string
    dni: string | null
    cuit?: string | null
    telefono: string | null
    email: string | null
    fecha_nacimiento?: string | null
    genero?: string | null
    direccion?: string | null
    ciudad?: string | null
    obra_social_id?: string | null
    plan_obra_social?: string | null
    n_afiliado?: string | null
    alergias?: string | null
    medicacion_actual?: string | null
    antecedentes?: string | null
    notas_internas?: string | null
    registro_completo?: boolean | null
    foto_url?: string | null
    created_at?: string
    updated_at?: string
}

export interface LocalTurno {
    id: string
    tenant_id: string
    paciente_id: string
    /** null = turno sin asignar, a la espera de recepción (diseño §10). */
    profesional_id: string | null
    tipo_tratamiento_id: string
    fecha_inicio: string
    fecha_fin: string
    estado: 'PENDIENTE' | 'CONFIRMADO' | 'EN_SALA' | 'ATENDIDO' | 'CANCELADO' | 'AUSENTE'
    prioridad_override?: string | null
    notas?: string | null
    origen?: string
    es_sobreturno?: boolean
    numero_pieza?: string | null
    created_at?: string
    updated_at?: string
    // Relaciones cacheadas para visualización 0ms
    paciente_nombre?: string
    paciente_apellido?: string
    paciente_dni?: string
    paciente_telefono?: string
    profesional_nombre?: string
    profesional_apellido?: string
    tipo_tratamiento_nombre?: string
    tipo_tratamiento_color?: string
}

export interface LocalProfesional {
    id: string
    tenant_id: string
    nombre: string
    apellido: string
    color_agenda: string
    especialidad?: string | null
    telefono?: string | null
    activo: boolean
}

export interface LocalTratamiento {
    id: string
    tenant_id: string
    nombre: string
    duracion_minutos: number
    color: string
    costo_default?: number | null
    activo: boolean
}

export interface LocalObraSocial {
    id: string
    tenant_id: string
    nombre: string
    activo: boolean
}

export interface LocalEvolucion {
    id: string
    tenant_id: string
    paciente_id: string
    profesional_id: string
    turno_id?: string | null
    fecha: string
    procedimiento_realizado?: string | null
    observaciones?: string | null
    presupuesto?: number | null
    created_at?: string
    updated_at?: string
    // Relación cacheada para mostrar el autor sin consultar otra tabla
    profesional_nombre?: string
    profesional_apellido?: string
}

export interface SyncOutboxItem {
    id?: number
    tenant_id: string
    entity: 'turnos' | 'pacientes' | 'evoluciones'
    entity_id: string
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    payload: any
    created_at: string
    attempts: number
    status: EstadoOutbox
    /** Momento a partir del cual el item vuelve a ser elegible. */
    next_attempt_at?: string | null
    /** Código de Postgres del último fallo, para clasificar y para mostrar. */
    last_error_code?: string
    error_message?: string
}

export interface LocalFichaReciente {
    paciente_id: string
    turnos: any[]
    historial: any[]
    odontograma: any[]
    presupuestos: any[]
    adjuntos: any[]
    escaneos3d: any[]
    cached_at: string
}

export interface SyncMetaItem {
    key: string // e.g. 'last_synced_at', 'auto_sync_interval_min', 'last_pull_count'
    value: any
    updated_at: string
}

export class DentalIaLocalDatabase extends Dexie {
    pacientes!: EntityTable<LocalPaciente, 'id'>
    turnos!: EntityTable<LocalTurno, 'id'>
    profesionales!: EntityTable<LocalProfesional, 'id'>
    tipos_tratamiento!: EntityTable<LocalTratamiento, 'id'>
    obras_sociales!: EntityTable<LocalObraSocial, 'id'>
    sync_outbox!: EntityTable<SyncOutboxItem, 'id'>
    sync_meta!: EntityTable<SyncMetaItem, 'key'>
    fichas_recientes!: EntityTable<LocalFichaReciente, 'paciente_id'>
    evoluciones!: EntityTable<LocalEvolucion, 'id'>

    constructor() {
        super('DentalIa_OfflineDB')

        this.version(1).stores({
            pacientes: 'id, tenant_id, dni, apellido, nombre, telefono, updated_at',
            turnos: 'id, tenant_id, paciente_id, profesional_id, fecha_inicio, estado, updated_at',
            profesionales: 'id, tenant_id, activo',
            tipos_tratamiento: 'id, tenant_id, activo',
            obras_sociales: 'id, tenant_id, activo',
            sync_outbox: '++id, tenant_id, entity, entity_id, status, created_at',
            sync_meta: 'key'
        })

        this.version(2).stores({
            fichas_recientes: 'paciente_id, cached_at'
        })

        // Evoluciones (historial_clinico): se cargan por paciente al abrir la
        // ficha, no vienen en el snapshot completo. La tabla crece sin techo y
        // bajar todas las de todos los pacientes infla IndexedDB sin necesidad.
        this.version(3).stores({
            evoluciones: 'id, tenant_id, paciente_id, fecha, updated_at'
        })

        // Reintentos del outbox. Los items que quedaron en 'ERROR' vuelven a
        // 'PENDIENTE' con el contador en cero: hoy están varados en las
        // computadoras del consultorio sin reintentarse ni verse. Con la
        // escalera nueva se recuperan y, si el fallo era permanente, terminan
        // en 'ATASCADO' y por fin quedan a la vista.
        // `next_attempt_at` queda declarado por compatibilidad con las bases ya
        // migradas (sacarlo exigiría otra versión de Dexie), pero NO se usa ni
        // se debe usar para seleccionar: IndexedDB no indexa null ni undefined,
        // así que una consulta por rango se saltearía justo los items que
        // vencieron y los que nunca esperaron. La elegibilidad se evalúa en
        // memoria con `esElegible`.
        this.version(4).stores({
            sync_outbox: '++id, tenant_id, entity, entity_id, status, created_at, next_attempt_at'
        }).upgrade(async tx => {
            await tx.table('sync_outbox').toCollection().modify(item => {
                if (item.status === 'ERROR' || item.status === 'EN_PROCESO') {
                    item.status = 'PENDIENTE'
                    item.attempts = 0
                    item.next_attempt_at = null
                }
            })
        })
    }
}

// Instancia única (Singleton) para el cliente web
export const localDb = new DentalIaLocalDatabase()


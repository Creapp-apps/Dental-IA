import Dexie, { type EntityTable } from 'dexie'

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
    obra_social_id?: string | null
    n_afiliado?: string | null
    alergias?: string | null
    medicacion_actual?: string | null
    antecedentes?: string | null
    notas_internas?: string | null
    created_at?: string
    updated_at?: string
}

export interface LocalTurno {
    id: string
    tenant_id: string
    paciente_id: string
    profesional_id: string
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

export interface SyncOutboxItem {
    id?: number
    tenant_id: string
    entity: 'turnos' | 'pacientes'
    entity_id: string
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    payload: any
    created_at: string
    attempts: number
    status: 'PENDIENTE' | 'ERROR' | 'EN_PROCESO'
    error_message?: string
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
    }
}

// Instancia única (Singleton) para el cliente web
export const localDb = new DentalIaLocalDatabase()

// ============================================================
// TIPOS GLOBALES — Consultorio Álvarez
// ============================================================

// ---- Multi-tenant ----

export type PlanTenant = 'free' | 'pro' | 'elite'

export interface HorarioAtencion {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=domingo, 1=lunes, ...
  apertura: string // "09:00"
  cierre: string   // "18:00"
  activo: boolean
}

export interface Tenant {
  id: string
  slug: string              // "alvarez" → /c/alvarez
  nombre: string
  descripcion: string | null
  logo_url: string | null
  telefono: string | null
  email_contacto: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  cuit: string | null
  color_primario: string    // "#2563eb"
  color_secundario: string  // "#1e40af"
  plan: PlanTenant
  landing_activa: boolean
  turnos_online_activos: boolean
  horarios: HorarioAtencion[]
  activo: boolean
  created_at: string
}

// ---- Roles / Tratamientos ----

export type Rol = 'admin' | 'profesional' | 'secretaria'

export type PrioridadTratamiento = 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAJA'

export type EstadoTurno =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_SALA'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'AUSENTE'

export type OrigenTurno = 'ONLINE' | 'SECRETARIA' | 'PROFESIONAL'

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OBRA_SOCIAL'

export type EstadoCobro = 'PENDIENTE' | 'PAGADO' | 'PARCIAL'

export type CanalRecordatorio = 'WHATSAPP' | 'SMS' | 'EMAIL'

// ---- Entidades ----

export interface Profesional {
  id: string
  nombre: string
  apellido: string
  especialidad?: string
  matricula?: string
  foto_url?: string | null
  descripcion?: string | null
  color_agenda: string
  email: string
  activo: boolean
  created_at: string
}

export interface TipoTratamiento {
  id: string
  nombre: string
  duracion_minutos: number
  prioridad: PrioridadTratamiento
  color: string
  descripcion: string | null
  activo: boolean
  created_at: string
}

export interface ObraSocial {
  id: string
  nombre: string
  codigo: string | null
  activo: boolean
}

export interface Paciente {
  id: string
  nro_historia_clinica: string
  nombre: string
  apellido: string
  dni: string | null
  fecha_nacimiento: string | null
  genero: 'M' | 'F' | 'X' | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  obra_social_id: string | null
  n_afiliado: string | null
  motivo_consulta: string | null
  alergias: string | null
  medicacion_actual: string | null
  antecedentes: string | null
  notas_internas: string | null
  created_at: string
  updated_at?: string
  // Join
  obra_social?: ObraSocial
}

export interface Turno {
  id: string
  paciente_id: string
  profesional_id: string
  tipo_tratamiento_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoTurno
  prioridad_override: PrioridadTratamiento | null
  notas: string | null
  origen: OrigenTurno
  created_at: string
  updated_at?: string
  // Joins
  paciente?: Paciente
  profesional?: Profesional
  tipo_tratamiento?: TipoTratamiento
}

export interface HistorialClinico {
  id: string
  paciente_id: string
  turno_id: string | null
  profesional_id: string
  fecha: string
  observaciones: string | null
  procedimiento_realizado: string | null
  presupuesto: number | null
  created_at: string
  // Joins
  profesional?: Profesional
  turno?: Turno
}

export interface Cobro {
  id: string
  turno_id: string
  paciente_id: string
  monto_total: number
  monto_pagado: number
  metodo_pago: MetodoPago
  obra_social_id: string | null
  estado: EstadoCobro
  fecha_pago: string | null
  created_at: string
  // Joins
  paciente?: Paciente
  turno?: Turno
  obra_social?: ObraSocial
}

// ---- UI helpers ----

export const PRIORIDAD_LABEL: Record<PrioridadTratamiento, string> = {
  URGENTE: 'Urgente',
  ALTA: 'Alta',
  NORMAL: 'Normal',
  BAJA: 'Baja',
}

export const PRIORIDAD_COLOR: Record<PrioridadTratamiento, string> = {
  URGENTE: '#ef4444',
  ALTA: '#f97316',
  NORMAL: '#3b82f6',
  BAJA: '#22c55e',
}

export const ESTADO_TURNO_LABEL: Record<EstadoTurno, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_SALA: 'En sala',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
  AUSENTE: 'Ausente',
}

export const ESTADO_TURNO_COLOR: Record<EstadoTurno, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMADO: 'bg-blue-100 text-blue-800 border-blue-200',
  EN_SALA: 'bg-purple-100 text-purple-800 border-purple-200',
  ATENDIDO: 'bg-green-100 text-green-800 border-green-200',
  CANCELADO: 'bg-red-100 text-red-800 border-red-200',
  AUSENTE: 'bg-gray-100 text-gray-800 border-gray-200',
}

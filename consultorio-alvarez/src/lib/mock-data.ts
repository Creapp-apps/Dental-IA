// ============================================================
// DATOS MOCK — Consultorio Álvarez
// Datos de demostración realistas para Argentina
// ============================================================

import {
    type Profesional,
    type TipoTratamiento,
    type ObraSocial,
    type Paciente,
    type Turno,
    type HistorialClinico,
    type Cobro,
} from '@/types'
import { addDays, subDays, setHours, setMinutes, startOfToday } from 'date-fns'

const hoy = startOfToday()

// ---- PROFESIONALES ----
export const MOCK_PROFESIONALES: Profesional[] = [
    {
        id: 'prof-1',
        nombre: 'Dr. Ricardo',
        apellido: 'Álvarez',
        color_agenda: '#2563eb',
        email: 'ricardo@consultorioalvarez.com',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'prof-2',
        nombre: 'Dr. Martín',
        apellido: 'Álvarez',
        color_agenda: '#16a34a',
        email: 'martin@consultorioalvarez.com',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
]

// ---- OBRAS SOCIALES ----
export const MOCK_OBRAS_SOCIALES: ObraSocial[] = [
    { id: 'os-1', nombre: 'OSDE', codigo: 'OSDE', activo: true },
    { id: 'os-2', nombre: 'Swiss Medical', codigo: 'SWISS', activo: true },
    { id: 'os-3', nombre: 'Galeno', codigo: 'GAL', activo: true },
    { id: 'os-4', nombre: 'IOMA', codigo: 'IOMA', activo: true },
    { id: 'os-5', nombre: 'PAMI', codigo: 'PAMI', activo: true },
    { id: 'os-6', nombre: 'Medifé', codigo: 'MDF', activo: true },
    { id: 'os-7', nombre: 'Particular', codigo: null, activo: true },
]

// ---- TIPOS DE TRATAMIENTO ----
export const MOCK_TRATAMIENTOS: TipoTratamiento[] = [
    { id: 'trat-1', nombre: 'Tratamiento de Conducto', duracion_minutos: 90, prioridad: 'ALTA', color: '#ef4444', descripcion: 'Endodoncia completa', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-2', nombre: 'Extracción Simple', duracion_minutos: 45, prioridad: 'ALTA', color: '#f97316', descripcion: 'Extracción dental simple', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-3', nombre: 'Extracción Compleja', duracion_minutos: 60, prioridad: 'ALTA', color: '#f97316', descripcion: 'Extracción molar o pieza incluida', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-4', nombre: 'Limpieza Dental', duracion_minutos: 45, prioridad: 'NORMAL', color: '#3b82f6', descripcion: 'Profilaxis y detartraje', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-5', nombre: 'Revisión de Rutina', duracion_minutos: 30, prioridad: 'BAJA', color: '#22c55e', descripcion: 'Control periódico', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-6', nombre: 'Consulta de Urgencia', duracion_minutos: 30, prioridad: 'URGENTE', color: '#dc2626', descripcion: 'Atención de emergencia dental', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-7', nombre: 'Colocación de Corona', duracion_minutos: 60, prioridad: 'NORMAL', color: '#8b5cf6', descripcion: 'Corona cerámica o porcelana', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-8', nombre: 'Ortodoncia - Control', duracion_minutos: 30, prioridad: 'NORMAL', color: '#6366f1', descripcion: 'Control y ajuste de brackets', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-9', nombre: 'Blanqueamiento', duracion_minutos: 60, prioridad: 'BAJA', color: '#84cc16', descripcion: 'Blanqueamiento dental profesional', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-10', nombre: 'Implante - Evaluación', duracion_minutos: 45, prioridad: 'NORMAL', color: '#7c3aed', descripcion: 'Evaluación para implante oseointegrado', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-11', nombre: 'Selladores', duracion_minutos: 30, prioridad: 'BAJA', color: '#0ea5e9', descripcion: 'Sellado de fisuras preventivo', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-12', nombre: 'Obturación / Composite', duracion_minutos: 45, prioridad: 'NORMAL', color: '#f59e0b', descripcion: 'Restauración con composite', activo: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'trat-13', nombre: 'Prótesis - Control', duracion_minutos: 30, prioridad: 'NORMAL', color: '#06b6d4', descripcion: 'Control de prótesis removible', activo: true, created_at: '2024-01-01T00:00:00Z' },
]

// ---- PACIENTES ----
export const MOCK_PACIENTES: Paciente[] = [
    {
        id: 'pac-1', nro_historia_clinica: '100001',
        nombre: 'María Laura', apellido: 'González', dni: '28456123',
        fecha_nacimiento: '1986-04-12', genero: 'F',
        telefono: '11 4523-7891', email: 'mlaura.gonzalez@gmail.com',
        direccion: 'Av. Rivadavia 4520, 3°B', ciudad: 'CABA',
        obra_social_id: 'os-1', n_afiliado: '4521879',
        motivo_consulta: 'Dolor en muela inferior izquierda',
        alergias: 'Penicilina', medicacion_actual: null, antecedentes: 'Diabetes tipo 2',
        notas_internas: 'Paciente puntual, prefiere turnos matutinos',
        created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z',
        obra_social: { id: 'os-1', nombre: 'OSDE', codigo: 'OSDE', activo: true },
    },
    {
        id: 'pac-2', nro_historia_clinica: '100002',
        nombre: 'Carlos Eduardo', apellido: 'Rodríguez', dni: '31654987',
        fecha_nacimiento: '1992-08-25', genero: 'M',
        telefono: '11 6234-5678', email: 'carlos.rodriguez@hotmail.com',
        direccion: 'Calle 48 N° 1220', ciudad: 'La Plata',
        obra_social_id: 'os-2', n_afiliado: '7845231',
        motivo_consulta: 'Control de ortodoncia mensual',
        alergias: null, medicacion_actual: 'Enalapril 10mg', antecedentes: 'Hipertensión',
        notas_internas: null,
        created_at: '2024-05-15T00:00:00Z', updated_at: '2024-05-15T00:00:00Z',
        obra_social: { id: 'os-2', nombre: 'Swiss Medical', codigo: 'SWISS', activo: true },
    },
    {
        id: 'pac-3', nro_historia_clinica: '100003',
        nombre: 'Sofía', apellido: 'Martínez', dni: '40123456',
        fecha_nacimiento: '1999-01-30', genero: 'F',
        telefono: '11 3345-6712', email: 'sofi.mart@gmail.com',
        direccion: 'Belgrano 890', ciudad: 'Quilmes',
        obra_social_id: 'os-7', n_afiliado: null,
        motivo_consulta: 'Dolor de muela de juicio',
        alergias: 'Látex', medicacion_actual: null, antecedentes: null,
        notas_internas: 'Paciente con ansiedad dental, requiere explicación del procedimiento',
        created_at: '2024-06-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z',
        obra_social: { id: 'os-7', nombre: 'Particular', codigo: null, activo: true },
    },
    {
        id: 'pac-4', nro_historia_clinica: '100004',
        nombre: 'Roberto Héctor', apellido: 'López', dni: '18345678',
        fecha_nacimiento: '1958-11-15', genero: 'M',
        telefono: '11 4789-0123', email: null,
        direccion: 'San Martín 1560', ciudad: 'Avellaneda',
        obra_social_id: 'os-5', n_afiliado: '1234567-001',
        motivo_consulta: 'Prótesis inferior desajustada',
        alergias: null, medicacion_actual: 'Metformina 850mg, Losartán 50mg',
        antecedentes: 'Diabetes tipo 2, Hipertensión, Cirugía cardíaca 2018',
        notas_internas: 'Requiere premedicación antibiótica por válvula cardíaca',
        created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z',
        obra_social: { id: 'os-5', nombre: 'PAMI', codigo: 'PAMI', activo: true },
    },
    {
        id: 'pac-5', nro_historia_clinica: '100005',
        nombre: 'Valentina', apellido: 'Fernández', dni: '38901234',
        fecha_nacimiento: '2001-07-22', genero: 'F',
        telefono: '11 2567-8901', email: 'vale.fdez@gmail.com',
        direccion: 'Mitre 340, 1°A', ciudad: 'Lanús',
        obra_social_id: 'os-4', n_afiliado: '9876543',
        motivo_consulta: 'Blanqueamiento dental',
        alergias: null, medicacion_actual: null, antecedentes: null,
        notas_internas: null,
        created_at: '2024-08-10T00:00:00Z', updated_at: '2024-08-10T00:00:00Z',
        obra_social: { id: 'os-4', nombre: 'IOMA', codigo: 'IOMA', activo: true },
    },
    {
        id: 'pac-6', nro_historia_clinica: '100006',
        nombre: 'Diego Alejandro', apellido: 'Sánchez', dni: '25678901',
        fecha_nacimiento: '1979-03-08', genero: 'M',
        telefono: '11 5432-1234', email: 'dsanchez@empresa.com',
        direccion: 'Av. Corrientes 3200, 8°C', ciudad: 'CABA',
        obra_social_id: 'os-3', n_afiliado: '4567890',
        motivo_consulta: 'Caries en pieza 36',
        alergias: 'Ibuprofeno', medicacion_actual: null, antecedentes: null,
        notas_internas: null,
        created_at: '2024-09-05T00:00:00Z', updated_at: '2024-09-05T00:00:00Z',
        obra_social: { id: 'os-3', nombre: 'Galeno', codigo: 'GAL', activo: true },
    },
    {
        id: 'pac-7', nro_historia_clinica: '100007',
        nombre: 'Luciana Paola', apellido: 'Torres', dni: '33456789',
        fecha_nacimiento: '1989-12-04', genero: 'F',
        telefono: '11 6789-0234', email: 'lu.torres@gmail.com',
        direccion: 'Av. Santa Fe 2850', ciudad: 'CABA',
        obra_social_id: 'os-1', n_afiliado: '3214569',
        motivo_consulta: 'Control ortodoncia',
        alergias: null, medicacion_actual: null, antecedentes: null,
        notas_internas: 'Paciente en tratamiento de ortodoncia con Dr. Martín',
        created_at: '2024-02-14T00:00:00Z', updated_at: '2024-02-14T00:00:00Z',
        obra_social: { id: 'os-1', nombre: 'OSDE', codigo: 'OSDE', activo: true },
    },
    {
        id: 'pac-8', nro_historia_clinica: '100008',
        nombre: 'Gustavo Ernesto', apellido: 'Herrera', dni: '22345678',
        fecha_nacimiento: '1965-06-19', genero: 'M',
        telefono: '11 4321-9876', email: null,
        direccion: 'Almirante Brown 720', ciudad: 'Adrogué',
        obra_social_id: 'os-7', n_afiliado: null,
        motivo_consulta: 'Extracción de pieza fracturada',
        alergias: null, medicacion_actual: 'Omeprazol 20mg', antecedentes: 'Gastritis crónica',
        notas_internas: null,
        created_at: '2024-04-30T00:00:00Z', updated_at: '2024-04-30T00:00:00Z',
        obra_social: { id: 'os-7', nombre: 'Particular', codigo: null, activo: true },
    },
    {
        id: 'pac-9', nro_historia_clinica: '100009',
        nombre: 'Natalia', apellido: 'Romero', dni: '36789012',
        fecha_nacimiento: '1995-09-14', genero: 'F',
        telefono: '11 7890-1234', email: 'nati.romero@outlook.com',
        direccion: 'Calle 7 N° 450', ciudad: 'La Plata',
        obra_social_id: 'os-6', n_afiliado: '2345678',
        motivo_consulta: 'Limpieza dental y evaluación inicial',
        alergias: null, medicacion_actual: null, antecedentes: null, notas_internas: null,
        created_at: '2025-01-08T00:00:00Z', updated_at: '2025-01-08T00:00:00Z',
        obra_social: { id: 'os-6', nombre: 'Medifé', codigo: 'MDF', activo: true },
    },
    {
        id: 'pac-10', nro_historia_clinica: '100010',
        nombre: 'Pablo Andrés', apellido: 'Acosta', dni: '29012345',
        fecha_nacimiento: '1983-02-28', genero: 'M',
        telefono: '11 8901-2345', email: 'pacosta@gmail.com',
        direccion: 'Av. Callao 1180, 5°D', ciudad: 'CABA',
        obra_social_id: 'os-2', n_afiliado: '9012345',
        motivo_consulta: 'Revisión de rutina y control anual',
        alergias: 'Amoxicilina', medicacion_actual: null, antecedentes: null,
        notas_internas: 'Alérgico a betalactámicos — usar alternativas',
        created_at: '2025-02-17T00:00:00Z', updated_at: '2025-02-17T00:00:00Z',
        obra_social: { id: 'os-2', nombre: 'Swiss Medical', codigo: 'SWISS', activo: true },
    },
    {
        id: 'pac-11', nro_historia_clinica: '100011',
        nombre: 'Camila', apellido: 'Vega', dni: '42345678',
        fecha_nacimiento: '2003-05-10', genero: 'F',
        telefono: '11 3456-7890', email: 'camiivega@gmail.com',
        direccion: 'Perón 2230', ciudad: 'Lomas de Zamora',
        obra_social_id: 'os-4', n_afiliado: '6789012',
        motivo_consulta: 'Selladores preventivos',
        alergias: null, medicacion_actual: null, antecedentes: null, notas_internas: null,
        created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z',
        obra_social: { id: 'os-4', nombre: 'IOMA', codigo: 'IOMA', activo: true },
    },
    {
        id: 'pac-12', nro_historia_clinica: '100012',
        nombre: 'Marcelo Osvaldo', apellido: 'Ruiz', dni: '14567890',
        fecha_nacimiento: '1951-10-03', genero: 'M',
        telefono: '11 4567-8901', email: null,
        direccion: 'Italia 560', ciudad: 'Temperley',
        obra_social_id: 'os-5', n_afiliado: '7654321-002',
        motivo_consulta: 'Control de prótesis removible',
        alergias: null, medicacion_actual: 'Atorvastatina 40mg, AAS 100mg',
        antecedentes: 'Hiperlipidemia, IAM 2015',
        notas_internas: 'Requiere premedicación. Consultar Dr. Álvarez antes de extracciones',
        created_at: '2024-07-22T00:00:00Z', updated_at: '2024-07-22T00:00:00Z',
        obra_social: { id: 'os-5', nombre: 'PAMI', codigo: 'PAMI', activo: true },
    },
]

// ---- Helper para crear turnos ----
function turno(
    id: string,
    pacId: string,
    profId: string,
    tratId: string,
    diasDesdeHoy: number,
    horaH: number,
    horaM: number,
    estado: Turno['estado'] = 'CONFIRMADO',
    origen: Turno['origen'] = 'SECRETARIA',
    notas?: string
): Turno {
    const trat = MOCK_TRATAMIENTOS.find((t) => t.id === tratId)!
    const pac = MOCK_PACIENTES.find((p) => p.id === pacId)!
    const prof = MOCK_PROFESIONALES.find((p) => p.id === profId)!
    const inicio = setMinutes(setHours(addDays(hoy, diasDesdeHoy), horaH), horaM)
    const fin = new Date(inicio.getTime() + trat.duracion_minutos * 60000)
    return {
        id, paciente_id: pacId, profesional_id: profId, tipo_tratamiento_id: tratId,
        fecha_inicio: inicio.toISOString(), fecha_fin: fin.toISOString(),
        estado, prioridad_override: null, notas: notas ?? null, origen,
        created_at: subDays(inicio, 3).toISOString(), updated_at: subDays(inicio, 3).toISOString(),
        paciente: pac, profesional: prof, tipo_tratamiento: trat,
    }
}

// ---- TURNOS (hoy + próximos días + pasados) ----
export const MOCK_TURNOS: Turno[] = [
    // Hoy — Prof 1 (Ricardo)
    turno('turno-001', 'pac-1', 'prof-1', 'trat-4', 0, 9, 0, 'ATENDIDO'),
    turno('turno-002', 'pac-3', 'prof-1', 'trat-6', 0, 9, 45, 'EN_SALA'),
    turno('turno-003', 'pac-6', 'prof-1', 'trat-1', 0, 10, 30, 'CONFIRMADO'),
    turno('turno-004', 'pac-10', 'prof-1', 'trat-5', 0, 12, 0, 'PENDIENTE'),
    turno('turno-005', 'pac-7', 'prof-1', 'trat-12', 0, 15, 30, 'PENDIENTE'),

    // Hoy — Prof 2 (Martín)
    turno('turno-006', 'pac-2', 'prof-2', 'trat-8', 0, 9, 0, 'ATENDIDO'),
    turno('turno-007', 'pac-7', 'prof-2', 'trat-8', 0, 9, 30, 'ATENDIDO'),
    turno('turno-008', 'pac-5', 'prof-2', 'trat-4', 0, 10, 0, 'EN_SALA'),
    turno('turno-009', 'pac-11', 'prof-2', 'trat-9', 0, 11, 0, 'CONFIRMADO'),
    turno('turno-010', 'pac-4', 'prof-2', 'trat-5', 0, 15, 0, 'PENDIENTE', 'SECRETARIA', 'Premedicación antibiótica confirmada'),
    turno('turno-011', 'pac-12', 'prof-2', 'trat-5', 0, 16, 0, 'PENDIENTE'),

    // Mañana — Prof 1
    turno('turno-012', 'pac-8', 'prof-1', 'trat-2', 1, 9, 0, 'CONFIRMADO'),
    turno('turno-013', 'pac-9', 'prof-1', 'trat-4', 1, 10, 0, 'CONFIRMADO'),
    turno('turno-014', 'pac-1', 'prof-1', 'trat-1', 1, 11, 0, 'PENDIENTE'),

    // Mañana — Prof 2
    turno('turno-015', 'pac-7', 'prof-2', 'trat-8', 1, 9, 30, 'CONFIRMADO'),
    turno('turno-016', 'pac-5', 'prof-2', 'trat-7', 1, 10, 30, 'PENDIENTE'),
    turno('turno-017', 'pac-3', 'prof-2', 'trat-11', 1, 12, 0, 'PENDIENTE'),

    // Pasado mañana
    turno('turno-018', 'pac-2', 'prof-1', 'trat-12', 2, 9, 0, 'PENDIENTE'),
    turno('turno-019', 'pac-4', 'prof-1', 'trat-3', 2, 10, 0, 'PENDIENTE'),
    turno('turno-020', 'pac-11', 'prof-2', 'trat-4', 2, 9, 0, 'PENDIENTE'),
    turno('turno-021', 'pac-6', 'prof-2', 'trat-10', 2, 11, 0, 'PENDIENTE'),

    // Dentro de 3 días
    turno('turno-022', 'pac-10', 'prof-1', 'trat-5', 3, 9, 30, 'PENDIENTE', 'ONLINE'),
    turno('turno-023', 'pac-12', 'prof-2', 'trat-13', 3, 10, 0, 'CONFIRMADO'),

    // Semana pasada (histórico)
    turno('turno-030', 'pac-1', 'prof-1', 'trat-4', -7, 9, 0, 'ATENDIDO'),
    turno('turno-031', 'pac-2', 'prof-2', 'trat-8', -7, 9, 30, 'ATENDIDO'),
    turno('turno-032', 'pac-5', 'prof-1', 'trat-5', -5, 10, 0, 'ATENDIDO'),
    turno('turno-033', 'pac-8', 'prof-2', 'trat-2', -5, 11, 0, 'CANCELADO'),
    turno('turno-034', 'pac-6', 'prof-1', 'trat-12', -3, 9, 0, 'ATENDIDO'),
    turno('turno-035', 'pac-9', 'prof-2', 'trat-4', -3, 10, 0, 'ATENDIDO'),
    turno('turno-036', 'pac-7', 'prof-2', 'trat-8', -2, 9, 30, 'ATENDIDO'),
    turno('turno-037', 'pac-3', 'prof-1', 'trat-6', -1, 9, 0, 'CANCELADO', 'SECRETARIA', 'Paciente llamó para cancelar'),
    turno('turno-038', 'pac-4', 'prof-2', 'trat-5', -1, 15, 0, 'AUSENTE'),
]

// ---- HISTORIAL CLÍNICO ----
export const MOCK_HISTORIAL: HistorialClinico[] = [
    {
        id: 'hist-1', paciente_id: 'pac-1', turno_id: 'turno-030',
        profesional_id: 'prof-1', fecha: subDays(hoy, 7).toISOString().split('T')[0],
        observaciones: 'Paciente concurre para control y profilaxis. Buen estado general de higiene bucal.',
        procedimiento_realizado: 'Limpieza dental - Profilaxis completa + detartraje supragingival',
        presupuesto: 12000, created_at: subDays(hoy, 7).toISOString(),
        profesional: MOCK_PROFESIONALES[0],
    },
    {
        id: 'hist-2', paciente_id: 'pac-1', turno_id: 'turno-001',
        profesional_id: 'prof-1', fecha: hoy.toISOString().split('T')[0],
        observaciones: 'Se inicia tratamiento de conducto en pieza 24. Primera sesión: apertura y conductometría. Paciente tolera bien el procedimiento.',
        procedimiento_realizado: 'Tratamiento de Conducto - Pieza 24 (1ra sesión)',
        presupuesto: 85000, created_at: hoy.toISOString(),
        profesional: MOCK_PROFESIONALES[0],
    },
    {
        id: 'hist-3', paciente_id: 'pac-2', turno_id: 'turno-031',
        profesional_id: 'prof-2', fecha: subDays(hoy, 7).toISOString().split('T')[0],
        observaciones: 'Control de ortodoncia mensual. Se realizan ajustes en el arco superior e inferior. Buen progreso.',
        procedimiento_realizado: 'Ortodoncia - Control y ajuste de brackets (mes 8)',
        presupuesto: 8000, created_at: subDays(hoy, 7).toISOString(),
        profesional: MOCK_PROFESIONALES[1],
    },
    {
        id: 'hist-4', paciente_id: 'pac-7', turno_id: 'turno-036',
        profesional_id: 'prof-2', fecha: subDays(hoy, 2).toISOString().split('T')[0],
        observaciones: 'Control mensual de ortodoncia. Paciente presenta buen avance. Se ajustan ligaduras.',
        procedimiento_realizado: 'Ortodoncia - Control mensual (mes 12)',
        presupuesto: 8000, created_at: subDays(hoy, 2).toISOString(),
        profesional: MOCK_PROFESIONALES[1],
    },
    {
        id: 'hist-5', paciente_id: 'pac-6', turno_id: 'turno-034',
        profesional_id: 'prof-1', fecha: subDays(hoy, 3).toISOString().split('T')[0],
        observaciones: 'Restauración de pieza 36 con composite. Se elimina caries secundaria. Buen resultado estético.',
        procedimiento_realizado: 'Obturación con composite - Pieza 36',
        presupuesto: 22000, created_at: subDays(hoy, 3).toISOString(),
        profesional: MOCK_PROFESIONALES[0],
    },
    {
        id: 'hist-6', paciente_id: 'pac-9', turno_id: 'turno-035',
        profesional_id: 'prof-2', fecha: subDays(hoy, 3).toISOString().split('T')[0],
        observaciones: 'Primera consulta de la paciente. Profilaxis completa. Se detectan dos caries incipientes en piezas 16 y 26.',
        procedimiento_realizado: 'Limpieza dental + evaluación inicial',
        presupuesto: 12000, created_at: subDays(hoy, 3).toISOString(),
        profesional: MOCK_PROFESIONALES[1],
    },
]

// ---- COBROS ----
export const MOCK_COBROS: Cobro[] = [
    {
        id: 'cobro-1', turno_id: 'turno-030', paciente_id: 'pac-1',
        monto_total: 12000, monto_pagado: 12000, metodo_pago: 'OBRA_SOCIAL',
        obra_social_id: 'os-1', estado: 'PAGADO',
        fecha_pago: subDays(hoy, 7).toISOString().split('T')[0],
        created_at: subDays(hoy, 7).toISOString(),
        paciente: MOCK_PACIENTES[0],
    },
    {
        id: 'cobro-2', turno_id: 'turno-031', paciente_id: 'pac-2',
        monto_total: 8000, monto_pagado: 8000, metodo_pago: 'OBRA_SOCIAL',
        obra_social_id: 'os-2', estado: 'PAGADO',
        fecha_pago: subDays(hoy, 7).toISOString().split('T')[0],
        created_at: subDays(hoy, 7).toISOString(),
        paciente: MOCK_PACIENTES[1],
    },
    {
        id: 'cobro-3', turno_id: 'turno-034', paciente_id: 'pac-6',
        monto_total: 22000, monto_pagado: 11000, metodo_pago: 'EFECTIVO',
        obra_social_id: null, estado: 'PARCIAL',
        fecha_pago: subDays(hoy, 3).toISOString().split('T')[0],
        created_at: subDays(hoy, 3).toISOString(),
        paciente: MOCK_PACIENTES[5],
    },
    {
        id: 'cobro-4', turno_id: 'turno-035', paciente_id: 'pac-9',
        monto_total: 12000, monto_pagado: 0, metodo_pago: 'TRANSFERENCIA',
        obra_social_id: null, estado: 'PENDIENTE', fecha_pago: null,
        created_at: subDays(hoy, 3).toISOString(),
        paciente: MOCK_PACIENTES[8],
    },
    {
        id: 'cobro-5', turno_id: 'turno-036', paciente_id: 'pac-7',
        monto_total: 8000, monto_pagado: 8000, metodo_pago: 'TARJETA',
        obra_social_id: null, estado: 'PAGADO',
        fecha_pago: subDays(hoy, 2).toISOString().split('T')[0],
        created_at: subDays(hoy, 2).toISOString(),
        paciente: MOCK_PACIENTES[6],
    },
    {
        id: 'cobro-6', turno_id: 'turno-001', paciente_id: 'pac-1',
        monto_total: 85000, monto_pagado: 0, metodo_pago: 'OBRA_SOCIAL',
        obra_social_id: 'os-1', estado: 'PENDIENTE', fecha_pago: null,
        created_at: hoy.toISOString(),
        paciente: MOCK_PACIENTES[0],
    },
]

// ---- HELPERS ----
export function getTurnosDelDia(fecha: Date): Turno[] {
    const diaStr = fecha.toISOString().split('T')[0]
    return MOCK_TURNOS.filter((t) => t.fecha_inicio.startsWith(diaStr))
}

export function getTurnosDeSemana(inicio: Date, fin: Date): Turno[] {
    return MOCK_TURNOS.filter((t) => {
        const fecha = new Date(t.fecha_inicio)
        return fecha >= inicio && fecha <= fin
    })
}

export function getPacienteById(id: string): Paciente | undefined {
    return MOCK_PACIENTES.find((p) => p.id === id)
}

export function getTurnosPorPaciente(pacienteId: string): Turno[] {
    return MOCK_TURNOS.filter((t) => t.paciente_id === pacienteId)
        .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
}

export function getHistorialPorPaciente(pacienteId: string): HistorialClinico[] {
    return MOCK_HISTORIAL.filter((h) => h.paciente_id === pacienteId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

export function getCobrosPorPaciente(pacienteId: string): Cobro[] {
    return MOCK_COBROS.filter((c) => c.paciente_id === pacienteId)
}

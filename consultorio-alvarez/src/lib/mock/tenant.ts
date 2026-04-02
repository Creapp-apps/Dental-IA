import type { Tenant, Profesional, TipoTratamiento, ObraSocial } from '@/types'

// ----------------------------------------------------------------
// Mock del tenant activo — Consultorio Álvarez
// ----------------------------------------------------------------

export const MOCK_TENANT: Tenant = {
    id: 'tenant-alvarez-001',
    slug: 'alvarez',
    nombre: 'Consultorio Álvarez',
    descripcion:
        'Más de 15 años brindando atención profesional en odontología y medicina general. Nuestro equipo está comprometido con tu salud y bienestar.',
    logo_url: null,
    telefono: '+54 9 11 4567-8900',
    email_contacto: 'turnos@consultorioalvarez.com.ar',
    direccion: 'Av. Corrientes 1234, Piso 3, Of. 5',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    cuit: '20-12345678-9',
    color_primario: '#2563eb',
    color_secundario: '#1e40af',
    plan: 'pro',
    landing_activa: true,
    turnos_online_activos: true,
    horarios: [
        { dia: 1, apertura: '09:00', cierre: '18:00', activo: true },
        { dia: 2, apertura: '09:00', cierre: '18:00', activo: true },
        { dia: 3, apertura: '09:00', cierre: '18:00', activo: true },
        { dia: 4, apertura: '09:00', cierre: '18:00', activo: true },
        { dia: 5, apertura: '09:00', cierre: '14:00', activo: true },
        { dia: 6, apertura: '10:00', cierre: '13:00', activo: false },
        { dia: 0, apertura: '00:00', cierre: '00:00', activo: false },
    ],
    activo: true,
    created_at: '2024-01-01T00:00:00Z',
}

// ----------------------------------------------------------------
// Profesionales del tenant
// ----------------------------------------------------------------

export const MOCK_PROFESIONALES: Profesional[] = [
    {
        id: 'prof-001',
        nombre: 'Martín',
        apellido: 'Álvarez',
        color_agenda: '#2563eb',
        email: 'martin@consultorioalvarez.com.ar',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
        especialidad: 'Odontología General',
        matricula: 'MP 12345',
        foto_url: null,
        descripcion: 'Especialista en odontología general y estética dental con más de 15 años de experiencia.',
    },
    {
        id: 'prof-002',
        nombre: 'Carolina',
        apellido: 'Méndez',
        color_agenda: '#7c3aed',
        email: 'carolina@consultorioalvarez.com.ar',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
        especialidad: 'Ortodoncia',
        matricula: 'MP 67890',
        foto_url: null,
        descripcion: 'Ortodoncista con especialización en técnicas modernas de alineación dental.',
    },
    {
        id: 'prof-003',
        nombre: 'Roberto',
        apellido: 'Sosa',
        color_agenda: '#059669',
        email: 'roberto@consultorioalvarez.com.ar',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
        especialidad: 'Endodoncia',
        matricula: 'MP 54321',
        foto_url: null,
        descripcion: 'Especialista en tratamientos de conducto radicular y endodoncia avanzada.',
    },
]

// ----------------------------------------------------------------
// Tipos de tratamiento del tenant
// ----------------------------------------------------------------

export const MOCK_TRATAMIENTOS: TipoTratamiento[] = [
    {
        id: 'trat-001',
        nombre: 'Consulta General',
        duracion_minutos: 30,
        prioridad: 'NORMAL',
        color: '#2563eb',
        descripcion: 'Evaluación inicial y diagnóstico general del estado de salud oral.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'trat-002',
        nombre: 'Limpieza Dental',
        duracion_minutos: 45,
        prioridad: 'NORMAL',
        color: '#0891b2',
        descripcion: 'Limpieza y profilaxis dental profesional.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'trat-003',
        nombre: 'Extracción',
        duracion_minutos: 60,
        prioridad: 'ALTA',
        color: '#dc2626',
        descripcion: 'Extracción dental simple o compleja según diagnóstico.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'trat-004',
        nombre: 'Blanqueamiento',
        duracion_minutos: 90,
        prioridad: 'BAJA',
        color: '#d97706',
        descripcion: 'Tratamiento de blanqueamiento dental profesional.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'trat-005',
        nombre: 'Ortodoncia — Consulta',
        duracion_minutos: 30,
        prioridad: 'NORMAL',
        color: '#7c3aed',
        descripcion: 'Evaluación y seguimiento de tratamiento de ortodoncia.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
    {
        id: 'trat-006',
        nombre: 'Endodoncia',
        duracion_minutos: 90,
        prioridad: 'ALTA',
        color: '#059669',
        descripcion: 'Tratamiento de conducto para salvar la pieza dental.',
        activo: true,
        created_at: '2024-01-01T00:00:00Z',
    },
]

// ----------------------------------------------------------------
// Obras sociales aceptadas
// ----------------------------------------------------------------

export const MOCK_OBRAS_SOCIALES: ObraSocial[] = [
    { id: 'os-001', nombre: 'OSDE', codigo: '009', activo: true },
    { id: 'os-002', nombre: 'Swiss Medical', codigo: '056', activo: true },
    { id: 'os-003', nombre: 'Medicus', codigo: '074', activo: true },
    { id: 'os-004', nombre: 'IOMA', codigo: '100', activo: true },
    { id: 'os-005', nombre: 'Galeno', codigo: '042', activo: true },
    { id: 'os-006', nombre: 'Particular (sin obra social)', codigo: null, activo: true },
]

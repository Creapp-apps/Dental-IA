// ── Clinic Data ─────────────────────────────────────────────────
// Hardcoded for the landing — no runtime DB dependency

export const CLINIC = {
    name: 'Consultorio Álvarez',
    tagline: 'Tu sonrisa, elevada',
    description:
        'Más de 15 años brindando atención profesional en odontología. Nuestro equipo está comprometido con tu salud y bienestar.',
    phone: '+54 9 11 4567-8900',
    email: 'turnos@consultorioalvarez.com.ar',
    address: 'Av. Corrientes 1234, Piso 3, Of. 5',
    city: 'Buenos Aires',
    hours: 'Lunes a Viernes 9–18hs · Sábados 10–13hs',
    teal: '#0d9488',
    tealDeep: '#0f766e',
}

export interface Service {
    id: string
    title: string
    subtitle: string
    description: string
    icon: string // emoji
    duration: string
}

export const SERVICES: Service[] = [
    {
        id: 'ortodoncia',
        title: 'Ortodoncia Invisible',
        subtitle: 'Alineación sin brackets',
        description:
            'Alineadores transparentes de última generación para corregir tu sonrisa de forma discreta y cómoda.',
        icon: '✦',
        duration: '12–18 meses',
    },
    {
        id: 'diseno',
        title: 'Diseño de Sonrisa',
        subtitle: 'Estética dental avanzada',
        description:
            'Planificación digital y carillas de porcelana para lograr la sonrisa perfecta que siempre deseaste.',
        icon: '◆',
        duration: '2–4 sesiones',
    },
    {
        id: 'implantes',
        title: 'Implantes Dentales',
        subtitle: 'Tecnología de punta',
        description:
            'Implantes de titanio con tecnología guiada por computadora para resultados precisos y duraderos.',
        icon: '⬡',
        duration: '3–6 meses',
    },
    {
        id: 'blanqueamiento',
        title: 'Blanqueamiento Láser',
        subtitle: 'Resultados inmediatos',
        description:
            'Blanqueamiento profesional con láser de última generación para dientes hasta 8 tonos más blancos.',
        icon: '◇',
        duration: '1 sesión',
    },
]

export interface Professional {
    id: string
    name: string
    lastName: string
    specialty: string
    license: string
    color: string
}

export const PROFESSIONALS: Professional[] = [
    {
        id: 'prof-001',
        name: 'Martín',
        lastName: 'Álvarez',
        specialty: 'Odontología General',
        license: 'MP 12345',
        color: '#0d9488',
    },
    {
        id: 'prof-002',
        name: 'Carolina',
        lastName: 'Méndez',
        specialty: 'Ortodoncia',
        license: 'MP 67890',
        color: '#7c3aed',
    },
    {
        id: 'prof-003',
        name: 'Roberto',
        lastName: 'Sosa',
        specialty: 'Endodoncia',
        license: 'MP 54321',
        color: '#059669',
    },
]

// ── Mock available days for booking ──────────────────────────────

export function generateMockDays(count: number) {
    const days: { date: Date; slots: string[] }[] = []
    const now = new Date()
    for (let i = 1; i <= count; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        if (d.getDay() === 0) continue // skip sundays
        const allSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
        ]
        const available = d.getDay() === 6
            ? allSlots.filter((s) => parseInt(s) < 13)
            : allSlots
        const filtered = available.filter((_, idx) => (d.getDate() + idx) % 3 !== 0)
        if (filtered.length > 0) days.push({ date: d, slots: filtered })
    }
    return days
}

export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

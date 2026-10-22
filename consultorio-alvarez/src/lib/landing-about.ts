// Textos por defecto de la sección "Nosotros" (video tour). Se comparten entre
// la sección pública (AboutUsSection) y el editor (TabMiWeb), para que el
// consultorio vea los textos reales de la plantilla y pueda editarlos.

export interface AboutScene {
    src: string
    title: string
    subtitle: string
    badge: string
}

export interface AboutFeature {
    title: string
    description: string
}

export const ABOUT_DEFAULT_EYEBROW = 'CONOCÉ NUESTRO CONSULTORIO'
export const ABOUT_DEFAULT_TITULO = 'Un espacio pensado para tu bienestar'
export const ABOUT_DEFAULT_SUBTITULO = 'Recorré virtualmente nuestras instalaciones de vanguardia. Tecnología de alta precisión, higiene médica rigurosa y máxima comodidad para tu atención.'

export const ABOUT_DEFAULT_SCENES: AboutScene[] = [
    {
        src: '/videos/Consultorio%20VIDEO%201.mp4',
        title: 'Instalaciones Premium & Sillones 3D',
        subtitle: 'Consultorio climatizado y equipado con tecnología médica de alta precisión.',
        badge: 'Equipamiento de Avanzada',
    },
    {
        src: '/videos/Consultorio%20VIDEO%202.mp4',
        title: 'Confort & Bioseguridad Grado Quirúrgico',
        subtitle: 'Ambientes diseñados para tu tranquilidad y máximo estándar de esterilización.',
        badge: 'Higiene & Confort',
    },
    {
        src: '/videos/Consultorio%20VIDEO%203.mp4',
        title: 'Atención Odontológica Personalizada',
        subtitle: 'Instrumental digitalizado e innovación constante para cuidar tu sonrisa.',
        badge: 'Innovación Odontológica',
    },
]

export const ABOUT_DEFAULT_FEATURES: AboutFeature[] = [
    {
        title: 'Bioseguridad Médica',
        description: 'Protocolos estrictos de esterilización y desinfección grado hospitalario en cada sesión.',
    },
    {
        title: 'Tecnología Intraoral 3D',
        description: 'Escaneo digitalizado y radiología de alta definición sin molestias ni pastas tradicionales.',
    },
    {
        title: 'Turnos Puntuales y Sin Demoras',
        description: 'Gestión de agenda sin demoras para garantizar una atención relajada y personalizada.',
    },
]

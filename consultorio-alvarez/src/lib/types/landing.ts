// Types and constants for landing config — NOT a server file, safe to import anywhere

export interface LogoConfig {
    type: 'image' | 'text'
    image_url: string | null
    text: string
    font: string
    icon: string
    color_style: 'gradient' | 'solid' | 'monochrome'
}

export interface LandingConfig {
    id: string
    tenant_id: string
    hero_badge: string
    hero_titulo: string
    hero_subtitulo: string
    servicios_titulo: string
    equipo_titulo: string
    booking_titulo: string
    booking_subtitulo: string
    servicios: { icono: string; titulo: string; descripcion: string }[]
    color_primary: string
    color_primary_hover: string
    color_accent: string
    color_bg_hero: string
    color_bg_dark: string
    logo_url: string | null
    logo_config?: LogoConfig
    meta_title: string | null
    meta_description: string | null
    custom_domain: string | null
    domain_verified: boolean
    footer_address: string | null
    footer_phone: string | null
    footer_email: string | null
    footer_hours: string | null
}

export const DEFAULT_LANDING_CONFIG: Omit<LandingConfig, 'id' | 'tenant_id'> = {
    hero_badge: 'Reservar Turno',
    hero_titulo: 'Agenda tu visita',
    hero_subtitulo: 'Seleccioná día, horario y profesional. Te confirmaremos a la brevedad.',
    servicios_titulo: 'Nuestros Servicios',
    equipo_titulo: 'Nuestro Equipo',
    booking_titulo: 'Agenda tu visita',
    booking_subtitulo: 'Seleccioná día, horario y profesional. Te confirmaremos a la brevedad.',
    servicios: [
        { icono: 'shield', titulo: 'Sin dolor', descripcion: 'Técnicas modernas para una experiencia cómoda' },
        { icono: 'clock', titulo: 'Turnos puntuales', descripcion: 'Respetamos tu tiempo al máximo' },
        { icono: 'star', titulo: 'Atención premium', descripcion: 'Tecnología de vanguardia' },
        { icono: 'heart', titulo: 'Seguimiento', descripcion: 'Historia clínica digital personalizada' },
    ],
    color_primary: '#0d9488',
    color_primary_hover: '#0f766e',
    color_accent: '#2dd4bf',
    color_bg_hero: '#f0fdfa',
    color_bg_dark: '#0b1525',
    logo_url: null,
    meta_title: null,
    meta_description: null,
    custom_domain: null,
    domain_verified: false,
    footer_address: null,
    footer_phone: null,
    footer_email: null,
    footer_hours: null,
}


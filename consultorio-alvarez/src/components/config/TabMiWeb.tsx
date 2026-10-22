'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
    Save, Globe, ExternalLink, Palette, Type, List,
    Plus, Trash2, Eye, MapPin, Image as ImageIcon
} from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { guardarLandingConfig } from '@/lib/actions/landing'
import type { LandingConfig, LogoConfig } from '@/lib/types/landing'
import { TenantLogo } from '@/components/ui/tenant-logo'
import { glassAlert } from '@/components/ui/glass-alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUploader } from '@/components/ui/image-uploader'
import { MediaUploader } from '@/components/ui/media-uploader'
import { ABOUT_DEFAULT_SCENES, ABOUT_DEFAULT_FEATURES } from '@/lib/landing-about'

// ── Paleta de colores predefinida ─────────────────────────────────

interface PalettePreset {
    name: string
    primary: string
    hover: string
    accent: string
    bg: string
    dark: string
}

const PRESET_PALETTES: PalettePreset[] = [
    { name: 'Teal (default)', primary: '#0d9488', hover: '#0f766e', accent: '#2dd4bf', bg: '#f0fdfa', dark: '#0b1525' },
    { name: 'Azul Clinical', primary: '#2563eb', hover: '#1d4ed8', accent: '#60a5fa', bg: '#eff6ff', dark: '#0f172a' },
    { name: 'Violeta Premium', primary: '#7c3aed', hover: '#6d28d9', accent: '#a78bfa', bg: '#f5f3ff', dark: '#1e1b4b' },
    { name: 'Esmeralda', primary: '#059669', hover: '#047857', accent: '#34d399', bg: '#ecfdf5', dark: '#052e16' },
    { name: 'Rosa Suave', primary: '#db2777', hover: '#be185d', accent: '#f9a8d4', bg: '#fdf2f8', dark: '#1a0a11' },
    { name: 'Naranja Vital', primary: '#ea580c', hover: '#c2410c', accent: '#fb923c', bg: '#fff7ed', dark: '#1c0a00' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
        </div>
    )
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType<{ className?: string }> }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            {children}
        </div>
    )
}

// ── Componente principal ──────────────────────────────────────────

interface TabMiWebProps {
    config: LandingConfig
    slug: string
}

export function TabMiWeb({ config, slug }: TabMiWebProps) {
    const [isPending, startTransition] = useTransition()

    // Textos
    const [textos, setTextos] = useState({
        hero_badge: config.hero_badge,
        hero_titulo: config.hero_titulo,
        hero_subtitulo: config.hero_subtitulo,
        servicios_titulo: config.servicios_titulo,
        servicios_subtitulo: config.servicios_subtitulo ?? '',
        equipo_titulo: config.equipo_titulo,
        equipo_subtitulo: config.equipo_subtitulo ?? '',
        booking_titulo: config.booking_titulo,
        booking_subtitulo: config.booking_subtitulo,
        meta_title: config.meta_title ?? '',
        meta_description: config.meta_description ?? '',
        footer_address: config.footer_address ?? '',
        footer_phone: config.footer_phone ?? '',
        footer_email: config.footer_email ?? '',
        footer_hours: config.footer_hours ?? '',
        coberturas_subtitulo: config.coberturas_subtitulo ?? '',
        asistente_nombre: config.asistente_nombre ?? 'CinthIA',
    })

    // Colores
    const [colores, setColores] = useState({
        color_primary: config.color_primary,
        color_primary_hover: config.color_primary_hover,
        color_accent: config.color_accent,
        color_bg_hero: config.color_bg_hero,
        color_bg_dark: config.color_bg_dark,
    })

    // Logo
    const [logoConfig, setLogoConfig] = useState<LogoConfig>(config.logo_config || {
        type: 'text',
        image_url: null,
        text: 'Consultorio',
        font: 'font-sans',
        icon: 'Stethoscope',
        color_style: 'gradient'
    })

    // Servicios
    const [servicios, setServicios] = useState(config.servicios)

    // Hero slides (fotos de la portada)
    const [heroSlides, setHeroSlides] = useState(config.hero_slides ?? [])

    // Sección "Nosotros" (video tour). Escenas y tarjetas se siembran con los
    // textos de la plantilla si el tenant todavía no cargó los suyos, así los ve
    // y los puede editar.
    const [escenas, setEscenas] = useState(config.about_videos ?? ABOUT_DEFAULT_SCENES)
    const [aboutFeatures, setAboutFeatures] = useState(config.about_features ?? ABOUT_DEFAULT_FEATURES)
    const [aboutTitulo, setAboutTitulo] = useState(config.about_titulo ?? '')
    const [aboutSubtitulo, setAboutSubtitulo] = useState(config.about_subtitulo ?? '')
    // null = default por slug; acá lo materializamos a booleano para el toggle.
    const [aboutVisible, setAboutVisible] = useState<boolean>(
        config.about_visible ?? (!slug || slug === 'alvarez')
    )

    // Sub-tabs internos para no tener un scroll infinito de ajustes.
    const SUBTABS = [
        { id: 'apariencia', label: 'Apariencia', icon: Palette },
        { id: 'textos', label: 'Textos', icon: Type },
        { id: 'medios', label: 'Imágenes y video', icon: ImageIcon },
        { id: 'contacto', label: 'Contacto', icon: MapPin },
    ] as const
    const [subtab, setSubtab] = useState<typeof SUBTABS[number]['id']>('apariencia')

    function applyPalette(p: PalettePreset) {
        setColores({
            color_primary: p.primary,
            color_primary_hover: p.hover,
            color_accent: p.accent,
            color_bg_hero: p.bg,
            color_bg_dark: p.dark,
        })
    }

    function addServicio() {
        setServicios(s => [...s, { icono: 'star', titulo: 'Nuevo servicio', descripcion: 'Descripción del servicio' }])
    }

    function removeServicio(i: number) {
        setServicios(s => s.filter((_, idx) => idx !== i))
    }

    function updateServicio(i: number, field: string, val: string) {
        setServicios(s => s.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
    }

    // ── Hero slides ──
    function addHeroSlide() {
        setHeroSlides(s => [...s, { image_url: '', title: '', description: '', tag: '' }])
    }
    function removeHeroSlide(i: number) {
        setHeroSlides(s => s.filter((_, idx) => idx !== i))
    }
    function updateHeroSlide(i: number, field: string, val: string) {
        setHeroSlides(s => s.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
    }

    // ── Escenas de "Nosotros" (video + textos) ──
    function addEscena() {
        setEscenas(v => [...v, { src: '', title: '', subtitle: '', badge: '' }])
    }
    function removeEscena(i: number) {
        setEscenas(v => v.filter((_, idx) => idx !== i))
    }
    function updateEscena(i: number, field: string, val: string) {
        setEscenas(v => v.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
    }

    // ── Tarjetas de "Nosotros" ──
    function addFeature() {
        setAboutFeatures(f => [...f, { title: '', description: '' }])
    }
    function removeFeature(i: number) {
        setAboutFeatures(f => f.filter((_, idx) => idx !== i))
    }
    function updateFeature(i: number, field: string, val: string) {
        setAboutFeatures(f => f.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
    }

    function guardar() {
        startTransition(async () => {
            // Hero: solo slides con foto cargada. Escenas/tarjetas: filtramos las
            // completamente vacías (las demás guardan texto aunque no tengan video).
            const heroSlidesLimpios = heroSlides.filter(s => s.image_url)
            const escenasLimpias = escenas.filter(v => v.src || v.title || v.subtitle || v.badge)
            const featuresLimpias = aboutFeatures.filter(f => f.title || f.description)
            const r = await guardarLandingConfig({
                ...textos,
                ...colores,
                servicios,
                logo_config: logoConfig,
                hero_slides: heroSlidesLimpios.length > 0 ? heroSlidesLimpios : null,
                about_videos: escenasLimpias.length > 0 ? escenasLimpias : null,
                about_features: featuresLimpias.length > 0 ? featuresLimpias : null,
                about_titulo: aboutTitulo || null,
                about_subtitulo: aboutSubtitulo || null,
                about_visible: aboutVisible,
            }, slug)
            if (r.error) glassAlert.error({ title: 'Error al guardar', description: r.error })
            else glassAlert.success({ title: '¡Landing actualizada!', description: 'Los cambios ya están publicados.' })
        })
    }

    const landingUrl = slug ? `/${slug}` : '/'

    return (
        <div className="space-y-5 max-w-3xl">

            {/* Banner de URL */}
            <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-primary/20">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Tu landing page pública</p>
                    <p className="text-sm font-medium text-foreground truncate">{landingUrl}</p>
                </div>
                <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                    <GlassButton size="sm" variant="glass">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver web
                        <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                    </GlassButton>
                </a>
            </div>

            {/* Sub-tabs internos */}
            <div className="flex flex-wrap gap-2 glass rounded-2xl p-1.5 border border-primary/15 sticky top-2 z-20">
                {SUBTABS.map(t => {
                    const Icon = t.icon
                    const active = subtab === t.id
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setSubtab(t.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
                                active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* ── TAB: Apariencia (logo + colores) ── */}
            {subtab === 'apariencia' && (
            <div className="space-y-5">
            {/* Logo Builder */}
            <SectionCard title="Identidad visual (Logo)" icon={Type}>
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Configurá el logo que aparecerá en tu panel y Landing Page.</p>

                    {/* Live Preview */}
                    <div className="glass-subtle p-8 flex justify-center items-center rounded-xl border border-border/40 min-h-36 bg-black/20 overflow-visible">
                        <TenantLogo
                            config={logoConfig}
                            colorPrimary={colores.color_primary}
                            fallbackName="Consultorio"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-4">
                            <Field label="Tipo de Logo">
                                <Select
                                    value={logoConfig.type}
                                    onValueChange={(v) => setLogoConfig(l => ({ ...l, type: v as 'image' | 'text' }))}
                                >
                                    <SelectTrigger className="w-full bg-input/40 border-input hover:border-primary/50 transition-colors h-9 text-foreground">
                                        <SelectValue placeholder="Tipo de Logo" />
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-popover backdrop-blur-3xl border-border shadow-2xl z-[100] text-popover-foreground">
                                        <SelectItem value="text">Elegante (Texto + Ícono)</SelectItem>
                                        <SelectItem value="image">Solo Imagen (.png)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            {logoConfig.type === 'text' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Texto del Logo">
                                        <Input
                                            value={logoConfig.text}
                                            onChange={e => setLogoConfig(l => ({ ...l, text: e.target.value }))}
                                        />
                                    </Field>

                                    <Field label="Tipografía">
                                        <Select
                                            value={logoConfig.font}
                                            onValueChange={(v) => setLogoConfig(l => ({ ...l, font: v || 'font-sans' }))}
                                        >
                                            <SelectTrigger className="w-full bg-input/40 border-input hover:border-primary/50 transition-colors h-9 text-foreground">
                                                <SelectValue placeholder="Tipografía" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-popover backdrop-blur-3xl border-border shadow-2xl z-[100] text-popover-foreground">
                                                <SelectItem value="font-sans">Moderna (Sans)</SelectItem>
                                                <SelectItem value="font-serif">Clásica (Serif)</SelectItem>
                                                <SelectItem value="font-mono">Técnica (Mono)</SelectItem>
                                                <SelectItem value="font-playfair">Playfair Display (Lujo/Elegante)</SelectItem>
                                                <SelectItem value="font-montserrat">Montserrat (Geométrica)</SelectItem>
                                                <SelectItem value="font-space-grotesk">Space Grotesk (Vanguardista)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="Ícono">
                                        <Select
                                            value={logoConfig.icon}
                                            onValueChange={(v) => setLogoConfig(l => ({ ...l, icon: v || 'Stethoscope' }))}
                                        >
                                            <SelectTrigger className="w-full bg-input/40 border-input hover:border-primary/50 transition-colors h-9 text-foreground">
                                                <SelectValue placeholder="Ícono" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-popover backdrop-blur-3xl border-border shadow-2xl z-[100] text-popover-foreground">
                                                <SelectItem value="Stethoscope">Estetoscopio</SelectItem>
                                                <SelectItem value="Leaf">Hoja / Etéreo</SelectItem>
                                                <SelectItem value="Heart">Corazón</SelectItem>
                                                <SelectItem value="Activity">Cardio / Vitalidad</SelectItem>
                                                <SelectItem value="Sparkles">Destellos / Premium</SelectItem>
                                                <SelectItem value="Plus">Cruz Médica</SelectItem>
                                                <SelectItem value="none">Ocultar ícono</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="Estilo de Color">
                                        <Select
                                            value={logoConfig.color_style}
                                            onValueChange={(v) => setLogoConfig(l => ({ ...l, color_style: v as any }))}
                                        >
                                            <SelectTrigger className="w-full bg-input/40 border-input hover:border-primary/50 transition-colors h-9 text-foreground">
                                                <SelectValue placeholder="Estilo de Color" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-popover backdrop-blur-3xl border-border shadow-2xl z-[100] text-popover-foreground">
                                                <SelectItem value="gradient">Gradiente dinámico</SelectItem>
                                                <SelectItem value="solid">Color Sólido</SelectItem>
                                                <SelectItem value="monochrome">Monocromático</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Field label="Sube el logo de tu clínica">
                                        <ImageUploader
                                            value={logoConfig.image_url}
                                            onChange={(url) => setLogoConfig(l => ({ ...l, image_url: url }))}
                                        />
                                    </Field>

                                    {logoConfig.image_url && (
                                        <Field label="Tamaño del logo">
                                            <div className="glass-subtle p-4 rounded-xl border border-white/5 space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-muted-foreground">Más pequeño</span>
                                                    <span className="text-foreground font-mono font-medium">
                                                        {logoConfig.image_scale || 100}% (~{Math.round(50 * ((logoConfig.image_scale || 100) / 100))}px de alto)
                                                    </span>
                                                    <span className="text-muted-foreground">Más grande</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max="400"
                                                    step="5"
                                                    value={logoConfig.image_scale || 100}
                                                    onChange={e => setLogoConfig(l => ({ ...l, image_scale: Number(e.target.value) }))}
                                                    className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                    💡 <strong>Consejo para Photoshop:</strong> Si tu imagen tiene márgenes transparentes vacíos alrededor del logo, recortá el lienzo transparente (en Photoshop: <em>Imagen &gt; Recortar</em>) antes de subirlo para que el isotipo aproveche todo el tamaño disponible.
                                                </p>
                                            </div>
                                        </Field>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Paleta de colores */}
            <SectionCard title="Paleta de colores" icon={Palette}>
                <div>
                    <p className="text-xs text-muted-foreground mb-3">Elegí un tema predefinido o personalizá cada color</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                        {PRESET_PALETTES.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => applyPalette(p)}
                                title={p.name}
                                className={cn(
                                    'h-8 rounded-lg border-2 transition-all cursor-pointer hover:scale-105',
                                    colores.color_primary === p.primary ? 'border-foreground scale-105' : 'border-transparent'
                                )}
                                style={{ background: `linear-gradient(135deg, ${p.primary} 0%, ${p.accent} 100%)` }}
                            />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(Object.entries(colores) as [keyof typeof colores, string][]).map(([key, val]) => {
                            const labels: Record<string, string> = {
                                color_primary: 'Principal',
                                color_primary_hover: 'Hover',
                                color_accent: 'Acento',
                                color_bg_hero: 'Fondo claro',
                                color_bg_dark: 'Fondo oscuro',
                            }
                            return (
                                <Field key={key} label={labels[key] ?? key}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={val}
                                            onChange={e => setColores(c => ({ ...c, [key]: e.target.value }))}
                                            className="h-8 w-8 rounded cursor-pointer border border-border"
                                        />
                                        <Input
                                            value={val}
                                            onChange={e => setColores(c => ({ ...c, [key]: e.target.value }))}
                                            className="text-xs font-mono"
                                            maxLength={7}
                                        />
                                    </div>
                                </Field>
                            )
                        })}
                    </div>
                </div>
            </SectionCard>

            {/* Preview en vivo del color */}
            <motion.div
                className="rounded-2xl p-4 flex items-center justify-between overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${colores.color_bg_hero}, ${colores.color_accent}20)` }}
                animate={{ opacity: 1 }}
            >
                <div>
                    <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full text-white tracking-wider uppercase"
                        style={{ backgroundColor: colores.color_primary }}
                    >
                        {textos.hero_badge}
                    </span>
                    <p className="mt-2 text-xl font-bold" style={{ color: '#1a1a2e' }}>
                        {textos.hero_titulo.split(' ').map((w, i) => (
                            i === textos.hero_titulo.split(' ').length - 1
                                ? <span key={i} style={{ color: colores.color_primary }}>{w}</span>
                                : <span key={i}>{w} </span>
                        ))}
                    </p>
                </div>
                <button
                    className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow"
                    style={{ backgroundColor: colores.color_primary }}
                >
                    Reservar
                </button>
            </motion.div>
            </div>
            )}

            {/* ── TAB: Textos (landing + asistente) ── */}
            {subtab === 'textos' && (
            <div className="space-y-5">
            {/* Textos */}
            <SectionCard title="Textos de la landing" icon={Type}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Badge del hero">
                            <Input value={textos.hero_badge} onChange={e => setTextos(t => ({ ...t, hero_badge: e.target.value }))} placeholder="Reservar Turno" />
                        </Field>
                        <Field label="Título del hero">
                            <Input value={textos.hero_titulo} onChange={e => setTextos(t => ({ ...t, hero_titulo: e.target.value }))} placeholder="Agenda tu visita" />
                        </Field>
                    </div>
                    <Field label="Subtítulo del hero">
                        <Input value={textos.hero_subtitulo} onChange={e => setTextos(t => ({ ...t, hero_subtitulo: e.target.value }))} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Título sección Servicios">
                            <Input value={textos.servicios_titulo} onChange={e => setTextos(t => ({ ...t, servicios_titulo: e.target.value }))} />
                        </Field>
                        <Field label="Título sección Equipo">
                            <Input value={textos.equipo_titulo} onChange={e => setTextos(t => ({ ...t, equipo_titulo: e.target.value }))} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Subtítulo sección Servicios">
                            <Input value={textos.servicios_subtitulo} onChange={e => setTextos(t => ({ ...t, servicios_subtitulo: e.target.value }))} placeholder="Cada tratamiento combina precisión clínica..." />
                        </Field>
                        <Field label="Subtítulo sección Equipo">
                            <Input value={textos.equipo_subtitulo} onChange={e => setTextos(t => ({ ...t, equipo_subtitulo: e.target.value }))} placeholder="Un equipo multidisciplinario con..." />
                        </Field>
                    </div>
                    <Field label="Subtítulo sección Coberturas / Obras Sociales">
                        <Input value={textos.coberturas_subtitulo} onChange={e => setTextos(t => ({ ...t, coberturas_subtitulo: e.target.value }))} placeholder="Trabajamos con las principales coberturas del país..." />
                    </Field>
                    <div className="border-t border-border/40 pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">SEO (para Google)</p>
                        <div className="space-y-2">
                            <Field label="Título de página (SEO)">
                                <Input value={textos.meta_title} onChange={e => setTextos(t => ({ ...t, meta_title: e.target.value }))} placeholder="Consultorio Álvarez — Odontología en Buenos Aires" />
                            </Field>
                            <Field label="Descripción (SEO)">
                                <Input value={textos.meta_description} onChange={e => setTextos(t => ({ ...t, meta_description: e.target.value }))} placeholder="Reservá tu turno online..." />
                            </Field>
                        </div>
                    </div>
                </div>
            </SectionCard>
            {/* Asistente virtual */}
            <SectionCard title="Asistente virtual (chatbot)" icon={Type}>
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Nombre con el que se presenta el asistente de turnos en tu web. Si lo dejás vacío, se usa &quot;CinthIA&quot;.</p>
                    <Field label="Nombre del asistente">
                        <Input value={textos.asistente_nombre} onChange={e => setTextos(t => ({ ...t, asistente_nombre: e.target.value }))} placeholder="CinthIA" />
                    </Field>
                </div>
            </SectionCard>
            </div>
            )}

            {/* ── TAB: Imágenes y video (hero + video + servicios) ── */}
            {subtab === 'medios' && (
            <div className="space-y-5">
            {/* Fotos de la portada (Hero) */}
            <SectionCard title="Fotos de la portada (Hero)" icon={Type}>
                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Estas son las fotos grandes que se ven arriba de todo. Subí las de tu consultorio. Si no cargás ninguna, se usan las de la plantilla.</p>
                    {heroSlides.map((slide, i) => (
                        <div key={i} className="glass-subtle rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">Foto {i + 1}</span>
                                <button
                                    onClick={() => removeHeroSlide(i)}
                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <MediaUploader
                                folder="hero"
                                kind="image"
                                value={slide.image_url || null}
                                onChange={(url) => updateHeroSlide(i, 'image_url', url)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input value={slide.title} onChange={e => updateHeroSlide(i, 'title', e.target.value)} placeholder="Título (ej. Implantología)" className="text-sm" />
                                <Input value={slide.tag} onChange={e => updateHeroSlide(i, 'tag', e.target.value)} placeholder="Etiqueta (ej. Rehabilitación Oral)" className="text-sm" />
                            </div>
                            <Input value={slide.description} onChange={e => updateHeroSlide(i, 'description', e.target.value)} placeholder="Descripción" className="text-sm" />
                        </div>
                    ))}
                    <GlassButton size="sm" variant="glass" onClick={addHeroSlide}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Agregar foto
                    </GlassButton>
                </div>
            </SectionCard>

            {/* Sección de video "Nosotros" */}
            <SectionCard title="Sección de video (Nosotros)" icon={Type}>
                <div className="space-y-4">
                    <label className="flex items-center justify-between gap-3 glass-subtle rounded-xl p-3 cursor-pointer">
                        <span className="text-sm text-foreground">Mostrar la sección de video en la web</span>
                        <input
                            type="checkbox"
                            checked={aboutVisible}
                            onChange={e => setAboutVisible(e.target.checked)}
                            className="h-4 w-4 accent-primary cursor-pointer"
                        />
                    </label>

                    {/* Encabezado de la sección */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Encabezado</p>
                        <Field label="Título (la última palabra se resalta con el color principal)">
                            <Input value={aboutTitulo} onChange={e => setAboutTitulo(e.target.value)} placeholder="Un espacio pensado para tu bienestar" />
                        </Field>
                        <Field label="Subtítulo">
                            <Input value={aboutSubtitulo} onChange={e => setAboutSubtitulo(e.target.value)} placeholder="Recorré virtualmente nuestras instalaciones..." />
                        </Field>
                    </div>

                    {/* Escenas (video + textos) */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Escenas del video</p>
                        <p className="text-xs text-muted-foreground">Cada escena tiene su nombre, título y subtítulo. El video es opcional (MP4, máx. 10MB): si no subís uno, se usa el de la plantilla.</p>
                        {escenas.map((v, i) => (
                            <div key={i} className="glass-subtle rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Escena {i + 1}</span>
                                    <button
                                        onClick={() => removeEscena(i)}
                                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <Input value={v.badge} onChange={e => updateEscena(i, 'badge', e.target.value)} placeholder="Nombre de la escena (ej. Equipamiento de Avanzada)" className="text-sm" />
                                <Input value={v.title} onChange={e => updateEscena(i, 'title', e.target.value)} placeholder="Título (ej. Instalaciones Premium)" className="text-sm" />
                                <Input value={v.subtitle} onChange={e => updateEscena(i, 'subtitle', e.target.value)} placeholder="Subtítulo" className="text-sm" />
                                <MediaUploader
                                    folder="videos"
                                    kind="video"
                                    value={v.src || null}
                                    onChange={(url) => updateEscena(i, 'src', url)}
                                />
                            </div>
                        ))}
                        <GlassButton size="sm" variant="glass" onClick={addEscena}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Agregar escena
                        </GlassButton>
                    </div>

                    {/* Tarjetas de la derecha */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Tarjetas destacadas (columna derecha)</p>
                        <p className="text-xs text-muted-foreground">Las 3 tarjetas que aparecen al costado del video. El ícono es fijo por posición.</p>
                        {aboutFeatures.map((f, i) => (
                            <div key={i} className="glass-subtle rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Tarjeta {i + 1}</span>
                                    <button
                                        onClick={() => removeFeature(i)}
                                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <Input value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} placeholder="Título (ej. Bioseguridad Médica)" className="text-sm" />
                                <Input value={f.description} onChange={e => updateFeature(i, 'description', e.target.value)} placeholder="Descripción" className="text-sm" />
                            </div>
                        ))}
                        <GlassButton size="sm" variant="glass" onClick={addFeature}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Agregar tarjeta
                        </GlassButton>
                    </div>
                </div>
            </SectionCard>

            {/* Servicios */}
            <SectionCard title="Servicios destacados" icon={List}>
                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">La imagen aparece al tocar el servicio en la web. Si no cargás una, se usa la de la plantilla.</p>
                    {servicios.map((s, i) => (
                        <div key={i} className="glass-subtle rounded-xl p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Input
                                        value={s.titulo}
                                        onChange={e => updateServicio(i, 'titulo', e.target.value)}
                                        placeholder="Título"
                                        className="text-sm"
                                    />
                                    <Input
                                        value={s.descripcion}
                                        onChange={e => updateServicio(i, 'descripcion', e.target.value)}
                                        placeholder="Descripción breve"
                                        className="text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => removeServicio(i)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <Input
                                value={s.descripcion_ampliada ?? ''}
                                onChange={e => updateServicio(i, 'descripcion_ampliada', e.target.value)}
                                placeholder="Descripción ampliada (opcional, aparece al tocar)"
                                className="text-sm"
                            />
                            <MediaUploader
                                folder="servicios"
                                kind="image"
                                value={s.image_url ?? null}
                                onChange={(url) => updateServicio(i, 'image_url', url)}
                            />
                        </div>
                    ))}
                    <GlassButton size="sm" variant="glass" onClick={addServicio}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Agregar servicio
                    </GlassButton>
                </div>
            </SectionCard>

            </div>
            )}

            {/* ── TAB: Contacto (footer) ── */}
            {subtab === 'contacto' && (
            <div className="space-y-5">
            {/* Footer */}
            <SectionCard title="Datos de contacto (Footer)" icon={MapPin}>
                <div className="space-y-3">
                    <Field label="Dirección / Ubicación">
                        <Input value={textos.footer_address} onChange={e => setTextos(t => ({ ...t, footer_address: e.target.value }))} placeholder="Ej: Av. Corrientes 1234, CABA" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Teléfonos / WhatsApp">
                            <div className="space-y-2">
                                {(textos.footer_phone ? textos.footer_phone.split(' | ').map(s => {
                                    const parts = s.split('::')
                                    const numStr = parts[0] || ''
                                    const lblStr = parts.slice(1).join('::') || ''
                                    return { num: numStr, lbl: lblStr }
                                }) : [{ num: '', lbl: '' }]).map((item, i, arr) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={item.num}
                                            onChange={e => {
                                                const newArr = [...arr]
                                                newArr[i].num = e.target.value
                                                const joined = newArr.filter(x => x.num || x.lbl).map(x => `${x.num}::${x.lbl}`).join(' | ')
                                                setTextos(t => ({ ...t, footer_phone: joined }))
                                            }}
                                            placeholder="+54 9 11 1234-5678"
                                            className="w-1/2"
                                        />
                                        <Input
                                            value={item.lbl}
                                            onChange={e => {
                                                const newArr = [...arr]
                                                newArr[i].lbl = e.target.value
                                                const joined = newArr.filter(x => x.num || x.lbl).map(x => `${x.num}::${x.lbl}`).join(' | ')
                                                setTextos(t => ({ ...t, footer_phone: joined }))
                                            }}
                                            placeholder="Ej: Administración"
                                            className="w-1/2"
                                        />
                                        {arr.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    const newArr = arr.filter((_, idx) => idx !== i)
                                                    const joined = newArr.filter(x => x.num || x.lbl).map(x => `${x.num}::${x.lbl}`).join(' | ')
                                                    setTextos(t => ({ ...t, footer_phone: joined }))
                                                }}
                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const current = textos.footer_phone ? textos.footer_phone.split(' | ').map(s => {
                                            const parts = s.split('::')
                                            const numStr = parts[0] || ''
                                            const lblStr = parts.slice(1).join('::') || ''
                                            return { num: numStr, lbl: lblStr }
                                        }) : [];
                                        const withNew = [...current, { num: '', lbl: '' }]
                                        const joined = withNew.map(x => `${x.num}::${x.lbl}`).join(' | ')
                                        setTextos(t => ({ ...t, footer_phone: joined }))
                                    }}
                                    className="flex items-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-1 cursor-pointer"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Añadir otra línea
                                </button>
                            </div>
                        </Field>
                        <Field label="Correo electrónico">
                            <Input value={textos.footer_email} onChange={e => setTextos(t => ({ ...t, footer_email: e.target.value }))} placeholder="turnos@clinica.com" />
                        </Field>
                    </div>
                    <Field label="Horarios de atención">
                        <Input value={textos.footer_hours} onChange={e => setTextos(t => ({ ...t, footer_hours: e.target.value }))} placeholder="Lunes a Viernes 9-18hs" />
                    </Field>
                </div>
            </SectionCard>
            </div>
            )}

            {/* Guardar (siempre visible: publica todas las secciones) */}
            <div className="flex justify-end sticky bottom-2">
                <GlassButton onClick={guardar} loading={isPending} className="px-6">
                    <Save className="h-4 w-4 mr-2" />
                    Publicar cambios
                </GlassButton>
            </div>
        </div>
    )
}

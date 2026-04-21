'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
    Save, Globe, ExternalLink, Palette, Type, List,
    Plus, Trash2, Eye, MapPin
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
        equipo_titulo: config.equipo_titulo,
        booking_titulo: config.booking_titulo,
        booking_subtitulo: config.booking_subtitulo,
        meta_title: config.meta_title ?? '',
        meta_description: config.meta_description ?? '',
        footer_address: config.footer_address ?? '',
        footer_phone: config.footer_phone ?? '',
        footer_email: config.footer_email ?? '',
        footer_hours: config.footer_hours ?? '',
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

    function guardar() {
        startTransition(async () => {
            const r = await guardarLandingConfig({
                ...textos,
                ...colores,
                servicios,
                logo_config: logoConfig
            })
            if (r.error) glassAlert.error({ title: 'Error al guardar', description: r.error })
            else glassAlert.success({ title: '¡Landing actualizada!', description: 'Los cambios ya están publicados.' })
        })
    }

    const landingUrl = `/`

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

            {/* Logo Builder */}
            <SectionCard title="Identidad visual (Logo)" icon={Type}>
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Configurá el logo que aparecerá en tu panel y Landing Page.</p>

                    {/* Live Preview */}
                    <div className="glass-subtle p-6 flex justify-center items-center rounded-xl border border-border/40 min-h-24">
                        <TenantLogo
                            config={logoConfig}
                            colorPrimary={colores.color_primary}
                            fallbackName="Consultorio"
                            className="scale-125"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-4">
                            <Field label="Tipo de Logo">
                                <Select
                                    value={logoConfig.type}
                                    onValueChange={(v) => setLogoConfig(l => ({ ...l, type: v as 'image' | 'text' }))}
                                >
                                    <SelectTrigger className="w-full bg-slate-900/50 border-white/10 hover:border-primary/50 transition-colors h-9 text-slate-200">
                                        <SelectValue placeholder="Tipo de Logo" />
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-slate-950/98 backdrop-blur-3xl border-white/10 shadow-2xl z-[100] text-slate-200">
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
                                            <SelectTrigger className="w-full bg-slate-900/50 border-white/10 hover:border-primary/50 transition-colors h-9 text-slate-200">
                                                <SelectValue placeholder="Tipografía" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-slate-950/98 backdrop-blur-3xl border-white/10 shadow-2xl z-[100] text-slate-200">
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
                                            <SelectTrigger className="w-full bg-slate-900/50 border-white/10 hover:border-primary/50 transition-colors h-9 text-slate-200">
                                                <SelectValue placeholder="Ícono" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-slate-950/98 backdrop-blur-3xl border-white/10 shadow-2xl z-[100] text-slate-200">
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
                                            <SelectTrigger className="w-full bg-slate-900/50 border-white/10 hover:border-primary/50 transition-colors h-9 text-slate-200">
                                                <SelectValue placeholder="Estilo de Color" />
                                            </SelectTrigger>
                                            <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-slate-950/98 backdrop-blur-3xl border-white/10 shadow-2xl z-[100] text-slate-200">
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
                                                    <span className="text-foreground font-mono font-medium">{logoConfig.image_scale || 100}%</span>
                                                    <span className="text-muted-foreground">Más grande</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max="250"
                                                    step="5"
                                                    value={logoConfig.image_scale || 100}
                                                    onChange={e => setLogoConfig(l => ({ ...l, image_scale: Number(e.target.value) }))}
                                                    className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
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
            {/* Servicios */}
            <SectionCard title="Servicios destacados" icon={List}>
                <div className="space-y-2">
                    {servicios.map((s, i) => (
                        <div key={i} className="glass-subtle rounded-xl p-3 flex items-start gap-2">
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
                    ))}
                    <GlassButton size="sm" variant="glass" onClick={addServicio}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Agregar servicio
                    </GlassButton>
                </div>
            </SectionCard>

            {/* Footer */}
            <SectionCard title="Datos de contacto (Footer)" icon={MapPin}>
                <div className="space-y-3">
                    <Field label="Dirección / Ubicación">
                        <Input value={textos.footer_address} onChange={e => setTextos(t => ({ ...t, footer_address: e.target.value }))} placeholder="Ej: Av. Corrientes 1234, CABA" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Teléfonos / WhatsApp">
                            <div className="space-y-2">
                                {(textos.footer_phone ? textos.footer_phone.split(/\||,/).map(s => s.trim()) : ['']).map((ph, i, arr) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={ph}
                                            onChange={e => {
                                                const newArr = [...arr]
                                                newArr[i] = e.target.value
                                                setTextos(t => ({ ...t, footer_phone: newArr.filter(Boolean).join(' | ') }))
                                            }}
                                            placeholder="+54 9 11 1234-5678"
                                        />
                                        {arr.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    const newArr = arr.filter((_, idx) => idx !== i)
                                                    setTextos(t => ({ ...t, footer_phone: newArr.filter(Boolean).join(' | ') }))
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
                                        const current = textos.footer_phone ? textos.footer_phone.split(/\||,/).map(s => s.trim()) : [];
                                        setTextos(t => ({ ...t, footer_phone: [...current, ''].join(' | ') }))
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

            {/* Guardar */}
            <div className="flex justify-end">
                <GlassButton onClick={guardar} loading={isPending} className="px-6">
                    <Save className="h-4 w-4 mr-2" />
                    Publicar cambios
                </GlassButton>
            </div>
        </div>
    )
}

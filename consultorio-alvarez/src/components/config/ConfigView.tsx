'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Users, CreditCard, Clock, Save, Plus, Check, X, Pencil, Globe, Blocks, Camera, Trash, Key, Volume2, ChevronDown, Stethoscope, Sparkles, MapPin, Mail, Phone, Info } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
    actualizarTenant, actualizarHorarios,
    crearProfesional, actualizarProfesional, toggleProfesionalEstado, eliminarProfesional,
    crearObraSocial, toggleObraSocial, actualizarObraSocial, eliminarObraSocial,
    crearTipoTratamiento, toggleTipoTratamiento,
    actualizarTipoTratamiento, eliminarTipoTratamiento,
} from '@/lib/actions/config'
import { glassAlert } from '@/components/ui/glass-alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TabMiWeb } from '@/components/config/TabMiWeb'
import { TabIntegraciones } from '@/components/config/TabIntegraciones'
import type { LandingConfig } from '@/lib/types/landing'
import { createClient } from '@/lib/supabase/client'
import { AvatarCropperModal } from '@/components/ui/avatar-cropper'

type TabId = 
    | 'consultorio' 
    | 'tratamientos' 
    | 'profesionales' 
    | 'obras_sociales' 
    | 'horarios' 
    | 'sonidos' 
    | 'mi_web' 
    | 'integraciones'

interface NavItem {
    id: TabId
    label: string
    shortLabel: string
    icon: any
    desc: string
    badge?: number
}

interface NavCategory {
    category: string
    items: NavItem[]
}

const DIA_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface ConfigViewProps {
    tenant: any
    profesionales: any[]
    obrasSociales: any[]
    tiposTratamiento: any[]
    integrations: any[]
    landingConfig: LandingConfig | null
    slug: string
}

export function ConfigView({ tenant, profesionales, obrasSociales, tiposTratamiento, integrations, landingConfig, slug }: ConfigViewProps) {
    const [tab, setTab] = useState<TabId>('consultorio')
    const router = useRouter()

    const navCategories: NavCategory[] = [
        {
            category: 'General',
            items: [
                { id: 'consultorio', label: 'Datos del Consultorio', shortLabel: 'Consultorio', icon: Building2, desc: 'Identidad, CUIT y contacto' },
                { id: 'tratamientos', label: 'Tipos de Tratamiento', shortLabel: 'Tratamientos', icon: Stethoscope, desc: 'Prestaciones y duraciones', badge: tiposTratamiento.length },
            ]
        },
        {
            category: 'Equipo y Coberturas',
            items: [
                { id: 'profesionales', label: 'Profesionales', shortLabel: 'Equipo', icon: Users, desc: 'Odontólogos y matrículas', badge: profesionales.length },
                { id: 'obras_sociales', label: 'Obras Sociales', shortLabel: 'Prepagas', icon: CreditCard, desc: 'Obras sociales y planes', badge: obrasSociales.length },
            ]
        },
        {
            category: 'Operación y Turnos',
            items: [
                { id: 'horarios', label: 'Horarios de Atención', shortLabel: 'Horarios', icon: Clock, desc: 'Días hábiles e intervalos' },
                { id: 'sonidos', label: 'Sonidos y Alertas', shortLabel: 'Alertas', icon: Volume2, desc: 'Avisos acústicos en tiempo real' },
            ]
        },
        {
            category: 'Canales y Conexiones',
            items: [
                { id: 'mi_web', label: 'Mi Portal Web', shortLabel: 'Mi Web', icon: Globe, desc: 'Landing pública y marca' },
                { id: 'integraciones', label: 'Integraciones', shortLabel: 'Conexiones', icon: Blocks, desc: 'WhatsApp Cloud, MP y Calendar' },
            ]
        }
    ]

    const allItems = navCategories.flatMap(c => c.items)

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Navegación Mobile / Tablet (Chips horizontales con scroll suave) */}
            <div className="w-full lg:hidden overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                <div className="flex gap-2">
                    {allItems.map(item => {
                        const Icon = item.icon
                        const isActive = tab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.shortLabel}</span>
                                {item.badge !== undefined && (
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold",
                                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Sub-Sidebar Desktop Categorizado */}
            <aside className="hidden lg:block w-72 shrink-0 sticky top-4">
                <div className="glass rounded-2xl p-3 border border-border/60 shadow-sm space-y-5">
                    {navCategories.map(cat => (
                        <div key={cat.category} className="space-y-1">
                            <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5">
                                {cat.category}
                            </h4>
                            <div className="space-y-0.5">
                                {cat.items.map(item => {
                                    const Icon = item.icon
                                    const isActive = tab === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setTab(item.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between text-left p-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer group",
                                                isActive
                                                    ? "bg-primary/10 text-primary border border-primary/25 shadow-xs font-semibold"
                                                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={cn(
                                                    "p-1.5 rounded-lg transition-colors shrink-0",
                                                    isActive ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
                                                )}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-semibold truncate leading-tight">
                                                        {item.label}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                                                        {item.desc}
                                                    </div>
                                                </div>
                                            </div>
                                            {item.badge !== undefined && (
                                                <span className={cn(
                                                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 font-bold",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                                )}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 min-w-0 w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                    >
                        {tab === 'consultorio' && <TabConsultorio tenant={tenant} />}
                        {tab === 'tratamientos' && <TabTratamientos tiposTratamiento={tiposTratamiento} />}
                        {tab === 'profesionales' && <TabProfesionales tenantId={tenant.id} profesionales={profesionales} router={router} />}
                        {tab === 'obras_sociales' && <TabObrasSociales obrasSociales={obrasSociales} />}
                        {tab === 'horarios' && <TabHorarios horarios={tenant.horarios} profesionales={profesionales} />}
                        {tab === 'sonidos' && <TabSonidos />}
                        {tab === 'mi_web' && landingConfig && <TabMiWeb config={landingConfig} slug={slug} />}
                        {tab === 'mi_web' && !landingConfig && (
                            <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
                                Ejecutá el script SQL para habilitar la personalización de tu landing.
                            </div>
                        )}
                        {tab === 'integraciones' && <TabIntegraciones integrations={integrations} />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}

/* ──────────── Tab: Consultorio ──────────── */
function TabConsultorio({ tenant }: { tenant: any }) {
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        nombre: tenant.nombre || '', descripcion: tenant.descripcion || '',
        telefono: tenant.telefono || '', email_contacto: tenant.email_contacto || '',
        direccion: tenant.direccion || '', ciudad: tenant.ciudad || '',
        provincia: tenant.provincia || '', cuit: tenant.cuit || '',
    })

    function guardar() {
        startTransition(async () => {
            const r = await actualizarTenant(form)
            r.error ? glassAlert.error({ title: 'Error', description: r.error }) : glassAlert.success({ title: 'Datos del consultorio actualizados' })
        })
    }

    return (
        <div className="space-y-6">
            <div className="glass rounded-2xl shadow-glass border border-border/60 overflow-hidden">
                {/* Header de la tarjeta */}
                <div className="p-6 border-b border-border/40 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Identidad y Datos del Consultorio</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Información legal, canales oficiales de atención al paciente y ubicación física de la sede
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulario segmentado */}
                <div className="p-6 space-y-7">
                    {/* Sección 1: Identidad */}
                    <div className="space-y-3.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Identidad & Aspectos Fiscales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Nombre del Consultorio / Razón Social">
                                <Input 
                                    value={form.nombre} 
                                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} 
                                    placeholder="Ej: Consultorio Odontológico Álvarez"
                                />
                            </Field>
                            <Field label="CUIT / Identificación Tributaria">
                                <Input 
                                    value={form.cuit} 
                                    onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} 
                                    placeholder="30-12345678-9" 
                                />
                            </Field>
                        </div>
                        <Field label="Descripción / Especialidad Principal">
                            <Textarea 
                                value={form.descripcion} 
                                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                placeholder="Breve descripción de las especialidades del consultorio (ej: Odontología general, implantes y ortodoncia invisible)..."
                                className="min-h-[80px]"
                            />
                        </Field>
                    </div>

                    <div className="border-t border-border/40" />

                    {/* Sección 2: Contacto */}
                    <div className="space-y-3.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            Canales Directos de Comunicación
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Teléfono / WhatsApp de Recepción">
                                <Input 
                                    value={form.telefono} 
                                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} 
                                    placeholder="Ej: +54 9 11 6103-9248"
                                />
                            </Field>
                            <Field label="Email Oficial de Contacto">
                                <Input 
                                    type="email"
                                    value={form.email_contacto} 
                                    onChange={e => setForm(f => ({ ...f, email_contacto: e.target.value }))} 
                                    placeholder="contacto@consultorio.com"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="border-t border-border/40" />

                    {/* Sección 3: Ubicación */}
                    <div className="space-y-3.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            Sede Física y Dirección
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field label="Dirección (Calle y Altura)">
                                <Input 
                                    value={form.direccion} 
                                    onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} 
                                    placeholder="Ej: Av. Maipú 2841 1B"
                                />
                            </Field>
                            <Field label="Ciudad / Localidad">
                                <Input 
                                    value={form.ciudad} 
                                    onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} 
                                    placeholder="Ej: Olivos"
                                />
                            </Field>
                            <Field label="Provincia">
                                <Input 
                                    value={form.provincia} 
                                    onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))} 
                                    placeholder="Ej: Buenos Aires"
                                />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Footer de guardado con feedback */}
                <div className="bg-muted/20 border-t border-border/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <span>Estos datos se sincronizan automáticamente en comprobantes y recordatorios.</span>
                    </div>
                    <GlassButton onClick={guardar} loading={isPending} className="w-full sm:w-auto">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar cambios
                    </GlassButton>
                </div>
            </div>
        </div>
    )
}

/* ──────────── Tab: Tipos de Tratamiento (Dedicado) ──────────── */
function TabTratamientos({ tiposTratamiento }: { tiposTratamiento: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [tratForm, setTratForm] = useState({ nombre: '', duracion_minutos: '30', color: '#3b82f6' })
    const [showTratForm, setShowTratForm] = useState(false)
    const [editingTratId, setEditingTratId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const PRESET_COLORS = [
        '#3b82f6', // Azul
        '#06b6d4', // Cyan
        '#10b981', // Esmeralda
        '#8b5cf6', // Violeta
        '#f59e0b', // Ámbar
        '#ea580c', // Naranja
        '#ec4899', // Rosa
        '#64748b', // Slate
    ]

    function abrirNuevoTratamiento() {
        setTratForm({ nombre: '', duracion_minutos: '30', color: '#3b82f6' })
        setEditingTratId(null)
        setShowTratForm(true)
    }

    function abrirEditarTratamiento(t: any) {
        setTratForm({
            nombre: t.nombre,
            duracion_minutos: String(t.duracion_minutos || 30),
            color: t.color || '#3b82f6'
        })
        setEditingTratId(t.id)
        setShowTratForm(true)
    }

    function guardarTratamiento() {
        if (!tratForm.nombre.trim()) {
            glassAlert.error({ title: 'Campo requerido', description: 'Por favor ingresá el nombre del tratamiento' })
            return
        }
        startTransition(async () => {
            const dataToSave = {
                nombre: tratForm.nombre.trim(),
                duracion_minutos: parseInt(tratForm.duracion_minutos) || 30,
                color: tratForm.color,
            }

            let r;
            if (editingTratId) {
                r = await actualizarTipoTratamiento(editingTratId, dataToSave)
            } else {
                r = await crearTipoTratamiento(dataToSave)
            }

            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else {
                glassAlert.success({ title: editingTratId ? 'Tratamiento actualizado' : 'Tratamiento creado exitosamente' })
                setTratForm({ nombre: '', duracion_minutos: '30', color: '#3b82f6' })
                setEditingTratId(null)
                setShowTratForm(false)
            }
        })
    }

    function onConfirmDelete() {
        if (!confirmDeleteId) return
        startTransition(async () => {
            const r = await eliminarTipoTratamiento(confirmDeleteId)
            setConfirmDeleteId(null)
            if (r.error) glassAlert.error({ title: 'Error al eliminar', description: r.error })
            else glassAlert.success({ title: 'Tratamiento eliminado' })
        })
    }

    return (
        <div className="space-y-6">
            <div className="glass rounded-2xl shadow-glass border border-border/60 p-6 space-y-6">
                {/* Cabecera */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Stethoscope className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-foreground">Tipos de Tratamiento</h2>
                                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary font-semibold">
                                    {tiposTratamiento.length} prestaciones
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Catálogo de prestaciones odontológicas, duraciones para el agendamiento y colores identificadores
                            </p>
                        </div>
                    </div>
                    <GlassButton 
                        size="sm" 
                        onClick={() => {
                            if (showTratForm) {
                                setShowTratForm(false)
                                setEditingTratId(null)
                            } else {
                                abrirNuevoTratamiento()
                            }
                        }}
                    >
                        {showTratForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                        {showTratForm ? 'Cancelar' : 'Nuevo Tratamiento'}
                    </GlassButton>
                </div>

                {/* Formulario de Alta / Edición animado */}
                <AnimatePresence>
                    {showTratForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 rounded-2xl bg-card/90 border border-primary/30 shadow-md space-y-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                                    {editingTratId ? 'Modificar Tratamiento' : 'Registrar Nuevo Tratamiento'}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                                    <div className="sm:col-span-6 space-y-1.5">
                                        <Label className="text-xs text-foreground font-medium">Nombre del Tratamiento</Label>
                                        <Input 
                                            placeholder="Ej: Limpieza profunda / Cirugía de implante" 
                                            value={tratForm.nombre} 
                                            onChange={e => setTratForm(f => ({ ...f, nombre: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="sm:col-span-3 space-y-1.5">
                                        <Label className="text-xs text-foreground font-medium">Duración Estimada</Label>
                                        <div className="relative flex items-center">
                                            <Input 
                                                type="number" 
                                                className="pr-14 text-right font-mono" 
                                                placeholder="30" 
                                                value={tratForm.duracion_minutos} 
                                                onChange={e => setTratForm(f => ({ ...f, duracion_minutos: e.target.value }))} 
                                            />
                                            <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">min</span>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-3 space-y-1.5">
                                        <Label className="text-xs text-foreground font-medium">Color de Agenda</Label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={tratForm.color} 
                                                onChange={e => setTratForm(f => ({ ...f, color: e.target.value }))} 
                                                className="h-9 w-10 rounded-lg cursor-pointer shrink-0 border border-input p-0.5 bg-transparent" 
                                            />
                                            <div className="flex gap-1 flex-wrap">
                                                {PRESET_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setTratForm(f => ({ ...f, color: c }))}
                                                        style={{ backgroundColor: c }}
                                                        className={cn(
                                                            "h-5 w-5 rounded-full transition-transform cursor-pointer shrink-0",
                                                            tratForm.color === c ? "scale-125 ring-2 ring-foreground" : "hover:scale-110 opacity-80 hover:opacity-100"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                                    <GlassButton 
                                        size="sm" 
                                        variant="glass" 
                                        onClick={() => { setShowTratForm(false); setEditingTratId(null); }}
                                    >
                                        Cancelar
                                    </GlassButton>
                                    <GlassButton 
                                        size="sm" 
                                        onClick={guardarTratamiento} 
                                        loading={isPending}
                                    >
                                        {editingTratId ? 'Actualizar' : 'Guardar Tratamiento'}
                                    </GlassButton>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Lista de Tratamientos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tiposTratamiento.map((t: any) => (
                        <div 
                            key={t.id} 
                            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-primary/30 transition-all duration-150 group shadow-xs"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div 
                                    className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm" 
                                    style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}66` }} 
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                        {t.nombre}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                                        <Clock className="h-3 w-3" />
                                        {t.duracion_minutos} min
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={() => { startTransition(async () => { await toggleTipoTratamiento(t.id, !t.activo) }) }}
                                    className={cn(
                                        'text-xs px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-colors border',
                                        t.activo 
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                                            : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/80'
                                    )}
                                >
                                    {t.activo ? 'Activo' : 'Inactivo'}
                                </button>

                                <button
                                    onClick={() => abrirEditarTratamiento(t)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Modificar tratamiento"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmDeleteId(t.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                    title="Eliminar tratamiento"
                                >
                                    <Trash className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {tiposTratamiento.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl space-y-2">
                        <Stethoscope className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-sm font-medium text-muted-foreground">No hay tratamientos registrados aún</p>
                        <GlassButton size="sm" onClick={abrirNuevoTratamiento}>
                            Crear primer tratamiento
                        </GlassButton>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Eliminar tratamiento"
                description="¿Seguro que deseas eliminar este tratamiento? Esta acción no se puede deshacer y puede afectar la visualización de turnos históricos correspondientes."
                onConfirm={onConfirmDelete}
                isPending={isPending}
                confirmText="Eliminar"
            />
        </div>
    )
}

/* ──────────── Tab: Profesionales ──────────── */
function TabProfesionales({ tenantId, profesionales, router }: { tenantId: string; profesionales: any[]; router: ReturnType<typeof useRouter> }) {
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [form, setForm] = useState({ nombre: '', apellido: '', especialidad: '', matricula: '', email: '', password: '', color_agenda: '#2563eb', avatar_url: '' })

    // Avatar states
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [cropperOpen, setCropperOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    function abrirNuevo() {
        setForm({ nombre: '', apellido: '', especialidad: '', matricula: '', email: '', password: '', color_agenda: '#2563eb', avatar_url: '' })
        setAvatarPreview(null)
        setEditingId(null)
        setShowForm(true)
    }

    function abrirEditar(p: any) {
        setForm({
            nombre: p.nombre || '',
            apellido: p.apellido || '',
            especialidad: p.especialidad || '',
            matricula: p.matricula || '',
            email: p.email || '',
            password: '',
            color_agenda: p.color_agenda || '#2563eb',
            avatar_url: p.avatar_url || p.foto_url || ''
        })
        setAvatarPreview(p.avatar_url || p.foto_url || null)
        setEditingId(p.id)
        setShowForm(true)
    }

    function cerrarForm() {
        setShowForm(false)
        setEditingId(null)
    }

    function borrarProfesional(id: string) {
        setConfirmDeleteId(id)
    }

    function onConfirmDelete() {
        if (!confirmDeleteId) return
        startTransition(async () => {
            const r = await eliminarProfesional(confirmDeleteId)
            setConfirmDeleteId(null)
            if (r.error) glassAlert.error({ title: 'Error al eliminar', description: r.error })
            else {
                glassAlert.success({ title: 'Profesional eliminado' })
                router.refresh()
            }
        })
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageUrl = URL.createObjectURL(file)
            setSelectedImage(imageUrl)
            setCropperOpen(true)
            e.target.value = ''
        }
    }

    const handleCropComplete = async (blob: Blob, previewUrl: string) => {
        // Previsualización instantánea
        setAvatarPreview(previewUrl)

        try {
            const supabase = createClient()
            const fileName = `profesionales/${Date.now()}.jpg`

            // Bloqueamos hasta subirla pero el UI ya muesra la vista previa
            const { data, error } = await supabase.storage
                .from('tenant_assets')
                .upload(`${tenantId}/${fileName}`, blob, { upsert: true, contentType: 'image/jpeg' })

            if (error) throw error

            const { data: publicUrlData } = supabase.storage
                .from('tenant_assets')
                .getPublicUrl(`${tenantId}/${fileName}`)

            setForm(f => ({ ...f, avatar_url: publicUrlData.publicUrl }))
        } catch (e: any) {
            glassAlert.error({ title: 'Error subiendo avatar', description: e.message })
        }
    }

    function guardar() {
        if (!form.nombre || !form.apellido || !form.email) { glassAlert.warning({ title: 'Completá nombre, apellido y email' }); return }
        if (!editingId && form.password && form.password.length < 6) {
            glassAlert.warning({ title: 'La contraseña debe tener al menos 6 caracteres' })
            return
        }
        startTransition(async () => {
            let r;
            if (editingId) {
                const { password, ...updateData } = form
                r = await actualizarProfesional(editingId, updateData)
            } else {
                r = await crearProfesional(form)
            }
            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else {
                glassAlert.success({ title: editingId ? 'Profesional actualizado' : 'Profesional creado' })
                cerrarForm()
                router.refresh()
            }
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass border border-border/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground">Equipo de Profesionales</h2>
                            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary font-semibold">
                                {profesionales.length} registrados
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gestión del equipo médico, especialidades, matrículas y credenciales de acceso a la plataforma
                        </p>
                    </div>
                </div>
                <GlassButton size="sm" onClick={showForm ? cerrarForm : abrirNuevo}>
                    {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                    {showForm ? 'Cancelar' : 'Nuevo Profesional'}
                </GlassButton>
            </div>
            {showForm && (
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
                        <div className="relative group">
                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/jpeg, image/png, image/webp"
                                onChange={handleFileSelect}
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="flex items-center justify-center h-16 w-16 rounded-full overflow-hidden border-2 border-border/50 cursor-pointer bg-muted hover:border-primary transition-all relative"
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-xl font-bold flex items-center justify-center text-white h-full w-full" style={{ backgroundColor: form.color_agenda }}>
                                        {form.nombre?.charAt(0) || ''}{form.apellido?.charAt(0) || ''}
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-5 w-5 text-white" />
                                </div>
                            </label>
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-foreground">Foto de perfil</p>
                            <p className="text-xs text-muted-foreground">Recomendado encuadre 1:1 circular.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Nombre *"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
                        <Field label="Apellido *"><Input value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} /></Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Field label="Especialidad"><Input value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} placeholder="Odontología general" /></Field>
                        <Field label="Matrícula"><Input value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} /></Field>
                        <Field label="Email *"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
                    </div>
                    {!editingId && (
                        <div className="grid grid-cols-1 gap-3">
                            <Field label="Contraseña de acceso inicial"><Input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres (Por defecto: Alvarez2026!)" /></Field>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <Field label="Color agenda"><input type="color" value={form.color_agenda} onChange={e => setForm(f => ({ ...f, color_agenda: e.target.value }))} className="h-9 w-9 rounded cursor-pointer" /></Field>
                        <GlassButton onClick={guardar} loading={isPending} className="ml-auto">
                            {editingId ? 'Guardar cambios' : 'Crear profesional'}
                        </GlassButton>
                    </div>
                </div>
            )}
            <div className="space-y-2 mt-4">
                {profesionales.map((p: any) => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-3 glass-subtle rounded-xl group transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn("h-10 w-10 relative overflow-hidden rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 transition-opacity", !p.activo && "opacity-50")} style={{ backgroundColor: p.color_agenda }}>
                                {(p.avatar_url || p.foto_url) ? (
                                    <img src={(p.avatar_url || p.foto_url)!} alt={p.nombre} className="h-full w-full object-cover" />
                                ) : (
                                    <>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</>
                                )}
                            </div>
                            <div className={cn("flex-1 min-w-0 transition-opacity", !p.activo && "opacity-50")}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-foreground">Dr. {p.nombre} {p.apellido}</p>
                                    {p.usuarios && p.usuarios.length > 0 ? (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium flex items-center gap-1" title="Tiene cuenta de acceso vinculada">
                                            <Key className="h-2.5 w-2.5" /> Cuenta activa
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium flex items-center gap-1" title="Sin cuenta de acceso individual">
                                            Sin cuenta
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{p.especialidad ?? 'Sin especialidad'} · {p.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-13 sm:pl-0 shrink-0">
                            {p.matricula && <span className={cn("text-xs glass px-2 py-1 rounded-lg shrink-0", !p.activo && "opacity-50")}>MP {p.matricula}</span>}

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => abrirEditar(p)}
                                    className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Modificar profesional"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => borrarProfesional(p.id)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Eliminar profesional"
                                >
                                    <Trash className="h-4 w-4" />
                                </button>
                            </div>

                            <button onClick={() => {
                                startTransition(async () => {
                                    const newState = !p.activo
                                    const r = await toggleProfesionalEstado(p.id, newState)
                                    if (r.error) glassAlert.error({ title: 'Error', description: r.error })
                                    else {
                                        glassAlert.success({ title: newState ? 'Profesional reactivado' : 'Profesional desactivado' })
                                        router.refresh()
                                    }
                                })
                            }}
                                className={cn('text-xs px-2 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0', p.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-destructive/10 text-destructive dark:bg-destructive/20')}>
                                {p.activo ? 'Activo' : 'Desactivado'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <AvatarCropperModal
                open={cropperOpen}
                onOpenChange={setCropperOpen}
                imageSrc={selectedImage}
                onCropCompleteAction={handleCropComplete}
            />
            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Eliminar profesional"
                description="¿Seguro que deseas eliminar este profesional? Esta acción no se puede deshacer y eliminará su cuenta de acceso individual vinculada en caso de tener una."
                onConfirm={onConfirmDelete}
                isPending={isPending}
                confirmText="Eliminar"
            />
        </div>
    )
}

/* ──────────── Tab: Obras Sociales ──────────── */
function TabObrasSociales({ obrasSociales }: { obrasSociales: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const [nombre, setNombre] = useState('')
    const [codigo, setCodigo] = useState('')
    const [planes, setPlanes] = useState('')

    function abrirNueva() {
        setNombre('')
        setCodigo('')
        setPlanes('')
        setEditingId(null)
        setShowForm(true)
    }

    function abrirEditar(os: any) {
        setNombre(os.nombre || '')
        setCodigo(os.codigo || '')
        setPlanes(os.planes || '')
        setEditingId(os.id)
        setShowForm(true)
    }

    function guardar() {
        if (!nombre) return
        startTransition(async () => {
            const dataToSave = { nombre, codigo: codigo || undefined, planes: planes || undefined }
            let r;
            if (editingId) {
                r = await actualizarObraSocial(editingId, dataToSave)
            } else {
                r = await crearObraSocial(dataToSave)
            }
            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else { 
                glassAlert.success({ title: editingId ? 'Obra social actualizada' : 'Obra social creada' })
                setNombre('')
                setCodigo('')
                setPlanes('')
                setEditingId(null)
                setShowForm(false) 
            }
        })
    }

    function borrarObraSocial(id: string) {
        setConfirmDeleteId(id)
    }

    function onConfirmDelete() {
        if (!confirmDeleteId) return
        startTransition(async () => {
            const r = await eliminarObraSocial(confirmDeleteId)
            setConfirmDeleteId(null)
            if (r.error) glassAlert.error({ title: 'Error al eliminar', description: r.error })
            else glassAlert.success({ title: 'Obra social eliminada' })
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass border border-border/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground">Obras Sociales y Prepagas</h2>
                            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary font-semibold">
                                {obrasSociales.length} convenios
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gestión de coberturas médicas, códigos de prestador y planes arancelarios admitidos
                        </p>
                    </div>
                </div>
                <GlassButton size="sm" onClick={() => {
                    if (showForm) {
                        setShowForm(false)
                        setEditingId(null)
                    } else {
                        abrirNueva()
                    }
                }}>
                    {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                    {showForm ? 'Cancelar' : 'Nueva Obra Social'}
                </GlassButton>
            </div>
            {showForm && (
                <div className="glass-subtle rounded-xl p-3 flex gap-2 items-end">
                    <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="OSDE" /></Field>
                    <Field label="Código"><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="01" /></Field>
                    <Field label="Planes (Opcional)"><Input value={planes} onChange={e => setPlanes(e.target.value)} placeholder="Ej: 210, 310" /></Field>
                    <GlassButton onClick={guardar} loading={isPending} className="shrink-0">{editingId ? 'Guardar' : 'Crear'}</GlassButton>
                </div>
            )}
            <div className="space-y-1">
                {obrasSociales.map((os: any) => (
                    <div key={os.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 py-3 sm:py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors group border-b border-border/10 last:border-b-0 sm:border-0">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{os.nombre}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {os.codigo && <span className="text-xs font-mono text-muted-foreground bg-white/5 px-1.5 rounded">{os.codigo}</span>}
                                {os.planes && <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20">Planes: {os.planes}</span>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => abrirEditar(os)}
                                    className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Modificar obra social"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => borrarObraSocial(os.id)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Eliminar obra social"
                                >
                                    <Trash className="h-4 w-4" />
                                </button>
                            </div>

                            <button onClick={() => { startTransition(async () => { await toggleObraSocial(os.id, !os.activo) }) }}
                                className={cn('text-xs px-2 py-0.5 rounded-lg cursor-pointer shrink-0', os.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                                {os.activo ? 'Activa' : 'Inactiva'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Eliminar obra social"
                description="¿Seguro que deseas eliminar esta obra social? Esta acción no se puede deshacer y puede afectar la información de los pacientes que la utilicen."
                onConfirm={onConfirmDelete}
                isPending={isPending}
                confirmText="Eliminar"
            />
        </div>
    )
}

/* ──────────── Helper Component: TimeSelect ──────────── */
function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    const options = Array.from({ length: 144 }, (_, i) => {
        const h = Math.floor(i / 6).toString().padStart(2, '0')
        const m = ((i % 6) * 10).toString().padStart(2, '0')
        return `${h}:${m}`
    })
    
    if (value && !options.includes(value)) {
        options.push(value)
        options.sort()
    }

    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="bg-input/50 text-foreground rounded-lg px-2 py-1 text-xs h-8 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 w-[5.5rem] sm:w-24 font-mono cursor-pointer border border-input hover:bg-input/80 transition-colors shadow-sm"
        >
            {options.map(opt => (
                <option key={opt} value={opt} className="bg-popover text-popover-foreground py-1">
                    {opt} hs
                </option>
            ))}
        </select>
    )
}

/* ──────────── Tab: Horarios ──────────── */
function TabHorarios({ horarios: initialHorarios, profesionales }: { horarios: any[]; profesionales: any[] }) {
    const [isPending, startTransition] = useTransition()
    const activeProfs = profesionales.filter(p => p.activo)
    const [selectedProfId, setSelectedProfId] = useState<string>(() => {
        return activeProfs[0]?.id || profesionales[0]?.id || ''
    })
    const ordered = [1, 2, 3, 4, 5, 6, 0]

    const targetOptions = activeProfs.map(p => ({
        id: p.id,
        label: `Dr/a. ${p.nombre} ${p.apellido}`
    }))

    const getHorariosFor = (profId: string) => {
        const filtered = initialHorarios ? initialHorarios.filter((x: any) => x.profesional_id === profId) : []
        
        return ordered.map(d => {
            let h = filtered.find((x: any) => x.dia === d)
            
            // If professional schedule doesn't exist yet, fallback to a sensible template
            if (!h) {
                const generalH = initialHorarios ? initialHorarios.find((x: any) => !x.profesional_id && x.dia === d) : null
                if (generalH) {
                    h = { ...generalH, profesional_id: profId }
                }
            }

            const base = h ?? { dia: d, apertura_manana: '09:00', cierre_manana: '13:00', apertura_tarde: '14:00', cierre_tarde: '18:00', activo: false }
            
            if (!base.apertura_manana && base.apertura) {
                return {
                    ...base,
                    apertura_manana: base.apertura,
                    cierre_manana: '13:00',
                    apertura_tarde: '14:00',
                    cierre_tarde: base.cierre,
                    profesional_id: profId
                }
            }
            
            return {
                ...base,
                apertura_manana: base.apertura_manana || '09:00',
                cierre_manana: base.cierre_manana || '13:00',
                apertura_tarde: base.apertura_tarde || '14:00',
                cierre_tarde: base.cierre_tarde || '18:00',
                profesional_id: profId
            }
        })
    }

    const [horarios, setHorarios] = useState<any[]>(() => getHorariosFor(selectedProfId))

    useEffect(() => {
        if (selectedProfId) {
            setHorarios(getHorariosFor(selectedProfId))
        }
    }, [selectedProfId, initialHorarios])

    function update(dia: number, field: string, value: any) {
        setHorarios(h => h.map(item => item.dia === dia ? { ...item, [field]: value } : item))
    }

    function guardar() {
        if (!selectedProfId) {
            glassAlert.error({ title: 'Error', description: 'Seleccioná un profesional para guardar sus horarios.' })
            return
        }

        for (const h of horarios) {
            if (!h.activo) continue;
            
            const [apMH, apMM] = h.apertura_manana.split(':').map(Number)
            const [ciMH, ciMM] = h.cierre_manana.split(':').map(Number)
            const [apTH, apTM] = h.apertura_tarde.split(':').map(Number)
            const [ciTH, ciTM] = h.cierre_tarde.split(':').map(Number)
            
            const minM = apMH * 60 + apMM
            const maxM = ciMH * 60 + ciMM
            const minT = apTH * 60 + apTM
            const maxT = ciTH * 60 + ciTM
            
            const labelDia = DIA_LABEL[h.dia]
            
            if (maxM <= minM) {
                glassAlert.error({
                    title: 'Error de Horarios',
                    description: `En el día ${labelDia}, el horario de cierre de la mañana (${h.cierre_manana}) debe ser posterior a la apertura (${h.apertura_manana}).`
                })
                return
            }
            
            if (maxT <= minT) {
                glassAlert.error({
                    title: 'Error de Horarios',
                    description: `En el día ${labelDia}, el horario de cierre de la tarde (${h.cierre_tarde}) debe ser posterior a la apertura (${h.apertura_tarde}).`
                })
                return
            }
            
            if (minT < maxM) {
                glassAlert.error({
                    title: 'Error de Horarios',
                    description: `En el día ${labelDia}, el horario de inicio de la tarde (${h.apertura_tarde}) no puede ser anterior o superponerse con el cierre de la mañana (${h.cierre_manana}).`
                })
                return
            }
        }

        startTransition(async () => {
            const otherHorarios = initialHorarios ? initialHorarios.filter((x: any) => x.profesional_id !== selectedProfId) : []
            const updatedHorarios = horarios.map(h => ({
                ...h,
                profesional_id: selectedProfId
            }))
            const finalHorarios = [...otherHorarios, ...updatedHorarios]

            const r = await actualizarHorarios(finalHorarios)
            r.error ? glassAlert.error({ title: 'Error', description: r.error }) : glassAlert.success({ title: 'Horarios actualizados' })
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass border border-border/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground">Horarios de Atención</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Disponibilidad operativa semanal, turnos matutinos y vespertinos por profesional
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                    <Label htmlFor="target-select" className="text-xs shrink-0 text-foreground font-medium">Configurar para:</Label>
                    <div className="w-56 relative">
                        <GlassSelect
                            value={selectedProfId}
                            onChange={(val) => {
                                setSelectedProfId(val)
                            }}
                            options={targetOptions}
                        />
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {horarios.map(h => (
                    <div key={h.dia} className={cn('flex flex-col gap-2 py-3 px-4 rounded-xl transition-colors border', h.activo ? 'glass-subtle border-border' : 'opacity-50 border-transparent')}>
                        <div className="flex items-center gap-3">
                            <button onClick={() => update(h.dia, 'activo', !h.activo)}
                                className={cn('h-5 w-5 rounded flex items-center justify-center cursor-pointer border', h.activo ? 'bg-primary border-primary text-primary-foreground' : 'border-border')}>
                                {h.activo && <Check className="h-3 w-3" />}
                            </button>
                            <span className="text-sm font-semibold text-foreground">{DIA_LABEL[h.dia]}</span>
                        </div>
                        <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {/* Mañana */}
                            <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border/50 justify-between sm:justify-start">
                                <span className="text-xs font-medium text-muted-foreground w-12">Mañana</span>
                                <TimeSelect value={h.apertura_manana} onChange={val => update(h.dia, 'apertura_manana', val)} disabled={!h.activo} />
                                <span className="text-xs text-muted-foreground">a</span>
                                <TimeSelect value={h.cierre_manana} onChange={val => update(h.dia, 'cierre_manana', val)} disabled={!h.activo} />
                            </div>
                            {/* Tarde */}
                            <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border/50 justify-between sm:justify-start">
                                <span className="text-xs font-medium text-muted-foreground w-12">Tarde</span>
                                <TimeSelect value={h.apertura_tarde} onChange={val => update(h.dia, 'apertura_tarde', val)} disabled={!h.activo} />
                                <span className="text-xs text-muted-foreground">a</span>
                                <TimeSelect value={h.cierre_tarde} onChange={val => update(h.dia, 'cierre_tarde', val)} disabled={!h.activo} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end">
                <GlassButton onClick={guardar} loading={isPending}><Save className="h-4 w-4 mr-2" />Guardar horarios</GlassButton>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-foreground font-medium">{label}</Label>
            {children}
        </div>
    )
}

/* ──────────── Tab: Sonidos/Alertas ──────────── */
interface GlassSelectOption {
    id: string
    label: string
}

interface GlassSelectProps {
    value: string
    onChange: (value: string) => void
    options: GlassSelectOption[]
    placeholder?: string
    disabled?: boolean
}

function GlassSelect({ value, onChange, options, placeholder = 'Seleccionar...', disabled = false }: GlassSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const selectedOption = options.find(o => o.id === value)

    return (
        <div className="relative w-full text-foreground" ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-input/40 border border-input hover:bg-input/60 active:scale-[0.98] rounded-xl text-xs px-3 py-2 text-foreground cursor-pointer transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none shadow-md"
            >
                <span className="truncate font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-popover text-popover-foreground shadow-[0_15px_35px_rgba(0,0,0,0.8)] rounded-xl p-1.5 border border-border focus:outline-none scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
                    >
                        <div className="space-y-0.5">
                            {options.map((option) => {
                                const isSelected = option.id === value
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.id)
                                            setIsOpen(false)
                                        }}
                                        className={`w-full flex items-center justify-between text-left text-xs px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer select-none ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                                : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                                        }`}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground shrink-0 ml-2" />}
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const SONIDOS_DISPONIBLES = [
    { id: 'bell.ogg', label: 'Campana Clásica' },
    { id: 'chime.mp3', label: 'Campanilla (Chime)' },
    { id: 'ding.mp3', label: 'Timbre Digital (Ding)' },
    { id: 'beep.mp3', label: 'Beep Corto' },
    { id: 'chello.mp3', label: 'Violonchelo Alerta' },
    { id: 'door.mp3', label: 'Timbre de Entrada (Door)' },
    { id: 'chord.mp3', label: 'Acorde de Órgano (Chord)' },
    { id: 'sonar.mp3', label: 'Sonar Submarino (Sonar)' },
    { id: 'boing.mp3', label: 'Rebote Divertido (Boing)' },
    { id: 'alarm.mp3', label: 'Alarma Digital (Alarm)' },
]

interface ConfigNotificacion {
    sound: string
    volume: number
}

interface SonidosSettings {
    turno_nuevo: ConfigNotificacion
    alerta: ConfigNotificacion
    sistema: ConfigNotificacion
}

function TabSonidos() {
    const [settings, setSettings] = useState<SonidosSettings>({
        turno_nuevo: { sound: 'bell.ogg', volume: 0.5 },
        alerta: { sound: 'chime.mp3', volume: 0.5 },
        sistema: { sound: 'beep.mp3', volume: 0.5 },
    })

    useEffect(() => {
        const saved = localStorage.getItem('consultorio-alvarez:notification-settings')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setSettings(prev => ({
                    ...prev,
                    ...parsed
                }))
            } catch (e) {
                console.error('Error al cargar config de sonidos:', e)
            }
        }
    }, [])

    function updateSetting(tipo: keyof SonidosSettings, field: keyof ConfigNotificacion, value: any) {
        setSettings(prev => ({
            ...prev,
            [tipo]: {
                ...prev[tipo],
                [field]: value
            }
        }))
    }

    function probarSonido(soundFile: string, volume: number) {
        if (!soundFile) return
        const audio = new Audio(`/sounds/${soundFile}`)
        audio.volume = volume
        audio.play().catch(err => {
            console.error('Error al reproducir audio de prueba:', err)
            const isNotAllowed = err.name === 'NotAllowedError'
            glassAlert.error({
                title: isNotAllowed ? 'Autoplay Bloqueado' : 'Error de Audio',
                description: isNotAllowed
                    ? 'El navegador bloqueó la reproducción de audio. Hace clic en cualquier parte de la pantalla e intentalo de nuevo.'
                    : `No se pudo reproducir el sonido: ${err.message || err.name}`
            })
        })
    }

    function guardar() {
        localStorage.setItem('consultorio-alvarez:notification-settings', JSON.stringify(settings))
        glassAlert.success({
            title: 'Configuración guardada',
            description: 'Las preferencias de sonido se guardaron en tu navegador.'
        })
    }

    const selectOptions = [{ id: '', label: 'Desactivado' }, ...SONIDOS_DISPONIBLES]

    return (
        <div className="glass rounded-2xl shadow-glass border border-border/60 p-6 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-border/40 pb-5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Volume2 className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Sonidos y Alertas Acústicas</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Personalizá los timbres y el nivel de volumen para cada evento operativo del consultorio
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Nuevo Turno */}
                <div className="glass-subtle rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/20">
                    <div className="space-y-1 md:max-w-xs">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Nuevos Turnos
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Sonido al recibir una reserva en línea desde la web pública.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:flex-1 md:justify-end">
                        <div className="w-full sm:w-48">
                            <GlassSelect
                                value={settings.turno_nuevo.sound}
                                onChange={val => updateSetting('turno_nuevo', 'sound', val)}
                                options={selectOptions}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.turno_nuevo.volume}
                                onChange={e => updateSetting('turno_nuevo', 'volume', parseFloat(e.target.value))}
                                className="w-24 accent-primary cursor-pointer h-1.5 bg-border rounded-lg appearance-none"
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">
                                {Math.round(settings.turno_nuevo.volume * 100)}%
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => probarSonido(settings.turno_nuevo.sound, settings.turno_nuevo.volume)}
                            disabled={!settings.turno_nuevo.sound}
                            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none glass shadow-glass hover:shadow-glass-lg text-foreground p-2 h-9 w-9 hover:scale-105 active:scale-95"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Alertas Críticas */}
                <div className="glass-subtle rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/20">
                    <div className="space-y-1 md:max-w-xs">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            Avisos y Alertas
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Sonido al registrarse alertas críticas o cancelaciones de turnos.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:flex-1 md:justify-end">
                        <div className="w-full sm:w-48">
                            <GlassSelect
                                value={settings.alerta.sound}
                                onChange={val => updateSetting('alerta', 'sound', val)}
                                options={selectOptions}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.alerta.volume}
                                onChange={e => updateSetting('alerta', 'volume', parseFloat(e.target.value))}
                                className="w-24 accent-primary cursor-pointer h-1.5 bg-border rounded-lg appearance-none"
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">
                                {Math.round(settings.alerta.volume * 100)}%
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => probarSonido(settings.alerta.sound, settings.alerta.volume)}
                            disabled={!settings.alerta.sound}
                            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none glass shadow-glass hover:shadow-glass-lg text-foreground p-2 h-9 w-9 hover:scale-105 active:scale-95"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Sistema / Avisos Generales */}
                <div className="glass-subtle rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/20">
                    <div className="space-y-1 md:max-w-xs">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Sistema y Mensajes
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Sonido para notificaciones de mantenimiento, avisos generales o logs.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:flex-1 md:justify-end">
                        <div className="w-full sm:w-48">
                            <GlassSelect
                                value={settings.sistema.sound}
                                onChange={val => updateSetting('sistema', 'sound', val)}
                                options={selectOptions}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.sistema.volume}
                                onChange={e => updateSetting('sistema', 'volume', parseFloat(e.target.value))}
                                className="w-24 accent-primary cursor-pointer h-1.5 bg-border rounded-lg appearance-none"
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">
                                {Math.round(settings.sistema.volume * 100)}%
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => probarSonido(settings.sistema.sound, settings.sistema.volume)}
                            disabled={!settings.sistema.sound}
                            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none glass shadow-glass hover:shadow-glass-lg text-foreground p-2 h-9 w-9 hover:scale-105 active:scale-95"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <GlassButton onClick={guardar}><Save className="h-4 w-4 mr-2" />Guardar configuración</GlassButton>
            </div>
        </div>
    )
}

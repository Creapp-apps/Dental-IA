'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Users, CreditCard, Clock, Save, Plus, Check, X, Pencil, Globe, Blocks, Camera } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
    actualizarTenant, actualizarHorarios,
    crearProfesional, actualizarProfesional, toggleProfesionalEstado,
    crearObraSocial, toggleObraSocial,
    crearTipoTratamiento, toggleTipoTratamiento,
} from '@/lib/actions/config'
import { glassAlert } from '@/components/ui/glass-alert'
import { TabMiWeb } from '@/components/config/TabMiWeb'
import { TabIntegraciones } from '@/components/config/TabIntegraciones'
import type { LandingConfig } from '@/lib/types/landing'
import { createClient } from '@/lib/supabase/client'
import { AvatarCropperModal } from '@/components/ui/avatar-cropper'

const TABS = [
    { id: 'consultorio', label: 'Consultorio', icon: Building2 },
    { id: 'profesionales', label: 'Profesionales', icon: Users },
    { id: 'obras_sociales', label: 'Obras Sociales', icon: CreditCard },
    { id: 'horarios', label: 'Horarios', icon: Clock },
    { id: 'mi_web', label: 'Mi Web', icon: Globe },
    { id: 'integraciones', label: 'Integraciones', icon: Blocks },
] as const

type TabId = typeof TABS[number]['id']

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

    return (
        <div className="space-y-4">
            <div className="flex gap-1 glass rounded-xl p-1 shadow-glass overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer whitespace-nowrap',
                            tab === t.id ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}>
                        <t.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {tab === 'consultorio' && <TabConsultorio tenant={tenant} tiposTratamiento={tiposTratamiento} />}
                    {tab === 'profesionales' && <TabProfesionales tenantId={tenant.id} profesionales={profesionales} router={router} />}
                    {tab === 'obras_sociales' && <TabObrasSociales obrasSociales={obrasSociales} />}
                    {tab === 'horarios' && <TabHorarios horarios={tenant.horarios} />}
                    {tab === 'mi_web' && landingConfig && <TabMiWeb config={landingConfig} slug={slug} />}
                    {tab === 'mi_web' && !landingConfig && (
                        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
                            Ejecutá el script SQL para habilitar la personalización de tu landing.
                        </div>
                    )}
                    {tab === 'integraciones' && <TabIntegraciones integrations={integrations} />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

/* ──────────── Tab: Consultorio ──────────── */
function TabConsultorio({ tenant, tiposTratamiento }: { tenant: any; tiposTratamiento: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        nombre: tenant.nombre || '', descripcion: tenant.descripcion || '',
        telefono: tenant.telefono || '', email_contacto: tenant.email_contacto || '',
        direccion: tenant.direccion || '', ciudad: tenant.ciudad || '',
        provincia: tenant.provincia || '', cuit: tenant.cuit || '',
    })
    const [newTrat, setNewTrat] = useState({ nombre: '', duracion_minutos: '30', precio_referencia: '', color: '#3b82f6' })
    const [showTratForm, setShowTratForm] = useState(false)

    function guardar() {
        startTransition(async () => {
            const r = await actualizarTenant(form)
            r.error ? glassAlert.error({ title: 'Error', description: r.error }) : glassAlert.success({ title: 'Datos actualizados' })
        })
    }

    function agregarTratamiento() {
        if (!newTrat.nombre) return
        startTransition(async () => {
            const r = await crearTipoTratamiento({
                nombre: newTrat.nombre, duracion_minutos: parseInt(newTrat.duracion_minutos) || 30,
                precio_referencia: parseFloat(newTrat.precio_referencia) || undefined,
                color: newTrat.color,
            })
            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else { glassAlert.success({ title: 'Tratamiento creado' }); setNewTrat({ nombre: '', duracion_minutos: '30', precio_referencia: '', color: '#3b82f6' }); setShowTratForm(false) }
        })
    }

    return (
        <div className="space-y-5">
            <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Datos del consultorio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nombre"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
                    <Field label="CUIT"><Input value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} placeholder="30-12345678-9" /></Field>
                </div>
                <Field label="Descripción"><Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Teléfono"><Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
                    <Field label="Email"><Input value={form.email_contacto} onChange={e => setForm(f => ({ ...f, email_contacto: e.target.value }))} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Dirección"><Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} /></Field>
                    <Field label="Ciudad"><Input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} /></Field>
                    <Field label="Provincia"><Input value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))} /></Field>
                </div>
                <div className="flex justify-end">
                    <GlassButton onClick={guardar} loading={isPending}><Save className="h-4 w-4 mr-2" />Guardar cambios</GlassButton>
                </div>
            </div>

            {/* Tratamientos */}
            <div className="glass rounded-2xl shadow-glass p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Tipos de tratamiento ({tiposTratamiento.length})</h3>
                    <GlassButton size="sm" variant="glass" onClick={() => setShowTratForm(!showTratForm)}>
                        <Plus className="h-3 w-3 mr-1" />Agregar
                    </GlassButton>
                </div>
                {showTratForm && (
                    <div className="glass-subtle rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <Input placeholder="Nombre" value={newTrat.nombre} onChange={e => setNewTrat(f => ({ ...f, nombre: e.target.value }))} />

                            <div className="relative flex items-center">
                                <Input type="number" className="pr-16 text-right" placeholder="Duración" value={newTrat.duracion_minutos} onChange={e => setNewTrat(f => ({ ...f, duracion_minutos: e.target.value }))} />
                                <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">minutos</span>
                            </div>

                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-xs text-muted-foreground pointer-events-none">$</span>
                                <Input type="number" className="pl-6" placeholder="Precio" value={newTrat.precio_referencia} onChange={e => setNewTrat(f => ({ ...f, precio_referencia: e.target.value }))} />
                            </div>

                            <div className="flex gap-1">
                                <input type="color" value={newTrat.color} onChange={e => setNewTrat(f => ({ ...f, color: e.target.value }))} className="h-9 w-9 rounded cursor-pointer shrink-0" />
                                <GlassButton size="sm" onClick={agregarTratamiento} loading={isPending} className="flex-1">Crear</GlassButton>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-1">
                    {tiposTratamiento.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                            <span className="text-sm font-medium text-foreground flex-1">{t.nombre}</span>
                            <span className="text-xs text-muted-foreground">{t.duracion_minutos}min</span>
                            {t.precio_referencia && <span className="text-xs text-muted-foreground">${Number(t.precio_referencia).toLocaleString('es-AR')}</span>}
                            <button onClick={() => { startTransition(async () => { await toggleTipoTratamiento(t.id, !t.activo) }) }}
                                className={cn('text-xs px-2 py-0.5 rounded-lg cursor-pointer', t.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                                {t.activo ? 'Activo' : 'Inactivo'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ──────────── Tab: Profesionales ──────────── */
function TabProfesionales({ tenantId, profesionales, router }: { tenantId: string; profesionales: any[]; router: ReturnType<typeof useRouter> }) {
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ nombre: '', apellido: '', especialidad: '', matricula: '', email: '', color_agenda: '#2563eb', avatar_url: '' })

    // Avatar states
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [cropperOpen, setCropperOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    function abrirNuevo() {
        setForm({ nombre: '', apellido: '', especialidad: '', matricula: '', email: '', color_agenda: '#2563eb', avatar_url: '' })
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
            color_agenda: p.color_agenda || '#2563eb',
            avatar_url: p.avatar_url || ''
        })
        setAvatarPreview(p.avatar_url || null)
        setEditingId(p.id)
        setShowForm(true)
    }

    function cerrarForm() {
        setShowForm(false)
        setEditingId(null)
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
        startTransition(async () => {
            let r;
            if (editingId) {
                r = await actualizarProfesional(editingId, form)
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
        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Profesionales ({profesionales.length})</h3>
                <GlassButton size="sm" variant="glass" onClick={showForm ? cerrarForm : abrirNuevo}>
                    {showForm ? <X className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                    {showForm ? 'Cancelar' : 'Agregar'}
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
                    <div key={p.id} className="flex items-center gap-3 glass-subtle rounded-xl p-3 group transition-colors hover:bg-muted/30">
                        <div className={cn("h-10 w-10 relative overflow-hidden rounded-full flex items-center justify-center text-white font-bold text-sm transition-opacity", !p.activo && "opacity-50")} style={{ backgroundColor: p.color_agenda }}>
                            {p.avatar_url ? (
                                <img src={p.avatar_url} alt={p.nombre} className="h-full w-full object-cover" />
                            ) : (
                                <>{p.nombre.charAt(0)}{p.apellido.charAt(0)}</>
                            )}
                        </div>
                        <div className={cn("flex-1 min-w-0 transition-opacity", !p.activo && "opacity-50")}>
                            <p className="text-sm font-semibold text-foreground">Dr. {p.nombre} {p.apellido}</p>
                            <p className="text-xs text-muted-foreground">{p.especialidad ?? 'Sin especialidad'} · {p.email}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {p.matricula && <span className={cn("text-xs glass px-2 py-1 rounded-lg", !p.activo && "opacity-50")}>MP {p.matricula}</span>}

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => abrirEditar(p)}
                                    className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Modificar profesional"
                                >
                                    <Pencil className="h-4 w-4" />
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
                                className={cn('text-xs px-2 py-1.5 ml-1 rounded-lg cursor-pointer transition-colors', p.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-destructive/10 text-destructive dark:bg-destructive/20')}>
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
        </div>
    )
}

/* ──────────── Tab: Obras Sociales ──────────── */
function TabObrasSociales({ obrasSociales }: { obrasSociales: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [nombre, setNombre] = useState('')
    const [codigo, setCodigo] = useState('')
    const [planes, setPlanes] = useState('')

    function agregar() {
        if (!nombre) return
        startTransition(async () => {
            const r = await crearObraSocial({ nombre, codigo: codigo || undefined, planes: planes || undefined })
            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else { glassAlert.success({ title: 'Obra social creada' }); setNombre(''); setCodigo(''); setPlanes(''); setShowForm(false) }
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Obras Sociales ({obrasSociales.length})</h3>
                <GlassButton size="sm" variant="glass" onClick={() => setShowForm(!showForm)}><Plus className="h-3 w-3 mr-1" />Agregar</GlassButton>
            </div>
            {showForm && (
                <div className="glass-subtle rounded-xl p-3 flex gap-2 items-end">
                    <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="OSDE" /></Field>
                    <Field label="Código"><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="01" /></Field>
                    <Field label="Planes (Opcional)"><Input value={planes} onChange={e => setPlanes(e.target.value)} placeholder="Ej: 210, 310" /></Field>
                    <GlassButton onClick={agregar} loading={isPending} className="shrink-0">Crear</GlassButton>
                </div>
            )}
            <div className="space-y-1">
                {obrasSociales.map((os: any) => (
                    <div key={os.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                        <div>
                            <p className="text-sm font-medium text-foreground">{os.nombre}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {os.codigo && <span className="text-xs font-mono text-muted-foreground bg-white/5 px-1.5 rounded">{os.codigo}</span>}
                                {os.planes && <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20">Planes: {os.planes}</span>}
                            </div>
                        </div>
                        <button onClick={() => { startTransition(async () => { await toggleObraSocial(os.id, !os.activo) }) }}
                            className={cn('text-xs px-2 py-0.5 rounded-lg cursor-pointer', os.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                            {os.activo ? 'Activa' : 'Inactiva'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ──────────── Tab: Horarios ──────────── */
function TabHorarios({ horarios: initialHorarios }: { horarios: any[] }) {
    const [isPending, startTransition] = useTransition()
    const ordered = [1, 2, 3, 4, 5, 6, 0]
    const [horarios, setHorarios] = useState<any[]>(
        ordered.map(d => initialHorarios.find((h: any) => h.dia === d) ?? { dia: d, apertura: '09:00', cierre: '18:00', activo: false })
    )

    function update(dia: number, field: string, value: any) {
        setHorarios(h => h.map(item => item.dia === dia ? { ...item, [field]: value } : item))
    }

    function guardar() {
        startTransition(async () => {
            const r = await actualizarHorarios(horarios)
            r.error ? glassAlert.error({ title: 'Error', description: r.error }) : glassAlert.success({ title: 'Horarios actualizados' })
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Horarios de atención</h3>
            <div className="space-y-2">
                {horarios.map(h => (
                    <div key={h.dia} className={cn('flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors', h.activo ? 'glass-subtle' : 'opacity-50')}>
                        <button onClick={() => update(h.dia, 'activo', !h.activo)}
                            className={cn('h-5 w-5 rounded flex items-center justify-center cursor-pointer border', h.activo ? 'bg-primary border-primary text-primary-foreground' : 'border-border')}>
                            {h.activo && <Check className="h-3 w-3" />}
                        </button>
                        <span className="text-sm font-medium text-foreground w-10">{DIA_LABEL[h.dia]}</span>
                        <div className="flex flex-1 gap-2">
                            <Input type="time" value={h.apertura} onChange={e => update(h.dia, 'apertura', e.target.value)} className="w-[4.5rem] sm:w-28 text-xs sm:text-sm px-1.5 sm:px-3" disabled={!h.activo} />
                            <span className="text-xs text-muted-foreground self-center">a</span>
                            <Input type="time" value={h.cierre} onChange={e => update(h.dia, 'cierre', e.target.value)} className="w-[4.5rem] sm:w-28 text-xs sm:text-sm px-1.5 sm:px-3" disabled={!h.activo} />
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
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
}

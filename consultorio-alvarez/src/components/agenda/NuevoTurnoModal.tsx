'use client'

import { useState, useTransition, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CalendarIcon, Clock, Zap } from 'lucide-react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
    GlassDialogFooter,
} from '@/components/ui/glass-dialog'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { GlassDatePicker } from '@/components/ui/glass-date-picker'
import { crearTurno } from '@/lib/actions/turnos'
import { glassAlert } from '@/components/ui/glass-alert'
import { type PrioridadTratamiento, PRIORIDAD_LABEL } from '@/types'

/* ──────────── Custom Glass Select ──────────── */
function GlassSelect({
    value,
    onChange,
    options,
    placeholder
}: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string, label: string }[];
    placeholder: string
}) {
    const [open, setOpen] = useState(false)
    const selected = options.find(o => o.value === value)

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-lg border border-input px-3 py-2 text-sm bg-background hover:bg-accent focus:ring-2 focus:ring-ring/50 transition-all outline-none"
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 w-full mt-1.5 z-[99999] bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl rounded-xl p-1.5 overflow-y-auto max-h-[250px] border border-border custom-scrollbar"
                        >
                            {options.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => { onChange(o.value); setOpen(false) }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-start gap-2 ${value === o.value
                                        ? 'bg-primary text-primary-foreground font-medium'
                                        : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                                        }`}
                                >
                                    <span className="flex-1 leading-snug">{o.label}</span>
                                    {value === o.value && <span className="text-primary-foreground text-xs mt-0.5 shrink-0">✓</span>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ──────────── Custom Glass Time Picker ──────────── */
function GlassTimePicker({ hora, onChange }: { hora: string, onChange: (h: string) => void }) {
    const [open, setOpen] = useState(false)

    const timeSlots = Array.from({ length: 25 }, (_, i) => {
        const h = Math.floor(i / 2) + 8
        const m = i % 2 === 0 ? '00' : '30'
        return `${h.toString().padStart(2, '0')}:${m}`
    })

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-lg border border-input px-3 py-2 text-sm bg-background hover:bg-accent focus:ring-2 focus:ring-ring/50 transition-all outline-none"
            >
                <span>{hora || 'Seleccionar hora'}</span>
                <Clock className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 w-full mt-1.5 z-[99999] bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl rounded-xl p-1.5 overflow-y-auto max-h-[250px] border border-border custom-scrollbar"
                        >
                            <div className="grid grid-cols-2 gap-1">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => { onChange(time); setOpen(false) }}
                                        className={`w-full text-center px-1 py-2 text-sm rounded-lg transition-colors ${hora === time
                                            ? 'bg-primary text-primary-foreground font-medium'
                                            : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                                            }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

interface NuevoTurnoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    profesionales: any[]
    tiposTratamiento: any[]
    pacientes: any[]
    defaultProfesionalId?: string
    defaultFecha?: string
}

export function NuevoTurnoModal({
    open,
    onOpenChange,
    profesionales,
    tiposTratamiento,
    pacientes,
    defaultProfesionalId = '',
    defaultFecha,
}: NuevoTurnoModalProps) {
    const [isPending, startTransition] = useTransition()
    const [pacienteId, setPacienteId] = useState('')
    const [pacienteSearch, setPacienteSearch] = useState('')
    const [profId, setProfId] = useState(defaultProfesionalId || (profesionales[0]?.id ?? ''))
    const [tratId, setTratId] = useState('')
    const [fecha, setFecha] = useState(defaultFecha || format(new Date(), 'yyyy-MM-dd'))
    const [hora, setHora] = useState('09:00')
    const [notas, setNotas] = useState('')
    const [prioridad, setPrioridad] = useState('')
    const [showResults, setShowResults] = useState(false)
    const [esSobreturno, setEsSobreturno] = useState(false)

    useEffect(() => {
        if (open) {
            setProfId(defaultProfesionalId || (profesionales[0]?.id ?? ''))
            setFecha(defaultFecha || format(new Date(), 'yyyy-MM-dd'))
            setPacienteId('')
            setPacienteSearch('')
            setTratId('')
            setHora('09:00')
            setNotas('')
            setPrioridad('')
            setEsSobreturno(false)
        }
    }, [open, defaultProfesionalId, defaultFecha, profesionales])

    // Auto-select 'Chequeo de rutina' treatment when sobreturno is toggled
    function toggleSobreturno() {
        const next = !esSobreturno
        setEsSobreturno(next)
        if (next) {
            const chequeo = tiposTratamiento.find((t: any) =>
                t.nombre.toLowerCase().includes('chequeo') || t.nombre.toLowerCase().includes('control')
            )
            if (chequeo) setTratId(chequeo.id)
            setPrioridad('BAJA')
        } else {
            setTratId('')
            setPrioridad('')
        }
    }

    const filteredPacientes = pacienteSearch.length >= 2
        ? pacientes.filter((p: any) =>
            p.nombre.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
            p.apellido.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
            (p.dni && p.dni.includes(pacienteSearch))
        ).slice(0, 6)
        : []

    async function handleGuardar() {
        if (!pacienteId || !profId || !tratId || !fecha || !hora) {
            glassAlert.warning({ title: 'Completá los campos obligatorios' })
            return
        }

        const trat = tiposTratamiento.find((t: any) => String(t.id) === String(tratId))
        if (!trat) return

        const fechaInicio = new Date(`${fecha}T${hora}:00`)
        const duracion = esSobreturno ? 15 : trat.duracion_minutos
        const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

        startTransition(async () => {
            const result = await crearTurno({
                paciente_id: pacienteId,
                profesional_id: profId,
                tipo_tratamiento_id: tratId,
                fecha_inicio: fechaInicio.toISOString(),
                fecha_fin: fechaFin.toISOString(),
                notas: notas || undefined,
                prioridad_override: prioridad || undefined,
                es_sobreturno: esSobreturno,
            })

            if (result.error) {
                glassAlert.error({ title: 'Error al crear turno', description: result.error })
            } else {
                glassAlert.success({ title: 'Turno creado', description: `${format(parseISO(fecha), 'dd/MM/yyyy')} a las ${hora}` })
                onOpenChange(false)
            }
        })
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-md">
                <GlassDialogHeader>
                    <GlassDialogTitle>{esSobreturno ? '⚡ Sobreturno rápido' : 'Nuevo turno'}</GlassDialogTitle>
                </GlassDialogHeader>

                <div className="space-y-4 py-2">
                    {/* Sobreturno Toggle */}
                    <button
                        type="button"
                        onClick={toggleSobreturno}
                        className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 border transition-all duration-200 ${esSobreturno
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                                : 'glass-subtle border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            }`}
                    >
                        <Zap className={`h-4 w-4 ${esSobreturno ? 'text-amber-500' : ''}`} />
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium">Sobreturno</p>
                            <p className="text-xs opacity-70">Chequeo rápido de 15 min, se superpone con la agenda</p>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${esSobreturno ? 'bg-amber-500' : 'bg-muted'}`}>
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${esSobreturno ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    </button>

                    <div className="space-y-1.5 relative">
                        <Label>Paciente *</Label>
                        <Input
                            placeholder="Buscar por nombre o DNI..."
                            value={pacienteSearch}
                            onChange={(e) => {
                                setPacienteSearch(e.target.value)
                                setPacienteId('')
                                setShowResults(true)
                            }}
                            onFocus={() => setShowResults(true)}
                        />
                        <AnimatePresence>
                            {showResults && filteredPacientes.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                    className="absolute z-[99999] top-full left-0 w-full mt-1.5 rounded-xl bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl border border-border overflow-hidden"
                                >
                                    <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                                    <div className="relative z-50">
                                        {filteredPacientes.map((p: any) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-b border-border/50 last:border-0"
                                                onClick={() => {
                                                    setPacienteId(p.id)
                                                    setPacienteSearch(`${p.apellido}, ${p.nombre}`)
                                                    setShowResults(false)
                                                }}
                                            >
                                                <span className="font-medium">{p.apellido}, {p.nombre}</span>
                                                {p.dni && <span className="text-muted-foreground ml-2">— DNI {p.dni}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {pacienteId && (
                            <p className="text-xs text-primary font-medium flex items-center mt-1.5 ml-1">
                                <span className="mr-1">✓</span> Paciente seleccionado
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-3">
                        <div className="space-y-1.5">
                            <Label>Profesional *</Label>
                            <GlassSelect
                                value={profId}
                                onChange={setProfId}
                                placeholder="Seleccionar..."
                                options={profesionales.map(p => ({ value: p.id, label: `Dr. ${p.nombre} ${p.apellido}` }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tratamiento *</Label>
                            {esSobreturno ? (
                                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-sm bg-amber-500/5">
                                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-foreground">Chequeo de rutina (15 min)</span>
                                </div>
                            ) : (
                                <GlassSelect
                                    value={tratId}
                                    onChange={setTratId}
                                    placeholder="Seleccionar..."
                                    options={tiposTratamiento.map(t => ({ value: t.id, label: `${t.nombre} (${t.duracion_minutos}m)` }))}
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Fecha *</Label>
                            <GlassDatePicker fecha={fecha} onChange={setFecha} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Hora *</Label>
                            <GlassTimePicker hora={hora} onChange={setHora} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Prioridad override</Label>
                        <GlassSelect
                            value={prioridad}
                            onChange={setPrioridad}
                            placeholder="Automática (según tratamiento)"
                            options={[
                                { value: '', label: 'Automática' },
                                { value: 'URGENTE', label: 'Urgente' },
                                { value: 'ALTA', label: 'Alta' },
                                { value: 'NORMAL', label: 'Normal' },
                                { value: 'BAJA', label: 'Baja' },
                            ]}
                        />
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <Label>Notas</Label>
                        <Textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                            placeholder="Observaciones eventuales sobre el turno..."
                            className="resize-none"
                        />
                    </div>
                </div>

                <GlassDialogFooter>
                    <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </GlassButton>
                    <GlassButton onClick={handleGuardar} loading={isPending}>
                        Crear turno
                    </GlassButton>
                </GlassDialogFooter>
            </GlassDialogContent>
        </GlassDialog>
    )
}


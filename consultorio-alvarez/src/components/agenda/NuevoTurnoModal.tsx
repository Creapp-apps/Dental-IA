'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
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
import { crearTurno, editarTurno, getOcupacionProfesionalDia } from '@/lib/actions/turnos'
import { crearPaciente } from '@/lib/actions/pacientes'
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



interface NuevoTurnoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    profesionales: any[]
    tiposTratamiento: any[]
    pacientes: any[]
    defaultProfesionalId?: string
    defaultFecha?: string
    turnoAEditar?: any
}

export function NuevoTurnoModal({
    open,
    onOpenChange,
    profesionales,
    tiposTratamiento,
    pacientes,
    defaultProfesionalId = '',
    defaultFecha,
    turnoAEditar,
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
    const [ocupacion, setOcupacion] = useState<{fecha_inicio: string, fecha_fin: string}[]>([])

    // Quick add patient states
    const [modoNuevoPaciente, setModoNuevoPaciente] = useState(false)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [nuevoApellido, setNuevoApellido] = useState('')
    const [nuevoDni, setNuevoDni] = useState('')
    const [nuevoTelefono, setNuevoTelefono] = useState('')

    useEffect(() => {
        if (open) {
            setModoNuevoPaciente(false)
            setNuevoNombre('')
            setNuevoApellido('')
            setNuevoDni('')
            setNuevoTelefono('')
            
            if (turnoAEditar) {
                setPacienteId(turnoAEditar.paciente_id)
                setPacienteSearch(`${turnoAEditar.paciente?.apellido || ''}, ${turnoAEditar.paciente?.nombre || ''}`)
                setProfId(turnoAEditar.profesional_id)
                setTratId(turnoAEditar.tipo_tratamiento_id)
                setFecha(format(parseISO(turnoAEditar.fecha_inicio), 'yyyy-MM-dd'))
                setHora(format(parseISO(turnoAEditar.fecha_inicio), 'HH:mm'))
                setNotas(turnoAEditar.notas || '')
                setPrioridad(turnoAEditar.prioridad_override || '')
                setEsSobreturno(turnoAEditar.es_sobreturno || false)
            } else {
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
        }
    }, [open, defaultProfesionalId, defaultFecha, profesionales, turnoAEditar])

    useEffect(() => {
        if (open && profId && fecha) {
            startTransition(async () => {
                const data = await getOcupacionProfesionalDia(profId, fecha)
                setOcupacion(data)
            })
        }
    }, [open, profId, fecha])

    const slots = useMemo(() => {
        const arr = []
        for (let h = 9; h <= 18; h++) {
            for (let m = 0; m < 60; m += 20) {
                if (h === 18 && m > 0) continue // Solo hasta 18:00
                arr.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
            }
        }
        return arr
    }, [])

    function isSlotOccupied(slotHora: string) {
        const slotDate = new Date(`${fecha}T${slotHora}:00`)
        const slotEnd = new Date(slotDate.getTime() + 20 * 60000)
        return ocupacion.some((t: any) => {
            if (turnoAEditar && t.id === turnoAEditar.id) return false // No checkear contra si mismo
            const tStart = new Date(t.fecha_inicio)
            const tEnd = new Date(t.fecha_fin)
            return slotDate < tEnd && slotEnd > tStart
        })
    }

    // Auto-select 'Chequeo de rutina' treatment when sobreturno is toggled
    function toggleSobreturno() {
        const next = !esSobreturno
        setEsSobreturno(next)
        if (next) {
            const chequeo = tiposTratamiento.find((t: any) =>
                t.nombre.toLowerCase().includes('chequeo') || 
                t.nombre.toLowerCase().includes('control') ||
                t.nombre.toLowerCase().includes('revis')
            )
            const selectedTrat = chequeo || tiposTratamiento[0]
            if (selectedTrat) setTratId(selectedTrat.id)
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
        const isPatientInvalid = !modoNuevoPaciente ? !pacienteId : (!nuevoNombre.trim() || !nuevoApellido.trim() || !nuevoDni.trim() || !nuevoTelefono.trim())
        if (
            isPatientInvalid ||
            !profId ||
            !tratId ||
            !fecha ||
            !hora
        ) {
            let desc = ''
            if (isPatientInvalid) {
                desc = modoNuevoPaciente 
                    ? 'Por favor completa Nombre, Apellido, DNI y Teléfono del paciente.' 
                    : 'Por favor selecciona un paciente.'
            } else if (!profId) {
                desc = 'Por favor selecciona un profesional.'
            } else if (!tratId) {
                desc = 'Por favor selecciona un tratamiento.'
            } else if (!fecha) {
                desc = 'Por favor selecciona una fecha.'
            } else if (!hora) {
                desc = 'Por favor ingresa una hora.'
            }

            glassAlert.warning({ 
                title: 'Completá los campos obligatorios',
                description: desc || undefined
            })
            return
        }

        const trat = tiposTratamiento.find((t: any) => String(t.id) === String(tratId))
        if (!trat) return

        let horaFormateada = hora.trim()
        if (horaFormateada.length === 4 && /^\d:\d{2}$/.test(horaFormateada)) {
            horaFormateada = `0${horaFormateada}`
        }

        const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(horaFormateada)) {
            glassAlert.warning({ title: 'Hora inválida', description: 'Por favor, ingresá la hora en formato HH:MM (ej: 15:52 o 09:30)' })
            return
        }

        const fechaInicio = new Date(`${fecha}T${horaFormateada}:00`)
        const duracion = esSobreturno ? 15 : trat.duracion_minutos
        const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

        startTransition(async () => {
            let finalPacienteId = pacienteId

            if (modoNuevoPaciente && !turnoAEditar) {
                const newPacienteRes = await crearPaciente({
                    nombre: nuevoNombre.trim(),
                    apellido: nuevoApellido.trim(),
                    dni: nuevoDni.trim(),
                    telefono: nuevoTelefono.trim(),
                    registro_completo: false,
                })

                if (newPacienteRes.error) {
                    glassAlert.error({ title: 'Error al registrar paciente', description: newPacienteRes.error })
                    return
                }

                if (!newPacienteRes.data) {
                    glassAlert.error({ title: 'Error al registrar paciente', description: 'No se pudo obtener el ID del nuevo paciente.' })
                    return
                }

                finalPacienteId = newPacienteRes.data.id
            }

            if (turnoAEditar) {
                const result = await editarTurno(turnoAEditar.id, {
                    paciente_id: finalPacienteId,
                    profesional_id: profId,
                    tipo_tratamiento_id: tratId,
                    fecha_inicio: fechaInicio.toISOString(),
                    fecha_fin: fechaFin.toISOString(),
                    notas: notas || undefined,
                    prioridad_override: prioridad || undefined,
                    es_sobreturno: esSobreturno,
                })

                if (result.error) {
                    glassAlert.error({ title: 'Error al editar turno', description: result.error })
                } else {
                    glassAlert.success({ title: 'Turno editado', description: `${format(parseISO(fecha), 'dd/MM/yyyy')} a las ${horaFormateada}` })
                    onOpenChange(false)
                }
            } else {
                const result = await crearTurno({
                    paciente_id: finalPacienteId,
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
                    glassAlert.success({ title: 'Turno creado', description: `${format(parseISO(fecha), 'dd/MM/yyyy')} a las ${horaFormateada}` })
                    onOpenChange(false)
                }
            }
        })
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <GlassDialogHeader className="p-6 pr-12 pb-4 border-b border-border/50">
                    <GlassDialogTitle>{turnoAEditar ? 'Editar turno' : (esSobreturno ? '⚡ Sobreturno rápido' : 'Nuevo turno')}</GlassDialogTitle>
                </GlassDialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
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
                        <div className="flex items-center justify-between">
                            <Label>Paciente *</Label>
                            {!modoNuevoPaciente && !turnoAEditar && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModoNuevoPaciente(true)
                                        setNuevoNombre('')
                                        setNuevoApellido('')
                                        setNuevoDni('')
                                        setNuevoTelefono('')
                                    }}
                                    className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
                                >
                                    <span>+ Registro rápido (Invitado)</span>
                                </button>
                            )}
                        </div>

                        {modoNuevoPaciente ? (
                            <div className="rounded-xl p-3 border border-primary/20 space-y-3 bg-primary/5 dark:bg-primary/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Registro Rápido de Paciente</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoNuevoPaciente(false)
                                            setPacienteId('')
                                            setPacienteSearch('')
                                        }}
                                        className="text-[11px] text-primary font-medium hover:underline"
                                    >
                                        Volver a buscar
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Nombre *</Label>
                                        <Input
                                            className="h-8 text-xs"
                                            placeholder="Nombre"
                                            value={nuevoNombre}
                                            onChange={(e) => setNuevoNombre(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Apellido *</Label>
                                        <Input
                                            className="h-8 text-xs"
                                            placeholder="Apellido"
                                            value={nuevoApellido}
                                            onChange={(e) => setNuevoApellido(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">DNI *</Label>
                                        <Input
                                            className="h-8 text-xs"
                                            placeholder="Solo números"
                                            value={nuevoDni}
                                            onChange={(e) => setNuevoDni(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Teléfono *</Label>
                                        <Input
                                            className="h-8 text-xs"
                                            placeholder="Teléfono"
                                            value={nuevoTelefono}
                                            onChange={(e) => setNuevoTelefono(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                    {showResults && (pacienteSearch.length >= 2 || filteredPacientes.length > 0) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                            className="absolute z-[99999] top-full left-0 w-full mt-1.5 rounded-xl bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl border border-border overflow-hidden"
                                        >
                                            <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                                            <div className="relative z-50 max-h-[200px] overflow-y-auto custom-scrollbar">
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
                                                
                                                {pacienteSearch.length >= 2 && (
                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2.5 text-xs text-primary font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-t border-border flex items-center justify-center gap-1.5"
                                                        onClick={() => {
                                                            setModoNuevoPaciente(true)
                                                            const parts = pacienteSearch.trim().split(/\s+/)
                                                            if (parts.length > 1) {
                                                                setNuevoNombre(parts[0])
                                                                setNuevoApellido(parts.slice(1).join(' '))
                                                            } else {
                                                                setNuevoNombre(pacienteSearch)
                                                                setNuevoApellido('')
                                                            }
                                                            setShowResults(false)
                                                        }}
                                                    >
                                                        <span>+ Registrar "{pacienteSearch}" como paciente rápido</span>
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {pacienteId && (
                                    <p className="text-xs text-primary font-medium flex items-center mt-1.5 ml-1">
                                        <span className="mr-1">✓</span> Paciente seleccionado
                                    </p>
                                )}
                            </>
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
                                    <span className="text-foreground">
                                        {tiposTratamiento.find(t => String(t.id) === String(tratId))?.nombre || 'Chequeo de rutina'} (15 min)
                                    </span>
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
                            {esSobreturno ? (
                                <Input 
                                    type="text" 
                                    placeholder="HH:MM (ej: 15:52)" 
                                    value={hora} 
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9:]/g, '')
                                        // Auto-insertar ":" al ingresar 2 dígitos si no está presente
                                        if (val.length === 2 && !val.includes(':') && !hora.endsWith(':')) {
                                            val = val + ':'
                                        }
                                        if (val.length <= 5) {
                                            setHora(val)
                                        }
                                    }}
                                />
                            ) : (
                                <Input 
                                    type="time" 
                                    value={hora} 
                                    onChange={(e) => setHora(e.target.value)} 
                                />
                            )}
                        </div>
                    </div>

                    {/* Disponibilidad o Indicación de Sobreturno */}
                    {!esSobreturno ? (
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                                <Label>Disponibilidad del profesional</Label>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500/50"></span> Libre</span>
                                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-red-500/50"></span> Ocupado</span>
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-black/20 border border-white/5 max-h-[135px] overflow-y-auto custom-scrollbar">
                                {slots.map(s => {
                                    const ocupado = isSlotOccupied(s)
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={ocupado}
                                            onClick={() => setHora(s)}
                                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${
                                                ocupado 
                                                    ? "bg-red-500/10 text-red-400/50 border-red-500/10 cursor-not-allowed" 
                                                    : hora === s 
                                                        ? "bg-primary text-primary-foreground border-primary" 
                                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                            ⚠️ Al ser un sobreturno, podés ingresar **cualquier horario** libremente (ej: 15:52) en el campo "Hora". El sistema lo agendará en paralelo con los turnos existentes.
                        </div>
                    )}

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

                <GlassDialogFooter className="p-6 pt-4 border-t border-border/50 bg-black/5 dark:bg-black/20">
                    <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </GlassButton>
                    <GlassButton onClick={handleGuardar} loading={isPending}>
                        {turnoAEditar ? 'Guardar cambios' : 'Crear turno'}
                    </GlassButton>
                </GlassDialogFooter>
            </GlassDialogContent>
        </GlassDialog>
    )
}


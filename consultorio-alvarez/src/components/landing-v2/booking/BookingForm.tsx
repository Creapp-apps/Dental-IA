'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { StaggerButton } from '@/components/landing-v2/ui/stagger-button'
import { motion, AnimatePresence } from 'motion/react'
import {
    DAY_NAMES_SHORT,
    MONTH_NAMES,
    CLINIC,
} from '@/lib/landing-constants'
import {
    getProfesionalesPublicos,
    getTurnosDisponibles,
    crearReservaPublica,
    getObrasSocialesPublicas,
    getPacientePorDni,
    getConfiguracionSeniaPublica,
} from '@/lib/actions/reservas'
import { crearPreferenciaPagoSenia } from '@/lib/actions/mercadopago'
import {
    Check,
    ChevronLeft,
    ChevronDown,
    CalendarDays,
    User,
    Clock,
    CheckCircle2,
    Loader2,
    CreditCard,
    ShieldCheck,
} from 'lucide-react'
import { glassAlert } from '@/components/ui/glass-alert'

// ── Types ─────────────────────────────────────────────────────────

interface AvailableDay {
    date: string
    dayOfWeek: number
    dayNum: number
    month: number
    slots: string[]
}

interface Professional {
    id: string
    nombre: string
    apellido: string
    especialidad: string | null
    color?: string | null
}

// ── Step indicator ────────────────────────────────────────────────

const STEP_LABELS = ['Profesional', 'Fecha y hora', 'Tus datos']

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-0">
                {STEP_LABELS.map((label, i) => {
                    const isCompleted = i < current
                    const isCurrent = i === current
                    return (
                        <div key={label} className="flex items-center flex-1 last:flex-none">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={cn(
                                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                                        isCompleted || isCurrent
                                            ? 'text-white border border-transparent'
                                            : 'bg-white/10 text-white/40'
                                    )}
                                    style={isCompleted || isCurrent ? { backgroundColor: 'var(--landing-primary, #0d9488)' } : undefined}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" strokeWidth={3} />
                                    ) : (
                                        <span>{i + 1}</span>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'text-xs font-medium hidden sm:block transition-colors',
                                        isCurrent ? 'text-white' : isCompleted ? 'text-white/70' : 'text-white/30'
                                    )}
                                >
                                    {label}
                                </span>
                            </div>
                            {i < STEP_LABELS.length - 1 && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-3 transition-all duration-500',
                                        i < current ? '' : 'bg-white/10'
                                    )}
                                    style={i < current ? { backgroundColor: 'var(--landing-primary, #0d9488)' } : undefined}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Step 0: Date & Time ──────────────────────────────────────────

function StepDate({
    selectedDate,
    selectedTime,
    onSelectDate,
    onSelectTime,
    availableDays,
    loading,
}: {
    selectedDate: string | null
    selectedTime: string | null
    onSelectDate: (d: string) => void
    onSelectTime: (t: string) => void
    availableDays: AvailableDay[]
    loading: boolean
}) {
    const selectedDay = availableDays.find((d) => d.date === selectedDate)

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: 'var(--landing-primary, #0d9488)' }} />
                <p className="text-sm text-slate-300">Cargando disponibilidad...</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-base font-semibold text-white mb-1">
                Seleccioná un día disponible
            </h2>
            <p className="text-xs text-slate-300 mb-5">
                Elegí el día y horario que más te convenga.
            </p>

            <div className="flex gap-2 overflow-x-auto pt-4 pb-6 -mx-4 px-4 -mt-4 scrollbar-hide">
                {availableDays.map(({ date, dayOfWeek, dayNum, month, slots }) => {
                    const isSelected = selectedDate === date
                    return (
                        <button
                            key={date}
                            onClick={() => {
                                onSelectDate(date)
                                onSelectTime('')
                            }}
                            className={cn(
                                'group flex flex-col items-center min-w-[4.2rem] rounded-xl border-2 px-3 py-2.5 transition-all shrink-0 cursor-pointer duration-300',
                                isSelected
                                    ? 'text-white shadow-md'
                                    : 'border-white/10 bg-white hover:border-transparent hover:shadow-sm text-gray-700 hover:-translate-y-0.5'
                            )}
                            style={isSelected ? { backgroundColor: 'var(--landing-primary, #0d9488)', borderColor: 'var(--landing-primary, #0d9488)' } : {}}
                        >
                            <span className={cn('text-[10px] font-medium uppercase transition-colors duration-300', isSelected ? 'text-white/80' : 'text-gray-400')} style={!isSelected ? { color: 'var(--landing-primary, #0d9488)' } : {}}>
                                {DAY_NAMES_SHORT[dayOfWeek]}
                            </span>
                            <span className={cn('text-lg font-bold leading-tight transition-colors duration-300', isSelected ? '' : '')} style={!isSelected ? { color: 'var(--landing-primary, #0d9488)' } : {}}>
                                {dayNum}
                            </span>
                            <span className={cn('text-[10px] transition-colors duration-300', isSelected ? 'text-white/70' : 'text-gray-400')} style={!isSelected ? { color: 'var(--landing-primary, #0d9488)' } : {}}>
                                {MONTH_NAMES[month].slice(0, 3)}
                            </span>
                            <span
                                className={cn(
                                    'mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-colors duration-300',
                                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-400'
                                )}
                            >
                                {slots.length} turnos
                            </span>
                        </button>
                    )
                })}
            </div>

            <AnimatePresence mode="popLayout">
                {selectedDay && (
                    <motion.div
                        key={selectedDay.date}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-5"
                    >
                        <p className="text-xs font-medium text-slate-300 mb-3">
                            Horarios disponibles — {DAY_NAMES_SHORT[selectedDay.dayOfWeek]}{' '}
                            {selectedDay.dayNum} de {MONTH_NAMES[selectedDay.month]}
                        </p>
                        <motion.div
                            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.04 }
                                }
                            }}
                            initial="hidden"
                            animate="visible"
                        >
                            {selectedDay.slots.map((slot) => {
                                const isSelected = selectedTime === slot
                                const isMorning = parseInt(slot) < 13
                                return (
                                    <motion.button
                                        variants={{
                                            hidden: { opacity: 0, y: 15, scale: 0.96 },
                                            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                                        }}
                                        key={slot}
                                        onClick={() => onSelectTime(slot)}
                                        className={cn(
                                            'group rounded-lg border-2 py-2.5 text-sm font-medium transition-all cursor-pointer duration-300',
                                            isSelected
                                                ? 'text-white shadow-md'
                                                : 'border-white/10 bg-white hover:shadow-sm text-gray-700 hover:-translate-y-0.5 hover:border-transparent'
                                        )}
                                        style={isSelected ? { backgroundColor: 'var(--landing-primary, #0d9488)', borderColor: 'var(--landing-primary, #0d9488)' } : {}}
                                    >
                                        <span className={cn('flex items-center justify-center gap-1.5 transition-colors duration-300')} style={!isSelected ? { color: 'var(--landing-primary, #0d9488)' } : {}}>
                                            <Clock className={cn('h-3 w-3 transition-colors duration-300')} />
                                            {slot}
                                        </span>
                                        <span
                                            className={cn('text-[10px] block mt-0.5 transition-colors duration-300', isSelected ? 'text-white/70' : 'text-gray-400')}
                                            style={!isSelected ? { color: 'var(--landing-primary, #0d9488)' } : {}}
                                        >
                                            {isMorning ? 'Mañana' : 'Tarde'}
                                        </span>
                                    </motion.button>
                                )
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selectedDate && (
                <div className="mt-6 text-center py-6 rounded-xl bg-white/5 border border-dashed border-white/10">
                    <CalendarDays className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/60">Seleccioná un día para ver los horarios disponibles</p>
                </div>
            )}
        </div>
    )
}

// ── Step 1: Professional ─────────────────────────────────────────

function StepProfessional({
    selected,
    onSelect,
    professionals,
    loading,
}: {
    selected: string | null
    onSelect: (id: string) => void
    professionals: Professional[]
    loading: boolean
}) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: 'var(--landing-primary, #0d9488)' }} />
                <p className="text-sm text-slate-300">Cargando profesionales...</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-base font-semibold text-white mb-4">
                ¿Con quién querés atenderte?
            </h2>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => onSelect('sin-preferencia')}
                    className={cn(
                        'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm cursor-pointer',
                        selected === 'sin-preferencia'
                            ? 'text-white shadow-md'
                            : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                    )}
                    style={selected === 'sin-preferencia' ? { backgroundColor: 'var(--landing-primary, #0d9488)', borderColor: 'var(--landing-primary, #0d9488)' } : {}}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-colors", selected === 'sin-preferencia' ? 'bg-white/20' : 'bg-gray-100')}>
                            <User className={cn("h-5 w-5 transition-colors", selected === 'sin-preferencia' ? 'text-white' : 'text-gray-400')} />
                        </div>
                        <div>
                            <p className={cn("font-semibold text-sm transition-colors", selected === 'sin-preferencia' ? 'text-white' : 'text-gray-800')}>Sin preferencia</p>
                            <p className={cn("text-xs transition-colors", selected === 'sin-preferencia' ? 'text-white/80' : 'text-gray-400')}>El primer profesional disponible</p>
                        </div>
                        {selected === 'sin-preferencia' && (
                            <div className="ml-auto h-5 w-5 rounded-full flex items-center justify-center bg-white" style={{ color: 'var(--landing-primary, #0d9488)' }}>
                                <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </button>

                {professionals.map((p) => {
                    const isSelected = selected === p.id
                    const initials = `${p.nombre[0]}${p.apellido[0]}`
                    return (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p.id)}
                            className={cn(
                                'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm cursor-pointer',
                                isSelected
                                    ? 'text-white shadow-md'
                                    : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                            )}
                            style={isSelected ? { backgroundColor: 'var(--landing-primary, #0d9488)', borderColor: 'var(--landing-primary, #0d9488)' } : {}}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 relative overflow-hidden rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                                    style={{ backgroundColor: (p as any).color || '#0d9488' }}
                                >
                                    {((p as any).avatar_url || (p as any).foto_url) ? (
                                        <img src={(p as any).avatar_url || (p as any).foto_url} alt={`Dr/a. ${p.nombre}`} className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("font-semibold text-sm transition-colors", isSelected ? 'text-white' : 'text-gray-800')}>
                                        Dr/a. {p.nombre} {p.apellido}
                                    </p>
                                    <p className={cn("text-xs transition-colors", isSelected ? 'text-white/80' : 'text-gray-400')}>{p.especialidad}</p>
                                </div>
                                {isSelected && (
                                    <div className="h-5 w-5 rounded-full flex items-center justify-center bg-white shrink-0" style={{ color: 'var(--landing-primary, #0d9488)' }}>
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Custom Premium Select ─────────────────────────────────────────

interface SelectOption {
    value: string
    label: string
}

function PremiumSelect({
    value,
    options,
    onChange,
}: {
    value: string
    options: SelectOption[]
    onChange: (val: string) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = options.find(o => o.value === value)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-left outline-none transition-all duration-300 flex items-center justify-between cursor-pointer',
                    open
                        ? 'shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                )}
                style={open ? { borderColor: 'var(--landing-primary, #0d9488)', boxShadow: '0 0 0 2px var(--landing-primary, #0d9488)40' } : {}}
            >
                <span className="text-gray-800">{selected?.label}</span>
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute z-50 mt-1.5 w-full rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/8 overflow-y-auto max-h-[220px]"
                        data-lenis-prevent
                    >
                        {options.map((option) => {
                            const isActive = option.value === value
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        'w-full px-3.5 py-2.5 text-sm text-left flex items-center justify-between transition-all duration-200 cursor-pointer',
                                        isActive
                                            ? 'font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    )}
                                    style={isActive ? { backgroundColor: 'var(--landing-primary, #0d9488)1a', color: 'var(--landing-primary, #0d9488)' } : {}}
                                >
                                    <span>{option.label}</span>
                                    {isActive && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        >
                                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: 'var(--landing-primary, #0d9488)' }} />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Step 2: Patient data ─────────────────────────────────────────

interface PatientFormData {
    nombre: string
    apellido: string
    telefono: string
    email: string
    es_nuevo: string
    notas: string
    obraSocialId: string
    plan: string
    dni: string
    pacienteExistenteId: string
}

function StepPatientData({
    datos,
    obrasSociales,
    onChange,
    errors,
    dniRef,
    telefonoRef,
    nombreRef,
    apellidoRef,
    configSenia,
    slug = 'alvarez',
}: {
    datos: PatientFormData
    obrasSociales: any[]
    onChange: (key: keyof PatientFormData, val: string) => void
    errors: Record<string, boolean>
    dniRef: React.RefObject<HTMLInputElement | null>
    telefonoRef: React.RefObject<HTMLInputElement | null>
    nombreRef: React.RefObject<HTMLInputElement | null>
    apellidoRef: React.RefObject<HTMLInputElement | null>
    configSenia?: { requiereSenia: boolean; montoSenia: number; clinicaNombre?: string } | null
    slug?: string
}) {
    const [buscando, setBuscando] = useState(false)
    const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
    const [pacienteEncontrado, setPacienteEncontrado] = useState<any | null>(null)

    const inputClass =
        'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:shadow-sm'
    const focusStyle = { '--tw-ring-color': 'var(--landing-primary, #0d9488)40', '--tw-ring-shadow': 'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)' } as React.CSSProperties

    async function handleBuscarDni() {
        const cleanDni = datos.dni.replace(/\D/g, '')
        if (!cleanDni) {
            setErrorBusqueda('Por favor, ingresá un DNI válido')
            return
        }

        setBuscando(true)
        setErrorBusqueda(null)
        setPacienteEncontrado(null)
        onChange('pacienteExistenteId', '')

        try {
            const res = await getPacientePorDni(slug, cleanDni)
            if (res.error) {
                setErrorBusqueda(res.error)
            } else if (res.data) {
                setPacienteEncontrado(res.data)
                // Populate the required fields in parent state for confirmation / WhatsApp redirect
                onChange('pacienteExistenteId', res.data.id)
                onChange('nombre', res.data.nombre)
                onChange('apellido', res.data.apellido)
                onChange('telefono', res.data.telefono || '')
                onChange('email', res.data.email || '')
                onChange('obraSocialId', res.data.obra_social_id || '')
            } else {
                setErrorBusqueda('DNI no encontrado, por favor contacte a administración')
            }
        } catch (err) {
            setErrorBusqueda('Ocurrió un error al buscar el DNI. Reintentá.')
        } finally {
            setBuscando(false)
        }
    }

    const selectedObra = obrasSociales.find(o => o.id === datos.obraSocialId)

    return (
        <div>
            <h2 className="text-base font-semibold text-white mb-4">Tus datos</h2>

            {/* Banner informativo si el consultorio exige seña */}
            {configSenia?.requiereSenia && (
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 mb-5 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0 text-teal-300">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-white">
                                    Reserva con Seña Requerida
                                </h4>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                                    ${configSenia.montoSenia.toLocaleString('es-AR')} ARS
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Para confirmar el turno en agenda es requisito abonar una seña de <strong className="text-white font-semibold">${configSenia.montoSenia.toLocaleString('es-AR')} ARS</strong> mediante Mercado Pago. Serás redirigido de forma automática e inmediata al confirmar tus datos.
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-teal-300/80 mt-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                                <span>Pago protegido vía Mercado Pago. El monto abonado se descuenta del valor total de la consulta.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 1. Selector de tipo de paciente */}
            <div className="mb-5">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">¿Es paciente nuevo?</label>
                <PremiumSelect
                    value={datos.es_nuevo}
                    options={[
                        { value: 'si', label: 'Sí, es mi primera vez' },
                        { value: 'no', label: 'No, ya me atendí aquí' },
                    ]}
                    onChange={(val) => {
                        onChange('es_nuevo', val)
                        setPacienteEncontrado(null)
                        setErrorBusqueda(null)
                        
                        // Reset parent fields
                        onChange('nombre', '')
                        onChange('apellido', '')
                        onChange('telefono', '')
                        onChange('email', '')
                        onChange('dni', '')
                        onChange('obraSocialId', '')
                        onChange('plan', '')
                        onChange('pacienteExistenteId', '')
                    }}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={focusStyle}>
                
                {/* FLUJO PACIENTE NUEVO */}
                {datos.es_nuevo === 'si' && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">DNI *</label>
                            <input
                                ref={dniRef}
                                type="text"
                                className={cn(
                                    inputClass,
                                    'focus:ring-2',
                                    errors?.dni && 'animate-pulse-red border-red-500 bg-red-950/20 text-red-200 placeholder:text-red-300/40'
                                )}
                                style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                placeholder="Tu número de DNI"
                                value={datos.dni}
                                onChange={(e) => onChange('dni', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Teléfono *</label>
                            <input
                                ref={telefonoRef}
                                type="tel"
                                className={cn(
                                    inputClass,
                                    'focus:ring-2',
                                    errors?.telefono && 'animate-pulse-red border-red-500 bg-red-950/20 text-red-200 placeholder:text-red-300/40'
                                )}
                                style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                placeholder="11 4567-8901"
                                value={datos.telefono}
                                onChange={(e) => onChange('telefono', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre *</label>
                            <input
                                ref={nombreRef}
                                type="text"
                                className={cn(
                                    inputClass,
                                    'focus:ring-2',
                                    errors?.nombre && 'animate-pulse-red border-red-500 bg-red-950/20 text-red-200 placeholder:text-red-300/40'
                                )}
                                style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                placeholder="Tu nombre"
                                value={datos.nombre}
                                onChange={(e) => onChange('nombre', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Apellido *</label>
                            <input
                                ref={apellidoRef}
                                type="text"
                                className={cn(
                                    inputClass,
                                    'focus:ring-2',
                                    errors?.apellido && 'animate-pulse-red border-red-500 bg-red-950/20 text-red-200 placeholder:text-red-300/40'
                                )}
                                style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                placeholder="Tu apellido"
                                value={datos.apellido}
                                onChange={(e) => onChange('apellido', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                            <input type="email" className={`${inputClass} focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} placeholder="correo@ejemplo.com" value={datos.email} onChange={(e) => onChange('email', e.target.value)} />
                        </div>
                        
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Prepaga / Obra Social *</label>
                            <PremiumSelect
                                value={datos.obraSocialId || ''}
                                options={[
                                    ...obrasSociales.map(o => ({ value: o.id, label: o.nombre })),
                                    { value: 'particular', label: 'No tengo / Particular' }
                                ]}
                                onChange={(val) => {
                                    onChange('obraSocialId', val)
                                    onChange('plan', '')
                                }}
                            />
                        </div>

                        {datos.obraSocialId && datos.obraSocialId !== 'particular' && (() => {
                            const opcionesPlanes = selectedObra?.planes 
                                ? selectedObra.planes.split(',').map((p: string) => ({ value: p.trim(), label: p.trim() })) 
                                : []
                            
                            if (opcionesPlanes.length > 0) {
                                return (
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Plan *</label>
                                        <PremiumSelect
                                            value={datos.plan || ''}
                                            options={opcionesPlanes}
                                            onChange={(val) => onChange('plan', val)}
                                        />
                                    </div>
                                )
                            }
                            return null
                        })()}

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo (opcional)</label>
                            <textarea className={`${inputClass} resize-none focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} rows={3} placeholder="Contanos brevemente el motivo de tu consulta..." value={datos.notas} onChange={(e) => onChange('notas', e.target.value)} />
                        </div>
                    </>
                )}

                {/* FLUJO PACIENTE EXISTENTE */}
                {datos.es_nuevo === 'no' && (
                    <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Input DNI y Botón de búsqueda */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">DNI *</label>
                                <input
                                    ref={dniRef}
                                    type="text"
                                    className={cn(
                                        inputClass,
                                        'focus:ring-2',
                                        errors?.dni && 'animate-pulse-red border-red-500 bg-red-950/20 text-red-200 placeholder:text-red-300/40'
                                    )}
                                    style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                    placeholder="Ingresa tu número de DNI completo"
                                    value={datos.dni}
                                    onChange={(e) => onChange('dni', e.target.value)}
                                    disabled={buscando}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleBuscarDni()
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleBuscarDni}
                                disabled={buscando || !datos.dni.trim()}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
                                style={{ backgroundColor: 'var(--landing-primary, #0d9488)' }}
                            >
                                {buscando ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    'Ingresar DNI'
                                )}
                            </button>
                        </div>

                        {/* Error de Búsqueda */}
                        {errorBusqueda && (
                            <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 text-red-700 text-sm font-medium animate-fadeIn">
                                {errorBusqueda}
                            </div>
                        )}

                        {/* Paciente Encontrado (Solo Lectura) */}
                        {pacienteEncontrado && (
                            <div className="p-5 rounded-2xl border border-teal-100 bg-teal-50/50 text-teal-800 text-sm animate-fadeIn">
                                <p className="font-semibold text-teal-950 mb-3.5 flex items-center gap-1.5">
                                    <Check className="h-4 w-4 text-teal-600" strokeWidth={3} />
                                    Paciente verificado con éxito
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="font-semibold block text-teal-800/60 uppercase tracking-wider text-[9px] mb-0.5">Nombre Completo</span>
                                        <span className="text-sm font-semibold text-teal-900">{pacienteEncontrado.nombre} {pacienteEncontrado.apellido}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-teal-800/60 uppercase tracking-wider text-[9px] mb-0.5">Teléfono</span>
                                        <span className="text-sm font-semibold text-teal-900">{pacienteEncontrado.telefono || 'No registrado'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-teal-800/60 uppercase tracking-wider text-[9px] mb-0.5">Email</span>
                                        <span className="text-sm font-semibold text-teal-900">{pacienteEncontrado.email || 'No registrado'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-teal-800/60 uppercase tracking-wider text-[9px] mb-0.5">Obra Social / Prepaga</span>
                                        <span className="text-sm font-semibold text-teal-900">
                                            {selectedObra?.nombre || 'Particular (Sin obra social)'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Motivo de Consulta */}
                        {pacienteEncontrado && (
                            <div className="mt-2 animate-fadeIn">
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo (opcional)</label>
                                <textarea
                                    className={`${inputClass} resize-none focus:ring-2`}
                                    style={{ outlineColor: 'var(--landing-primary, #0d9488)' }}
                                    rows={3}
                                    placeholder="Contanos brevemente el motivo de tu consulta..."
                                    value={datos.notas}
                                    onChange={(e) => onChange('notas', e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}

// ── Success ──────────────────────────────────────────────────────

function StepSuccess({ slug }: { slug?: string }) {
    return (
        <div className="text-center py-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--landing-primary, #0d9488)1a' }}>
                <CheckCircle2 className="h-9 w-9" style={{ color: 'var(--landing-primary, #0d9488)' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¡Turno reservado!</h2>
            <p className="text-slate-300 max-w-sm mx-auto text-sm leading-relaxed">
                Tu turno ha sido registrado exitosamente. Te enviaremos la confirmación por WhatsApp a la brevedad.
            </p>
            {(!slug || slug === 'alvarez') && (
                <p className="mt-4 text-sm text-slate-400">
                    También podés comunicarte al{' '}
                    <a href={`tel:${CLINIC.phone}`} className="font-medium underline animate-pulse" style={{ color: 'var(--landing-primary, #0d9488)' }}>
                        {CLINIC.phone}
                    </a>
                </p>
            )}
        </div>
    )
}

// ── Main BookingForm ─────────────────────────────────────────────

export function BookingForm({ slug = 'alvarez' }: { slug?: string }) {
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1)
    const [sent, setSent] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [professionalId, setProfessionalId] = useState<string | null>(null)
    const [datos, setDatos] = useState<PatientFormData>({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        es_nuevo: 'si',
        notas: '',
        obraSocialId: '',
        plan: '',
        dni: '',
        pacienteExistenteId: '',
    })

    // Refs for input focus highlighting
    const dniRef = useRef<HTMLInputElement>(null)
    const telefonoRef = useRef<HTMLInputElement>(null)
    const nombreRef = useRef<HTMLInputElement>(null)
    const apellidoRef = useRef<HTMLInputElement>(null)

    // Validation & feedback state
    const [formErrors, setFormErrors] = useState<Record<string, boolean>>({})
    const [showTooltip, setShowTooltip] = useState(false)
    const [tooltipText, setTooltipText] = useState('')

    // Real data from Supabase
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([])
    const [obrasSociales, setObrasSociales] = useState<any[]>([])
    const [loadingDays, setLoadingDays] = useState(false)
    const [loadingProfs, setLoadingProfs] = useState(true)
    const [configSenia, setConfigSenia] = useState<{
        requiereSenia: boolean
        montoSenia: number
        clinicaNombre?: string
    } | null>(null)

    // Load initial data (professionals, health insurances, and deposit requirement)
    useEffect(() => {
        async function loadData() {
            try {
                const [profs, obras, seniaRes] = await Promise.all([
                    getProfesionalesPublicos(slug),
                    getObrasSocialesPublicas(slug),
                    getConfiguracionSeniaPublica(slug),
                ])
                setProfessionals(profs as Professional[])
                setObrasSociales(obras)
                if (seniaRes?.success && seniaRes.requiereSenia) {
                    setConfigSenia({
                        requiereSenia: seniaRes.requiereSenia,
                        montoSenia: seniaRes.montoSenia || 0,
                        clinicaNombre: seniaRes.clinicaNombre,
                    })
                }
            } catch (err) {
                console.error('Error loading booking data:', err)
            } finally {
                setLoadingProfs(false)
            }
        }
        loadData()
    }, [slug])

    // Fetch availability reactively when professional is selected
    useEffect(() => {
        if (!professionalId) {
            setAvailableDays([])
            return
        }

        async function loadAvailability() {
            setLoadingDays(true)
            try {
                const days = await getTurnosDisponibles(slug, professionalId)
                setAvailableDays(days)
            } catch (err) {
                console.error('Error loading availability:', err)
            } finally {
                setLoadingDays(false)
            }
        }
        loadAvailability()
    }, [professionalId, slug])

    // Reusable refresh for availability (called after booking)
    async function refreshAvailability() {
        if (professionalId) {
            const days = await getTurnosDisponibles(slug, professionalId)
            setAvailableDays(days)
        }
    }

    const handleFieldChange = (key: keyof PatientFormData, val: string) => {
        setDatos((prev) => ({ ...prev, [key]: val }))
        if (formErrors[key]) {
            setFormErrors((prev) => ({ ...prev, [key]: false }))
        }
    }

    const canNext = [
        professionalId !== null,
        selectedDate !== null && selectedTime !== null && selectedTime !== '',
        datos.es_nuevo === 'si'
            ? datos.nombre.trim() !== '' && datos.apellido.trim() !== '' && datos.telefono.trim() !== '' && datos.dni.trim() !== ''
            : datos.pacienteExistenteId !== '' && datos.pacienteExistenteId !== null,
    ]

    const isStepDisabled = !canNext[step]

    async function handleNext() {
        // If step is disabled, trigger highlights & tooltip instead of advancing
        if (isStepDisabled) {
            if (step === 0) {
                setTooltipText('Por favor, seleccioná un profesional para continuar.')
                setShowTooltip(true)
                setTimeout(() => setShowTooltip(false), 4000)
            } else if (step === 1) {
                setTooltipText('Por favor, elegí un día y horario.')
                setShowTooltip(true)
                setTimeout(() => setShowTooltip(false), 4000)
            } else if (step === 2) {
                const newErrors: Record<string, boolean> = {}
                let firstMissingField: 'dni' | 'telefono' | 'nombre' | 'apellido' | null = null

                if (datos.es_nuevo === 'si') {
                    if (!datos.dni.trim()) {
                        newErrors.dni = true
                        if (!firstMissingField) firstMissingField = 'dni'
                    }
                    if (!datos.telefono.trim()) {
                        newErrors.telefono = true
                        if (!firstMissingField) firstMissingField = 'telefono'
                    }
                    if (!datos.nombre.trim()) {
                        newErrors.nombre = true
                        if (!firstMissingField) firstMissingField = 'nombre'
                    }
                    if (!datos.apellido.trim()) {
                        newErrors.apellido = true
                        if (!firstMissingField) firstMissingField = 'apellido'
                    }
                    setTooltipText('Por favor, completa los campos requeridos en rojo.')
                } else {
                    // Existing patient validation
                    if (!datos.dni.trim()) {
                        newErrors.dni = true
                        firstMissingField = 'dni'
                        setTooltipText('Ingresá tu DNI para verificar tu cuenta.')
                    } else if (!datos.pacienteExistenteId) {
                        newErrors.dni = true
                        firstMissingField = 'dni'
                        setTooltipText('Debes hacer clic en "Ingresar DNI" para verificar tu cuenta.')
                    }
                }

                setFormErrors(newErrors)
                setShowTooltip(true)
                setTimeout(() => setShowTooltip(false), 5000)

                // Scroll and focus targeting
                if (firstMissingField) {
                    if (firstMissingField === 'dni' && dniRef.current) {
                        dniRef.current.focus()
                        dniRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    } else if (firstMissingField === 'telefono' && telefonoRef.current) {
                        telefonoRef.current.focus()
                        telefonoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    } else if (firstMissingField === 'nombre' && nombreRef.current) {
                        nombreRef.current.focus()
                        nombreRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    } else if (firstMissingField === 'apellido' && apellidoRef.current) {
                        apellidoRef.current.focus()
                        apellidoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                }
            }
            return
        }

        // Proceed normally
        if (step < 2) {
            setDirection(1)
            setStep((s) => s + 1)
        } else {
            setSubmitting(true)
            try {
                const result = await crearReservaPublica({
                    tenantSlug: slug,
                    fecha: selectedDate!,
                    hora: selectedTime!,
                    profesionalId: professionalId,
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    telefono: datos.telefono,
                    email: datos.email,
                    es_nuevo: datos.es_nuevo,
                    notas: datos.notas,
                    obraSocialId: datos.obraSocialId !== 'particular' ? datos.obraSocialId : null,
                    planSeleccionado: datos.plan,
                    dni: datos.dni,
                    pacienteExistenteId: datos.es_nuevo === 'no' ? datos.pacienteExistenteId : null,
                })
                if (result.error) {
                    glassAlert.error({ title: 'Error', description: result.error })
                } else {
                    // Si el consultorio tiene activada la seña obligatoria, redirigir a Mercado Pago
                    if (result.requiereSenia && result.turnoId && result.montoSenia) {
                        const prefResult = await crearPreferenciaPagoSenia({
                            turnoId: result.turnoId,
                            tenantId: result.tenantId,
                            pacienteNombre: `${datos.nombre} ${datos.apellido}`.trim(),
                            pacienteEmail: datos.email,
                            monto: result.montoSenia,
                            clinicaNombre: result.clinicaNombre,
                        })

                        if (prefResult.success && prefResult.initPoint) {
                            // Redirigir al Checkout de Mercado Pago
                            window.location.href = prefResult.initPoint
                            return
                        } else {
                            console.error('Error al generar preferencia MP:', prefResult.error)
                            glassAlert.warning({
                                title: 'Turno registrado con aviso',
                                description: 'Tu turno fue agendado, pero hubo un inconveniente al generar el link de pago de la seña. Te contactaremos a la brevedad para coordinar.',
                            })
                            await refreshAvailability()
                            setSent(true)
                            return
                        }
                    }

                    // Flujo habitual sin seña previa requerida
                    await refreshAvailability()
                    setSent(true)
                }
            } catch (err) {
                glassAlert.error({ title: 'Error', description: 'Error al enviar la reserva. Intentá nuevamente.' })
                console.error(err)
            } finally {
                setSubmitting(false)
            }
        }
    }

    if (sent) {
        return (
            <div className="p-8">
                <StepSuccess slug={slug} />
            </div>
        )
    }

    return (
        <div>
            <StepIndicator current={step} />

            <div className="p-6 md:p-8 overflow-hidden relative">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={{
                            enter: (dir: number) => ({
                                x: dir > 0 ? 30 : -30,
                                opacity: 0,
                                filter: 'blur(4px)',
                            }),
                            center: {
                                x: 0,
                                opacity: 1,
                                filter: 'blur(0px)',
                            },
                            exit: (dir: number) => ({
                                x: dir > 0 ? -30 : 30,
                                opacity: 0,
                                filter: 'blur(4px)',
                            }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                    >
                        {step === 0 && (
                            <StepProfessional
                                selected={professionalId}
                                onSelect={(id) => {
                                    setProfessionalId(id)
                                    // Reset date and time if professional changes
                                    setSelectedDate(null)
                                    setSelectedTime(null)
                                    // One-touch: Advance immediately to next step
                                    setDirection(1)
                                    setStep(1)
                                }}
                                professionals={professionals}
                                loading={loadingProfs}
                            />
                        )}
                        {step === 1 && (
                            <StepDate
                                selectedDate={selectedDate}
                                selectedTime={selectedTime}
                                onSelectDate={setSelectedDate}
                                onSelectTime={(time) => {
                                    setSelectedTime(time)
                                    if (time) {
                                        // One-touch: Advance immediately to next step
                                        setDirection(1)
                                        setStep(2)
                                    }
                                }}
                                availableDays={availableDays}
                                loading={loadingDays}
                            />
                        )}
                        {step === 2 && (
                            <StepPatientData
                                datos={datos}
                                obrasSociales={obrasSociales}
                                onChange={handleFieldChange}
                                errors={formErrors}
                                dniRef={dniRef}
                                telefonoRef={telefonoRef}
                                nombreRef={nombreRef}
                                apellidoRef={apellidoRef}
                                configSenia={configSenia}
                                slug={slug}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-white/10 bg-white/5">
                <button
                    onClick={() => {
                        setDirection(-1)
                        setStep((s) => s - 1)
                    }}
                    disabled={step === 0}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-0 cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </button>

                <div className="relative">
                    <AnimatePresence>
                        {showTooltip && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-3 right-0 z-50 w-72 p-3 bg-red-950/90 backdrop-blur-md border border-red-500/50 rounded-xl shadow-2xl text-xs text-red-100 flex items-center gap-2"
                            >
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
                                <span className="font-medium">{tooltipText}</span>
                                {/* Downward pointer arrow */}
                                <div className="absolute top-full right-8 w-3 h-3 bg-red-950/90 border-r border-b border-red-500/50 transform rotate-45 -translate-y-1.5" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <StaggerButton
                        onClick={handleNext}
                        loading={submitting}
                        text={
                            step === 2
                                ? submitting
                                    ? configSenia?.requiereSenia
                                        ? 'Generando pago seguro...'
                                        : 'Enviando...'
                                    : configSenia?.requiereSenia
                                      ? `Pagar seña ($${configSenia.montoSenia.toLocaleString('es-AR')}) y confirmar`
                                      : 'Confirmar turno'
                                : 'Continuar'
                        }
                        direction="up"
                        className={cn(
                            'rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm h-auto border-0 transition-all duration-300',
                            isStepDisabled && 'opacity-40 cursor-not-allowed hover:bg-opacity-80'
                        )}
                        style={{ backgroundColor: 'var(--landing-primary, #0d9488)' }}
                    >
                        {step === 2
                            ? submitting
                                ? configSenia?.requiereSenia
                                    ? 'Generando pago seguro...'
                                    : 'Enviando...'
                                : configSenia?.requiereSenia
                                  ? `Pagar seña ($${configSenia.montoSenia.toLocaleString('es-AR')}) y confirmar`
                                  : 'Confirmar turno'
                            : 'Continuar'}
                    </StaggerButton>
                </div>
            </div>
        </div>
    )
}

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
} from '@/lib/actions/reservas'
import {
    Check,
    ChevronLeft,
    ChevronDown,
    CalendarDays,
    User,
    Clock,
    CheckCircle2,
    Loader2,
} from 'lucide-react'

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

const STEP_LABELS = ['Fecha', 'Profesional', 'Tus datos']

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="border-b border-gray-100 px-6 py-4">
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
                                            : 'bg-gray-100 text-gray-400'
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
                                        isCurrent ? 'text-gray-800' : isCompleted ? 'text-gray-500' : 'text-gray-300'
                                    )}
                                >
                                    {label}
                                </span>
                            </div>
                            {i < STEP_LABELS.length - 1 && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-3 transition-all duration-500',
                                        i < current ? '' : 'bg-gray-200'
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
                <p className="text-sm text-gray-400">Cargando disponibilidad...</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">
                Seleccioná un día disponible
            </h2>
            <p className="text-xs text-gray-400 mb-5">
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
                                    : 'border-gray-100 bg-white hover:border-transparent hover:shadow-sm text-gray-700 hover:-translate-y-0.5'
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
                        <p className="text-xs font-medium text-gray-500 mb-3">
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
                                                : 'border-gray-100 bg-white hover:shadow-sm text-gray-700 hover:-translate-y-0.5 hover:border-transparent'
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
                <div className="mt-6 text-center py-6 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                    <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Seleccioná un día para ver los horarios disponibles</p>
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
                <p className="text-sm text-gray-400">Cargando profesionales...</p>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">
                ¿Con quién querés atenderte?
            </h2>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => onSelect('sin-preferencia')}
                    className={cn(
                        'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm cursor-pointer',
                        selected === 'sin-preferencia'
                            ? 'shadow-md'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                    )}
                    style={selected === 'sin-preferencia' ? { borderColor: 'var(--landing-primary, #0d9488)', backgroundColor: 'transparent' } : {}}
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">Sin preferencia</p>
                            <p className="text-xs text-gray-400">El primer profesional disponible</p>
                        </div>
                        {selected === 'sin-preferencia' && (
                            <div className="ml-auto h-5 w-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--landing-primary, #0d9488)' }}>
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
                                    ? 'shadow-md'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                            )}
                            style={isSelected ? { borderColor: 'var(--landing-primary, #0d9488)', backgroundColor: 'transparent' } : {}}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                                    style={{ backgroundColor: p.color || '#0d9488' }}
                                >
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm">
                                        Dr/a. {p.nombre} {p.apellido}
                                    </p>
                                    <p className="text-xs text-gray-400">{p.especialidad}</p>
                                </div>
                                {isSelected && (
                                    <div className="h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: 'var(--landing-primary, #0d9488)' }}>
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
                        className="absolute z-50 mt-1.5 w-full rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/8 overflow-hidden"
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
}

function StepPatientData({
    datos,
    onChange,
}: {
    datos: PatientFormData
    onChange: (key: keyof PatientFormData, val: string) => void
}) {
    const inputClass =
        'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:shadow-sm'
    // For inputs, we add focus styles dynamically using regular style (onFocus would be needed for true dynamic focus, 
    // but we can use CSS variables in globals.css or just keep it simple). 
    // Wait, global CSS var --landing-primary is already defined, so we can just use tailwind arbitrary values correctly if we want, 
    // but to avoid string interpolation issues with arbitrary variants, we'll use a style prop on the div wrapper or just leave the border as neutral focus for now.
    // Actually, adding a style block to inject focus styles dynamically:
    const focusStyle = { '--tw-ring-color': 'var(--landing-primary, #0d9488)40', '--tw-ring-shadow': 'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)' } as React.CSSProperties

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Tus datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={focusStyle}>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre *</label>
                    <input type="text" className={`${inputClass} focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} placeholder="Tu nombre" value={datos.nombre} onChange={(e) => onChange('nombre', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Apellido *</label>
                    <input type="text" className={`${inputClass} focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} placeholder="Tu apellido" value={datos.apellido} onChange={(e) => onChange('apellido', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono *</label>
                    <input type="tel" className={`${inputClass} focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} placeholder="11 4567-8901" value={datos.telefono} onChange={(e) => onChange('telefono', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input type="email" className={`${inputClass} focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} placeholder="correo@ejemplo.com" value={datos.email} onChange={(e) => onChange('email', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">¿Es paciente nuevo?</label>
                    <PremiumSelect
                        value={datos.es_nuevo}
                        options={[
                            { value: 'si', label: 'Sí, es mi primera vez' },
                            { value: 'no', label: 'No, ya me atendí aquí' },
                        ]}
                        onChange={(val) => onChange('es_nuevo', val)}
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Motivo (opcional)</label>
                    <textarea className={`${inputClass} resize-none focus:ring-2`} style={{ outlineColor: 'var(--landing-primary, #0d9488)' }} rows={3} placeholder="Contanos brevemente el motivo de tu consulta..." value={datos.notas} onChange={(e) => onChange('notas', e.target.value)} />
                </div>
            </div>
        </div>
    )
}

// ── Success ──────────────────────────────────────────────────────

function StepSuccess() {
    return (
        <div className="text-center py-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--landing-primary, #0d9488)1a' }}>
                <CheckCircle2 className="h-9 w-9" style={{ color: 'var(--landing-primary, #0d9488)' }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Turno reservado!</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                Tu turno ha sido registrado exitosamente. Nos comunicaremos a la brevedad para confirmar.
            </p>
            <p className="mt-4 text-sm text-gray-400">
                También podés comunicarte al{' '}
                <a href={`tel:${CLINIC.phone}`} className="font-medium underline" style={{ color: 'var(--landing-primary, #0d9488)' }}>
                    {CLINIC.phone}
                </a>
            </p>
        </div>
    )
}

// ── Main BookingForm ─────────────────────────────────────────────

export function BookingForm() {
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
    })

    // Real data from Supabase
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([])
    const [loadingDays, setLoadingDays] = useState(true)
    const [loadingProfs, setLoadingProfs] = useState(true)

    useEffect(() => {
        async function loadData() {
            try {
                const [profs, days] = await Promise.all([
                    getProfesionalesPublicos('alvarez'),
                    getTurnosDisponibles('alvarez'),
                ])
                setProfessionals(profs as Professional[])
                setAvailableDays(days)
            } catch (err) {
                console.error('Error loading booking data:', err)
            } finally {
                setLoadingDays(false)
                setLoadingProfs(false)
            }
        }
        loadData()
    }, [])

    // Reusable refresh for availability (called after booking)
    async function refreshAvailability() {
        const days = await getTurnosDisponibles('alvarez')
        setAvailableDays(days)
    }

    const canNext = [
        selectedDate !== null && selectedTime !== null && selectedTime !== '',
        professionalId !== null,
        datos.nombre.trim() !== '' && datos.apellido.trim() !== '' && datos.telefono.trim() !== '',
    ]

    async function handleNext() {
        if (step < 2) {
            // When going from Step 0 → Step 1, reload professionals for selected slot
            if (step === 0 && selectedDate && selectedTime) {
                setLoadingProfs(true)
                setProfessionalId(null)
                try {
                    const profs = await getProfesionalesPublicos('alvarez', selectedDate, selectedTime)
                    setProfessionals(profs as Professional[])
                } catch (err) {
                    console.error('Error loading available professionals:', err)
                } finally {
                    setLoadingProfs(false)
                }
            }
            setDirection(1)
            setStep((s) => s + 1)
        } else {
            setSubmitting(true)
            try {
                const result = await crearReservaPublica({
                    tenantSlug: 'alvarez',
                    fecha: selectedDate!,
                    hora: selectedTime!,
                    profesionalId: professionalId,
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    telefono: datos.telefono,
                    email: datos.email,
                    es_nuevo: datos.es_nuevo,
                    notas: datos.notas,
                })
                if (result.error) {
                    alert(`Error: ${result.error}`)
                } else {
                    // Refresh availability so booked slot disappears
                    await refreshAvailability()
                    setSent(true)
                }
            } catch (err) {
                alert('Error al enviar la reserva. Intentá nuevamente.')
                console.error(err)
            } finally {
                setSubmitting(false)
            }
        }
    }

    if (sent) {
        return (
            <div className="p-8">
                <StepSuccess />
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
                            <StepDate
                                selectedDate={selectedDate}
                                selectedTime={selectedTime}
                                onSelectDate={setSelectedDate}
                                onSelectTime={setSelectedTime}
                                availableDays={availableDays}
                                loading={loadingDays}
                            />
                        )}
                        {step === 1 && (
                            <StepProfessional
                                selected={professionalId}
                                onSelect={setProfessionalId}
                                professionals={professionals}
                                loading={loadingProfs}
                            />
                        )}
                        {step === 2 && (
                            <StepPatientData
                                datos={datos}
                                onChange={(key, val) => setDatos((prev) => ({ ...prev, [key]: val }))}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => {
                        setDirection(-1)
                        setStep((s) => s - 1)
                    }}
                    disabled={step === 0}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-0 cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </button>
                <StaggerButton
                    onClick={handleNext}
                    disabled={!canNext[step] || submitting}
                    text={step === 2 ? (submitting ? 'Enviando...' : 'Confirmar turno') : 'Continuar'}
                    direction="up"
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer h-auto border-0"
                    style={{ backgroundColor: 'var(--landing-primary, #0d9488)' }}
                >
                    {step === 2 ? (submitting ? 'Enviando...' : 'Confirmar turno') : 'Continuar'}
                </StaggerButton>
            </div>
        </div>
    )
}

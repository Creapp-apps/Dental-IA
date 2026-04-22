'use client'

import { useState, useMemo } from 'react'
import type { Tenant, Profesional, TipoTratamiento } from '@/types'
import { Check, ChevronRight, ChevronLeft, Calendar, CalendarDays, User, Stethoscope, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    tenant: Tenant
    profesionales: Profesional[]
    tratamientos: TipoTratamiento[]
}

// ── Helpers: generar días mock disponibles ─────────────────────
function generateMockDays(count: number) {
    const days: { date: Date; slots: string[] }[] = []
    const now = new Date()
    for (let i = 1; i <= count; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        // Skip sundays
        if (d.getDay() === 0) continue
        // Mock: generate random slots
        const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']
        // Saturdays only morning
        const available = d.getDay() === 6
            ? allSlots.filter(s => parseInt(s) < 13)
            : allSlots
        // Remove some randomly (seed by date to be stable)
        const filtered = available.filter((_, idx) => (d.getDate() + idx) % 3 !== 0)
        if (filtered.length > 0) days.push({ date: d, slots: filtered })
    }
    return days
}

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Paso 0: Selección de fecha y hora ──────────────────────────
function PasoFecha({
    selectedDate,
    selectedTime,
    onSelectDate,
    onSelectTime,
    colorPrimario,
}: {
    selectedDate: string | null
    selectedTime: string | null
    onSelectDate: (dateStr: string) => void
    onSelectTime: (time: string) => void
    colorPrimario: string
}) {
    const mockDays = useMemo(() => generateMockDays(21), [])
    const selectedDay = mockDays.find(d => d.date.toISOString().split('T')[0] === selectedDate)

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Seleccioná un día disponible</h2>
            <p className="text-xs text-gray-400 mb-5">Elegí el día y horario que más te convenga.</p>

            {/* Date selector - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-thin">
                {mockDays.map(({ date, slots }) => {
                    const dateStr = date.toISOString().split('T')[0]
                    const isSelected = selectedDate === dateStr
                    return (
                        <button
                            key={dateStr}
                            onClick={() => {
                                onSelectDate(dateStr)
                                onSelectTime('') // reset time when date changes
                            }}
                            className={cn(
                                'flex flex-col items-center min-w-[4.2rem] rounded-xl border-2 px-3 py-2.5 transition-all shrink-0',
                                isSelected
                                    ? 'border-transparent shadow-md text-white'
                                    : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700',
                            )}
                            style={isSelected ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                        >
                            <span className={cn('text-[10px] font-medium uppercase', isSelected ? 'text-white/80' : 'text-gray-400')}>
                                {DAY_NAMES_SHORT[date.getDay()]}
                            </span>
                            <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
                            <span className={cn('text-[10px]', isSelected ? 'text-white/70' : 'text-gray-400')}>
                                {MONTH_NAMES[date.getMonth()].slice(0, 3)}
                            </span>
                            <span className={cn(
                                'mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-400'
                            )}>
                                {slots.length} turnos
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Time slots */}
            {selectedDay && (
                <div className="mt-5">
                    <p className="text-xs font-medium text-gray-500 mb-3">
                        Horarios disponibles — {DAY_NAMES_SHORT[selectedDay.date.getDay()]}{' '}
                        {selectedDay.date.getDate()} de {MONTH_NAMES[selectedDay.date.getMonth()]}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {selectedDay.slots.map((slot) => {
                            const isSelected = selectedTime === slot
                            const isMorning = parseInt(slot) < 13
                            return (
                                <button
                                    key={slot}
                                    onClick={() => onSelectTime(slot)}
                                    className={cn(
                                        'rounded-lg border-2 py-2.5 text-sm font-medium transition-all',
                                        isSelected
                                            ? 'border-transparent text-white shadow-md'
                                            : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700',
                                    )}
                                    style={isSelected ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                                >
                                    <span className="flex items-center justify-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        {slot}
                                    </span>
                                    <span className={cn(
                                        'text-[10px] block mt-0.5',
                                        isSelected ? 'text-white/70' : 'text-gray-400'
                                    )}>
                                        {isMorning ? 'Mañana' : 'Tarde'}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {!selectedDate && (
                <div className="mt-6 text-center py-6 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                    <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Seleccioná un día para ver los horarios disponibles</p>
                </div>
            )}
        </div>
    )
}

// ── Paso 1: Selección de servicio ──────────────────────────────
function PasoServicio({
    tratamientos,
    selected,
    onSelect,
    colorPrimario,
}: {
    tratamientos: TipoTratamiento[]
    selected: string | null
    onSelect: (id: string) => void
    colorPrimario: string
}) {
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">¿Qué servicio necesitás?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tratamientos.map(t => {
                    const isSelected = selected === t.id
                    return (
                        <button
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            className={cn(
                                'relative text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm',
                                isSelected
                                    ? 'border-transparent shadow-md'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                            )}
                            style={isSelected ? { borderColor: colorPrimario, backgroundColor: `${colorPrimario}08` } : {}}
                        >
                            {isSelected && (
                                <div
                                    className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: colorPrimario }}
                                >
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                </div>
                            )}
                            <div
                                className="h-2.5 w-2.5 rounded-full mb-2"
                                style={{ backgroundColor: t.color }}
                            />
                            <p className="font-semibold text-gray-900 text-sm">{t.nombre}</p>
                            {t.descripcion && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.descripcion}</p>
                            )}
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {t.duracion_minutos} min
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Paso 2: Selección de profesional ──────────────────────────
function PasoProfesional({
    profesionales,
    selected,
    onSelect,
    colorPrimario,
}: {
    profesionales: Profesional[]
    selected: string | null
    onSelect: (id: string) => void
    colorPrimario: string
}) {
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">¿Con quién querés atenderte?</h2>
            <div className="flex flex-col gap-3">
                {/* Opción "Sin preferencia" */}
                <button
                    onClick={() => onSelect('sin-preferencia')}
                    className={cn(
                        'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm',
                        selected === 'sin-preferencia'
                            ? 'border-transparent shadow-md'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                    )}
                    style={selected === 'sin-preferencia' ? { borderColor: colorPrimario, backgroundColor: `${colorPrimario}08` } : {}}
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
                            <div
                                className="ml-auto h-5 w-5 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: colorPrimario }}
                            >
                                <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </button>

                {profesionales.map(p => {
                    const isSelected = selected === p.id
                    const initials = `${p.nombre[0]}${p.apellido[0]}`.toUpperCase()
                    return (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p.id)}
                            className={cn(
                                'text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm',
                                isSelected
                                    ? 'border-transparent shadow-md'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                            )}
                            style={isSelected ? { borderColor: colorPrimario, backgroundColor: `${colorPrimario}08` } : {}}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 relative overflow-hidden rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                                    style={{ backgroundColor: p.color_agenda }}
                                >
                                    {p.avatar_url ? (
                                        <img src={p.avatar_url} alt={`Dr/a. ${p.nombre}`} className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm">
                                        Dr/a. {p.nombre} {p.apellido}
                                    </p>
                                    {p.especialidad && (
                                        <p className="text-xs text-gray-400">{p.especialidad}</p>
                                    )}
                                </div>
                                {isSelected && (
                                    <div
                                        className="h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0"
                                        style={{ backgroundColor: colorPrimario }}
                                    >
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

// ── Paso 3: Datos del paciente ────────────────────────────────
function PasoDatos({
    datos,
    onChange,
    colorPrimario,
}: {
    datos: FormDatos
    onChange: (key: keyof FormDatos, val: string) => void
    colorPrimario: string
}) {
    const inputClass =
        'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:border-transparent'

    return (
        <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Tus datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre *</label>
                    <input
                        type="text"
                        className={inputClass}
                        style={{ '--tw-ring-color': colorPrimario } as React.CSSProperties}
                        placeholder="Tu nombre"
                        value={datos.nombre}
                        onChange={e => onChange('nombre', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Apellido *</label>
                    <input
                        type="text"
                        className={inputClass}
                        placeholder="Tu apellido"
                        value={datos.apellido}
                        onChange={e => onChange('apellido', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono *</label>
                    <input
                        type="tel"
                        className={inputClass}
                        placeholder="11 4567-8901"
                        value={datos.telefono}
                        onChange={e => onChange('telefono', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input
                        type="email"
                        className={inputClass}
                        placeholder="correo@ejemplo.com"
                        value={datos.email}
                        onChange={e => onChange('email', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">¿Es paciente nuevo?</label>
                    <select
                        className={inputClass}
                        value={datos.es_nuevo}
                        onChange={e => onChange('es_nuevo', e.target.value)}
                    >
                        <option value="si">Sí, es mi primera vez</option>
                        <option value="no">No, ya me atendí aquí</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Turno preferido</label>
                    <select
                        className={inputClass}
                        value={datos.preferencia_horaria}
                        onChange={e => onChange('preferencia_horaria', e.target.value)}
                    >
                        <option value="">Sin preferencia</option>
                        <option value="manana">Mañana (8–12h)</option>
                        <option value="mediodia">Mediodía (12–15h)</option>
                        <option value="tarde">Tarde (15–18h)</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Motivo o aclaración (opcional)</label>
                    <textarea
                        className={`${inputClass} resize-none`}
                        rows={3}
                        placeholder="Contanos brevemente el motivo de tu consulta..."
                        value={datos.notas}
                        onChange={e => onChange('notas', e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}

// ── Paso 4: Confirmación / Éxito ─────────────────────────────
function PasoExito({ tenant }: { tenant: Tenant }) {
    return (
        <div className="text-center py-8">
            <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: `${tenant.color_primario}15` }}
            >
                <CheckCircle2
                    className="h-9 w-9"
                    style={{ color: tenant.color_primario }}
                />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                Recibimos tu pedido de turno. Nos comunicaremos a la brevedad para confirmar el día y horario.
            </p>
            {tenant.telefono && (
                <p className="mt-4 text-sm text-gray-400">
                    También podés comunicarte al{' '}
                    <a
                        href={`tel:${tenant.telefono}`}
                        className="font-medium underline underline-offset-2"
                        style={{ color: tenant.color_primario }}
                    >
                        {tenant.telefono}
                    </a>
                </p>
            )}
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────

interface FormDatos {
    nombre: string
    apellido: string
    telefono: string
    email: string
    es_nuevo: string
    preferencia_horaria: string
    notas: string
}

const PASO_LABELS = ['Fecha', 'Profesional', 'Tus datos']
const PASO_ICONS = [CalendarDays, User, Calendar]

export function ReservarForm({ tenant, profesionales, tratamientos }: Props) {
    const [paso, setPaso] = useState(0)
    const [enviado, setEnviado] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [profesionalId, setProfesionalId] = useState<string | null>(null)
    const [datos, setDatos] = useState<FormDatos>({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        es_nuevo: 'si',
        preferencia_horaria: '',
        notas: '',
    })

    const canNext = [
        selectedDate !== null && selectedTime !== null && selectedTime !== '',
        profesionalId !== null,
        datos.nombre.trim() !== '' && datos.apellido.trim() !== '' && datos.telefono.trim() !== '',
    ]

    function handleNext() {
        if (paso < 2) setPaso(p => p + 1)
        else handleSubmit()
    }

    function handleSubmit() {
        // En prod: POST a API. Por ahora: mock
        console.log('Reserva:', { selectedDate, selectedTime, profesionalId, datos })
        setEnviado(true)
    }

    function handleDato(key: keyof FormDatos, val: string) {
        setDatos(prev => ({ ...prev, [key]: val }))
    }

    if (enviado) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <PasoExito tenant={tenant} />
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Progress steps */}
            <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-0">
                    {PASO_LABELS.map((label, i) => {
                        const Icon = PASO_ICONS[i]
                        const isCompleted = i < paso
                        const isCurrent = i === paso
                        return (
                            <div key={label} className="flex items-center flex-1 last:flex-none">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={cn(
                                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                            isCompleted
                                                ? 'text-white'
                                                : isCurrent
                                                    ? 'text-white'
                                                    : 'bg-gray-100 text-gray-400'
                                        )}
                                        style={isCompleted || isCurrent ? { backgroundColor: tenant.color_primario } : {}}
                                    >
                                        {isCompleted ? (
                                            <Check className="h-4 w-4" strokeWidth={3} />
                                        ) : (
                                            <Icon className="h-3.5 w-3.5" />
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
                                {i < PASO_LABELS.length - 1 && (
                                    <div
                                        className="flex-1 h-0.5 mx-3 transition-all"
                                        style={{
                                            backgroundColor: i < paso ? tenant.color_primario : '#e5e7eb',
                                        }}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Contenido del paso */}
            <div className="p-6 md:p-8">
                {paso === 0 && (
                    <PasoFecha
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        onSelectDate={setSelectedDate}
                        onSelectTime={setSelectedTime}
                        colorPrimario={tenant.color_primario}
                    />
                )}
                {paso === 1 && (
                    <PasoProfesional
                        profesionales={profesionales}
                        selected={profesionalId}
                        onSelect={setProfesionalId}
                        colorPrimario={tenant.color_primario}
                    />
                )}
                {paso === 2 && (
                    <PasoDatos
                        datos={datos}
                        onChange={handleDato}
                        colorPrimario={tenant.color_primario}
                    />
                )}
            </div>

            {/* Footer con botones */}
            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => setPaso(p => p - 1)}
                    disabled={paso === 0}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </button>

                <button
                    onClick={handleNext}
                    disabled={!canNext[paso]}
                    className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: tenant.color_primario }}
                >
                    {paso === 2 ? 'Enviar solicitud' : 'Continuar'}
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

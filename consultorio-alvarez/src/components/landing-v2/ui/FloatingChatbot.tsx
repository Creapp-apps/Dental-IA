'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageSquare,
    X,
    RotateCcw,
    ChevronRight,
    Calendar,
    Clock,
    User,
    Phone,
    CheckCircle2,
    Sparkles,
    ShieldCheck,
    Loader2,
    ArrowRight,
    Zap,
    HeartPulse,
    Smile,
    CalendarDays
} from 'lucide-react'
import { crearReservaPublica, getTurnosDisponibles } from '@/lib/actions/reservas'
import { format, addDays, parseISO, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

interface FloatingChatbotProps {
    slug: string
    colorPrimary?: string
    professionals?: any[]
    obrasSociales?: any[]
}

type Step = 'profesional' | 'fecha' | 'hora' | 'datos' | 'confirmando' | 'exito'

interface BookingData {
    motivo: string
    profesionalId: string | null
    profesionalNombre: string
    fecha: string
    fechaFormatted: string
    hora: string
    nombre: string
    apellido: string
    telefono: string
    obraSocialId: string | null
    obraSocialNombre: string
    esNuevo: string
}

export function FloatingChatbot({
    slug,
    colorPrimary = '#2563eb',
    professionals = [],
    obrasSociales = []
}: FloatingChatbotProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<Step>('profesional')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [availableDays, setAvailableDays] = useState<any[]>([])
    const [selectedDaySlots, setSelectedDaySlots] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const [booking, setBooking] = useState<BookingData>({
        motivo: 'Consulta Odontológica General',
        profesionalId: null,
        profesionalNombre: 'Cualquier profesional disponible',
        fecha: '',
        fechaFormatted: '',
        hora: '',
        nombre: '',
        apellido: '',
        telefono: '',
        obraSocialId: null,
        obraSocialNombre: 'Particular',
        esNuevo: 'si'
    })

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [isOpen, step, loadingSlots])

    // Cargar turnos disponibles al llegar al paso de fecha
    const loadDays = async (profId: string | null) => {
        setLoadingSlots(true)
        setErrorMsg('')
        try {
            const days = await getTurnosDisponibles(slug, profId)
            const validDays = (days || []).filter((d: any) => d.slots && d.slots.length > 0)
            setAvailableDays(validDays)
            if (validDays.length === 0) {
                setErrorMsg('No hay turnos inmediatos en la web. Por favor comunicate por WhatsApp.')
            }
        } catch (e) {
            console.error('Error cargando turnos disponibles:', e)
            setErrorMsg('No se pudieron obtener los turnos en este momento.')
        } finally {
            setLoadingSlots(false)
        }
    }

    const resetChat = () => {
        setStep('profesional')
        setErrorMsg('')
        setBooking({
            motivo: 'Consulta Odontológica General',
            profesionalId: null,
            profesionalNombre: 'Cualquier profesional disponible',
            fecha: '',
            fechaFormatted: '',
            hora: '',
            nombre: '',
            apellido: '',
            telefono: '',
            obraSocialId: null,
            obraSocialNombre: 'Particular',
            esNuevo: 'si'
        })
    }

    const handleSelectProfesional = async (profId: string | null, profName: string) => {
        setBooking(prev => ({
            ...prev,
            profesionalId: profId,
            profesionalNombre: profName
        }))
        setStep('fecha')
        await loadDays(profId)
    }

    const handleSelectFecha = (dateStr: string, slots: string[]) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        let formatted = format(dateObj, "EEEE d 'de' MMMM", { locale: es })
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)

        setBooking(prev => ({
            ...prev,
            fecha: dateStr,
            fechaFormatted: formatted
        }))
        setSelectedDaySlots(slots)
        setStep('hora')
    }

    const handleSelectHora = (slot: string) => {
        setBooking(prev => ({ ...prev, hora: slot }))
        setStep('datos')
    }

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!booking.nombre.trim() || !booking.apellido.trim() || !booking.telefono.trim()) {
            setErrorMsg('Por favor completá tu nombre, apellido y teléfono.')
            return
        }

        setSubmitting(true)
        setErrorMsg('')

        try {
            const res = await crearReservaPublica({
                tenantSlug: slug,
                fecha: booking.fecha,
                hora: booking.hora,
                profesionalId: booking.profesionalId,
                nombre: booking.nombre.trim(),
                apellido: booking.apellido.trim(),
                telefono: booking.telefono.trim(),
                es_nuevo: booking.esNuevo,
                notas: `Agendado por CinthIA. Motivo: ${booking.motivo}`,
                obraSocialId: booking.obraSocialId,
            })

            if (res.error) {
                setErrorMsg(res.error)
                setSubmitting(false)
            } else {
                setStep('exito')
                setSubmitting(false)
            }
        } catch (err: any) {
            console.error('Error al confirmar reserva:', err)
            setErrorMsg('Ocurrió un error al agendar tu turno. Por favor intenta de nuevo.')
            setSubmitting(false)
        }
    }

    return (
        <>
            {/* ── BOTÓN FLOTANTE PILL (Puro, Claro y Profesional) ─────────── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="group flex items-center gap-3.5 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white pl-2.5 pr-4 py-2 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.38)] hover:shadow-[0_15px_35px_rgba(37,99,235,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 border border-blue-400/40 cursor-pointer"
                        >
                            {/* Avatar Asistente */}
                            <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/40">
                                    👩‍⚕️
                                </div>
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-blue-600 animate-pulse" />
                            </div>

                            {/* Textos */}
                            <div className="text-left">
                                <p className="text-[11px] font-extrabold tracking-wider uppercase leading-tight text-blue-100 flex items-center gap-1">
                                    <span>Cinth</span><span className="text-cyan-200 underline decoration-cyan-300 font-black">IA</span>
                                    <span className="text-[9px] font-normal opacity-80 lowercase">(recepción)</span>
                                </p>
                                <p className="text-sm font-bold text-white leading-tight flex items-center gap-1">
                                    <span>Agendar turno en 1 min</span>
                                    <span className="text-cyan-200">⚡</span>
                                </p>
                            </div>

                            {/* Chat Icon */}
                            <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-white/90 group-hover:bg-white/25 transition-colors">
                                <MessageSquare className="h-4 w-4" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── MODAL CHATBOT FLOTANTE (Claro, Puro y Profesional) ──────── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[600px] max-h-[88vh] bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] flex flex-col overflow-hidden font-sans"
                    >
                        {/* Header Asistente (Azul Dental Corporativo) */}
                        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30 shadow-inner">
                                        👩‍⚕️
                                    </div>
                                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-blue-700" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base text-white tracking-tight">
                                            Cinth<span className="text-cyan-300 font-extrabold">IA</span>
                                        </h3>
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-cyan-100 border border-white/25">
                                            Recepción IA
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-100/80 flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                        Consultorio Álvarez
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={resetChat}
                                    title="Reiniciar conversación"
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    title="Cerrar asistente"
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mensajes y Opciones (Body Claro y Pulcro) */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
                            
                            {/* Mensaje de Bienvenida CinthIA */}
                            <div className="flex items-start gap-2.5 max-w-[92%]">
                                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs shrink-0 mt-1">
                                    👩‍⚕️
                                </div>
                                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 text-sm text-slate-700 leading-relaxed shadow-sm">
                                    ¡Hola! 👋 Soy <strong>CinthIA</strong>, recepcionista virtual de Consultorio Álvarez.
                                    <br />
                                    Te ayudaré a agendar tu <strong>Consulta Odontológica</strong> en 1 minuto.
                                    <br /><br />
                                    ¿Con qué profesional te gustaría atenderte?
                                </div>
                            </div>

                            {/* ── PASO 1: PROFESIONAL ──────────────────────────────── */}
                            {step === 'profesional' && (
                                <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {/* Opción rápida: Primer turno */}
                                        <button
                                            type="button"
                                            onClick={() => handleSelectProfesional(null, 'Cualquier profesional disponible')}
                                            className="w-full text-left p-3.5 rounded-2xl bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200/80 hover:border-blue-400 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] shadow-xs"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                                                    ⚡
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-blue-900">
                                                        Primer turno disponible
                                                    </p>
                                                    <p className="text-xs text-blue-600/80 font-medium">Atención más rápida</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        {/* Lista de Profesionales */}
                                        {professionals.map((prof: any) => (
                                            <button
                                                key={prof.id}
                                                type="button"
                                                onClick={() => handleSelectProfesional(prof.id, `Dr. ${prof.nombre} ${prof.apellido}`)}
                                                className="w-full text-left p-3 rounded-2xl bg-white hover:bg-blue-50/70 border border-slate-200/90 hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] shadow-xs"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                                                        style={{ backgroundColor: prof.color_agenda || '#2563eb' }}
                                                    >
                                                        {prof.nombre.charAt(0)}{prof.apellido.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                                                            Dr. {prof.nombre} {prof.apellido}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{prof.especialidad || 'Odontólogo General'}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </button>
                                        ))}
                                </div>
                            )}

                            {/* ── RESPUESTA PROFESIONAL SELECCIONADO ────────────────── */}
                            {step !== 'profesional' && (
                                <div className="flex justify-end">
                                    <div className="p-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white font-medium text-sm shadow-sm">
                                        👨‍⚕️ {booking.profesionalNombre}
                                    </div>
                                </div>
                            )}

                            {/* ── PASO 2: FECHA / DÍA ──────────────────────────────── */}
                            {step === 'fecha' && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-start gap-2.5 max-w-[92%]">
                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs shrink-0 mt-1">
                                            👩‍⚕️
                                        </div>
                                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 text-sm text-slate-700 shadow-sm">
                                            ¿Qué día te queda más cómodo para tu visita?
                                        </div>
                                    </div>

                                    {loadingSlots ? (
                                        <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                                            <p className="text-xs text-slate-500">Buscando días y horarios disponibles...</p>
                                        </div>
                                    ) : availableDays.length > 0 ? (
                                        <div className="space-y-2 pt-1">
                                            {availableDays.slice(0, 5).map((d: any) => {
                                                const [year, month, day] = d.date.split('-').map(Number)
                                                const dateObj = new Date(year, month - 1, day)
                                                const isTod = isToday(dateObj)
                                                const isTom = isTomorrow(dateObj)
                                                const dayName = isTod ? 'Hoy' : isTom ? 'Mañana' : format(dateObj, 'EEEE d', { locale: es })
                                                const monthName = format(dateObj, 'MMMM', { locale: es })

                                                return (
                                                    <button
                                                        key={d.date}
                                                        type="button"
                                                        onClick={() => handleSelectFecha(d.date, d.slots)}
                                                        className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] shadow-xs"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/80 flex flex-col items-center justify-center text-blue-700 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                                <span className="text-[10px] font-bold uppercase leading-none">{d.dayName}</span>
                                                                <span className="text-sm font-black leading-none mt-0.5">{d.dayNum}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800 capitalize group-hover:text-blue-700 transition-colors">
                                                                    {dayName} ({monthName})
                                                                </p>
                                                                <p className="text-xs text-emerald-600 font-semibold">
                                                                    {d.slots.length} horario{d.slots.length !== 1 ? 's' : ''} disponible{d.slots.length !== 1 ? 's' : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                            {errorMsg || 'No hay turnos disponibles para esta opción. Intentá seleccionando otro profesional o comunicate por WhatsApp.'}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── RESPUESTA FECHA SELECCIONADA ───────────────────────── */}
                            {step !== 'profesional' && step !== 'fecha' && (
                                <div className="flex justify-end">
                                    <div className="p-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white font-medium text-sm shadow-sm">
                                        📅 {booking.fechaFormatted}
                                    </div>
                                </div>
                            )}

                            {/* ── PASO 3: HORARIO ──────────────────────────────────── */}
                            {step === 'hora' && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-start gap-2.5 max-w-[92%]">
                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs shrink-0 mt-1">
                                            👩‍⚕️
                                        </div>
                                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 text-sm text-slate-700 shadow-sm">
                                            Elegí el horario que prefieras para el <strong>{booking.fechaFormatted}</strong>:
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        {selectedDaySlots.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => handleSelectHora(slot)}
                                                className="py-3 px-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 transition-all font-mono font-bold text-sm text-slate-800 text-center cursor-pointer active:scale-95 shadow-xs"
                                            >
                                                {slot} hs
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── RESPUESTA HORA SELECCIONADA ───────────────────────── */}
                            {step !== 'profesional' && step !== 'fecha' && step !== 'hora' && (
                                <div className="flex justify-end">
                                    <div className="p-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white font-medium text-sm shadow-sm">
                                        ⏰ {booking.hora} hs
                                    </div>
                                </div>
                            )}

                            {/* ── PASO 5: DATOS DEL PACIENTE ────────────────────────── */}
                            {step === 'datos' && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-start gap-2.5 max-w-[92%]">
                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs shrink-0 mt-1">
                                            👩‍⚕️
                                        </div>
                                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200/90 text-sm text-slate-700 shadow-sm">
                                            ¡Genial! Ya casi reservamos tu lugar. Ingresá tus datos para enviarte la confirmación a tu WhatsApp:
                                        </div>
                                    </div>

                                    <form onSubmit={handleConfirmBooking} className="space-y-3 pt-1">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Ej. Juan"
                                                    value={booking.nombre}
                                                    onChange={(e) => setBooking(prev => ({ ...prev, nombre: e.target.value }))}
                                                    className="w-full h-10 rounded-xl bg-white border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Apellido *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Ej. Pérez"
                                                    value={booking.apellido}
                                                    onChange={(e) => setBooking(prev => ({ ...prev, apellido: e.target.value }))}
                                                    className="w-full h-10 rounded-xl bg-white border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Celular / WhatsApp *</label>
                                            <input
                                                required
                                                type="tel"
                                                placeholder="Ej. 11 3017 4859"
                                                value={booking.telefono}
                                                onChange={(e) => setBooking(prev => ({ ...prev, telefono: e.target.value }))}
                                                className="w-full h-10 rounded-xl bg-white border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Te enviaremos el recordatorio y confirmación aquí.</p>
                                        </div>

                                        {obrasSociales && obrasSociales.length > 0 && (
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Obra Social / Prepaga</label>
                                                <select
                                                    value={booking.obraSocialId || ''}
                                                    onChange={(e) => setBooking(prev => ({ ...prev, obraSocialId: e.target.value || null }))}
                                                    className="w-full h-10 rounded-xl bg-white border border-slate-300 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
                                                >
                                                    <option value="">Particular / Sin Obra Social</option>
                                                    {obrasSociales.map((os: any) => (
                                                        <option key={os.id} value={os.id}>{os.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {errorMsg && (
                                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                                                {errorMsg}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Confirmando tu turno...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Confirmar Turno</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* ── PASO 6: ÉXITO / CONFIRMADO ────────────────────────── */}
                            {step === 'exito' && (
                                <div className="space-y-4 pt-2 text-center animate-in zoom-in-95 duration-300">
                                    <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto shadow-sm">
                                        ✓
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-extrabold text-slate-800">¡Turno Confirmado!</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            ¡Muchas gracias, <strong>{booking.nombre}</strong>!
                                        </p>
                                    </div>

                                    {/* Resumen del Turno */}
                                    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left space-y-2 text-xs shadow-xs">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Fecha y Hora:</span>
                                            <span className="font-bold text-blue-700">{booking.fechaFormatted} a las {booking.hora} hs</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-500">Profesional:</span>
                                            <span className="font-semibold text-slate-800">{booking.profesionalNombre}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Motivo:</span>
                                            <span className="font-semibold text-slate-800">{booking.motivo}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Te enviamos el recordatorio automático a tu WhatsApp.</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetChat}
                                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200"
                                        >
                                            Agendar otro
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

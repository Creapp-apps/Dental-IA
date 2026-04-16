'use client'

import { useState, useTransition, useMemo } from 'react'
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    addDays, subDays, addMonths, subMonths, isSameDay, parseISO, isToday,
    startOfMonth, endOfMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassButton } from '@/components/ui/glass-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { NuevoTurnoModal } from '@/components/agenda/NuevoTurnoModal'
import { cambiarEstadoTurno } from '@/lib/actions/turnos'
import { glassAlert } from '@/components/ui/glass-alert'
import {
    type EstadoTurno,
    ESTADO_TURNO_LABEL,
} from '@/types'
import { cn } from '@/lib/utils'

// ── Apple-style staggered spring animation ─────────────────────
const sectionVariants = {
    hidden: { opacity: 0, x: -40, filter: 'blur(6px)' },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
            delay: i * 0.08,
            type: 'spring' as const,
            stiffness: 260,
            damping: 24,
        },
    }),
}

type ViewMode = 'hoy' | 'semana' | '15dias' | 'mes'

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: '15dias', label: '15 días' },
    { key: 'mes', label: 'Mes' },
]

interface AgendaViewProps {
    profesionales: any[]
    tiposTratamiento: any[]
    turnosIniciales: any[]
    pacientes: any[]
}

export function AgendaView({
    profesionales,
    tiposTratamiento,
    turnosIniciales,
    pacientes,
}: AgendaViewProps) {
    const [vistaActiva, setVistaActiva] = useState<ViewMode>('semana')
    const [baseDate, setBaseDate] = useState(new Date())
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date())
    const [modalOpen, setModalOpen] = useState(false)
    const [modalProfId, setModalProfId] = useState<string>('')
    const [isPending, startTransition] = useTransition()

    // ── Compute visible days based on view mode ────────────────
    const diasVisibles = useMemo(() => {
        switch (vistaActiva) {
            case 'hoy':
                return [baseDate]
            case 'semana': {
                const inicio = startOfWeek(baseDate, { weekStartsOn: 1 })
                return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
            }
            case '15dias':
                return Array.from({ length: 15 }, (_, i) => addDays(baseDate, i))
            case 'mes': {
                const inicio = startOfMonth(baseDate)
                const fin = endOfMonth(baseDate)
                const count = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return Array.from({ length: count }, (_, i) => addDays(inicio, i))
            }
        }
    }, [vistaActiva, baseDate])

    // ── Navigation ─────────────────────────────────────────────
    function navAnterior() {
        switch (vistaActiva) {
            case 'hoy': setBaseDate(p => subDays(p, 1)); break
            case 'semana': setBaseDate(p => subWeeks(p, 1)); break
            case '15dias': setBaseDate(p => subDays(p, 15)); break
            case 'mes': setBaseDate(p => subMonths(p, 1)); break
        }
    }

    function navSiguiente() {
        switch (vistaActiva) {
            case 'hoy': setBaseDate(p => addDays(p, 1)); break
            case 'semana': setBaseDate(p => addWeeks(p, 1)); break
            case '15dias': setBaseDate(p => addDays(p, 15)); break
            case 'mes': setBaseDate(p => addMonths(p, 1)); break
        }
    }

    function irAHoy() {
        setBaseDate(new Date())
        setDiaSeleccionado(new Date())
    }

    // ── Range label ────────────────────────────────────────────
    function getRangeLabel() {
        if (diasVisibles.length === 0) return ''
        const first = diasVisibles[0]
        const last = diasVisibles[diasVisibles.length - 1]
        if (vistaActiva === 'hoy') return format(first, "EEEE d 'de' MMMM yyyy", { locale: es })
        if (vistaActiva === 'mes') return format(first, "MMMM yyyy", { locale: es })
        return `${format(first, 'd MMM', { locale: es })} — ${format(last, "d MMM yyyy", { locale: es })}`
    }

    function getTurnosDia(dia: Date, profId: string) {
        return turnosIniciales
            .filter((t: any) => t.profesional_id === profId && isSameDay(parseISO(t.fecha_inicio), dia))
            .sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    }

    function handleCambiarEstado(turnoId: string, nuevoEstado: EstadoTurno) {
        startTransition(async () => {
            const result = await cambiarEstadoTurno(turnoId, nuevoEstado)
            if (result.error) {
                glassAlert.error({ title: 'Error', description: result.error })
            } else {
                glassAlert.success({ title: `Estado → ${ESTADO_TURNO_LABEL[nuevoEstado]}` })
            }
        })
    }

    function abrirModalConProf(profId: string) {
        setModalProfId(profId)
        setModalOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* View mode selector + navigation */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View mode pills */}
                    <div className="flex items-center gap-0.5 glass rounded-xl p-0.5">
                        {VIEW_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => { setVistaActiva(opt.key); if (opt.key === 'hoy') { setBaseDate(new Date()); setDiaSeleccionado(new Date()) } }}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                                    vistaActiva === opt.key
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Navigation arrows */}
                    <div className="flex items-center gap-1.5 ml-1">
                        <GlassButton variant="glass" size="icon-sm" onClick={navAnterior}>
                            <ChevronLeft className="h-4 w-4" />
                        </GlassButton>
                        <GlassButton variant="glass" size="sm" onClick={irAHoy}>
                            Hoy
                        </GlassButton>
                        <GlassButton variant="glass" size="icon-sm" onClick={navSiguiente}>
                            <ChevronRight className="h-4 w-4" />
                        </GlassButton>
                    </div>

                    {/* Range label */}
                    <span className="text-sm font-medium text-foreground ml-1 capitalize">
                        {getRangeLabel()}
                    </span>
                </div>

                <GlassButton onClick={() => { setModalProfId(profesionales[0]?.id ?? ''); setModalOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo turno
                </GlassButton>
            </motion.div>

            {/* Selector de día (strip) — hidden in 'hoy' mode */}
            {vistaActiva !== 'hoy' && (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible"
                    className={cn(
                        'flex gap-1.5 overflow-x-auto scrollbar-hide pb-1',
                        vistaActiva === 'semana' && 'grid grid-cols-7'
                    )}
                >
                    {diasVisibles.map((dia) => {
                        const totalDia = turnosIniciales.filter((t: any) => isSameDay(parseISO(t.fecha_inicio), dia)).length
                        const esHoy = isToday(dia)
                        const isSelected = isSameDay(dia, diaSeleccionado)
                        return (
                            <motion.button
                                key={dia.toISOString()}
                                onClick={() => setDiaSeleccionado(dia)}
                                className={cn(
                                    'relative rounded-xl p-2.5 text-center transition-all cursor-pointer border shrink-0',
                                    vistaActiva !== 'semana' && 'min-w-[4.5rem]',
                                    isSelected
                                        ? 'bg-primary border-primary text-primary-foreground shadow-glass-lg'
                                        : esHoy
                                            ? 'glass border-primary/50 text-primary font-semibold'
                                            : 'glass-subtle border-transparent hover:border-white/20 text-muted-foreground hover:text-foreground'
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Dot indicator for days with turnos */}
                                {totalDia > 0 && (
                                    <span className={cn(
                                        'absolute top-1.5 right-1.5 flex h-2 w-2',
                                    )}>
                                        <span className={cn(
                                            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                                            isSelected ? 'bg-white/60' : 'bg-emerald-400'
                                        )} />
                                        <span className={cn(
                                            'relative inline-flex rounded-full h-2 w-2',
                                            isSelected ? 'bg-white' : 'bg-emerald-500'
                                        )} />
                                    </span>
                                )}
                                <p className={cn("text-xs uppercase tracking-wide", isSelected ? "opacity-90" : "opacity-70")}>
                                    {format(dia, 'EEE', { locale: es })}
                                </p>
                                <p className="text-xl font-bold leading-tight">{format(dia, 'd')}</p>
                                {totalDia > 0 && (
                                    <p className={cn(
                                        "text-[10px] mt-1 font-semibold rounded-full px-1.5 py-0.5 mx-auto w-fit",
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-primary/10 text-primary'
                                    )}>
                                        {totalDia} turno{totalDia > 1 ? 's' : ''}
                                    </p>
                                )}
                            </motion.button>
                        )
                    })}
                </motion.div>
            )}

            {/* Columnas por profesional */}
            <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="grid gap-5" style={{ gridTemplateColumns: `repeat(${profesionales.length}, 1fr)` }}>
                {profesionales.map((prof: any) => {
                    const turnosDia = getTurnosDia(diaSeleccionado, prof.id)
                    return (
                        <div key={prof.id}>
                            {/* Header profesional */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: prof.color_agenda }} />
                                <span className="text-sm font-semibold text-foreground">Dr. {prof.nombre} {prof.apellido}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{turnosDia.length} turnos</span>
                            </div>

                            {/* Turnos */}
                            <AnimatePresence mode="wait">
                                {turnosDia.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="glass rounded-xl border border-dashed border-border p-6 text-center"
                                    >
                                        <p className="text-xs text-muted-foreground mb-2">Sin turnos este día</p>
                                        <GlassButton variant="ghost" size="sm" onClick={() => abrirModalConProf(prof.id)}>
                                            + Agregar turno
                                        </GlassButton>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-2.5"
                                    >
                                        {turnosDia.map((turno: any, i: number) => (
                                            <TurnoAgendaCard
                                                key={turno.id}
                                                turno={turno}
                                                colorProf={prof.color_agenda}
                                                index={i}
                                                onCambiarEstado={handleCambiarEstado}
                                                isPending={isPending}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </motion.div>

            {/* Modal nuevo turno */}
            <NuevoTurnoModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                profesionales={profesionales}
                tiposTratamiento={tiposTratamiento}
                pacientes={pacientes}
                defaultProfesionalId={modalProfId}
                defaultFecha={format(diaSeleccionado, 'yyyy-MM-dd')}
            />
        </div>
    )
}

/* ──────────── TurnoAgendaCard ──────────── */

function TurnoAgendaCard({
    turno,
    colorProf,
    index,
    onCambiarEstado,
    isPending,
}: {
    turno: any
    colorProf: string
    index: number
    onCambiarEstado: (id: string, estado: EstadoTurno) => void
    isPending: boolean
}) {
    const estado = turno.estado as EstadoTurno
    const isST = turno.es_sobreturno === true

    return (
        <motion.div
            className={cn(
                'glass rounded-xl shadow-glass hover:shadow-glass-lg transition-shadow',
                isST ? 'p-2.5' : 'p-3.5'
            )}
            style={{ borderLeft: `3px solid ${isST ? '#f59e0b' : (turno.tipo_tratamiento?.color ?? colorProf)}` }}
            initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {turno.paciente?.apellido}, {turno.paciente?.nombre}
                        </p>
                        {isST && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-md px-1.5 py-0.5">
                                ⚡ ST
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {turno.tipo_tratamiento?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(turno.fecha_inicio), 'HH:mm')} — {format(parseISO(turno.fecha_fin), 'HH:mm')}
                        {isST && <span className="text-amber-500 font-medium ml-1">(15 min)</span>}
                    </p>
                </div>
                <StatusBadge status={estado} />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {estado === 'PENDIENTE' && (
                    <GlassButton size="sm" variant="glass" className="h-6 text-xs px-2"
                        onClick={() => onCambiarEstado(turno.id, 'CONFIRMADO')} disabled={isPending}>
                        ✓ Confirmar
                    </GlassButton>
                )}
                {estado === 'CONFIRMADO' && (
                    <GlassButton size="sm" variant="glass" className="h-6 text-xs px-2 border-violet-300 dark:border-violet-700"
                        onClick={() => onCambiarEstado(turno.id, 'EN_SALA')} disabled={isPending}>
                        🔔 En sala
                    </GlassButton>
                )}
                {estado === 'EN_SALA' && (
                    <GlassButton size="sm" variant="success" className="h-6 text-xs px-2"
                        onClick={() => onCambiarEstado(turno.id, 'ATENDIDO')} disabled={isPending}>
                        ✓ Atendido
                    </GlassButton>
                )}
                {!['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(estado) && (
                    <GlassButton size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive"
                        onClick={() => onCambiarEstado(turno.id, 'CANCELADO')} disabled={isPending}>
                        Cancelar
                    </GlassButton>
                )}
            </div>
        </motion.div>
    )
}

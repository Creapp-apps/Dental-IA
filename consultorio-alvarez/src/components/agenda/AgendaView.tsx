'use client'

import { useState, useTransition } from 'react'
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    addDays, isSameDay, parseISO, isToday,
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
    const [semanaBase, setSemanaBase] = useState(new Date())
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date())
    const [modalOpen, setModalOpen] = useState(false)
    const [modalProfId, setModalProfId] = useState<string>('')
    const [isPending, startTransition] = useTransition()

    const inicio = startOfWeek(semanaBase, { weekStartsOn: 1 })
    const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicio, i))

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
            {/* Controles de semana */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <GlassButton variant="glass" size="icon-sm" onClick={() => setSemanaBase(p => subWeeks(p, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </GlassButton>
                    <GlassButton variant="glass" size="sm" onClick={() => { setSemanaBase(new Date()); setDiaSeleccionado(new Date()) }}>
                        Hoy
                    </GlassButton>
                    <GlassButton variant="glass" size="icon-sm" onClick={() => setSemanaBase(p => addWeeks(p, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </GlassButton>
                    <span className="text-sm font-medium text-foreground ml-2">
                        {format(inicio, "d MMM", { locale: es })} — {format(endOfWeek(semanaBase, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
                    </span>
                </div>
                <GlassButton onClick={() => { setModalProfId(profesionales[0]?.id ?? ''); setModalOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo turno
                </GlassButton>
            </motion.div>

            {/* Selector de día (week strip) */}
            <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="grid grid-cols-7 gap-1.5">
                {diasSemana.map((dia) => {
                    const totalDia = turnosIniciales.filter((t: any) => isSameDay(parseISO(t.fecha_inicio), dia)).length
                    const esHoy = isToday(dia)
                    const isSelected = isSameDay(dia, diaSeleccionado)
                    return (
                        <motion.button
                            key={dia.toISOString()}
                            onClick={() => setDiaSeleccionado(dia)}
                            className={cn(
                                'rounded-xl p-2.5 text-center transition-all cursor-pointer border',
                                isSelected && esHoy
                                    ? 'bg-primary border-primary text-primary-foreground shadow-glass-lg'
                                    : isSelected
                                        ? 'bg-primary border-primary text-primary-foreground shadow-glass-lg'
                                        : esHoy
                                            ? 'glass border-primary/50 text-primary font-semibold'
                                            : 'glass-subtle border-transparent hover:border-white/20 text-muted-foreground hover:text-foreground'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <p className={cn("text-xs uppercase tracking-wide", isSelected ? "opacity-90" : "opacity-70")}>
                                {format(dia, 'EEE', { locale: es })}
                            </p>
                            <p className="text-xl font-bold leading-tight">{format(dia, 'd')}</p>
                            {totalDia > 0 && (
                                <p className="text-xs mt-0.5 opacity-70">
                                    {totalDia} turno{totalDia > 1 ? 's' : ''}
                                </p>
                            )}
                        </motion.button>
                    )
                })}
            </motion.div>

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

    return (
        <motion.div
            className="glass rounded-xl p-3.5 shadow-glass hover:shadow-glass-lg transition-shadow"
            style={{ borderLeft: `3px solid ${turno.tipo_tratamiento?.color ?? colorProf}` }}
            initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {turno.paciente?.apellido}, {turno.paciente?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {turno.tipo_tratamiento?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(turno.fecha_inicio), 'HH:mm')} — {format(parseISO(turno.fecha_fin), 'HH:mm')}
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

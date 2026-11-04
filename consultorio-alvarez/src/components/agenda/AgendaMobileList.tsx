'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseISO, isToday, differenceInMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import { ESTADO_TURNO_LABEL, type EstadoTurno } from '@/types'

/**
 * Vista mobile de la agenda del día como lista vertical de tarjetas.
 * Reemplaza la grilla por columnas (ilegible en teléfono) por renglones
 * completos con nombre, hora, tratamiento, profesional y estado de un vistazo.
 * Ver docs/PLAN_agenda_mobile_rediseno.md y docs/spike-agenda-mobile.html.
 */

interface Turno {
    id: string
    fecha_inicio: string
    fecha_fin?: string | null
    estado?: EstadoTurno | string
    paciente?: { nombre?: string | null; apellido?: string | null } | null
    profesional?: { nombre?: string | null; color_agenda?: string | null } | null
    tipo_tratamiento?: { nombre?: string | null; color?: string | null } | null
}

interface AgendaMobileListProps {
    /** Turnos del día ya ordenados por hora y filtrados por profesional. */
    turnos: Turno[]
    diaSeleccionado: Date
    isLoading?: boolean
    onSelectTurno: (turno: Turno) => void
}

/** Estilos de pill por estado, pensados para fondo oscuro (el ESTADO_TURNO_COLOR de types es tema claro). */
const ESTADO_PILL: Record<EstadoTurno, string> = {
    CONFIRMADO: 'bg-emerald-500/15 text-emerald-300',
    PENDIENTE: 'bg-amber-500/15 text-amber-300',
    EN_SALA: 'bg-blue-500/20 text-blue-300',
    ATENDIDO: 'bg-slate-500/15 text-slate-300',
    AUSENTE: 'bg-red-500/15 text-red-300',
    CANCELADO: 'bg-red-500/15 text-red-300',
}

type Franja = 'Mañana' | 'Mediodía' | 'Tarde'

function franjaDe(fecha: Date): Franja {
    const h = fecha.getHours()
    if (h < 12) return 'Mañana'
    if (h < 14) return 'Mediodía'
    return 'Tarde'
}

function hhmm(fecha: Date): string {
    return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`
}

export function AgendaMobileList({ turnos, diaSeleccionado, isLoading, onSelectTurno }: AgendaMobileListProps) {
    const esHoy = isToday(diaSeleccionado)

    // "Ahora" en estado (no leer el reloj en render): se refresca cada minuto
    // para que la línea indicadora avance sola.
    const [now, setNow] = useState<Date>(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])

    const { confirmados, pendientes } = useMemo(() => {
        let confirmados = 0
        let pendientes = 0
        for (const t of turnos) {
            if (t.estado === 'CONFIRMADO') confirmados++
            else if (t.estado === 'PENDIENTE') pendientes++
        }
        return { confirmados, pendientes }
    }, [turnos])

    // Dónde cae "ahora" dentro de la lista: índice del primer turno con hora >= ahora.
    // -2 = no mostrar (otro día); -1 = todos los turnos ya pasaron.
    const nowIndex = useMemo(() => {
        if (!esHoy) return -2
        const ahora = now.getTime()
        return turnos.findIndex((t) => parseISO(t.fecha_inicio).getTime() >= ahora)
    }, [turnos, esHoy, now])

    const nowLabel = hhmm(now)

    // Precalcula inicio y encabezado de franja por turno (sin mutar en render).
    const items = useMemo(() => {
        return turnos.map((turno, i) => {
            const inicio = parseISO(turno.fecha_inicio)
            const franja = franjaDe(inicio)
            const prevFranja = i > 0 ? franjaDe(parseISO(turnos[i - 1].fecha_inicio)) : null
            const header = franja !== prevFranja ? franja : null
            return { turno, inicio, header }
        })
    }, [turnos])

    if (!isLoading && turnos.length === 0) {
        return (
            <div className="pb-24 select-none">
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <span className="text-4xl">🗓️</span>
                    <p className="text-sm font-semibold text-muted-foreground">No hay turnos para este día</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('pb-24 select-none transition-opacity', isLoading && 'opacity-60')}>
            {/* Resumen del día (centrado) */}
            <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1.5 pt-1 pb-3">
                <span className="text-[15px] font-extrabold text-foreground">
                    <span className="text-primary text-[17px]">{turnos.length}</span>{' '}
                    {turnos.length === 1 ? 'turno' : 'turnos'}
                </span>
                {confirmados > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{confirmados} confirmado{confirmados === 1 ? '' : 's'}
                    </span>
                )}
                {pendientes > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <i className="h-2.5 w-2.5 rounded-full bg-amber-500" />{pendientes} pendiente{pendientes === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            <div className="px-0.5">
                {/* Si "ahora" es antes del primer turno, la línea va arriba de todo */}
                {esHoy && nowIndex === 0 && <NowLine label={nowLabel} />}

                {items.map(({ turno, inicio, header }, idx) => {
                    const fin = turno.fecha_fin ? parseISO(turno.fecha_fin) : null
                    const dur = fin ? Math.max(0, differenceInMinutes(fin, inicio)) : null

                    const estado: EstadoTurno = (turno.estado || 'PENDIENTE') as EstadoTurno
                    const colorProf = turno.profesional?.color_agenda || '#3b82f6'
                    const colorTrat = turno.tipo_tratamiento?.color || colorProf
                    const nombrePaciente = turno.paciente
                        ? `${turno.paciente.apellido ?? ''}${turno.paciente.nombre ? `, ${turno.paciente.nombre}` : ''}`.trim() || 'Sin paciente'
                        : 'Sin paciente'
                    const cancelado = estado === 'CANCELADO'

                    return (
                        <div key={turno.id}>
                            {header && (
                                <div className="flex items-center gap-2.5 mt-2.5 mb-2">
                                    <span className="text-xs font-extrabold tracking-wide text-muted-foreground/80 uppercase">{header}</span>
                                    <span className="flex-1 h-px bg-border/50" />
                                </div>
                            )}

                            {/* Línea "Ahora" justo antes del primer turno futuro */}
                            {esHoy && nowIndex === idx && idx > 0 && <NowLine label={nowLabel} />}

                            <button
                                type="button"
                                onClick={() => onSelectTurno(turno)}
                                className={cn(
                                    'w-full flex text-left rounded-[15px] border border-border/60 bg-card/80 overflow-hidden mb-2.5 transition-colors active:bg-card',
                                    cancelado && 'opacity-60'
                                )}
                            >
                                {/* Acento color profesional */}
                                <span className="w-[5px] shrink-0" style={{ backgroundColor: colorProf }} />

                                {/* Columna hora */}
                                <span className="flex-none w-[60px] flex flex-col items-center justify-center py-2.5 px-1.5 bg-black/20 border-r border-border/40">
                                    <span className="text-[18px] font-extrabold leading-none tabular-nums">{hhmm(inicio)}</span>
                                    {dur !== null && <span className="text-[10px] font-bold text-muted-foreground mt-1">{dur} min</span>}
                                </span>

                                {/* Cuerpo */}
                                <span className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-2.5 px-3">
                                    {/* Fila 1: nombre + estado */}
                                    <span className="flex items-center gap-2">
                                        <span className={cn('flex-1 min-w-0 truncate text-[16px] font-extrabold leading-tight', cancelado && 'line-through')}>
                                            {nombrePaciente}
                                        </span>
                                        <span className={cn('flex-none inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full', ESTADO_PILL[estado])}>
                                            <i className={cn('h-1.5 w-1.5 rounded-full bg-current', estado === 'EN_SALA' && 'motion-safe:animate-pulse')} />
                                            {ESTADO_TURNO_LABEL[estado]}
                                        </span>
                                    </span>
                                    {/* Fila 2: profesional · tratamiento */}
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className="flex-none inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                            <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorProf }} />
                                            Dr. {turno.profesional?.nombre ?? '—'}
                                        </span>
                                        {turno.tipo_tratamiento?.nombre && (
                                            <>
                                                <i className="flex-none h-[3px] w-[3px] rounded-full bg-muted-foreground/60" />
                                                <span className="min-w-0 inline-flex items-center gap-1.5 text-xs font-bold text-foreground/90 truncate">
                                                    <i className="flex-none h-2 w-2 rounded-sm" style={{ backgroundColor: colorTrat }} />
                                                    <span className="truncate">{turno.tipo_tratamiento.nombre}</span>
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </span>
                            </button>
                        </div>
                    )
                })}

                {/* Si "ahora" es después del último turno, la línea va al final */}
                {esHoy && nowIndex === -1 && turnos.length > 0 && <NowLine label={nowLabel} />}
            </div>
        </div>
    )
}

function NowLine({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 my-2.5">
            <span className="text-[11px] font-extrabold text-red-400 bg-red-400/15 px-2 py-0.5 rounded-full">Ahora · {label}</span>
            <span className="flex-1 h-0.5 rounded-full bg-gradient-to-r from-red-400/80 to-transparent" />
        </div>
    )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseISO, isToday, differenceInMinutes, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ESTADO_TURNO_LABEL, type EstadoTurno } from '@/types'

/**
 * Vista mobile de la agenda como lista vertical de tarjetas.
 * Reemplaza la grilla por columnas (ilegible en teléfono) por renglones
 * completos con nombre, hora, tratamiento, profesional y estado de un vistazo.
 * Soporta un día (vista Día) o varios días agrupados (3 días / Semana), y
 * huecos "Libre" cuando hay un profesional seleccionado.
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

interface Horario {
    profesional_id: string
    dia: number
    activo?: boolean
    activo_manana?: boolean
    apertura_manana?: string | null
    cierre_manana?: string | null
    activo_tarde?: boolean
    apertura_tarde?: string | null
    cierre_tarde?: string | null
}

export interface DiaGrupo {
    date: Date
    turnos: Turno[]
    /** Profesional en contexto (si hay uno filtrado). Habilita los huecos "Libre". */
    profesionalId?: string
}

interface AgendaMobileListProps {
    /** Un grupo = un día. Vista Día: un solo grupo. 3 días / Semana: varios. */
    grupos: DiaGrupo[]
    isLoading?: boolean
    onSelectTurno: (turno: Turno) => void
    /** Mostrar encabezado por día (3 días / Semana). En vista Día va en false. */
    mostrarEncabezadoDia?: boolean
    horarios?: Horario[]
    /** Si se pasa, los huecos "Libre" muestran acción de alta (solo admin). */
    onAgendarLibre?: (profId: string, fecha: Date, hora: string) => void
}

/** Estilos de pill por estado para fondo oscuro (ESTADO_TURNO_COLOR de types es tema claro). */
const ESTADO_PILL: Record<EstadoTurno, string> = {
    CONFIRMADO: 'bg-emerald-500/15 text-emerald-300',
    PENDIENTE: 'bg-amber-500/15 text-amber-300',
    EN_SALA: 'bg-blue-500/20 text-blue-300',
    ATENDIDO: 'bg-slate-500/15 text-slate-300',
    AUSENTE: 'bg-red-500/15 text-red-300',
    CANCELADO: 'bg-red-500/15 text-red-300',
}

type Franja = 'Mañana' | 'Mediodía' | 'Tarde'
const MIN_HUECO = 15 // minutos mínimos para considerar un hueco "Libre"

function franjaDe(fecha: Date): Franja {
    const h = fecha.getHours()
    if (h < 12) return 'Mañana'
    if (h < 14) return 'Mediodía'
    return 'Tarde'
}

function hhmm(fecha: Date): string {
    return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`
}

function conHora(fecha: Date, hm: string): Date {
    const [h, m] = hm.split(':').map(Number)
    const d = new Date(fecha)
    d.setHours(h, m, 0, 0)
    return d
}

/** Calcula los huecos libres de un día dentro del horario del profesional. */
function calcularHuecos(fecha: Date, turnos: Turno[], horario?: Horario): { desde: Date; hasta: Date }[] {
    if (!horario || horario.activo === false) return []

    const ventanas: { ini: Date; fin: Date }[] = []
    if (horario.activo_manana !== false && horario.apertura_manana && horario.cierre_manana) {
        ventanas.push({ ini: conHora(fecha, horario.apertura_manana), fin: conHora(fecha, horario.cierre_manana) })
    }
    if (horario.activo_tarde !== false && horario.apertura_tarde && horario.cierre_tarde) {
        ventanas.push({ ini: conHora(fecha, horario.apertura_tarde), fin: conHora(fecha, horario.cierre_tarde) })
    }
    if (ventanas.length === 0) return []

    const ocupados = turnos
        .map((t) => ({ ini: parseISO(t.fecha_inicio), fin: t.fecha_fin ? parseISO(t.fecha_fin) : parseISO(t.fecha_inicio) }))
        .sort((a, b) => a.ini.getTime() - b.ini.getTime())

    const huecos: { desde: Date; hasta: Date }[] = []
    for (const v of ventanas) {
        let cursor = v.ini
        for (const o of ocupados) {
            if (o.fin <= v.ini || o.ini >= v.fin) continue // fuera de la ventana
            if (o.ini.getTime() - cursor.getTime() >= MIN_HUECO * 60_000) {
                huecos.push({ desde: cursor, hasta: o.ini })
            }
            if (o.fin > cursor) cursor = o.fin
        }
        if (v.fin.getTime() - cursor.getTime() >= MIN_HUECO * 60_000) {
            huecos.push({ desde: cursor, hasta: v.fin })
        }
    }
    return huecos
}

export function AgendaMobileList({
    grupos,
    isLoading,
    onSelectTurno,
    mostrarEncabezadoDia = false,
    horarios,
    onAgendarLibre,
}: AgendaMobileListProps) {
    // "Ahora" en estado (no leer el reloj en render): se refresca cada minuto.
    const [now, setNow] = useState<Date>(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])

    const totalTurnos = useMemo(() => grupos.reduce((n, g) => n + g.turnos.length, 0), [grupos])

    if (!isLoading && totalTurnos === 0 && !mostrarEncabezadoDia) {
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
            {grupos.map((grupo) => (
                <DiaSection
                    key={grupo.date.toISOString()}
                    grupo={grupo}
                    now={now}
                    mostrarEncabezadoDia={mostrarEncabezadoDia}
                    mostrarFranjas={!mostrarEncabezadoDia}
                    horarios={horarios}
                    onSelectTurno={onSelectTurno}
                    onAgendarLibre={onAgendarLibre}
                />
            ))}
        </div>
    )
}

function DiaSection({
    grupo,
    now,
    mostrarEncabezadoDia,
    mostrarFranjas,
    horarios,
    onSelectTurno,
    onAgendarLibre,
}: {
    grupo: DiaGrupo
    now: Date
    mostrarEncabezadoDia: boolean
    mostrarFranjas: boolean
    horarios?: Horario[]
    onSelectTurno: (t: Turno) => void
    onAgendarLibre?: (profId: string, fecha: Date, hora: string) => void
}) {
    const esHoy = isToday(grupo.date)
    const confirmados = grupo.turnos.filter((t) => t.estado === 'CONFIRMADO').length
    const pendientes = grupo.turnos.filter((t) => t.estado === 'PENDIENTE').length

    // Secuencia cronológica unificada: turnos + huecos "Libre".
    const eventos = useMemo(() => {
        const turnoEv = grupo.turnos.map((t) => ({ kind: 'turno' as const, start: parseISO(t.fecha_inicio), turno: t }))
        let gapEv: { kind: 'gap'; start: Date; desde: Date; hasta: Date }[] = []
        if (grupo.profesionalId) {
            const dow = grupo.date.getDay()
            const horario = (horarios || []).find((h) => h.profesional_id === grupo.profesionalId && h.dia === dow)
            gapEv = calcularHuecos(grupo.date, grupo.turnos, horario).map((g) => ({ kind: 'gap' as const, start: g.desde, desde: g.desde, hasta: g.hasta }))
        }
        return [...turnoEv, ...gapEv].sort((a, b) => a.start.getTime() - b.start.getTime())
    }, [grupo, horarios])

    // Índice donde cae "ahora": primer evento con start >= ahora (-1 = al final).
    const nowIndex = useMemo(() => {
        if (!esHoy) return -2
        const ms = now.getTime()
        return eventos.findIndex((e) => e.start.getTime() >= ms)
    }, [eventos, esHoy, now])
    const nowLabel = hhmm(now)

    const diaVacio = grupo.turnos.length === 0

    return (
        <section className="mb-1">
            {mostrarEncabezadoDia && (
                <div className={cn(
                    'flex items-center gap-2.5 mt-3 mb-2.5 px-0.5',
                    esHoy && 'text-primary'
                )}>
                    <span className="text-[15px] font-extrabold capitalize leading-none">
                        {format(grupo.date, "EEEE d", { locale: es })}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground capitalize">{format(grupo.date, 'MMM', { locale: es })}</span>
                    {grupo.turnos.length > 0 && (
                        <span className="text-[11px] font-extrabold text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                            {grupo.turnos.length}
                        </span>
                    )}
                    <span className="flex-1 h-px bg-border/50" />
                </div>
            )}

            {/* Resumen (solo vista Día) */}
            {!mostrarEncabezadoDia && grupo.turnos.length > 0 && (
                <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1.5 pt-1 pb-3">
                    <span className="text-[15px] font-extrabold text-foreground">
                        <span className="text-primary text-[17px]">{grupo.turnos.length}</span>{' '}
                        {grupo.turnos.length === 1 ? 'turno' : 'turnos'}
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
            )}

            {mostrarEncabezadoDia && diaVacio && eventos.length === 0 && (
                <p className="text-xs font-semibold text-muted-foreground/70 px-1 pb-1">Sin turnos</p>
            )}

            <div className="px-0.5">
                {esHoy && nowIndex === 0 && <NowLine label={nowLabel} />}

                {eventos.map((ev, idx) => {
                    const franja = franjaDe(ev.start)
                    const prevFranja = idx > 0 ? franjaDe(eventos[idx - 1].start) : null
                    const mostrarHeaderFranja = mostrarFranjas && franja !== prevFranja

                    return (
                        <div key={ev.kind === 'turno' ? ev.turno.id : `gap-${ev.start.toISOString()}`}>
                            {mostrarHeaderFranja && (
                                <div className="flex items-center gap-2.5 mt-2.5 mb-2">
                                    <span className="text-xs font-extrabold tracking-wide text-muted-foreground/80 uppercase">{franja}</span>
                                    <span className="flex-1 h-px bg-border/50" />
                                </div>
                            )}

                            {esHoy && nowIndex === idx && idx > 0 && <NowLine label={nowLabel} />}

                            {ev.kind === 'turno' ? (
                                <TurnoCard turno={ev.turno} inicio={ev.start} onSelect={onSelectTurno} />
                            ) : (
                                <HuecoLibre
                                    desde={ev.desde}
                                    hasta={ev.hasta}
                                    onAgendar={
                                        onAgendarLibre && grupo.profesionalId
                                            ? () => onAgendarLibre(grupo.profesionalId as string, grupo.date, hhmm(ev.desde))
                                            : undefined
                                    }
                                />
                            )}
                        </div>
                    )
                })}

                {esHoy && nowIndex === -1 && eventos.length > 0 && <NowLine label={nowLabel} />}
            </div>
        </section>
    )
}

function TurnoCard({ turno, inicio, onSelect }: { turno: Turno; inicio: Date; onSelect: (t: Turno) => void }) {
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
        <button
            type="button"
            onClick={() => onSelect(turno)}
            className={cn(
                'w-full flex text-left rounded-[15px] border border-border/60 bg-card/80 overflow-hidden mb-2.5 transition-colors active:bg-card',
                cancelado && 'opacity-60'
            )}
        >
            <span className="w-[5px] shrink-0" style={{ backgroundColor: colorProf }} />
            <span className="flex-none w-[60px] flex flex-col items-center justify-center py-2.5 px-1.5 bg-black/20 border-r border-border/40">
                <span className="text-[18px] font-extrabold leading-none tabular-nums">{hhmm(inicio)}</span>
                {dur !== null && <span className="text-[10px] font-bold text-muted-foreground mt-1">{dur} min</span>}
            </span>
            <span className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-2.5 px-3">
                <span className="flex items-center gap-2">
                    <span className={cn('flex-1 min-w-0 truncate text-[16px] font-extrabold leading-tight', cancelado && 'line-through')}>
                        {nombrePaciente}
                    </span>
                    <span className={cn('flex-none inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full', ESTADO_PILL[estado])}>
                        <i className={cn('h-1.5 w-1.5 rounded-full bg-current', estado === 'EN_SALA' && 'motion-safe:animate-pulse')} />
                        {ESTADO_TURNO_LABEL[estado]}
                    </span>
                </span>
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
    )
}

function HuecoLibre({ desde, hasta, onAgendar }: { desde: Date; hasta: Date; onAgendar?: () => void }) {
    const contenido = (
        <>
            {onAgendar && (
                <span className="flex-none h-6 w-6 rounded-full bg-card border border-border/60 flex items-center justify-center text-primary font-extrabold leading-none">+</span>
            )}
            <span>Libre · {hhmm(desde)} – {hhmm(hasta)}</span>
        </>
    )
    const clase = 'w-full flex items-center justify-center gap-2.5 border border-dashed border-border/60 rounded-[14px] py-2.5 mb-2.5 text-[13px] font-bold text-muted-foreground'

    if (onAgendar) {
        return (
            <button type="button" onClick={onAgendar} className={cn(clase, 'transition-colors active:bg-card/60')}>
                {contenido}
            </button>
        )
    }
    return <div className={clase}>{contenido}</div>
}

function NowLine({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 my-2.5">
            <span className="text-[11px] font-extrabold text-red-400 bg-red-400/15 px-2 py-0.5 rounded-full">Ahora · {label}</span>
            <span className="flex-1 h-0.5 rounded-full bg-gradient-to-r from-red-400/80 to-transparent" />
        </div>
    )
}

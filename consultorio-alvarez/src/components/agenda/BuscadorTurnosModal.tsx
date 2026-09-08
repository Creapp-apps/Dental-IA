'use client'

import { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
} from '@/components/ui/glass-dialog'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
    Search,
    Calendar,
    User,
    Clock,
    X,
    Loader2,
    ArrowRight,
    Filter,
    CalendarDays,
    Sparkles,
} from 'lucide-react'
import {
    format,
    parseISO,
    isToday,
    isFuture,
    isPast,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { buscarTurnosAction, type BuscarTurnosParams } from '@/lib/actions/turnos'
import { cn } from '@/lib/utils'

type RangoFechaPreset = 'todos' | 'hoy' | 'semana' | 'mes' | 'proximos' | 'personalizado'

interface BuscadorTurnosModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    profesionales?: any[]
    turnosLocales?: any[]
    onSelectTurno: (turno: any) => void
}

// Helper para búsqueda instantánea en 0ms sobre turnos ya presentes en memoria de la agenda
function filtrarTurnosLocales(
    lista: any[],
    q: string,
    fDesde: string,
    fHasta: string,
    profId: string,
    est: string
): any[] {
    if (!lista || lista.length === 0) return []
    const cleanQ = q.trim().toLowerCase()
    const tokens = cleanQ ? cleanQ.split(/\s+/).filter(Boolean) : []

    return lista.filter(t => {
        // Filtro profesional
        if (profId && profId !== 'todos' && t.profesional_id !== profId) {
            return false
        }
        // Filtro estado
        if (est && est !== 'todos' && t.estado !== est) {
            return false
        }
        // Filtro fechaDesde
        if (fDesde) {
            const fTurno = (t.fecha_inicio || '').slice(0, 10)
            if (fTurno < fDesde) return false
        }
        // Filtro fechaHasta
        if (fHasta) {
            const fTurno = (t.fecha_inicio || '').slice(0, 10)
            if (fTurno > fHasta) return false
        }
        // Filtro texto paciente
        if (tokens.length > 0) {
            const nombre = (t.paciente?.nombre || '').toLowerCase()
            const apellido = (t.paciente?.apellido || '').toLowerCase()
            const dni = (t.paciente?.dni || '').toLowerCase()
            const hc = (t.paciente?.nro_historia_clinica || '').toLowerCase()

            const allTokensMatch = tokens.every(token =>
                nombre.includes(token) ||
                apellido.includes(token) ||
                dni.includes(token) ||
                hc.includes(token)
            )
            if (!allTokensMatch) return false
        }
        return true
    })
}

export function BuscadorTurnosModal({
    open,
    onOpenChange,
    profesionales = [],
    turnosLocales = [],
    onSelectTurno,
}: BuscadorTurnosModalProps) {
    const [query, setQuery] = useState('')
    const [rangoPreset, setRangoPreset] = useState<RangoFechaPreset>('todos')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [profesionalId, setProfesionalId] = useState('todos')
    const [estadoFiltro, setEstadoFiltro] = useState('todos')

    const [turnos, setTurnos] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    // Memoria caché en cliente (0ms para búsquedas repetidas o al usar backspace)
    const cacheRef = useRef<Map<string, any[]>>(new Map())
    // Control de concurrencia para ignorar respuestas de búsquedas anteriores que lleguen tarde
    const activeRequestIdRef = useRef<number>(0)
    const [, startTransition] = useTransition()

    // Resetear formulario cuando se abre el modal
    useEffect(() => {
        if (open) {
            setQuery('')
            setRangoPreset('todos')
            setFechaDesde('')
            setFechaHasta('')
            setProfesionalId('todos')
            setEstadoFiltro('todos')
            setTurnos([])
            setHasSearched(false)
            setIsSearching(false)
        }
    }, [open])

    // Calcular fechas según el preset
    useEffect(() => {
        const hoy = new Date()
        const hoyStr = format(hoy, 'yyyy-MM-dd')

        switch (rangoPreset) {
            case 'todos':
                setFechaDesde('')
                setFechaHasta('')
                break
            case 'hoy':
                setFechaDesde(hoyStr)
                setFechaHasta(hoyStr)
                break
            case 'semana': {
                const inicioSem = startOfWeek(hoy, { weekStartsOn: 1 })
                const finSem = endOfWeek(hoy, { weekStartsOn: 1 })
                setFechaDesde(format(inicioSem, 'yyyy-MM-dd'))
                setFechaHasta(format(finSem, 'yyyy-MM-dd'))
                break
            }
            case 'mes': {
                const inicioMes = startOfMonth(hoy)
                const finMes = endOfMonth(hoy)
                setFechaDesde(format(inicioMes, 'yyyy-MM-dd'))
                setFechaHasta(format(finMes, 'yyyy-MM-dd'))
                break
            }
            case 'proximos': {
                const en30Dias = addDays(hoy, 30)
                setFechaDesde(hoyStr)
                setFechaHasta(format(en30Dias, 'yyyy-MM-dd'))
                break
            }
            case 'personalizado':
                // Mantiene los valores de fechaDesde y fechaHasta
                break
        }
    }, [rangoPreset])

    // Ejecutar búsqueda híbrida (Local-first 0ms + Cache 0ms + Server asíncrono ultra veloz)
    useEffect(() => {
        if (!open) return

        const cleanQuery = query.trim()
        const tieneRango = Boolean(fechaDesde || fechaHasta)
        const tieneProf = profesionalId !== 'todos'
        const tieneEstado = estadoFiltro !== 'todos'

        // Si no hay ningún criterio, no buscar automáticamente
        if (!cleanQuery && !tieneRango && !tieneProf && !tieneEstado) {
            setTurnos([])
            setHasSearched(false)
            setIsSearching(false)
            return
        }

        // Si solo escribió 1 letra y no hay fechas ni filtros, esperar al menos 2 letras
        if (cleanQuery.length === 1 && !tieneRango && !tieneProf && !tieneEstado) {
            return
        }

        const cacheKey = JSON.stringify({
            cleanQuery: cleanQuery.toLowerCase(),
            fechaDesde,
            fechaHasta,
            profesionalId,
            estadoFiltro,
        })

        // 1. RECURSO 1: Si ya lo buscamos antes, respuesta instantánea en 0ms desde la memoria
        if (cacheRef.current.has(cacheKey)) {
            const cachedResults = cacheRef.current.get(cacheKey)!
            setTurnos(cachedResults)
            setHasSearched(true)
            setIsSearching(false)
            return
        }

        // 2. RECURSO 2: Coincidencias locales inmediatas en 0ms (turnos ya visibles en la agenda)
        const coincidenciasLocales = filtrarTurnosLocales(
            turnosLocales,
            cleanQuery,
            fechaDesde,
            fechaHasta,
            profesionalId,
            estadoFiltro
        )

        if (coincidenciasLocales.length > 0) {
            setTurnos(coincidenciasLocales)
            setHasSearched(true)
        }

        setIsSearching(true)
        const currentRequestId = ++activeRequestIdRef.current

        // 3. RECURSO 3: Debounce acelerado a 140ms + consulta asíncrona a la base de datos
        const timer = setTimeout(async () => {
            try {
                const res = await buscarTurnosAction({
                    query: cleanQuery || undefined,
                    fechaDesde: fechaDesde || undefined,
                    fechaHasta: fechaHasta || undefined,
                    profesionalId: profesionalId !== 'todos' ? profesionalId : undefined,
                    estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
                    limit: 50,
                })

                // Si el usuario siguió tipeando y este request quedó obsoleto, descartar
                if (currentRequestId !== activeRequestIdRef.current) return

                const serverTurnos: any[] = (res.turnos as any[]) || []

                // Unificar resultados deduplicando por ID
                const mapTurnos = new Map<string, any>()
                coincidenciasLocales.forEach((t: any) => mapTurnos.set(t.id, t))
                serverTurnos.forEach((t: any) => mapTurnos.set(t.id, t))

                const turnosFinales = Array.from(mapTurnos.values()).sort((a, b) => {
                    const isFutureSearch = fechaDesde && new Date(fechaDesde) >= new Date(new Date().setHours(0, 0, 0, 0))
                    const diff = new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
                    return isFutureSearch ? diff : -diff
                })

                // Guardar en caché para búsquedas repetidas
                cacheRef.current.set(cacheKey, turnosFinales)

                startTransition(() => {
                    setTurnos(turnosFinales)
                    setHasSearched(true)
                    setIsSearching(false)
                })
            } catch (err) {
                console.error('Error buscando turnos:', err)
                if (currentRequestId === activeRequestIdRef.current) {
                    setIsSearching(false)
                }
            }
        }, 140)

        return () => {
            clearTimeout(timer)
        }
    }, [open, query, fechaDesde, fechaHasta, profesionalId, estadoFiltro, turnosLocales])

    const presetsList: { key: RangoFechaPreset; label: string }[] = [
        { key: 'todos', label: 'Cualquier fecha' },
        { key: 'hoy', label: 'Hoy' },
        { key: 'semana', label: 'Esta semana' },
        { key: 'mes', label: 'Este mes' },
        { key: 'proximos', label: 'Próximos 30 días' },
        { key: 'personalizado', label: 'Personalizado' },
    ]

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <GlassDialogHeader className="p-5 pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <Search className="h-4 w-4" />
                            </div>
                            <div>
                                <GlassDialogTitle className="text-lg">Buscador de Turnos</GlassDialogTitle>
                                <p className="text-xs text-muted-foreground">
                                    Buscá turnos por paciente (apellido, nombre, DNI) o por fecha / rango.
                                </p>
                            </div>
                        </div>
                    </div>
                </GlassDialogHeader>

                {/* Filtros & Barra de búsqueda */}
                <div className="p-5 pb-3 border-b border-border/40 space-y-3 bg-muted/20">
                    {/* Campo principal de búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por apellido, nombre o DNI del paciente..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 pr-10 h-11 text-sm rounded-xl bg-background/80 border-border/80 focus-visible:ring-primary shadow-inner"
                            autoFocus
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        {isSearching && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    {/* Presets de Fecha */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Fecha:
                        </span>
                        {presetsList.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => setRangoPreset(p.key)}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer border',
                                    rangoPreset === p.key
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-background/50 hover:bg-white/10 text-muted-foreground hover:text-foreground border-border/50'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Rango de Fechas Personalizado */}
                    {rangoPreset === 'personalizado' && (
                        <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-1.5 flex-1">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Desde:</span>
                                <Input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 flex-1">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Hasta:</span>
                                <Input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Filtros secundarios: Profesional y Estado */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {/* Selector de profesional */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <User className="h-3 w-3" /> Odontólogo:
                            </span>
                            <select
                                value={profesionalId}
                                onChange={(e) => setProfesionalId(e.target.value)}
                                className="h-7 text-xs rounded-lg bg-background border border-border px-2 text-foreground outline-none cursor-pointer"
                            >
                                <option value="todos">Todos los profesionales</option>
                                {profesionales.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        Dr. {p.nombre} {p.apellido || ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de estado */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Filter className="h-3 w-3" /> Estado:
                            </span>
                            <select
                                value={estadoFiltro}
                                onChange={(e) => setEstadoFiltro(e.target.value)}
                                className="h-7 text-xs rounded-lg bg-background border border-border px-2 text-foreground outline-none cursor-pointer"
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="CONFIRMADO">Confirmado</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="COMPLETADO">Completado</option>
                                <option value="CANCELADO">Cancelado</option>
                                <option value="AUSENTE">Ausente</option>
                                <option value="EN_SALA">En Sala</option>
                            </select>
                        </div>

                        {/* Contador de resultados */}
                        {hasSearched && (
                            <span className="text-xs font-semibold text-primary ml-auto">
                                {turnos.length} {turnos.length === 1 ? 'turno encontrado' : 'turnos encontrados'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Lista de Resultados */}
                <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar min-h-[300px]">
                    {!hasSearched && !isSearching && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 text-muted-foreground">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                                <Search className="h-6 w-6 stroke-[1.75]" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Búsqueda rápida en la agenda</p>
                            <p className="text-xs max-w-sm mt-1">
                                Escribí el apellido del paciente o seleccioná un rango de fechas para ver todos los turnos agendados.
                            </p>
                        </div>
                    )}

                    {isSearching && turnos.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                            <p className="text-xs">Buscando turnos en la base de datos...</p>
                        </div>
                    )}

                    {hasSearched && turnos.length === 0 && !isSearching && (
                        <div className="text-center py-12 px-4 text-muted-foreground">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-2.5">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No se encontraron turnos</p>
                            <p className="text-xs mt-1 max-w-md mx-auto">
                                No hay turnos registrados que coincidan con los filtros seleccionados. Probá modificando el término de búsqueda o ampliando el rango de fechas.
                            </p>
                        </div>
                    )}

                    {turnos.map((t) => {
                        const fechaInicio = parseISO(t.fecha_inicio)
                        const esHoy = isToday(fechaInicio)
                        const esProximo = isFuture(fechaInicio) && !esHoy
                        const esPasado = isPast(fechaInicio) && !esHoy

                        const fechaFormateada = format(fechaInicio, "EEEE d 'de' MMMM, yyyy", { locale: es })
                        const horaFormateada = format(fechaInicio, 'HH:mm')
                        const paciente = t.paciente
                        const profesional = t.profesional
                        const tratamiento = t.tipo_tratamiento

                        return (
                            <div
                                key={t.id}
                                onClick={() => {
                                    onSelectTurno(t)
                                    onOpenChange(false)
                                }}
                                className={cn(
                                    'group relative rounded-xl p-3.5 border transition-all duration-200 cursor-pointer text-left',
                                    'bg-card/40 hover:bg-card/80 dark:bg-black/30 dark:hover:bg-white/5 border-border/50 hover:border-primary/50',
                                    'hover:shadow-md hover:scale-[1.008]'
                                )}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    {/* Paciente y Horario */}
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-foreground">
                                                {paciente ? `${paciente.apellido}, ${paciente.nombre}` : 'Sin paciente asignado'}
                                            </span>
                                            {paciente?.dni && (
                                                <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                                    DNI {paciente.dni}
                                                </span>
                                            )}
                                            {esHoy && (
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    HOY
                                                </span>
                                            )}
                                            {esProximo && (
                                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                                    Próximo
                                                </span>
                                            )}
                                        </div>

                                        {/* Fecha y Hora */}
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                            <span className="flex items-center gap-1 font-medium capitalize text-foreground/80">
                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                {fechaFormateada}
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold text-foreground">
                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                {horaFormateada} hs
                                            </span>
                                            {paciente?.telefono && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    Tel: {paciente.telefono}
                                                </span>
                                            )}
                                        </div>

                                        {/* Profesional y Tratamiento */}
                                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                            {profesional && (
                                                <span className="text-[11px] font-medium text-foreground/90 flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-lg border border-border/40">
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: profesional.color_agenda || '#3b82f6' }}
                                                    />
                                                    Dr. {profesional.nombre} {profesional.apellido || ''}
                                                </span>
                                            )}
                                            {tratamiento && (
                                                <span
                                                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg border"
                                                    style={{
                                                        backgroundColor: tratamiento.color ? `${tratamiento.color}15` : 'transparent',
                                                        borderColor: tratamiento.color ? `${tratamiento.color}40` : 'rgba(255,255,255,0.1)',
                                                        color: tratamiento.color || 'inherit',
                                                    }}
                                                >
                                                    {tratamiento.nombre}
                                                </span>
                                            )}
                                            {t.es_sobreturno && (
                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                                    ⚡ Sobreturno
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Estado y Botón de acción */}
                                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                                        <StatusBadge status={t.estado} />
                                        <span className="text-xs font-semibold text-primary flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                            Ver en agenda
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </GlassDialogContent>
        </GlassDialog>
    )
}

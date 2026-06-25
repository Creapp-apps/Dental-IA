'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    addDays, subDays, addMonths, subMonths, isSameDay, parseISO, isToday,
    startOfMonth, endOfMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, Maximize, Minimize, Edit2, Trash2, MessageSquare, User, Activity, ZoomIn, ZoomOut, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassButton } from '@/components/ui/glass-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { NuevoTurnoModal } from '@/components/agenda/NuevoTurnoModal'
import { cambiarEstadoTurno, eliminarTurno, moverTurno } from '@/lib/actions/turnos'
import { glassAlert } from '@/components/ui/glass-alert'
import {
    type EstadoTurno,
    ESTADO_TURNO_LABEL,
} from '@/types'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { NotificarDemoraModal } from '@/components/agenda/NotificarDemoraModal'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'

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

const HOUR_HEIGHT = 80
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8:00 to 21:00

function getCardPosition(fechaInicioStr: string, fechaFinStr: string) {
    const start = parseISO(fechaInicioStr)
    const end = parseISO(fechaFinStr)
    
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    
    const agendaStartHour = 8
    
    const top = Math.max(0, (startHour - agendaStartHour) * HOUR_HEIGHT)
    const height = Math.max(30, (endHour - startHour) * HOUR_HEIGHT)
    
    return { top, height }
}

interface AgendaViewProps {
    profesionales: any[]
    tiposTratamiento: any[]
    turnosIniciales: any[]
    pacientes: any[]
    fechaInicial?: string
}

export function AgendaView({
    profesionales,
    tiposTratamiento,
    turnosIniciales,
    pacientes,
    fechaInicial,
}: AgendaViewProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlVista = (searchParams.get('vista') as ViewMode) || 'semana'
    
    const [turnos, setTurnos] = useState<any[]>(turnosIniciales || [])
    
    // Synchronize prop updates to local state
    useEffect(() => {
        setTurnos(turnosIniciales || [])
    }, [turnosIniciales])

    const [vistaActiva, setVistaActiva] = useState<ViewMode>(urlVista)
    const [baseDate, setBaseDate] = useState(() => fechaInicial ? parseISO(fechaInicial) : new Date())
    const [diaSeleccionado, setDiaSeleccionado] = useState(() => fechaInicial ? parseISO(fechaInicial) : new Date())
    const [modalOpen, setModalOpen] = useState(false)
    const [modalProfId, setModalProfId] = useState<string>('')
    const [modalHora, setModalHora] = useState<string>('09:00')
    const [turnoAEditar, setTurnoAEditar] = useState<any>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [turnoADemorar, setTurnoADemorar] = useState<any>(null)
    const [selectedTurnoDetail, setSelectedTurnoDetail] = useState<any>(null)
    const [draggedOverTime, setDraggedOverTime] = useState<{ time: string; colIndex: number; top: number } | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [zoom, setZoom] = useState(100) // Zoom percentage: 80, 100, 120, 150, 200

    // Sync fechaInicial prop to local state
    useEffect(() => {
        if (fechaInicial) {
            const date = parseISO(fechaInicial)
            setBaseDate(date)
            setDiaSeleccionado(date)
        }
    }, [fechaInicial])

    // Sync urlVista to vistaActiva if URL parameter changes
    useEffect(() => {
        if (urlVista && urlVista !== vistaActiva) {
            setVistaActiva(urlVista)
        }
    }, [urlVista])

    // Sync local baseDate and vistaActiva back to the URL parameters
    useEffect(() => {
        const formattedDate = format(baseDate, 'yyyy-MM-dd')
        const currentParams = new URLSearchParams(window.location.search)
        let changed = false
        if (currentParams.get('fecha') !== formattedDate) {
            currentParams.set('fecha', formattedDate)
            changed = true
        }
        if (currentParams.get('vista') !== vistaActiva) {
            currentParams.set('vista', vistaActiva)
            changed = true
        }
        if (changed) {
            router.replace(`/agenda?${currentParams.toString()}`, { scroll: false })
        }
    }, [baseDate, vistaActiva, router])

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Real-time synchronization of turnos
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('turnos-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'turnos' },
                async (payload) => {
                    const eventType = payload.eventType
                    
                    if (eventType === 'DELETE') {
                        const oldId = payload.old.id
                        setTurnos(prev => prev.filter(t => t.id !== oldId))
                    } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
                        const newRow = payload.new as any
                        
                        // Check if we already have this patient in local list
                        let pacienteObj = pacientes.find(p => p.id === newRow.paciente_id)
                        if (!pacienteObj && newRow.paciente_id) {
                            const { data: pData } = await supabase
                                .from('pacientes')
                                .select('id, nombre, apellido, telefono, dni')
                                .eq('id', newRow.paciente_id)
                                .single()
                            if (pData) {
                                pacienteObj = pData
                            }
                        }
                        
                        const profesionalObj = profesionales.find(p => p.id === newRow.profesional_id)
                        const tipoTratamientoObj = tiposTratamiento.find(t => t.id === newRow.tipo_tratamiento_id)
                        
                        const turnoCompleto = {
                            ...newRow,
                            paciente: pacienteObj ? {
                                id: pacienteObj.id,
                                nombre: pacienteObj.nombre,
                                apellido: pacienteObj.apellido,
                                telefono: pacienteObj.telefono,
                                dni: pacienteObj.dni
                            } : null,
                            profesional: profesionalObj ? {
                                id: profesionalObj.id,
                                nombre: profesionalObj.nombre,
                                apellido: profesionalObj.apellido,
                                color_agenda: profesionalObj.color_agenda
                            } : null,
                            tipo_tratamiento: tipoTratamientoObj ? {
                                id: tipoTratamientoObj.id,
                                nombre: tipoTratamientoObj.nombre,
                                duracion_minutos: tipoTratamientoObj.duracion_minutos,
                                prioridad: tipoTratamientoObj.prioridad,
                                color: tipoTratamientoObj.color
                            } : null
                        }
                        
                        if (eventType === 'INSERT') {
                            setTurnos(prev => {
                                if (prev.some(t => t.id === newRow.id)) return prev
                                return [...prev, turnoCompleto]
                            })
                        } else {
                            setTurnos(prev => prev.map(t => t.id === newRow.id ? turnoCompleto : t))
                        }
                    }
                    
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router, pacientes, profesionales, tiposTratamiento])

    function toggleFullscreen() {
        const el = document.getElementById('admin-layout-root')
        if (!el) return
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(err => console.error('Error attempting to enable fullscreen:', err))
        } else {
            document.exitFullscreen()
        }
    }

    // Auto-focus incoming webhook coordinates
    const urlTurnoId = searchParams.get('turno')

    useEffect(() => {
        if (!urlTurnoId || !turnos) return
        const turno = turnos.find(t => t.id === urlTurnoId)
        if (turno) {
            const date = parseISO(turno.fecha_inicio)
            setBaseDate(date)
            setDiaSeleccionado(date)
            setVistaActiva('hoy') // Foco en el día específico
            setTimeout(() => {
                const el = document.getElementById(`turno-${turno.id}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    const pulseClasses = ['ring-4', 'ring-red-500', 'animate-pulse', 'shadow-[0_0_25px_rgba(239,68,68,0.8)]']
                    el.classList.add(...pulseClasses)
                    // Quitar el latido después de 10 segundos
                    setTimeout(() => el.classList.remove(...pulseClasses), 10000)
                }
            }, 500)
        }
    }, [urlTurnoId, turnos])

    const editTurnoId = searchParams.get('edit')
    useEffect(() => {
        if (!editTurnoId || !turnos) return
        const turno = turnos.find(t => t.id === editTurnoId)
        if (turno) {
            setTurnoAEditar(turno)
            setModalProfId(turno.profesional_id)
            setModalOpen(true)
            
            // Clean up the URL query parameter so it doesn't reopen on subsequent renders/state-changes
            const url = new URL(window.location.href)
            url.searchParams.delete('edit')
            router.replace(url.pathname + url.search, { scroll: false })
        }
    }, [editTurnoId, turnos, router])


    // ── Compute visible days based on view mode ────────────────
    const diasVisibles = useMemo(() => {
        switch (vistaActiva) {
            case 'hoy': {
                const inicio = startOfWeek(baseDate, { weekStartsOn: 1 })
                return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
            }
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
            case 'hoy': {
                const prev = subDays(baseDate, 1)
                setBaseDate(prev)
                setDiaSeleccionado(prev)
                break
            }
            case 'semana': {
                const prev = subWeeks(baseDate, 1)
                setBaseDate(prev)
                setDiaSeleccionado(prev)
                break
            }
            case '15dias': {
                const prev = subDays(baseDate, 15)
                setBaseDate(prev)
                setDiaSeleccionado(prev)
                break
            }
            case 'mes': {
                const prev = subMonths(baseDate, 1)
                setBaseDate(prev)
                setDiaSeleccionado(prev)
                break
            }
        }
    }

    function navSiguiente() {
        switch (vistaActiva) {
            case 'hoy': {
                const next = addDays(baseDate, 1)
                setBaseDate(next)
                setDiaSeleccionado(next)
                break
            }
            case 'semana': {
                const next = addWeeks(baseDate, 1)
                setBaseDate(next)
                setDiaSeleccionado(next)
                break
            }
            case '15dias': {
                const next = addDays(baseDate, 15)
                setBaseDate(next)
                setDiaSeleccionado(next)
                break
            }
            case 'mes': {
                const next = addMonths(baseDate, 1)
                setBaseDate(next)
                setDiaSeleccionado(next)
                break
            }
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
        return turnos
            .filter((t: any) => t.profesional_id === profId && isSameDay(parseISO(t.fecha_inicio), dia))
            .sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    }
    const usesCustomWidth = vistaActiva === '15dias' || vistaActiva === 'mes'
    const columnWidth = useMemo(() => {
        return Math.round(150 * (zoom / 100))
    }, [zoom])

    const columns = useMemo(() => {
        const showProfColumns = vistaActiva === 'hoy'
        
        if (showProfColumns) {
            return profesionales.map(prof => {
                const turnosDiaProf = turnos.filter(
                    (t: any) => t.profesional_id === prof.id && isSameDay(parseISO(t.fecha_inicio), diaSeleccionado)
                )
                return {
                    header: (
                        <div className="flex items-center gap-2 justify-center">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: prof.color_agenda }} />
                            <span className="text-xs font-semibold text-foreground truncate">Dr. {prof.nombre}</span>
                        </div>
                    ),
                    date: diaSeleccionado,
                    profesionalId: prof.id,
                    colorProf: prof.color_agenda,
                    turnos: turnosDiaProf
                }
            })
        } else {
            return diasVisibles.map(dia => {
                const turnosDia = turnos.filter(
                    (t: any) => isSameDay(parseISO(t.fecha_inicio), dia)
                )
                const esHoy = isToday(dia)
                return {
                    header: (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {format(dia, 'EEE', { locale: es })}
                            </span>
                            <span className={cn(
                                "text-sm font-bold mt-0.5 h-6 w-6 rounded-full flex items-center justify-center",
                                esHoy ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                            )}>
                                {format(dia, 'd')}
                            </span>
                        </div>
                    ),
                    date: dia,
                    profesionalId: undefined,
                    colorProf: undefined,
                    turnos: turnosDia
                }
            })
        }
    }, [vistaActiva, profesionales, turnos, diaSeleccionado, diasVisibles])

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, colIdx: number) => {
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        const clientY = e.clientY - rect.top
        const minutesFromStart = (clientY / HOUR_HEIGHT) * 60
        const roundedMinutes = Math.round(minutesFromStart / 15) * 15
        
        const startHour = 8
        let dropHour = startHour + Math.floor(roundedMinutes / 60)
        let dropMinute = roundedMinutes % 60
        
        if (dropHour < 8) {
            dropHour = 8
            dropMinute = 0
        } else if (dropHour >= 22) {
            dropHour = 22
            dropMinute = 0
        }
        
        const pad = (num: number) => num.toString().padStart(2, '0')
        const timeStr = `${pad(dropHour)}:${pad(dropMinute)}`
        const visualTop = ((dropHour - 8) + dropMinute / 60) * HOUR_HEIGHT

        setDraggedOverTime({
            time: timeStr,
            colIndex: colIdx,
            top: visualTop
        })
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetDate: Date, targetProfId?: string) => {
        e.preventDefault()
        setDraggedOverTime(null)
        const turnoId = e.dataTransfer.getData('text/plain')
        if (!turnoId) return

        const rect = e.currentTarget.getBoundingClientRect()
        const clientY = e.clientY - rect.top
        const minutesFromStart = (clientY / HOUR_HEIGHT) * 60
        const roundedMinutes = Math.round(minutesFromStart / 15) * 15
        
        const startHour = 8
        let dropHour = startHour + Math.floor(roundedMinutes / 60)
        let dropMinute = roundedMinutes % 60
        
        if (dropHour < 8) {
            dropHour = 8
            dropMinute = 0
        } else if (dropHour >= 21) {
            dropHour = 21
            dropMinute = 0
        }
        
        const newStart = new Date(targetDate)
        newStart.setHours(dropHour, dropMinute, 0, 0)
        
        const originalTurno = turnos.find((t: any) => t.id === turnoId)
        if (!originalTurno) return
        
        const origStart = parseISO(originalTurno.fecha_inicio)
        const origEnd = parseISO(originalTurno.fecha_fin)
        const durationMs = origEnd.getTime() - origStart.getTime()
        
        const newEnd = new Date(newStart.getTime() + durationMs)
        
        // Optimistic update: move card locally immediately
        setTurnos(prev => prev.map(t => {
            if (t.id === turnoId) {
                return {
                    ...t,
                    fecha_inicio: newStart.toISOString(),
                    fecha_fin: newEnd.toISOString(),
                    profesional_id: targetProfId,
                    profesional: targetProfId !== t.profesional_id 
                        ? profesionales.find(p => p.id === targetProfId) || t.profesional
                        : t.profesional
                }
            }
            return t
        }))
        
        startTransition(async () => {
            const res = await moverTurno(turnoId, newStart.toISOString(), newEnd.toISOString(), targetProfId)
            if (res.error) {
                // Revert optimistic update
                setTurnos(turnosIniciales)
                glassAlert.error({ title: 'Error al mover turno', description: res.error })
            } else {
                glassAlert.success({ title: 'Turno reprogramado' })
            }
        })
    }

    const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, date: Date, profId?: string) => {
        if ((e.target as HTMLElement).closest('.cursor-grab')) return
        
        const rect = e.currentTarget.getBoundingClientRect()
        const clientY = e.clientY - rect.top
        const minutesFromStart = (clientY / HOUR_HEIGHT) * 60
        const roundedMinutes = Math.round(minutesFromStart / 15) * 15
        
        const startHour = 8
        let dropHour = startHour + Math.floor(roundedMinutes / 60)
        let dropMinute = roundedMinutes % 60
        
        if (dropHour < 8) {
            dropHour = 8
            dropMinute = 0
        } else if (dropHour >= 21) {
            dropHour = 21
            dropMinute = 0
        }
        
        const pad = (num: number) => num.toString().padStart(2, '0')
        const horaStr = `${pad(dropHour)}:${pad(dropMinute)}`
        
        abrirModalConProf(profId ?? profesionales[0]?.id ?? '', format(date, 'yyyy-MM-dd'), horaStr)
    }

    function handleCambiarEstado(turnoId: string, nuevoEstado: EstadoTurno) {
        // Optimistic status update
        setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, estado: nuevoEstado } : t))
        
        startTransition(async () => {
            const result = await cambiarEstadoTurno(turnoId, nuevoEstado)
            if (result.error) {
                // Revert optimistic update
                setTurnos(turnosIniciales)
                glassAlert.error({ title: 'Error', description: result.error })
            } else {
                glassAlert.success({ title: `Estado → ${ESTADO_TURNO_LABEL[nuevoEstado]}` })
            }
        })
    }

    function handleEditTurno(turno: any) {
        setTurnoAEditar(turno)
        setModalProfId(turno.profesional_id)
        setModalOpen(true)
    }

    function handleDeleteTurno(id: string) {
        setConfirmDeleteId(id)
    }

    function handleExtend20Minutes(turnoId: string) {
        const targetTurno = turnos.find(t => t.id === turnoId)
        if (!targetTurno) return

        const currentEnd = new Date(targetTurno.fecha_fin)
        const newEnd = new Date(currentEnd.getTime() + 20 * 60 * 1000)

        // Optimistic update: extend card immediately in UI
        setTurnos((prev: any[]) => prev.map(t => t.id === turnoId ? { ...t, fecha_fin: newEnd.toISOString() } : t))
        setSelectedTurnoDetail((prev: any) => prev && prev.id === turnoId ? { ...prev, fecha_fin: newEnd.toISOString() } : prev)

        startTransition(async () => {
            const { editarTurno } = await import('@/lib/actions/turnos')
            const res = await editarTurno(turnoId, {
                paciente_id: targetTurno.paciente_id,
                profesional_id: targetTurno.profesional_id,
                tipo_tratamiento_id: targetTurno.tipo_tratamiento_id,
                fecha_inicio: targetTurno.fecha_inicio,
                fecha_fin: newEnd.toISOString(),
                notas: targetTurno.notas,
                prioridad_override: targetTurno.prioridad_override,
                es_sobreturno: targetTurno.es_sobreturno,
            })

            if (res.error) {
                // Revert optimistic update
                setTurnos((prev: any[]) => prev.map(t => t.id === turnoId ? { ...t, fecha_fin: currentEnd.toISOString() } : t))
                setSelectedTurnoDetail((prev: any) => prev && prev.id === turnoId ? { ...prev, fecha_fin: currentEnd.toISOString() } : prev)
                glassAlert.error({ title: 'Error al extender turno', description: res.error })
            } else {
                glassAlert.success({ title: 'Turno extendido', description: '+20 minutos agregados con éxito.' })
            }
        })
    }

    function onConfirmDelete() {
        if (!confirmDeleteId) return
        const targetId = confirmDeleteId
        setConfirmDeleteId(null)
        
        // Optimistic delete: remove card immediately from local UI
        setTurnos(prev => prev.filter(t => t.id !== targetId))
        
        startTransition(async () => {
            const res = await eliminarTurno(targetId)
            if (res.error) {
                // Revert optimistic update
                setTurnos(turnosIniciales)
                glassAlert.error({ title: 'Error al eliminar', description: res.error })
            } else {
                glassAlert.success({ title: 'Turno eliminado correctamente' })
            }
        })
    }

    function abrirModalConProf(profId: string, fechaStr?: string, horaStr?: string) {
        setModalProfId(profId)
        if (fechaStr) {
            const date = parseISO(fechaStr)
            setDiaSeleccionado(date)
            setBaseDate(date)
        }
        setModalHora(horaStr ?? '09:00')
        setModalOpen(true)
    }

    return (
        <div className="space-y-4 relative">
            {/* Real-time Mutation Overlay Spinner */}
            <AnimatePresence>
                {isPending && (
                    <motion.div 
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex flex-col items-center gap-4 bg-card/90 border border-primary/20 p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150">
                            <div className="relative h-12 w-12">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            </div>
                            <div className="flex flex-col items-center gap-1 text-center">
                                <p className="text-sm font-semibold text-foreground">Actualizando agenda...</p>
                                <p className="text-xs text-muted-foreground">Sincronizando con el servidor</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View mode selector + navigation */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View mode pills */}
                    <div className="flex items-center gap-0.5 glass rounded-xl p-0.5">
                        {VIEW_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setVistaActiva(opt.key)}
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

                <div className="flex items-center gap-2">
                    {usesCustomWidth && (
                        <div className="flex items-center gap-1 glass-subtle rounded-xl p-0.5 border border-white/5 mr-1">
                            <GlassButton
                                onClick={() => setZoom(prev => Math.max(80, prev - 10))}
                                variant="ghost"
                                size="icon-sm"
                                title="Alejar (Zoom Out)"
                                disabled={zoom <= 80}
                            >
                                <ZoomOut className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </GlassButton>
                            <span className="text-[11px] font-semibold text-muted-foreground w-12 text-center select-none">
                                {zoom}%
                            </span>
                            <GlassButton
                                onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                                variant="ghost"
                                size="icon-sm"
                                title="Acercar (Zoom In)"
                                disabled={zoom >= 200}
                            >
                                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </GlassButton>
                        </div>
                    )}
                    <GlassButton onClick={toggleFullscreen} variant="glass" size="icon" title="Pantalla completa">
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </GlassButton>
                    <GlassButton onClick={() => { 
                        setTurnoAEditar(null)
                        setModalProfId(profesionales[0]?.id ?? '')
                        setModalOpen(true) 
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo turno
                    </GlassButton>
                </div>
            </motion.div>

            {/* Selector de día (strip) */}
            {true && (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible"
                    className={cn(
                        'flex gap-1.5 overflow-x-auto scrollbar-hide pb-1',
                        (vistaActiva === 'semana' || vistaActiva === 'hoy') && 'grid grid-cols-7'
                    )}
                >
                    {diasVisibles.map((dia) => {
                        const turnosDelDia = turnos.filter((t: any) => isSameDay(parseISO(t.fecha_inicio), dia))
                        const totalDia = turnosDelDia.length
                        const pendientesDia = turnosDelDia.filter((t: any) => t.estado === 'PENDIENTE').length
                        const esHoy = isToday(dia)
                        const isSelected = isSameDay(dia, diaSeleccionado)
                        return (
                            <motion.button
                                key={dia.toISOString()}
                                onClick={() => {
                                    setDiaSeleccionado(dia)
                                    setBaseDate(dia)
                                    setTimeout(() => {
                                        const colId = `agenda-col-${format(dia, 'yyyy-MM-dd')}`
                                        const colEl = document.getElementById(colId)
                                        if (colEl) {
                                            colEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                                        }
                                    }, 50)
                                }}
                                className={cn(
                                    'relative rounded-xl p-2.5 text-center transition-all cursor-pointer border shrink-0 flex flex-col items-center justify-between',
                                    vistaActiva !== 'semana' && vistaActiva !== 'hoy' && 'min-w-[4.5rem]',
                                    isSelected
                                        ? 'bg-primary border-primary text-primary-foreground shadow-glass-lg'
                                        : esHoy
                                            ? 'glass border-primary/50 text-primary font-semibold'
                                            : pendientesDia > 0
                                                ? 'glass border-amber-500/40 text-muted-foreground hover:text-foreground shadow-[0_0_12px_rgba(245,158,11,0.1)] hover:border-amber-500/60'
                                                : 'glass-subtle border-transparent hover:border-white/20 text-muted-foreground hover:text-foreground'
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Dot indicator for days with turnos */}
                                {totalDia > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                        {pendientesDia > 0 ? (
                                            <>
                                                <span className={cn(
                                                    'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-amber-400'
                                                )} />
                                                <span className={cn(
                                                    'relative inline-flex rounded-full h-2 w-2',
                                                    isSelected ? 'bg-amber-300' : 'bg-amber-500'
                                                )} />
                                            </>
                                        ) : (
                                            <>
                                                <span className={cn(
                                                    'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                                                    isSelected ? 'bg-white/60' : 'bg-emerald-400'
                                                )} />
                                                <span className={cn(
                                                    'relative inline-flex rounded-full h-2 w-2',
                                                    isSelected ? 'bg-white' : 'bg-emerald-500'
                                                )} />
                                            </>
                                        )}
                                    </span>
                                )}
                                <p className={cn("text-xs uppercase tracking-wide", isSelected ? "opacity-90" : "opacity-70")}>
                                    {format(dia, 'EEE', { locale: es })}
                                </p>
                                <p className="text-xl font-bold leading-tight my-0.5">{format(dia, 'd')}</p>
                                {totalDia > 0 && (
                                    <div className="flex flex-col gap-1 items-center w-full">
                                        <p className={cn(
                                            "text-[10px] font-semibold rounded-full px-1.5 py-0.5 mx-auto w-fit",
                                            isSelected
                                                ? 'bg-white/20 text-white'
                                                : 'bg-primary/10 text-primary'
                                        )}>
                                            {totalDia} turno{totalDia > 1 ? 's' : ''}
                                        </p>
                                        {pendientesDia > 0 && (
                                            <span className={cn(
                                                "text-[9px] font-extrabold rounded-md px-1 py-0.5 w-fit text-center animate-pulse",
                                                isSelected
                                                    ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            )}>
                                                {pendientesDia} sin conf.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </motion.button>
                        )
                    })}
                </motion.div>
            )}

            {/* Google Calendar TimeGrid View */}
            <motion.div 
                custom={2} 
                variants={sectionVariants} 
                initial="hidden" 
                animate="visible" 
                className="flex flex-col border border-border/40 rounded-2xl bg-card/10 backdrop-blur-xl shadow-glass overflow-hidden"
            >
                {/* Single horizontal scroll wrapper */}
                <div className="flex-1 overflow-x-auto scrollbar-hide flex flex-col min-w-0 w-full">
                    {/* Width setter inside scroll container */}
                    <div 
                        className="flex flex-col flex-1 min-w-0"
                        style={
                            usesCustomWidth
                                ? { width: `${65 + columns.length * columnWidth}px` }
                                : undefined
                        }
                    >
                        {/* Header row */}
                        <div className={cn(
                            "flex border-b border-border bg-muted/20 select-none",
                            !usesCustomWidth && "w-full"
                        )}>
                            {/* Time cell spacer */}
                            <div className="w-[65px] shrink-0 border-r border-border flex items-end justify-center pb-2 text-[10px] font-semibold text-muted-foreground uppercase sticky left-0 bg-slate-950 dark:bg-[#0b0c10] z-20">
                                Hora
                            </div>
                            {/* Column headers wrapper */}
                            <div className={cn(
                                "flex flex-1 divide-x divide-border",
                                vistaActiva === 'semana' && 'grid grid-cols-7',
                                usesCustomWidth && 'flex',
                                vistaActiva === 'hoy' && 'grid'
                            )}
                            style={
                                vistaActiva === 'hoy'
                                    ? { gridTemplateColumns: `repeat(${profesionales.length}, minmax(0, 1fr))` }
                                    : undefined
                            }
                            >
                                {columns.map((col, idx) => (
                                    <div 
                                        key={idx} 
                                        id={`agenda-header-col-${format(col.date, 'yyyy-MM-dd')}`}
                                        style={usesCustomWidth ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px` } : undefined}
                                        className={cn(
                                            "flex-1 py-3 text-center flex flex-col items-center justify-center transition-colors",
                                            !usesCustomWidth && "min-w-[120px]",
                                            isSameDay(col.date, new Date()) && "bg-primary/5"
                                        )}
                                    >
                                        {col.header}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grid Body */}
                        <div className={cn(
                            "flex flex-1 relative overflow-y-auto min-h-0 max-h-[650px] scrollbar-hide",
                            !usesCustomWidth && "w-full"
                        )}>
                            {/* Hours column */}
                            <div className="w-[65px] shrink-0 border-r border-border bg-muted/5 select-none relative z-10 sticky left-0 bg-slate-950 dark:bg-[#0b0c10] z-20">
                                {HOURS.map((hour) => (
                                    <div key={hour} className="text-right pr-2 text-[11px] font-semibold text-muted-foreground/85" style={{ height: `${HOUR_HEIGHT}px`, paddingTop: '4px' }}>
                                        {`${hour.toString().padStart(2, '0')}:00`}
                                    </div>
                                ))}
                            </div>

                            {/* Columns grid */}
                            <div className={cn(
                                "flex-1 relative min-h-0 divide-x divide-border",
                                vistaActiva === 'semana' && 'grid grid-cols-7',
                                usesCustomWidth && 'flex',
                                vistaActiva === 'hoy' && 'grid'
                            )}
                            style={
                                vistaActiva === 'hoy'
                                    ? { gridTemplateColumns: `repeat(${profesionales.length}, minmax(0, 1fr))` }
                                    : undefined
                            }
                            >
                                {/* Background hour lines */}
                                <div className="absolute inset-0 pointer-events-none select-none">
                                    {HOURS.map((hour, idx) => (
                                        <div 
                                            key={hour} 
                                            className="absolute left-0 right-0 border-b border-border/40" 
                                            style={{ top: `${(idx + 1) * HOUR_HEIGHT}px`, height: '1px' }}
                                        />
                                    ))}
                                </div>

                                {/* Current Time Indicator Line spanning the whole grid (if today is visible) */}
                                {columns.some(col => isSameDay(col.date, new Date())) && (
                                    <CurrentTimeIndicator HOUR_HEIGHT={HOUR_HEIGHT} />
                                )}

                                {/* Drop columns */}
                                {columns.map((col, colIdx) => {
                                    const isColToday = isSameDay(col.date, new Date())
                                    return (
                                        <div
                                            key={colIdx}
                                            id={`agenda-col-${format(col.date, 'yyyy-MM-dd')}`}
                                            style={usesCustomWidth ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px` } : undefined}
                                            className={cn(
                                                "flex-1 relative h-[1120px] transition-colors hover:bg-white/[0.02]",
                                                !usesCustomWidth && "min-w-[120px]",
                                                isColToday && "bg-primary/[0.01]"
                                            )}
                                            onDragOver={(e) => handleDragOver(e, colIdx)}
                                            onDragLeave={() => setDraggedOverTime(null)}
                                            onDrop={(e) => handleDrop(e, col.date, col.profesionalId)}
                                            onClick={(e) => handleColumnClick(e, col.date, col.profesionalId)}
                                        >

                                            {/* Appointments cards */}
                                            {(() => {
                                                const overlapStyles = calculateOverlappingStyle(col.turnos)
                                                return col.turnos.map((turno: any) => {
                                                    const { top, height } = getCardPosition(turno.fecha_inicio, turno.fecha_fin)
                                                    const cardStyle = overlapStyles[turno.id] || { left: '4px', width: 'calc(100% - 8px)' }
                                                    return (
                                                        <TurnoCalendarCard
                                                            key={turno.id}
                                                            turno={turno}
                                                            top={cardStyle.top !== undefined ? cardStyle.top : top}
                                                            height={cardStyle.height !== undefined ? cardStyle.height : height}
                                                            left={cardStyle.left}
                                                            width={cardStyle.width}
                                                            colorProf={col.colorProf || turno.profesional?.color_agenda}
                                                            onSelect={() => setSelectedTurnoDetail(turno)}
                                                            onDragEnd={() => setDraggedOverTime(null)}
                                                        />
                                                    )
                                                })
                                            })()}

                                            {/* Drag-over Time Tooltip */}
                                            {draggedOverTime && draggedOverTime.colIndex === colIdx && (
                                                <div 
                                                    className={cn(
                                                        "absolute z-[99] pointer-events-none transition-all duration-75 flex items-center",
                                                        colIdx === columns.length - 1 ? "right-full mr-2" : "left-full ml-2"
                                                    )}
                                                    style={{ 
                                                        top: `${draggedOverTime.top - 12}px`
                                                    }}
                                                >
                                                    <span className="text-[10px] font-bold text-primary bg-background dark:bg-card border border-primary/45 px-2.5 py-1.5 rounded-md shadow-2xl flex items-center gap-1.5 font-mono whitespace-nowrap">
                                                        <Clock className="h-3.5 w-3.5 animate-pulse text-primary" />
                                                        Reprogramar: {draggedOverTime.time} hs
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Modal nuevo turno */}
            <NuevoTurnoModal
                open={modalOpen}
                onOpenChange={(o) => {
                    setModalOpen(o)
                    if (!o) setTurnoAEditar(null)
                }}
                profesionales={profesionales}
                tiposTratamiento={tiposTratamiento}
                pacientes={pacientes}
                defaultProfesionalId={modalProfId}
                defaultFecha={format(diaSeleccionado, 'yyyy-MM-dd')}
                defaultHora={modalHora}
                turnoAEditar={turnoAEditar}
                onSuccess={(turnoRaw, isEdit, nuevoPaciente) => {
                    const pacienteObj = nuevoPaciente || pacientes.find(p => p.id === turnoRaw.paciente_id)
                    const profesionalObj = profesionales.find(p => p.id === turnoRaw.profesional_id)
                    const tipoTratamientoObj = tiposTratamiento.find(t => t.id === turnoRaw.tipo_tratamiento_id)
                    
                    const turnoCompleto = {
                        ...turnoRaw,
                        paciente: pacienteObj ? {
                            id: pacienteObj.id,
                            nombre: pacienteObj.nombre,
                            apellido: pacienteObj.apellido,
                            telefono: pacienteObj.telefono,
                            dni: pacienteObj.dni
                        } : null,
                        profesional: profesionalObj ? {
                            id: profesionalObj.id,
                            nombre: profesionalObj.nombre,
                            apellido: profesionalObj.apellido,
                            color_agenda: profesionalObj.color_agenda
                        } : null,
                        tipo_tratamiento: tipoTratamientoObj ? {
                            id: tipoTratamientoObj.id,
                            nombre: tipoTratamientoObj.nombre,
                            duracion_minutos: tipoTratamientoObj.duracion_minutos,
                            prioridad: tipoTratamientoObj.prioridad,
                            color: tipoTratamientoObj.color
                        } : null
                    }

                    if (isEdit) {
                        setTurnos(prev => prev.map(t => t.id === turnoRaw.id ? turnoCompleto : t))
                    } else {
                        setTurnos(prev => [...prev, turnoCompleto])
                    }
                }}
            />

            {/* Modal de confirmación de eliminación */}
            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Eliminar turno"
                description="¿Estás seguro de que querés eliminar este turno? Esta acción no se puede deshacer."
                onConfirm={onConfirmDelete}
                isPending={isPending}
                confirmText="Eliminar turno"
            />

            {/* Modal de Notificar Demora */}
            <NotificarDemoraModal
                open={!!turnoADemorar}
                onOpenChange={(open) => !open && setTurnoADemorar(null)}
                turno={turnoADemorar}
            />

            {/* Modal de Detalle de Turno */}
            <TurnoDetailModal
                turno={selectedTurnoDetail}
                open={!!selectedTurnoDetail}
                onOpenChange={(open) => !open && setSelectedTurnoDetail(null)}
                onCambiarEstado={handleCambiarEstado}
                onEdit={handleEditTurno}
                onDelete={handleDeleteTurno}
                onNotifyDelay={(t) => setTurnoADemorar(t)}
                isPending={isPending}
                onAdd20Minutes={handleExtend20Minutes}
            />
        </div>
    )
}

/* ──────────── Helper Components ──────────── */

// Algoritmo estándar para calcular la superposición temporal y posicionar tarjetas en columnas laterales (como Google Calendar)
function calculateOverlappingStyle(turnos: any[]) {
    const sorted = [...turnos]
        .filter(t => t.fecha_inicio && t.fecha_fin)
        .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())

    const styles: Record<string, { width: string; left: string; top?: number; height?: number }> = {}
    if (sorted.length === 0) return styles

    const clusters: any[][] = []
    let currentCluster: any[] = []
    let maxEnd = 0

    for (const t of sorted) {
        const start = new Date(t.fecha_inicio).getTime()
        const end = new Date(t.fecha_fin).getTime()

        if (currentCluster.length === 0) {
            currentCluster.push(t)
            maxEnd = end
        } else if (start < maxEnd) {
            currentCluster.push(t)
            if (end > maxEnd) maxEnd = end
        } else {
            clusters.push(currentCluster)
            currentCluster = [t]
            maxEnd = end
        }
    }
    if (currentCluster.length > 0) {
        clusters.push(currentCluster)
    }

    for (const cluster of clusters) {
        const columns: number[] = []
        const eventCols: Record<string, number> = {}

        let minTop = Infinity
        let maxBottom = -Infinity

        for (const t of cluster) {
            const start = new Date(t.fecha_inicio).getTime()
            const end = new Date(t.fecha_fin).getTime()

            let colIndex = 0
            while (colIndex < columns.length && columns[colIndex] > start) {
                colIndex++
            }

            eventCols[t.id] = colIndex
            columns[colIndex] = end

            // Solo calcular minTop y maxBottom usando turnos que NO son sobreturnos para evitar que estiren el grupo
            if (t.es_sobreturno !== true) {
                const pos = getCardPosition(t.fecha_inicio, t.fecha_fin)
                if (pos.top < minTop) minTop = pos.top
                const bottom = pos.top + pos.height
                if (bottom > maxBottom) maxBottom = bottom
            }
        }

        if (minTop === Infinity) {
            // Si el cluster contiene solo sobreturnos
            for (const t of cluster) {
                const pos = getCardPosition(t.fecha_inicio, t.fecha_fin)
                if (pos.top < minTop) minTop = pos.top
                const bottom = pos.top + pos.height
                if (bottom > maxBottom) maxBottom = bottom
            }
        }

        const totalCols = columns.length
        const hasOverlap = totalCols > 1
        const unifiedHeight = maxBottom - minTop

        for (const t of cluster) {
            const colIndex = eventCols[t.id]
            const widthVal = 100 / totalCols
            const leftVal = colIndex * widthVal
            const isST = t.es_sobreturno === true

            styles[t.id] = {
                width: `calc(${widthVal}% - 4px)`,
                left: `calc(${leftVal}% + 2px)`,
                top: isST ? getCardPosition(t.fecha_inicio, t.fecha_fin).top : (hasOverlap ? minTop : undefined),
                height: isST ? getCardPosition(t.fecha_inicio, t.fecha_fin).height : (hasOverlap ? unifiedHeight : undefined),
            }
        }
    }

    return styles
}

interface TurnoCalendarCardProps {
    turno: any
    top: number
    height: number
    colorProf: string
    onSelect: () => void
    onDragEnd?: () => void
    left?: string
    width?: string
}

function TurnoCalendarCard({
    turno,
    top,
    height,
    colorProf,
    onSelect,
    onDragEnd,
    left,
    width,
}: TurnoCalendarCardProps) {
    const estado = turno.estado as EstadoTurno
    const isST = turno.es_sobreturno === true

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', turno.id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect()
    }

    const borderLeftColor = isST ? '#ef4444' : (turno.tipo_tratamiento?.color ?? colorProf)
    const bgColor = isST ? 'rgba(239, 68, 68, 0.15)' : `${turno.tipo_tratamiento?.color ?? colorProf}20`
    
    return (
        <motion.div
            draggable
            onDragStart={handleDragStart as any}
            onDragEnd={onDragEnd}
            onClick={handleClick}
            className={cn(
                "absolute rounded-lg shadow-sm overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none group",
                isST ? "border border-red-500/30 animate-pulse-subtle" : "border border-white/5",
                height < 50 ? "py-1 px-1.5 flex items-center justify-between" : "p-2"
            )}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                left: left || '4px',
                width: width || 'calc(100% - 8px)',
                borderLeft: `3px solid ${borderLeftColor}`,
                backgroundColor: bgColor,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {height < 50 ? (
                <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-foreground truncate">
                            {format(parseISO(turno.fecha_inicio), 'HH:mm')} {turno.paciente?.apellido}, {turno.paciente?.nombre?.charAt(0)}.
                        </span>
                        {isST && <span className="text-[8px] bg-red-500/20 text-red-400 font-bold px-0.5 rounded leading-none">ST</span>}
                    </div>
                    <div className="shrink-0 flex items-center scale-75 origin-right">
                        <StatusBadge status={estado} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full justify-between min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground">
                                {format(parseISO(turno.fecha_inicio), 'HH:mm')} — {format(parseISO(turno.fecha_fin), 'HH:mm')}
                            </span>
                            <div className="shrink-0 scale-75 origin-top-right">
                                <StatusBadge status={estado} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-foreground truncate mt-0.5 leading-snug group-hover:text-primary transition-colors">
                            {turno.paciente?.apellido}, {turno.paciente?.nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate leading-normal">
                            {turno.tipo_tratamiento?.nombre}
                        </p>
                    </div>
                    {isST && (
                        <div className="w-fit text-[8px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/25 rounded px-1 leading-none mt-1">
                            Sobreturno
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    )
}

function CurrentTimeIndicator({ HOUR_HEIGHT }: { HOUR_HEIGHT: number }) {
    const [now, setNow] = useState(new Date())
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const hours = now.getHours()
    const minutes = now.getMinutes()
    
    if (hours < 8 || hours >= 22) return null
    
    const top = ((hours - 8) + minutes / 60) * HOUR_HEIGHT

    return (
        <div 
            className="absolute left-0 right-0 z-30 flex items-center pointer-events-auto group cursor-help"
            style={{ top: `${top - 6}px`, height: '12px' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Tooltip */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: -26, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-[80px] bg-red-600 text-white text-[9px] font-extrabold px-2 py-1 rounded shadow-xl border border-red-500 whitespace-nowrap pointer-events-none z-50 flex items-center gap-1.5"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        HORA ACTUAL
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pulsing time dot */}
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 shrink-0 shadow-lg animate-pulse" />
            
            {/* Visual Time Badge (like Google Calendar) */}
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-[8px] font-extrabold text-white rounded shadow-sm uppercase tracking-wider shrink-0 select-none">
                {format(now, 'HH:mm')}
            </span>

            {/* Red Ruler Line */}
            <div className="flex-1 h-0.5 bg-red-500/80 ml-1.5" />
        </div>
    )
}

interface TurnoDetailModalProps {
    turno: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onCambiarEstado: (id: string, estado: EstadoTurno) => void
    onEdit: (turno: any) => void
    onDelete: (id: string) => void
    onNotifyDelay: (turno: any) => void
    isPending: boolean
    onAdd20Minutes?: (id: string) => void
}

function TurnoDetailModal({
    turno,
    open,
    onOpenChange,
    onCambiarEstado,
    onEdit,
    onDelete,
    onNotifyDelay,
    isPending,
    onAdd20Minutes,
}: TurnoDetailModalProps) {
    if (!turno) return null
    const estado = turno.estado as EstadoTurno
    const isST = turno.es_sobreturno === true

    const handleImprimirTicket = (t: any) => {
        const printWindow = window.open('', '_blank', 'width=350,height=600');
        if (!printWindow) {
            alert('Por favor habilite las ventanas emergentes (popups) para poder imprimir el comprobante.');
            return;
        }

        const fechaObj = parseISO(t.fecha_inicio);
        const fechaFormateada = format(fechaObj, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
        const horaFormateada = format(fechaObj, 'HH:mm');
        const pacienteNombre = `${t.paciente?.apellido || ''}, ${t.paciente?.nombre || ''}`;
        const dni = t.paciente?.dni || 'No registrado';
        const telefono = t.paciente?.telefono || 'No registrado';
        const profesional = `Dr. ${t.profesional?.nombre || ''} ${t.profesional?.apellido || ''}`;
        const tratamiento = t.tipo_tratamiento?.nombre || 'Consulta General';
        const esST = t.es_sobreturno === true;

        let ticketHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>Comprobante de Turno</title>
                    <style>
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                        body {
                            font-family: 'Courier New', Courier, monospace;
                            width: 72mm;
                            margin: 0;
                            padding: 8px 12px 24px 12px;
                            font-size: 11px;
                            color: #000;
                            line-height: 1.3;
                            box-sizing: border-box;
                        }
                        .text-center {
                            text-align: center;
                        }
                        .bold {
                            font-weight: bold;
                        }
                        .divider {
                            border-top: 1px dashed #000;
                            margin: 6px 0;
                            height: 0;
                        }
                        .header {
                            font-size: 14px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin-bottom: 2px;
                        }
                        .subtitle {
                            font-size: 9px;
                            margin-bottom: 8px;
                        }
                        .title-ticket {
                            font-size: 12px;
                            font-weight: bold;
                            margin: 6px 0;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .section-title {
                            font-size: 8px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin-top: 5px;
                            color: #444;
                        }
                        .section-value {
                            font-size: 12px;
                            margin-bottom: 4px;
                            word-wrap: break-word;
                        }
                        .time-block {
                            font-size: 15px;
                            font-weight: bold;
                            margin: 4px 0;
                        }
                        .footer-msg {
                            font-size: 11px;
                            margin-top: 12px;
                            text-align: center;
                            line-height: 1.4;
                        }
                        .sobreturno-badge {
                            border: 1px solid #000;
                            padding: 2px 6px;
                            display: inline-block;
                            margin: 4px 0;
                            font-weight: bold;
                            font-size: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="text-center">
                        <div class="header">CONSULTORIO ALVAREZ</div>
                        <div class="subtitle">Odontología Integral</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="text-center title-ticket">
                        COMPROBANTE DE TURNO
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div>
                        <div class="section-title">Paciente</div>
                        <div class="section-value bold">${pacienteNombre}</div>
                        
                        <div class="section-title">DNI</div>
                        <div class="section-value">${dni}</div>`;

        if (telefono && telefono !== 'No registrado') {
            ticketHtml += `
                        <div class="section-title">Teléfono</div>
                        <div class="section-value">${telefono}</div>`;
        }

        ticketHtml += `
                        <div class="divider"></div>
                        
                        <div class="section-title">Fecha</div>
                        <div class="section-value bold" style="text-transform: capitalize;">${fechaFormateada}</div>
                        
                        <div class="section-title">Hora</div>
                        <div class="time-block">${horaFormateada} hs</div>`;

        if (esST) {
            ticketHtml += `
                        <div class="text-center">
                            <span class="sobreturno-badge">SOBRETURNO</span>
                        </div>`;
        }

        ticketHtml += `
                        <div class="section-title">Profesional</div>
                        <div class="section-value">${profesional}</div>
                        
                        <div class="section-title">Tratamiento</div>
                        <div class="section-value">${tratamiento}</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="footer-msg">
                        Recuerde que podrá autogestionar su turno<br>
                        desde nuestra nueva web:<br>
                        <strong>www.dentalva.ar</strong>!
                    </div>
                    
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 300);
                        }
                    </script>
                </body>
            </html>`;

        printWindow.document.write(ticketHtml);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="dark sm:max-w-[425px] bg-black border border-white/15 text-slate-100 shadow-2xl p-6 rounded-2xl overflow-hidden">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(parseISO(turno.fecha_inicio), "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                        <StatusBadge status={estado} />
                    </div>
                    <DialogTitle className="text-xl font-bold pt-2 flex items-center gap-2 text-slate-100">
                        {turno.paciente?.apellido}, {turno.paciente?.nombre}
                        {isST && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">
                                Sobreturno
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4 text-sm">
                    {/* Paciente details block */}
                    <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/5 space-y-2.5">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-medium text-slate-200">Paciente: {turno.paciente?.apellido}, {turno.paciente?.nombre}</span>
                        </div>
                        {turno.paciente?.dni && (
                            <div className="flex items-center gap-2 pl-6 text-xs text-slate-400">
                                <span>DNI: {turno.paciente.dni}</span>
                            </div>
                        )}
                        {turno.paciente?.telefono && (
                            <div className="flex items-center gap-2 pl-6 text-xs text-slate-400">
                                <span>Tel: {turno.paciente.telefono}</span>
                            </div>
                        )}
                    </div>

                    {/* Tratamiento & Profesional block */}
                    <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-200">Tratamiento: {turno.tipo_tratamiento?.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: turno.profesional?.color_agenda }} />
                            <span className="text-xs font-medium text-slate-200">Dr. {turno.profesional?.nombre} {turno.profesional?.apellido}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-6 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Horario: {format(parseISO(turno.fecha_inicio), 'HH:mm')} — {format(parseISO(turno.fecha_fin), 'HH:mm')}</span>
                        </div>
                    </div>

                    {/* Notas block */}
                    {turno.notas && (
                        <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Notas:</p>
                            <p className="text-xs italic text-slate-300 font-mono bg-black/40 p-2 rounded-lg border border-white/5 whitespace-pre-line leading-relaxed">{turno.notas}</p>
                        </div>
                    )}
                </div>

                {/* Footer and Actions */}
                <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-white/5">
                    {/* Status change actions */}
                    <div className="flex flex-wrap gap-1.5 mr-auto">
                        {estado === 'PENDIENTE' && (
                            <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 border border-white/15 hover:bg-white/10 text-slate-200"
                                onClick={() => { onCambiarEstado(turno.id, 'CONFIRMADO'); onOpenChange(false); }} disabled={isPending}>
                                ✓ Confirmar
                            </GlassButton>
                        )}
                        {estado === 'CONFIRMADO' && (
                            <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                                onClick={() => { onCambiarEstado(turno.id, 'EN_SALA'); onOpenChange(false); }} disabled={isPending}>
                                🔔 En sala
                            </GlassButton>
                        )}
                        {estado === 'EN_SALA' && (
                            <GlassButton size="sm" variant="success" className="h-8 text-xs px-3"
                                onClick={() => { onCambiarEstado(turno.id, 'ATENDIDO'); onOpenChange(false); }} disabled={isPending}>
                                ✓ Atendido
                            </GlassButton>
                        )}
                        {!['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(estado) && (
                            <GlassButton size="sm" variant="ghost" className="h-8 text-xs px-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 border-transparent"
                                onClick={() => { onCambiarEstado(turno.id, 'CANCELADO'); onOpenChange(false); }} disabled={isPending}>
                                Cancelar
                            </GlassButton>
                        )}
                        {estado === 'ATENDIDO' && (
                            <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 border border-white/15 hover:bg-white/10 text-slate-200"
                                onClick={() => { onCambiarEstado(turno.id, 'PENDIENTE'); onOpenChange(false); }} disabled={isPending}>
                                Revertir a pendiente
                            </GlassButton>
                        )}
                        {!['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(estado) && (
                            <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400"
                                onClick={() => { onAdd20Minutes?.(turno.id); }} disabled={isPending}>
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                +20 Min
                            </GlassButton>
                        )}
                        {turno.paciente?.telefono && (
                            <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400"
                                onClick={() => { onNotifyDelay(turno); onOpenChange(false); }} disabled={isPending}>
                                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                Demora
                            </GlassButton>
                        )}
                    </div>

                    {/* Edit/Delete actions */}
                    <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                        <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                            onClick={() => handleImprimirTicket(turno)}>
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            Ticket
                        </GlassButton>
                        <GlassButton size="sm" variant="glass" className="h-8 text-xs px-3 text-blue-400 border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10"
                            onClick={() => { onEdit(turno); onOpenChange(false); }} disabled={isPending}>
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Editar
                        </GlassButton>
                        <GlassButton size="sm" variant="glass" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                            onClick={() => { onDelete(turno.id); onOpenChange(false); }} disabled={isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </GlassButton>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

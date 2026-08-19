'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Edit2, CheckSquare, MessageSquare, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Info, PhoneCall } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { glassAlert } from '@/components/ui/glass-alert'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { enviarRecordatorioManual } from '@/lib/actions/turnos'
import { cn, normalizarTelefonoArgentino } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { EstadoTurno } from '@/types'

interface Recordatorio {
    id: string
    created_at: string
    estado_envio: string
    error_detalle?: string | null
    mensaje_enviado?: string | null
}

interface TurnoSinConfirmar {
    id: string
    fecha_inicio: string
    estado: string
    notas: string | null
    numero_pieza: string | null
    paciente: {
        id: string
        nombre: string
        apellido: string
        telefono: string | null
    } | null
    profesional: {
        id: string
        nombre: string
        apellido: string
        color_agenda: string
    } | null
    tipo_tratamiento: {
        id: string
        nombre: string
        duracion_minutos: number
        prioridad: string
        color: string
    } | null
    recordatorios: Recordatorio[]
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.76.459 3.477 1.332 4.992l-1.417 5.176 5.297-1.39c1.463.798 3.111 1.218 4.774 1.219h.004c5.505 0 9.987-4.482 9.987-9.989 0-2.67-1.039-5.18-2.926-7.069C17.202 3.039 14.686 2 12.012 2zm6.657 14.156c-.274.772-1.34 1.408-1.854 1.488-.475.074-.954.121-2.99-.706-2.607-1.058-4.267-3.714-4.397-3.887-.13-.173-1.053-1.401-1.053-2.673 0-1.272.663-1.897.902-2.148.239-.251.52-.314.693-.314.173 0 .346.002.498.01.156.008.365-.06.572.441.214.52.733 1.785.798 1.916.065.13.108.281.022.455-.087.173-.13.282-.26.433-.13.152-.272.339-.39.455-.13.13-.266.27-.115.53.152.259.673 1.111 1.442 1.796.993.883 1.826 1.156 2.086 1.286.26.13.411.108.563-.065.152-.173.65-.758.823-1.017.173-.259.346-.216.584-.13.238.086 1.516.714 1.776.844.26.13.433.195.498.303.065.108.065.627-.209 1.399z" />
    </svg>
)

function getFriendlyErrorMessage(rawError?: string | null): { friendly: string; technical: string } {
    if (!rawError) {
        return {
            friendly: 'No se pudo entregar el mensaje por WhatsApp.',
            technical: 'Sin detalle provisto por el servidor de Meta.'
        }
    }
    const lower = rawError.toLowerCase()
    let friendly = 'Ocurrió un error al enviar el mensaje de WhatsApp.'

    if (lower.includes('131026') || lower.includes('outside the allowed window') || lower.includes('24 hour')) {
        friendly = 'Pasaron más de 24hs sin mensaje del paciente. Meta exige plantilla pre-aprobada.'
    } else if (lower.includes('131030') || lower.includes('option not available') || lower.includes('not a whatsapp user')) {
        friendly = 'El celular ingresado no tiene una cuenta activa en WhatsApp.'
    } else if (lower.includes('invalid') || lower.includes('phone') || lower.includes('recipient')) {
        friendly = 'El número de teléfono tiene formato inválido (verificar código de área).'
    } else if (lower.includes('token') || lower.includes('auth') || lower.includes('access_token')) {
        friendly = 'Credencial de Meta WhatsApp caducada. Requiere reautenticación.'
    } else if (lower.includes('limit') || lower.includes('rate')) {
        friendly = 'Límite de mensajes por minuto alcanzado. Reintentar en un instante.'
    }

    return { friendly, technical: rawError }
}

interface TurnosSinConfirmarSectionProps {
    initialTurnos: TurnoSinConfirmar[]
}

export function TurnosSinConfirmarSection({ initialTurnos }: TurnosSinConfirmarSectionProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
    const [localSentMap, setLocalSentMap] = useState<Record<string, { timestamp: string; status: string; errorDetalle?: string }>>({})

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('turnos-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'turnos'
                },
                () => {
                    startTransition(() => {
                        router.refresh()
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    const handleSendReminder = async (turnoId: string) => {
        setLoadingMap(prev => ({ ...prev, [turnoId]: true }))
        
        try {
            const res = await enviarRecordatorioManual(turnoId)
            
            if (res.error) {
                glassAlert.error({
                    title: 'Error al enviar recordatorio',
                    description: res.error
                })
                setLocalSentMap(prev => ({
                    ...prev,
                    [turnoId]: { timestamp: new Date().toISOString(), status: 'FALLIDO', errorDetalle: res.error }
                }))
            } else {
                glassAlert.success({
                    title: 'Recordatorio enviado',
                    description: 'Se ha enviado el recordatorio de WhatsApp correctamente.'
                })
                setLocalSentMap(prev => ({
                    ...prev,
                    [turnoId]: { timestamp: new Date().toISOString(), status: 'ENVIADO' }
                }))
                
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            glassAlert.error({
                title: 'Excepción de red',
                description: err?.message || 'Error al comunicarse con el servidor'
            })
        } finally {
            setLoadingMap(prev => ({ ...prev, [turnoId]: false }))
        }
    }

    const getStatusTextAndIcon = (turno: TurnoSinConfirmar) => {
        const local = localSentMap[turno.id]
        
        if (local) {
            const timeStr = format(new Date(local.timestamp), 'HH:mm')
            if (local.status === 'ENVIADO') {
                return {
                    label: 'Enviado',
                    subLabel: `hoy ${timeStr}`,
                    errorDetalle: null,
                    className: 'text-emerald-600 bg-emerald-500/15 border-emerald-500/30 font-semibold',
                    icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                }
            } else {
                return {
                    label: 'Fallo',
                    subLabel: `hoy ${timeStr}`,
                    errorDetalle: local.errorDetalle || 'Error en envío local',
                    className: 'text-red-600 bg-red-500/20 border-red-500/40 font-bold animate-pulse',
                    icon: <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                }
            }
        }

        const sorted = [...(turno.recordatorios || [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const last = sorted[0]

        if (!last) {
            return {
                label: 'Sin notificar',
                subLabel: null,
                errorDetalle: null,
                className: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30 font-semibold',
                icon: <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            }
        }

        const dateStr = format(new Date(last.created_at), 'dd/MM HH:mm')
        if (last.estado_envio === 'RESPONDIDO') {
            return {
                label: 'Respondido',
                subLabel: dateStr,
                errorDetalle: null,
                className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.1)]',
                icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            }
        } else if (last.estado_envio === 'ENVIADO') {
            return {
                label: 'Enviado',
                subLabel: dateStr,
                errorDetalle: null,
                className: 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30 font-semibold shadow-[0_0_10px_rgba(59,130,246,0.1)]',
                icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            }
        } else {
            return {
                label: 'Fallo',
                subLabel: dateStr,
                errorDetalle: last.error_detalle || 'Falló la entrega en WhatsApp',
                className: 'text-red-600 dark:text-red-400 bg-red-500/20 border-red-500/40 font-bold shadow-[0_0_12px_rgba(239,68,68,0.2)]',
                icon: <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            }
        }
    }

    return (
        <TooltipProvider delay={0}>
            <div className="space-y-4">
                <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left justify-between gap-1 md:gap-0">
                    <div className="flex flex-col items-center md:items-start">
                        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center md:justify-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />
                            Control de Confirmación de Turnos
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Próximos turnos y sus estados de confirmación vía WhatsApp.
                        </p>
                    </div>
                </div>

                {initialTurnos.length === 0 ? (
                    <div className="glass rounded-2xl shadow-glass p-8 text-center border border-dashed border-border/40">
                        <CheckSquare className="h-10 w-10 text-emerald-500/50 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">Todos los turnos al día</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            No hay turnos futuros pendientes ni cancelaciones para gestionar.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop View: Animated Horizontal Cards */}
                        <div className="hidden md:block space-y-2.5">
                            {/* Header */}
                            <div className="grid grid-cols-[1.5fr_1.3fr_1.2fr_1.2fr_1.1fr_1fr_auto] items-center px-4 py-2.5 bg-muted/20 rounded-xl text-xs font-bold text-muted-foreground uppercase tracking-wider border border-border/30">
                                <div>Fecha / Hora</div>
                                <div>Paciente</div>
                                <div>Profesional</div>
                                <div>Tratamiento</div>
                                <div>Estado</div>
                                <div>Recordatorio</div>
                                <div className="text-right pr-2">Acciones</div>
                            </div>

                            {/* Body: Animated Rows */}
                            <div className="space-y-2.5">
                                <AnimatePresence initial={false}>
                                    {initialTurnos.map((turno) => {
                                        const dateObj = new Date(turno.fecha_inicio)
                                        const dayDateStr = format(dateObj, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())
                                        const timeStr = format(dateObj, "HH:mm 'hs'")
                                        const status = getStatusTextAndIcon(turno)
                                        const isSending = loadingMap[turno.id]
                                        const isCancelled = turno.estado === 'CANCELADO'
                                        const isPendingStatus = turno.estado === 'PENDIENTE'
                                        const isUrgent = isPendingStatus && (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000
                                        const isConfirmed = turno.estado === 'CONFIRMADO'

                                        const errInfo = getFriendlyErrorMessage(status.errorDetalle)

                                        return (
                                            <motion.div
                                                key={turno.id}
                                                className={cn(
                                                    "grid grid-cols-[1.5fr_1.3fr_1.2fr_1.2fr_1.1fr_1fr_auto] items-center px-4 py-3.5 rounded-2xl border relative will-change-transform transform-gpu shadow-sm",
                                                    isCancelled
                                                        ? "bg-red-500/20 dark:bg-red-950/50 hover:bg-red-500/25 border-red-500/50 border-l-[6px] border-l-red-600 animate-card-pulse-red"
                                                        : isPendingStatus
                                                            ? "bg-amber-500/15 dark:bg-amber-950/40 hover:bg-amber-500/20 border-amber-500/40 border-l-[6px] border-l-amber-500 animate-card-pulse-amber"
                                                            : isConfirmed 
                                                                ? "bg-emerald-500/12 dark:bg-emerald-950/35 hover:bg-emerald-500/18 border-emerald-500/30 border-l-[5px] border-l-emerald-500" 
                                                                : "glass border-border/40 hover:bg-muted/10"
                                                )}
                                                initial={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                {/* Fecha y Hora */}
                                                <div className="flex flex-col gap-1 pr-2">
                                                    {isCancelled && (
                                                        <span className="inline-flex items-center gap-1.5 text-white font-extrabold text-[11px] bg-red-600 border border-red-700 px-2 py-0.5 rounded-full shadow-md animate-bounce shrink-0 w-fit">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                            ¡CANCELADO POR PACIENTE!
                                                        </span>
                                                    )}
                                                    {isUrgent && !isCancelled && (
                                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[10px] bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse shrink-0 w-fit">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                                            &lt; 48hs PENDIENTE
                                                        </span>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-foreground text-sm whitespace-nowrap">
                                                            {dayDateStr}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                            {timeStr}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Paciente */}
                                                <div className="pr-2">
                                                    <p className="font-bold text-foreground text-sm">
                                                        {turno.paciente ? `${turno.paciente.apellido || ''} ${turno.paciente.nombre || ''}`.trim() : '—'}
                                                    </p>
                                                    {turno.paciente?.telefono && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap font-mono">
                                                            {turno.paciente.telefono}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Profesional */}
                                                <div className="flex items-center gap-2 pr-2">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: turno.profesional?.color_agenda }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground font-semibold text-sm whitespace-nowrap">
                                                            Dr. {turno.profesional?.apellido}
                                                        </span>
                                                        {turno.profesional?.nombre && (
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {turno.profesional.nombre}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tratamiento */}
                                                <div className="flex items-center gap-1.5 pr-2 max-w-[120px] xl:max-w-[160px]">
                                                    <span className="text-muted-foreground text-xs truncate font-medium" title={turno.tipo_tratamiento?.nombre || 'Consulta'}>
                                                        {turno.tipo_tratamiento?.nombre || 'Consulta'}
                                                    </span>
                                                    {turno.numero_pieza && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0 whitespace-nowrap">
                                                            Pza. {turno.numero_pieza}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Estado de Confirmación (Pulsante) */}
                                                <div className="whitespace-nowrap pr-2">
                                                    <StatusBadge
                                                        status={turno.estado as EstadoTurno}
                                                        pulse={isCancelled || isPendingStatus}
                                                    />
                                                </div>

                                                {/* Estado Recordatorio con Tooltip de Error */}
                                                <div className="pr-2">
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <div className="flex flex-col items-start cursor-pointer group">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${status.className}`}>
                                                                    {status.icon}
                                                                    {status.label}
                                                                    {status.errorDetalle && (
                                                                        <Info className="h-3 w-3 ml-0.5 text-red-500 animate-pulse" />
                                                                    )}
                                                                </span>
                                                                {status.subLabel && (
                                                                    <span className="text-[10px] text-muted-foreground mt-1 ml-1 whitespace-nowrap font-medium">
                                                                        {status.subLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md rounded-xl space-y-1.5">
                                                            <div className="flex items-center gap-1.5 font-bold text-xs">
                                                                {status.icon}
                                                                <span>Recordatorio: {status.label}</span>
                                                            </div>
                                                            {status.subLabel && (
                                                                <p className="text-[11px] text-slate-300">
                                                                    Intentado el: <span className="font-semibold text-white">{status.subLabel}</span>
                                                                </p>
                                                            )}
                                                            {status.errorDetalle ? (
                                                                <div className="pt-1 border-t border-slate-700/60 space-y-1">
                                                                    <p className="text-[11px] text-red-400 font-semibold flex items-start gap-1">
                                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                                        <span>{errInfo.friendly}</span>
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-400 font-mono bg-black/40 p-1.5 rounded border border-slate-800 break-words">
                                                                        {errInfo.technical}
                                                                    </p>
                                                                    <p className="text-[10px] text-emerald-400 font-medium">
                                                                        💡 Consejo: Haz clic en &quot;WhatsApp&quot; para enviar un mensaje directo.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-emerald-400 font-medium pt-1 border-t border-slate-700/60">
                                                                    ✅ Notificación procesada correctamente vía Meta API WhatsApp.
                                                                </p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                {/* Acciones */}
                                                <div className="text-right">
                                                    <div className="inline-flex items-center gap-1 justify-end">
                                                        {isCancelled ? (
                                                            <GlassButton
                                                                size="sm"
                                                                variant="glass"
                                                                className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white font-bold border-red-700 shadow-md shrink-0 animate-pulse"
                                                                onClick={() => {
                                                                    const normalized = normalizarTelefonoArgentino(turno.paciente?.telefono || '')
                                                                    const waPhone = normalized.startsWith('54') ? `549${normalized.substring(2)}` : normalized
                                                                    window.open(`https://wa.me/${waPhone}?text=Hola%20${encodeURIComponent(turno.paciente?.nombre || '')},%20vemos%20que%20cancelaste%20tu%20turno.%20¿Te%20gustaría%20re-agendar%20para%20otro%20día?`, '_blank')
                                                                }}
                                                                disabled={!turno.paciente?.telefono}
                                                                title="Llamar / Escribir al paciente para re-agendar"
                                                            >
                                                                <PhoneCall className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                                Re-agendar por WA
                                                            </GlassButton>
                                                        ) : (
                                                            <>
                                                                <GlassButton
                                                                    size="sm"
                                                                    variant="glass"
                                                                    className="h-8 px-2 2xl:px-3 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0"
                                                                    onClick={() => {
                                                                        const normalized = normalizarTelefonoArgentino(turno.paciente?.telefono || '')
                                                                        const waPhone = normalized.startsWith('54') ? `549${normalized.substring(2)}` : normalized
                                                                        window.open(`https://wa.me/${waPhone}`, '_blank')
                                                                    }}
                                                                    disabled={!turno.paciente?.telefono}
                                                                    title={turno.paciente?.telefono ? 'Abrir chat de WhatsApp' : 'Paciente sin Teléfono'}
                                                                >
                                                                    <WhatsAppIcon className="h-3.5 w-3.5 2xl:mr-1 shrink-0 text-emerald-500" />
                                                                    <span className="hidden 2xl:inline">WhatsApp</span>
                                                                </GlassButton>
                                                                <GlassButton
                                                                    size="sm"
                                                                    variant="glass"
                                                                    className="h-8 px-2 2xl:px-3 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0"
                                                                    onClick={() => handleSendReminder(turno.id)}
                                                                    loading={isSending}
                                                                    disabled={isSending || !turno.paciente?.telefono || turno.estado === 'CONFIRMADO'}
                                                                    title={turno.estado === 'CONFIRMADO' ? 'Turno ya confirmado' : turno.paciente?.telefono ? 'Enviar Recordatorio WhatsApp' : 'Paciente sin Teléfono'}
                                                                >
                                                                    <Bell className="h-3.5 w-3.5 2xl:mr-1 shrink-0" />
                                                                    <span className="hidden 2xl:inline">Recordatorio</span>
                                                                </GlassButton>
                                                            </>
                                                        )}
                                                        <GlassButton
                                                            size="sm"
                                                            variant="glass"
                                                            className="h-8 px-2 2xl:px-3 border-primary/30 hover:border-primary/60 text-primary font-semibold shrink-0"
                                                            onClick={() => router.push(`/agenda?edit=${turno.id}`)}
                                                            title="Editar turno"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5 2xl:mr-1 shrink-0" />
                                                            <span className="hidden 2xl:inline">Editar</span>
                                                        </GlassButton>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Mobile View Cards */}
                        <div className="block md:hidden space-y-3">
                            <AnimatePresence initial={false}>
                                {initialTurnos.map((turno) => {
                                    const dateObj = new Date(turno.fecha_inicio)
                                    const formattedDate = format(dateObj, "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es })
                                        .replace(/^\w/, (c) => c.toUpperCase())
                                    const status = getStatusTextAndIcon(turno)
                                    const isSending = loadingMap[turno.id]
                                    const isCancelled = turno.estado === 'CANCELADO'
                                    const isPendingStatus = turno.estado === 'PENDIENTE'
                                    const isUrgent = isPendingStatus && (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000
                                    const isConfirmed = turno.estado === 'CONFIRMADO'
                                    const errInfo = getFriendlyErrorMessage(status.errorDetalle)

                                    return (
                                        <motion.div
                                            key={turno.id}
                                            className={cn(
                                                "glass rounded-2xl p-4 border space-y-3 relative will-change-transform transform-gpu",
                                                isCancelled
                                                    ? "bg-red-500/20 dark:bg-red-950/50 border-red-500/50 border-l-[6px] border-l-red-600 animate-card-pulse-red"
                                                    : isPendingStatus
                                                        ? "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500/40 border-l-[5px] border-l-amber-500 animate-card-pulse-amber"
                                                        : isConfirmed 
                                                            ? "bg-emerald-500/12 dark:bg-emerald-950/35 border-emerald-500/30 border-l-[4px] border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.06)]" 
                                                            : "border-border/40"
                                            )}
                                            initial={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {/* Header: Date and status badge */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-bold text-foreground text-sm flex flex-col gap-1">
                                                    {isCancelled && (
                                                        <span className="inline-flex items-center gap-1 text-white font-extrabold text-[10px] bg-red-600 border border-red-700 px-2 py-0.5 rounded-full animate-bounce shrink-0">
                                                            <AlertTriangle className="h-3 w-3 shrink-0" />
                                                            ¡TURNO CANCELADO!
                                                        </span>
                                                    )}
                                                    {isUrgent && !isCancelled && (
                                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[10px] bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                                            &lt; 48hs
                                                        </span>
                                                    )}
                                                    <span>{formattedDate}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <div className="cursor-pointer">
                                                                <span className={cn(
                                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0',
                                                                    status.className
                                                                )}>
                                                                    {status.icon}
                                                                    {status.label}
                                                                </span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900/95 text-white border border-slate-700 rounded-xl">
                                                            <p className="font-bold text-xs">{status.label}</p>
                                                            {status.errorDetalle && (
                                                                <p className="text-[10px] text-red-300 mt-1">{errInfo.friendly}</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {status.subLabel && (
                                                        <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap font-medium">
                                                            {status.subLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Estado de Confirmación (Mobile) */}
                                            <div className="mt-1">
                                                <StatusBadge
                                                    status={turno.estado as EstadoTurno}
                                                    pulse={isCancelled || isPendingStatus}
                                                />
                                            </div>

                                            {/* Details grid: Patient, Professional, Treatment */}
                                            <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/10 py-3">
                                                <div className="space-y-1">
                                                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Paciente</p>
                                                    <p className="font-bold text-foreground">
                                                        {turno.paciente ? `${turno.paciente.apellido || ''} ${turno.paciente.nombre || ''}`.trim() : '—'}
                                                    </p>
                                                    {turno.paciente?.telefono && (
                                                        <p className="text-muted-foreground text-[11px] font-mono">{turno.paciente.telefono}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Profesional</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="h-2 w-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: turno.profesional?.color_agenda }}
                                                        />
                                                        <span className="text-foreground font-semibold truncate">
                                                            Dr. {turno.profesional?.nombre} {turno.profesional?.apellido}
                                                        </span>
                                                    </div>
                                                    {turno.tipo_tratamiento?.nombre && (
                                                        <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                                            <span className="text-muted-foreground text-[11px] truncate font-medium">
                                                                {turno.tipo_tratamiento.nombre}
                                                            </span>
                                                            {turno.numero_pieza && (
                                                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 border border-amber-500/30 shrink-0 whitespace-nowrap">
                                                                    Pza. {turno.numero_pieza}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 pt-1">
                                                {isCancelled ? (
                                                    <GlassButton
                                                        size="sm"
                                                        variant="glass"
                                                        className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white font-bold text-xs justify-center border-red-700 animate-pulse shadow-md"
                                                        onClick={() => {
                                                            const normalized = normalizarTelefonoArgentino(turno.paciente?.telefono || '')
                                                            const waPhone = normalized.startsWith('54') ? `549${normalized.substring(2)}` : normalized
                                                            window.open(`https://wa.me/${waPhone}?text=Hola%20${encodeURIComponent(turno.paciente?.nombre || '')},%20vemos%20que%20cancelaste%20tu%20turno.%20¿Te%20gustaría%20re-agendar%20para%20otro%20día?`, '_blank')
                                                        }}
                                                        disabled={!turno.paciente?.telefono}
                                                    >
                                                        <PhoneCall className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                        Re-agendar WA
                                                    </GlassButton>
                                                ) : (
                                                    <>
                                                        <GlassButton
                                                            size="sm"
                                                            variant="glass"
                                                            className="flex-1 h-9 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs justify-center"
                                                            onClick={() => {
                                                                const normalized = normalizarTelefonoArgentino(turno.paciente?.telefono || '')
                                                                const waPhone = normalized.startsWith('54') ? `549${normalized.substring(2)}` : normalized
                                                                window.open(`https://wa.me/${waPhone}`, '_blank')
                                                            }}
                                                            disabled={!turno.paciente?.telefono}
                                                        >
                                                            <WhatsAppIcon className="h-3.5 w-3.5 mr-1 shrink-0 text-emerald-500" />
                                                            WhatsApp
                                                        </GlassButton>
                                                        <GlassButton
                                                            size="sm"
                                                            variant="glass"
                                                            className="flex-1 h-9 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs justify-center"
                                                            onClick={() => handleSendReminder(turno.id)}
                                                            loading={isSending}
                                                            disabled={isSending || !turno.paciente?.telefono || turno.estado === 'CONFIRMADO'}
                                                        >
                                                            <Bell className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                            Recordatorio
                                                        </GlassButton>
                                                    </>
                                                )}
                                                <GlassButton
                                                    size="sm"
                                                    variant="glass"
                                                    className="flex-1 h-9 border-primary/30 hover:border-primary/60 text-primary font-semibold text-xs justify-center"
                                                    onClick={() => router.push(`/agenda?edit=${turno.id}`)}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                                                    Editar
                                                </GlassButton>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </TooltipProvider>
    )
}

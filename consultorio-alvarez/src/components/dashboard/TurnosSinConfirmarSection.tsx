'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Edit2, CheckSquare, MessageSquare, AlertTriangle, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { glassAlert } from '@/components/ui/glass-alert'
import { motion, AnimatePresence } from 'framer-motion'
import { enviarRecordatorioManual } from '@/lib/actions/turnos'
import { cn, normalizarTelefonoArgentino } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Recordatorio {
    id: string
    created_at: string
    estado_envio: string
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

interface TurnosSinConfirmarSectionProps {
    initialTurnos: TurnoSinConfirmar[]
}

export function TurnosSinConfirmarSection({ initialTurnos }: TurnosSinConfirmarSectionProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
    const [localSentMap, setLocalSentMap] = useState<Record<string, { timestamp: string; status: string }>>({})

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
                (payload) => {
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
                    [turnoId]: { timestamp: new Date().toISOString(), status: 'FALLIDO' }
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
                
                // Actualizar servidor en segundo plano
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
        
        // Si hay estado local (recién enviado), usarlo
        if (local) {
            const timeStr = format(new Date(local.timestamp), 'HH:mm')
            if (local.status === 'ENVIADO') {
                return {
                    label: 'Enviado',
                    subLabel: `hoy ${timeStr}`,
                    className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                    icon: <CheckCircle2 className="h-3 w-3 shrink-0" />
                }
            } else {
                return {
                    label: 'Fallo',
                    subLabel: `hoy ${timeStr}`,
                    className: 'text-red-500 bg-red-500/10 border-red-500/20',
                    icon: <XCircle className="h-3 w-3 shrink-0" />
                }
            }
        }

        // Si no hay local, buscar en la lista de recordatorios de la DB
        const sorted = [...(turno.recordatorios || [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const last = sorted[0]

        if (!last) {
            return {
                label: 'Sin notificar',
                subLabel: null,
                className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                icon: <AlertCircle className="h-3 w-3 shrink-0" />
            }
        }

        const dateStr = format(new Date(last.created_at), 'dd/MM HH:mm')
        if (last.estado_envio === 'RESPONDIDO') {
            return {
                label: 'Respondido',
                subLabel: dateStr,
                className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.02)]',
                icon: <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            }
        } else if (last.estado_envio === 'ENVIADO') {
            return {
                label: 'Enviado',
                subLabel: dateStr,
                className: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.02)]',
                icon: <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />
            }
        } else {
            return {
                label: 'Fallo',
                subLabel: dateStr,
                className: 'text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.02)]',
                icon: <XCircle className="h-3 w-3 shrink-0 text-red-500" />
            }
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left justify-between gap-1 md:gap-0">
                <div className="flex flex-col items-center md:items-start">
                    <h2 className="text-lg font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
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
                    <h3 className="text-sm font-semibold text-foreground">Todos los turnos confirmados</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        No hay turnos futuros pendientes de confirmación.
                    </p>
                </div>
            ) : (
                <>
                    {/* Desktop View Table */}
                    <div className="hidden md:block glass rounded-2xl shadow-glass overflow-hidden border border-border/40">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/40 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <th className="py-3 px-2 lg:px-4">Fecha / Hora</th>
                                        <th className="py-3 px-2 lg:px-4">Paciente</th>
                                        <th className="py-3 px-2 lg:px-4">Profesional</th>
                                        <th className="py-3 px-2 lg:px-4">Tratamiento</th>
                                        <th className="py-3 px-2 lg:px-4">Estado</th>
                                        <th className="py-3 px-2 lg:px-4">Recordatorio</th>
                                        <th className="py-3 px-2 lg:px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20 text-sm">
                                    <AnimatePresence initial={false}>
                                        {initialTurnos.map((turno) => {
                                            const dateObj = new Date(turno.fecha_inicio)
                                            const dayDateStr = format(dateObj, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())
                                            const timeStr = format(dateObj, "HH:mm 'hs'")
                                            const status = getStatusTextAndIcon(turno)
                                            const isSending = loadingMap[turno.id]
                                            const isUrgent = turno.estado === 'PENDIENTE' && (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000

                                            return (
                                                <motion.tr
                                                    key={turno.id}
                                                    className="hover:bg-muted/10 transition-colors relative"
                                                    initial={{ opacity: 0 }}
                                                    animate={{
                                                        opacity: 1,
                                                        ...(isUrgent && {
                                                            backgroundColor: [
                                                                "rgba(239, 68, 68, 0.02)",
                                                                "rgba(239, 68, 68, 0.08)",
                                                                "rgba(239, 68, 68, 0.02)"
                                                            ]
                                                        })
                                                    }}
                                                    transition={{
                                                        opacity: { duration: 0.2 },
                                                        backgroundColor: {
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut"
                                                        }
                                                    }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    {/* Fecha y Hora */}
                                                    <td className={cn(
                                                        "py-3 px-2 lg:px-4 font-medium text-foreground transition-all",
                                                        isUrgent && "border-l-[4px] border-l-red-500"
                                                    )}>
                                                        <div className="flex items-start gap-2">
                                                            {isUrgent && (
                                                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full animate-pulse shrink-0 mt-0.5">
                                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                                    &lt; 48hs
                                                                </span>
                                                            )}
                                                            <div>
                                                                <p className="font-semibold text-foreground whitespace-nowrap">
                                                                    {dayDateStr}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                                    {timeStr}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Paciente */}
                                                    <td className="py-3 px-2 lg:px-4">
                                                        <div>
                                                            <p className="font-semibold text-foreground">
                                                                {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : '—'}
                                                            </p>
                                                            {turno.paciente?.telefono && (
                                                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                                    {turno.paciente.telefono}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Profesional */}
                                                    <td className="py-3 px-2 lg:px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="h-2 w-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: turno.profesional?.color_agenda }}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-foreground font-medium text-sm whitespace-nowrap">
                                                                    Dr. {turno.profesional?.apellido}
                                                                </span>
                                                                {turno.profesional?.nombre && (
                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                        {turno.profesional.nombre}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Tratamiento */}
                                                    <td className="py-3 px-2 lg:px-4">
                                                        <div className="flex items-center gap-1.5 max-w-[120px] xl:max-w-[160px]">
                                                            <span className="text-muted-foreground text-xs truncate" title={turno.tipo_tratamiento?.nombre || 'Consulta'}>
                                                                {turno.tipo_tratamiento?.nombre || 'Consulta'}
                                                            </span>
                                                            {turno.numero_pieza && (
                                                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0 whitespace-nowrap">
                                                                    Pza. {turno.numero_pieza}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Estado de Confirmación */}
                                                    <td className="py-3 px-2 lg:px-4 whitespace-nowrap">
                                                        {turno.estado === 'CONFIRMADO' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                                Confirmado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                                                                <AlertCircle className={cn("h-3.5 w-3.5 text-red-500", isUrgent && "animate-pulse")} />
                                                                Sin confirmar
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Estado Recordatorio */}
                                                    <td className="py-3 px-2 lg:px-4">
                                                        <div className="flex flex-col items-start">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                                                                {status.icon}
                                                                {status.label}
                                                            </span>
                                                            {status.subLabel && (
                                                                <span className="text-[10px] text-muted-foreground mt-1 ml-1 whitespace-nowrap">
                                                                    {status.subLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="py-3 px-2 lg:px-4 text-right">
                                                        <div className="inline-flex items-center gap-1 justify-end">
                                                            <GlassButton
                                                                size="sm"
                                                                variant="glass"
                                                                className="h-8 px-2 2xl:px-3 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0"
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
                                                                className="h-8 px-2 2xl:px-3 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0"
                                                                onClick={() => handleSendReminder(turno.id)}
                                                                loading={isSending}
                                                                disabled={isSending || !turno.paciente?.telefono || turno.estado === 'CONFIRMADO'}
                                                                title={turno.estado === 'CONFIRMADO' ? 'Turno ya confirmado' : turno.paciente?.telefono ? 'Enviar Recordatorio WhatsApp' : 'Paciente sin Teléfono'}
                                                            >
                                                                <Bell className="h-3.5 w-3.5 2xl:mr-1 shrink-0" />
                                                                <span className="hidden 2xl:inline">Recordatorio</span>
                                                            </GlassButton>
                                                            <GlassButton
                                                                size="sm"
                                                                variant="glass"
                                                                className="h-8 px-2 2xl:px-3 border-primary/20 hover:border-primary/50 text-primary shrink-0"
                                                                onClick={() => router.push(`/agenda?edit=${turno.id}`)}
                                                                title="Editar turno"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5 2xl:mr-1 shrink-0" />
                                                                <span className="hidden 2xl:inline">Editar</span>
                                                            </GlassButton>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
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
                                const isUrgent = turno.estado === 'PENDIENTE' && (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000

                                return (
                                    <motion.div
                                        key={turno.id}
                                        className="glass rounded-2xl p-4 border border-border/40 space-y-3 transition-shadow"
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: 1,
                                            ...(isUrgent && {
                                                borderColor: ["rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 0.6)", "rgba(239, 68, 68, 0.2)"],
                                                boxShadow: [
                                                    "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 2px rgba(239, 68, 68, 0.05)",
                                                    "0 8px 32px rgba(239, 68, 68, 0.15), 0 0 0 4px rgba(239, 68, 68, 0.2)",
                                                    "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 2px rgba(239, 68, 68, 0.05)"
                                                ],
                                                backgroundColor: ["rgba(239, 68, 68, 0.02)", "rgba(239, 68, 68, 0.08)", "rgba(239, 68, 68, 0.02)"]
                                            })
                                        }}
                                        transition={{
                                            opacity: { duration: 0.2 },
                                            borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                            backgroundColor: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {/* Header: Date and status badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                                {isUrgent && (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                                        &lt; 48hs
                                                    </span>
                                                )}
                                                <span>{formattedDate}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                                                    status.className
                                                )}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
                                                {status.subLabel && (
                                                    <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                                        {status.subLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Estado de Confirmación (Mobile) */}
                                        <div className="mt-1">
                                            {turno.estado === 'CONFIRMADO' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                    Turno confirmado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                    <AlertCircle className={cn("h-3.5 w-3.5 text-red-500", isUrgent && "animate-pulse")} />
                                                    Turno sin confirmar
                                                </span>
                                            )}
                                        </div>

                                        {/* Details grid: Patient, Professional, Treatment */}
                                        <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/10 py-3">
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Paciente</p>
                                                <p className="font-semibold text-foreground">
                                                    {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : '—'}
                                                </p>
                                                {turno.paciente?.telefono && (
                                                    <p className="text-muted-foreground text-[11px]">{turno.paciente.telefono}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Profesional</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="h-2 w-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: turno.profesional?.color_agenda }}
                                                    />
                                                    <span className="text-foreground font-medium truncate">
                                                        Dr. {turno.profesional?.nombre} {turno.profesional?.apellido}
                                                    </span>
                                                </div>
                                                {turno.tipo_tratamiento?.nombre && (
                                                    <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                                        <span className="text-muted-foreground text-[11px] truncate">
                                                            {turno.tipo_tratamiento.nombre}
                                                        </span>
                                                        {turno.numero_pieza && (
                                                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0 whitespace-nowrap">
                                                                Pza. {turno.numero_pieza}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <GlassButton
                                                size="sm"
                                                variant="glass"
                                                className="flex-1 h-9 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs justify-center"
                                                onClick={() => {
                                                    const normalized = normalizarTelefonoArgentino(turno.paciente?.telefono || '')
                                                    const waPhone = normalized.startsWith('54') ? `549${normalized.substring(2)}` : normalized
                                                    window.open(`https://wa.me/${waPhone}`, '_blank')
                                                }}
                                                disabled={!turno.paciente?.telefono}
                                                title={turno.paciente?.telefono ? 'Abrir chat de WhatsApp' : 'Paciente sin Teléfono'}
                                            >
                                                <WhatsAppIcon className="h-3.5 w-3.5 mr-1 shrink-0 text-emerald-500" />
                                                WhatsApp
                                            </GlassButton>
                                            <GlassButton
                                                size="sm"
                                                variant="glass"
                                                className="flex-1 h-9 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs justify-center"
                                                onClick={() => handleSendReminder(turno.id)}
                                                loading={isSending}
                                                disabled={isSending || !turno.paciente?.telefono || turno.estado === 'CONFIRMADO'}
                                                title={turno.estado === 'CONFIRMADO' ? 'Turno ya confirmado' : turno.paciente?.telefono ? 'Enviar Recordatorio WhatsApp' : 'Paciente sin Teléfono'}
                                            >
                                                <Bell className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                Recordatorio
                                            </GlassButton>
                                            <GlassButton
                                                size="sm"
                                                variant="glass"
                                                className="flex-1 h-9 border-primary/20 hover:border-primary/50 text-primary text-xs justify-center"
                                                onClick={() => router.push(`/agenda?edit=${turno.id}`)}
                                                title="Editar turno"
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
    )
}

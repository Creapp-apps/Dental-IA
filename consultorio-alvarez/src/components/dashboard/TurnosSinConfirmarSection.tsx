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
import { cn } from '@/lib/utils'
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
                    label: `Enviado hoy ${timeStr}`,
                    className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                    icon: <CheckCircle2 className="h-3 w-3 shrink-0" />
                }
            } else {
                return {
                    label: `Fallo hoy ${timeStr}`,
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
                className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                icon: <AlertCircle className="h-3 w-3 shrink-0" />
            }
        }

        const dateStr = format(new Date(last.created_at), 'dd/MM HH:mm')
        if (last.estado_envio === 'ENVIADO') {
            return {
                label: `Enviado (${dateStr})`,
                className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                icon: <CheckCircle2 className="h-3 w-3 shrink-0" />
            }
        } else {
            return {
                label: `Fallo (${dateStr})`,
                className: 'text-red-500 bg-red-500/10 border-red-500/20',
                icon: <XCircle className="h-3 w-3 shrink-0" />
            }
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left justify-between gap-1 md:gap-0">
                <div className="flex flex-col items-center md:items-start">
                    <h2 className="text-lg font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        Turnos Pendientes de Confirmación
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Pacientes que aún no respondieron a las plantillas de confirmación.
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
                                        <th className="py-3 px-4">Fecha y Hora</th>
                                        <th className="py-3 px-4">Paciente</th>
                                        <th className="py-3 px-4">Profesional</th>
                                        <th className="py-3 px-4">Tratamiento</th>
                                        <th className="py-3 px-4">Último Recordatorio</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20 text-sm">
                                    <AnimatePresence initial={false}>
                                        {initialTurnos.map((turno) => {
                                            const dateObj = new Date(turno.fecha_inicio)
                                            const formattedDate = format(dateObj, "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es })
                                                .replace(/^\w/, (c) => c.toUpperCase())
                                            const status = getStatusTextAndIcon(turno)
                                            const isSending = loadingMap[turno.id]
                                            const isUrgent = (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000

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
                                                        "py-3 px-4 whitespace-nowrap font-medium text-foreground transition-all",
                                                        isUrgent && "border-l-[4px] border-l-red-500"
                                                    )}>
                                                        <div className="flex items-center gap-2">
                                                            {isUrgent && (
                                                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                                    &lt; 48hs
                                                                </span>
                                                            )}
                                                            <span>{formattedDate}</span>
                                                        </div>
                                                    </td>

                                                    {/* Paciente */}
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-semibold text-foreground">
                                                                {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : '—'}
                                                            </p>
                                                            {turno.paciente?.telefono && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {turno.paciente.telefono}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Profesional */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="h-2 w-2 rounded-full"
                                                                style={{ backgroundColor: turno.profesional?.color_agenda }}
                                                            />
                                                            <span className="text-foreground">
                                                                Dr. {turno.profesional?.nombre} {turno.profesional?.apellido}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Tratamiento */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className="text-muted-foreground text-xs">
                                                            {turno.tipo_tratamiento?.nombre || 'Consulta'}
                                                        </span>
                                                    </td>

                                                    {/* Estado Recordatorio */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                                                            {status.icon}
                                                            {status.label}
                                                        </span>
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center gap-2">
                                                            <GlassButton
                                                                size="sm"
                                                                variant="glass"
                                                                className="h-8 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                                                                onClick={() => handleSendReminder(turno.id)}
                                                                loading={isSending}
                                                                disabled={isSending || !turno.paciente?.telefono}
                                                                title={turno.paciente?.telefono ? 'Enviar Recordatorio WhatsApp' : 'Paciente sin Teléfono'}
                                                            >
                                                                <Bell className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                                Recordatorio
                                                            </GlassButton>
                                                            <GlassButton
                                                                size="sm"
                                                                variant="glass"
                                                                className="h-8 border-primary/20 hover:border-primary/50 text-primary"
                                                                onClick={() => router.push(`/agenda?edit=${turno.id}`)}
                                                                title="Editar turno"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5 mr-1" />
                                                                Editar
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
                                const isUrgent = (dateObj.getTime() - Date.now()) <= 48 * 60 * 60 * 1000

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
                                            <span className={cn(
                                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                                                status.className
                                            )}>
                                                {status.icon}
                                                {status.label}
                                            </span>
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
                                                    <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                                                        {turno.tipo_tratamiento.nombre}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <GlassButton
                                                size="sm"
                                                variant="glass"
                                                className="flex-1 h-9 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs justify-center"
                                                onClick={() => handleSendReminder(turno.id)}
                                                loading={isSending}
                                                disabled={isSending || !turno.paciente?.telefono}
                                                title={turno.paciente?.telefono ? 'Enviar Recordatorio WhatsApp' : 'Paciente sin Teléfono'}
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

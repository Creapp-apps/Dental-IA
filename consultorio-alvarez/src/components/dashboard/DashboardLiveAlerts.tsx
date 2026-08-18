'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    BellRing, 
    CalendarClock, 
    RefreshCw, 
    XCircle, 
    CheckCircle2, 
    AlertTriangle, 
    Sparkles, 
    CheckCheck, 
    ChevronDown, 
    ChevronUp,
    ArrowRight
} from 'lucide-react'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { Notificacion } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function DashboardLiveAlerts() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    const [isExpanded, setIsExpanded] = useState(true)
    const router = useRouter()

    const unreadNotifications = notifications.filter(n => !n.leida)

    if (unreadNotifications.length === 0) {
        return null
    }

    const getNotificationStyle = (tipo: Notificacion['tipo']) => {
        switch (tipo) {
            case 'turno_reprogramado':
                return {
                    icon: <RefreshCw className="h-4 w-4 text-amber-500 animate-spin-slow shrink-0" />,
                    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
                    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
                    label: 'Reprogramación solicitada',
                    borderLeft: 'border-l-amber-500'
                }
            case 'turno_cancelado':
                return {
                    icon: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
                    bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200',
                    badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
                    label: 'Turno cancelado',
                    borderLeft: 'border-l-rose-500'
                }
            case 'turno_confirmado':
                return {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
                    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
                    label: 'Confirmación WhatsApp',
                    borderLeft: 'border-l-emerald-500'
                }
            case 'turno_nuevo':
                return {
                    icon: <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />,
                    bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200',
                    badge: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
                    label: 'Nueva Reserva Web',
                    borderLeft: 'border-l-indigo-500'
                }
            default:
                return {
                    icon: <AlertTriangle className="h-4 w-4 text-sky-500 shrink-0" />,
                    bg: 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200',
                    badge: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40',
                    label: 'Aviso',
                    borderLeft: 'border-l-sky-500'
                }
        }
    }

    const formatTimeAgo = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
        } catch {
            return 'Reciente'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full rounded-2xl bg-gradient-to-br from-card/95 to-card/75 border border-primary/20 shadow-xl overflow-hidden backdrop-blur-md"
        >
            {/* Header del Banner */}
            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                            <BellRing className="h-5 w-5 animate-[bounce_2s_infinite]" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-foreground">
                                Centro de Alertas y Novedades
                            </h2>
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                                {unreadCount} {unreadCount === 1 ? 'pendiente' : 'pendientes'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Respuestas de WhatsApp, cancelaciones y nuevas reservas en tiempo real.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => markAllAsRead()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground border border-border/60 transition-colors"
                        title="Marcar todas como leídas"
                    >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Marcar todas como leídas</span>
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                        title={isExpanded ? 'Colapsar' : 'Expandir'}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Lista de Alertas Activas */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="divide-y divide-border/30 p-3 sm:p-4 space-y-2.5 max-h-[340px] overflow-y-auto"
                    >
                        {unreadNotifications.map((notif) => {
                            const style = getNotificationStyle(notif.tipo)
                            return (
                                <div
                                    key={notif.id}
                                    className={`p-3.5 rounded-xl border border-l-4 ${style.bg} ${style.borderLeft} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md`}
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="mt-0.5">{style.icon}</div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-xs text-foreground">
                                                    {notif.titulo}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {formatTimeAgo(notif.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                                                {notif.mensaje}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones Rápidas */}
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <button
                                            onClick={() => {
                                                markAsRead(notif.id)
                                                if (notif.referencia_id) {
                                                    router.push(`/agenda?turno=${notif.referencia_id}`)
                                                } else {
                                                    router.push('/agenda')
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all cursor-pointer"
                                        >
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            <span>Ver en Agenda</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => markAsRead(notif.id)}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                                            title="Descartar / Marcar como leída"
                                        >
                                            ✓
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

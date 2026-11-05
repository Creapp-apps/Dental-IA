'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    BellRing,
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

function formatNotificationMessage(text: string) {
    if (!text) return null
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const content = part.slice(2, -2)
                    return (
                        <span
                            key={index}
                            className="font-black text-foreground mr-1 px-1.5 py-0.5 rounded-md bg-foreground/10 border border-foreground/15 inline-block tracking-wide uppercase text-[10px]"
                        >
                            {content}
                        </span>
                    )
                }
                return part
            })}
        </span>
    )
}

export function DashboardLiveAlerts() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    // En mobile arranca colapsado (no se come el fold); en desktop expandido.
    // El componente se puebla con datos de cliente, así que el initializer con
    // window es seguro (en SSR no hay alertas y el componente devuelve null).
    const [isExpanded, setIsExpanded] = useState<boolean>(
        () => typeof window === 'undefined' || window.matchMedia('(min-width: 640px)').matches
    )
    const [showAllAlerts, setShowAllAlerts] = useState(false)
    const router = useRouter()
    const reduce = useReducedMotion()

    const unreadNotifications = notifications.filter(n => !n.leida)

    if (unreadNotifications.length === 0) {
        return null
    }

    const displayedAlerts = showAllAlerts ? unreadNotifications : unreadNotifications.slice(0, 3)

    const getNotificationStyle = (tipo: Notificacion['tipo'], titulo?: string) => {
        // Guardia / urgencia se graban con tipo 'turno_reprogramado' (no hay un
        // tipo propio en la DB), así que se detectan por el título para no
        // mostrarlas mal como "Reprogramación solicitada".
        const t = (titulo || '').toLowerCase()
        if (t.includes('guardia') || t.includes('urgencia')) {
            return {
                icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
                edge: 'bg-rose-500',
                badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
                label: 'Guardia / Urgencia',
            }
        }
        switch (tipo) {
            case 'turno_reprogramado':
                return {
                    icon: <RefreshCw className="h-4 w-4 text-amber-500" />,
                    edge: 'bg-amber-500',
                    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
                    label: 'Reprogramación',
                }
            case 'turno_cancelado':
                return {
                    icon: <XCircle className="h-4 w-4 text-rose-500" />,
                    edge: 'bg-rose-500',
                    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
                    label: 'Turno cancelado',
                }
            case 'turno_confirmado':
                return {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                    edge: 'bg-emerald-500',
                    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
                    label: 'Confirmación WhatsApp',
                }
            case 'turno_nuevo':
                return {
                    icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
                    edge: 'bg-indigo-500',
                    badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
                    label: 'Nueva Reserva Web',
                }
            default:
                return {
                    icon: <AlertTriangle className="h-4 w-4 text-sky-500" />,
                    edge: 'bg-sky-500',
                    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
                    label: 'Aviso',
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
            {/* Header: toda la barra abre/cierra. Sobrio, sin animaciones cansadoras. */}
            <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                className="w-full flex items-center gap-3 p-3.5 sm:p-4 text-left transition-colors hover:bg-primary/[0.04]"
            >
                <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <BellRing className="h-5 w-5" />
                    </div>
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-foreground">
                            Centro de Alertas
                        </h2>
                        <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                            {unreadCount} {unreadCount === 1 ? 'pendiente' : 'pendientes'}
                        </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                        WhatsApp, cancelaciones y reservas en tiempo real.
                    </p>
                </div>
                <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="shrink-0 text-muted-foreground"
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.span>
            </button>

            {/* Lista — se despliega suave. Sin scroll interno en mobile (sólo desktop). */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-border/40"
                    >
                        <div className="p-2.5 sm:p-3">
                            <button
                                onClick={() => markAllAsRead()}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground border border-border/60 transition-colors"
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>Marcar todas como leídas</span>
                            </button>
                        </div>

                        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 flex flex-col gap-2 sm:max-h-[420px] sm:overflow-y-auto">
                            {displayedAlerts.map((notif, i) => {
                                const style = getNotificationStyle(notif.tipo, notif.titulo)
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={reduce ? false : { opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                        className="relative"
                                    >
                                        {/* Toda la tarjeta: marca leída y abre en agenda. */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                markAsRead(notif.id)
                                                router.push(notif.referencia_id ? `/agenda?turno=${notif.referencia_id}` : '/agenda')
                                            }}
                                            className="w-full flex text-left rounded-xl border border-border/60 bg-foreground/[0.04] overflow-hidden transition-colors hover:bg-foreground/[0.07] active:bg-foreground/[0.09]"
                                        >
                                            <span className={`w-1 shrink-0 ${style.edge}`} />
                                            <span className="flex-1 min-w-0 p-2.5 sm:p-3 pr-9">
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <span className="shrink-0">{style.icon}</span>
                                                    <span className="flex-1 min-w-0 truncate text-[13px] font-extrabold text-foreground">
                                                        {notif.titulo}
                                                    </span>
                                                    <span className={`shrink-0 text-[9.5px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${style.badge}`}>
                                                        {style.label}
                                                    </span>
                                                </span>
                                                <span className="block text-[11.5px] text-foreground/90 font-medium leading-snug mt-1.5">
                                                    {formatNotificationMessage(notif.mensaje)}
                                                </span>
                                                <span className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] text-muted-foreground font-bold">
                                                        {formatTimeAgo(notif.created_at)}
                                                    </span>
                                                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-extrabold text-primary">
                                                        Ver en agenda <ArrowRight className="h-3 w-3" />
                                                    </span>
                                                </span>
                                            </span>
                                        </button>
                                        {/* Descartar (marca leída sin navegar). */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id) }}
                                            className="absolute top-2 right-2 h-6 w-6 rounded-md bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-muted-foreground hover:text-foreground flex items-center justify-center text-xs font-bold transition-colors"
                                            title="Descartar / Marcar como leída"
                                        >
                                            ✓
                                        </button>
                                    </motion.div>
                                )
                            })}

                            {unreadNotifications.length > 3 && (
                                <button
                                    onClick={() => setShowAllAlerts((v) => !v)}
                                    className="w-full py-2 px-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    {showAllAlerts ? (
                                        <>
                                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Mostrar menos (primeras 3)</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Ver {unreadNotifications.length - 3} alertas restantes</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

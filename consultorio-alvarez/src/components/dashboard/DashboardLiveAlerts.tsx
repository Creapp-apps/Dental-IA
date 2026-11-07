'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    BellRing,
    CheckCheck,
    ChevronDown,
    ArrowRight
} from 'lucide-react'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { Notificacion } from '@/types'
import {
    grupoNotificacion,
    etiquetaNotificacion,
    rutaNotificacion,
    type GrupoAlerta
} from '@/lib/mensajes/notificaciones'
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

// Config visual de cada grupo (orden de arriba hacia abajo). Rojo+amarillo abren;
// agenda+sistema arrancan colapsados (informativo, no estorban).
const GRUPOS: {
    id: GrupoAlerta
    titulo: string
    defaultColapsado: boolean
    edge: string
    head: string
    badge: string
}[] = [
    {
        id: 'urgente', titulo: '🔴 Urgente — responder ya', defaultColapsado: false,
        edge: 'bg-rose-500',
        head: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
        badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
    },
    {
        id: 'requiere_respuesta', titulo: '🟡 Requiere respuesta', defaultColapsado: false,
        edge: 'bg-amber-500',
        head: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    },
    {
        id: 'agenda', titulo: '🟢 Agenda (operativo)', defaultColapsado: true,
        edge: 'bg-emerald-500',
        head: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    },
    {
        id: 'sistema', titulo: '⚪ Sistema', defaultColapsado: true,
        edge: 'bg-slate-400',
        head: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
        badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
    },
]

// Rótulo del link derivado del DESTINO real (no del grupo): una alerta urgente que
// referencia un turno va a la Agenda, así que debe decir "Ver en agenda".
function verLabelDeRuta(ruta: string): string {
    if (ruta.startsWith('/mensajes')) return 'Ver en mensajes'
    if (ruta.startsWith('/agenda')) return 'Ver en agenda'
    return 'Ver'
}

// Clasifica una notificación en grupo + etiqueta. Para filas viejas sin prioridad/motivo
// (pre-backfill) cae a un sniff por título, para no perder las urgencias.
function clasificar(n: Notificacion): { grupo: GrupoAlerta; etiqueta: string } {
    if (n.prioridad || n.motivo) {
        return {
            grupo: grupoNotificacion(n.prioridad, n.motivo),
            etiqueta: etiquetaNotificacion(n.prioridad, n.motivo),
        }
    }
    const t = (n.titulo || '').toLowerCase()
    if (t.includes('guardia') || t.includes('urgencia')) return { grupo: 'urgente', etiqueta: '🚨 Urgente' }
    return { grupo: 'sistema', etiqueta: '🔔 Sistema' }
}

export function DashboardLiveAlerts() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    const [isExpanded, setIsExpanded] = useState<boolean>(
        () => typeof window === 'undefined' || window.matchMedia('(min-width: 640px)').matches
    )
    const [filtro, setFiltro] = useState<'todo' | GrupoAlerta>('todo')
    const [colapsados, setColapsados] = useState<Record<GrupoAlerta, boolean>>({
        urgente: false, requiere_respuesta: false, agenda: true, sistema: true,
    })
    const router = useRouter()
    const reduce = useReducedMotion()

    const unreadNotifications = notifications.filter(n => !n.leida)
    if (unreadNotifications.length === 0) {
        return null
    }

    // Agrupar una sola vez.
    const porGrupo: Record<GrupoAlerta, { notif: Notificacion; etiqueta: string }[]> = {
        urgente: [], requiere_respuesta: [], agenda: [], sistema: [],
    }
    for (const n of unreadNotifications) {
        const { grupo, etiqueta } = clasificar(n)
        porGrupo[grupo].push({ notif: n, etiqueta })
    }

    const gruposVisibles = GRUPOS.filter(g => (filtro === 'todo' || filtro === g.id) && porGrupo[g.id].length > 0)

    const formatTimeAgo = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
        } catch {
            return 'Reciente'
        }
    }

    const toggleColapsado = (id: GrupoAlerta) =>
        setColapsados(prev => ({ ...prev, [id]: !prev[id] }))

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full rounded-2xl bg-gradient-to-br from-card/95 to-card/75 border border-primary/20 shadow-xl overflow-hidden backdrop-blur-md"
        >
            {/* Header: abre/cierra todo el panel. */}
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
                        WhatsApp, agenda y sistema — en tiempo real.
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

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-border/40"
                    >
                        {/* Chips de grupo */}
                        <div className="px-2.5 sm:px-3 pt-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
                            {[
                                { id: 'todo' as const, label: 'Todo', count: unreadNotifications.length },
                                ...GRUPOS.map(g => ({ id: g.id, label: g.titulo.replace(/^[^\s]+\s/, ''), count: porGrupo[g.id].length })),
                            ].map((chip) => (
                                <button
                                    key={chip.id}
                                    onClick={() => setFiltro(chip.id)}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
                                        filtro === chip.id
                                            ? 'bg-foreground text-background border-transparent'
                                            : 'bg-foreground/5 text-foreground/70 border-border/60 hover:bg-foreground/10'
                                    }`}
                                >
                                    {chip.label}
                                    <span className="text-[10px] font-extrabold opacity-70">{chip.count}</span>
                                </button>
                            ))}
                        </div>

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

                        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 max-h-[70vh] overflow-y-auto sm:max-h-[460px]">
                          <AnimatePresence mode="wait" initial={false}>
                           <motion.div
                                key={filtro}
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduce ? undefined : { opacity: 0 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="flex flex-col gap-3"
                           >
                            {gruposVisibles.map(g => {
                                const items = porGrupo[g.id]
                                const abierto = filtro === g.id ? true : !colapsados[g.id]
                                return (
                                    <div key={g.id} className="rounded-xl border border-border/60 overflow-hidden">
                                        {/* Encabezado del grupo */}
                                        <button
                                            type="button"
                                            onClick={() => toggleColapsado(g.id)}
                                            aria-expanded={abierto}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left font-extrabold text-xs uppercase tracking-wide ${g.head}`}
                                        >
                                            <span className={`w-1.5 h-4 rounded-full ${g.edge}`} />
                                            <span className="flex-1 min-w-0 truncate">{g.titulo}</span>
                                            <span className="shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full bg-background/70 border border-border/50">
                                                {items.length}
                                            </span>
                                            <motion.span
                                                animate={{ rotate: abierto ? 0 : -90 }}
                                                transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                                className="shrink-0 opacity-70"
                                            >
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </motion.span>
                                        </button>

                                        {/* Colapso fluido del grupo: height + opacity. */}
                                        <AnimatePresence initial={false}>
                                        {abierto && (
                                            <motion.div
                                                key="body"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden"
                                            >
                                            <div className="flex flex-col gap-2 p-2">
                                                {items.map(({ notif, etiqueta }, i) => {
                                                    const ruta = rutaNotificacion(g.id, notif.referencia_id, notif.tipo)
                                                    const verLabel = verLabelDeRuta(ruta)
                                                    return (
                                                        <motion.div
                                                            key={notif.id}
                                                            initial={reduce ? false : { opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.24, delay: Math.min(i, 6) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                                                            className="relative"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    markAsRead(notif.id)
                                                                    router.push(ruta)
                                                                }}
                                                                className="w-full flex text-left rounded-lg border border-border/60 bg-foreground/[0.03] overflow-hidden transition-colors hover:bg-foreground/[0.07]"
                                                            >
                                                                <span className={`w-1 shrink-0 ${g.edge}`} />
                                                                <span className="flex-1 min-w-0 p-2.5 pr-9">
                                                                    <span className="flex items-center gap-2 min-w-0">
                                                                        <span className="flex-1 min-w-0 truncate text-[13px] font-extrabold text-foreground">
                                                                            {notif.titulo}
                                                                        </span>
                                                                        <span className={`shrink-0 text-[9.5px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${g.badge}`}>
                                                                            {etiqueta}
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
                                                                            {verLabel} <ArrowRight className="h-3 w-3" />
                                                                        </span>
                                                                    </span>
                                                                </span>
                                                            </button>
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
                                            </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                           </motion.div>
                          </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

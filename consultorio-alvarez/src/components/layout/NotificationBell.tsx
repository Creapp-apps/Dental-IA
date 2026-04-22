'use client'

import { Bell, Check, Trash2, CalendarClock, AlertCircle, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function NotificationBell({ themeColor }: { themeColor?: string }) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

    return (
        <Popover>
            <PopoverTrigger className="relative p-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 cursor-pointer">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span
                        className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-sidebar"
                        style={{ backgroundColor: '#ef4444' }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </PopoverTrigger>

            <PopoverContent align="end" className="w-[340px] p-0 shadow-lg border-sidebar-border/30 bg-background/80 backdrop-blur-2xl rounded-xl overflow-hidden mt-1 mr-2 z-[999]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border/30 bg-secondary/30">
                    <h3 className="font-semibold text-sm">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                        >
                            <Check className="h-3 w-3" />
                            Marcar leídas
                        </button>
                    )}
                </div>

                <div className="max-h-[350px] overflow-y-auto scrollbar-thin flex flex-col">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center flex flex-col items-center justify-center opacity-60">
                            <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-foreground font-medium">Bandeja Vacía</p>
                            <p className="text-xs text-muted-foreground mt-1">No hay alertas en este momento.</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const isUnread = !n.leida
                            const Icon = n.tipo === 'turno_nuevo' ? CalendarClock : n.tipo === 'alerta' ? AlertCircle : Info

                            return (
                                <button
                                    key={n.id}
                                    onClick={() => isUnread && markAsRead(n.id)}
                                    className={cn(
                                        "w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-sidebar-border/20 last:border-0 hover:bg-secondary/40",
                                        isUnread ? "bg-primary/5" : "opacity-80"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-full",
                                            isUnread ? "bg-primary/10" : "bg-secondary"
                                        )}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            style={isUnread ? { color: themeColor || 'var(--primary)' } : undefined}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex items-start justify-between gap-1 mb-1">
                                            <p className={cn("text-sm leading-tight line-clamp-1", isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                                                {n.titulo}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                                            {n.mensaje}
                                        </p>
                                    </div>
                                    {isUnread && (
                                        <div className="shrink-0 h-2 w-2 rounded-full self-center" style={{ backgroundColor: themeColor || 'var(--primary)' }} />
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="bg-secondary/20 px-4 py-2 border-t border-sidebar-border/30 text-center">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase opacity-70">
                            Sincronización en Tiempo Real Activa
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

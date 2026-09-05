'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notificacion } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, CalendarClock, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface NotificationContextProps {
    notifications: Notificacion[]
    unreadCount: number
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextProps>({
    notifications: [],
    unreadCount: 0,
    markAsRead: async () => { },
    markAllAsRead: async () => { },
})

interface LiveToast extends Notificacion {
    toastId: string
}

export function NotificationProvider({ children, tenantId }: { children: ReactNode; tenantId?: string }) {
    const [notifications, setNotifications] = useState<Notificacion[]>([])
    const [toasts, setToasts] = useState<LiveToast[]>([])
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function syncPush() {
            if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
                return
            }

            // Sincronizar automáticamente en segundo plano si el permiso ya fue otorgado
            if (Notification.permission === 'granted') {
                try {
                    const { registerServiceWorker, urlB64ToUint8Array } = await import('@/lib/push-notifications/push-subscription')
                    const { registrarSuscripcionPush } = await import('@/lib/actions/push')

                    const registration = await registerServiceWorker()
                    if (!registration || !registration.pushManager) return

                    let sub = await registration.pushManager.getSubscription()
                    const publicKeyB64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

                    if (!sub && publicKeyB64) {
                        console.log('[PUSH SYNC] Permiso concedido pero sin suscripción activa. Renovando token en segundo plano...')
                        const applicationServerKey = urlB64ToUint8Array(publicKeyB64)
                        sub = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: applicationServerKey
                        })
                    }

                    if (sub) {
                        await registrarSuscripcionPush(sub.toJSON())
                        console.log('[PUSH SYNC] Suscripción push sincronizada con éxito.')
                    }
                } catch (err) {
                    console.error('[PUSH SYNC] Error al sincronizar notificaciones push:', err)
                }
            }
        }

        syncPush()
    }, [])

    useEffect(() => {
        setMounted(true)
        let isMounted = true

        const fetchInitial = async () => {
            if (!tenantId) {
                setNotifications([])
                return
            }

            const { data } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (data && isMounted) {
                setNotifications(data as Notificacion[])
            }
        }

        fetchInitial()

        if (!tenantId) return

        const channelName = `notificaciones-${tenantId}`
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notificaciones',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    const newNotif = payload.new as Notificacion
                    if (newNotif.tenant_id && newNotif.tenant_id !== tenantId) {
                        return
                    }
                    setNotifications(prev => [newNotif, ...prev])
                    
                    // Disparar Toast flotante en tiempo real
                    const toastItem: LiveToast = {
                        ...newNotif,
                        toastId: `${newNotif.id}-${Date.now()}`
                    }
                    setToasts(prev => [toastItem, ...prev.slice(0, 3)]) // Máximo 4 toasts a la vez

                    // Auto-cerrar el toast después de 8 segundos
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.toastId !== toastItem.toastId))
                    }, 8000)

                    // Reproducir sonido personalizado según configuración de timbre/volumen
                    try {
                        const saved = localStorage.getItem('consultorio-alvarez:notification-settings')
                        const settings = saved ? JSON.parse(saved) : null
                        const defaultSounds: Record<string, { sound: string; volume: number }> = {
                            turno_nuevo: { sound: 'bell.ogg', volume: 0.5 },
                            turno_reprogramado: { sound: 'chime.mp3', volume: 0.6 },
                            turno_cancelado: { sound: 'beep.mp3', volume: 0.6 },
                            turno_confirmado: { sound: 'ding.mp3', volume: 0.5 },
                            alerta: { sound: 'chime.mp3', volume: 0.5 },
                            sistema: { sound: 'beep.mp3', volume: 0.5 },
                        }
                        const config = settings?.[newNotif.tipo] ?? defaultSounds[newNotif.tipo] ?? { sound: 'bell.ogg', volume: 0.5 }

                        if (config.sound) {
                            const audio = new Audio(`/sounds/${config.sound}`)
                            audio.volume = config.volume
                            audio.play().catch(e => console.log('Audio autoplay blocked:', e))
                        }
                    } catch (e) {
                        console.error('Error al reproducir sonido de alerta:', e)
                    }
                }
            )
            .on(
                'postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'notificaciones',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    const updatedNotif = payload.new as Notificacion
                    if (updatedNotif.tenant_id && updatedNotif.tenant_id !== tenantId) {
                        return
                    }
                    setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n))
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [supabase, tenantId])

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
        setToasts(prev => prev.filter(t => t.id !== id))
        let query = supabase.from('notificaciones').update({ leida: true }).eq('id', id)
        if (tenantId) {
            query = query.eq('tenant_id', tenantId)
        }
        await query
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.leida).map(n => n.id)
        if (unreadIds.length === 0) return

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
        setToasts([])
        let query = supabase.from('notificaciones').update({ leida: true }).in('id', unreadIds)
        if (tenantId) {
            query = query.eq('tenant_id', tenantId)
        }
        await query
    }

    const dismissToast = (toastId: string) => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId))
    }

    const unreadCount = notifications.filter(n => !n.leida).length

    const getToastVisuals = (tipo: Notificacion['tipo']) => {
        switch (tipo) {
            case 'turno_reprogramado':
                return {
                    border: 'border-amber-500/50 bg-slate-900/95 shadow-amber-500/10',
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    dot: 'bg-amber-500',
                    label: 'Reprogramar Turno',
                    icon: '🔄'
                }
            case 'turno_cancelado':
                return {
                    border: 'border-rose-500/50 bg-slate-900/95 shadow-rose-500/10',
                    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                    dot: 'bg-rose-500',
                    label: 'Cancelación',
                    icon: '❌'
                }
            case 'turno_confirmado':
                return {
                    border: 'border-emerald-500/50 bg-slate-900/95 shadow-emerald-500/10',
                    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    dot: 'bg-emerald-500',
                    label: 'Confirmado',
                    icon: '✅'
                }
            case 'turno_nuevo':
                return {
                    border: 'border-indigo-500/50 bg-slate-900/95 shadow-indigo-500/10',
                    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                    dot: 'bg-indigo-500',
                    label: 'Nueva Reserva Web',
                    icon: '🌟'
                }
            default:
                return {
                    border: 'border-primary/50 bg-slate-900/95 shadow-primary/10',
                    badge: 'bg-primary/20 text-primary-300 border-primary/30',
                    dot: 'bg-primary',
                    label: 'Aviso de Sistema',
                    icon: '🔔'
                }
        }
    }

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}

            {/* Stack de Toasts Flotantes en Tiempo Real (Top-Right) */}
            {mounted && createPortal(
                <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
                    <AnimatePresence>
                        {toasts.map((toast) => {
                            const visual = getToastVisuals(toast.tipo)
                            return (
                                <motion.div
                                    key={toast.toastId}
                                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85, x: 30 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    className={`pointer-events-auto w-full rounded-2xl border p-4 shadow-2xl backdrop-blur-xl text-white overflow-hidden relative ${visual.border}`}
                                >
                                    {/* Indicador de pulso superior */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />

                                    <div className="flex items-start gap-3">
                                        <div className="text-xl shrink-0 mt-0.5">{visual.icon}</div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visual.badge}`}>
                                                    {visual.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    Ahora
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-white leading-tight">
                                                {toast.titulo}
                                            </h4>
                                            <p className="text-xs text-slate-300 leading-snug line-clamp-3">
                                                {(() => {
                                                    const parts = toast.mensaje.split(/(\*\*.*?\*\*)/g)
                                                    return (
                                                        <span>
                                                            {parts.map((part, i) => {
                                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                                    return (
                                                                        <strong key={i} className="font-black text-white px-1 py-0.2 rounded bg-white/20 mr-1 inline-block uppercase">
                                                                            {part.slice(2, -2)}
                                                                        </strong>
                                                                    )
                                                                }
                                                                return part
                                                            })}
                                                        </span>
                                                    )
                                                })()}
                                            </p>

                                            {/* Acciones */}
                                            <div className="pt-2 flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        markAsRead(toast.id)
                                                        dismissToast(toast.toastId)
                                                        if (toast.referencia_id) {
                                                            router.push(`/agenda?turno=${toast.referencia_id}`)
                                                        } else {
                                                            router.push('/agenda')
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30 transition-all flex items-center gap-1.5"
                                                >
                                                    <CalendarClock className="h-3.5 w-3.5" />
                                                    <span>Ver Turno</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        markAsRead(toast.id)
                                                        dismissToast(toast.toastId)
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                                                >
                                                    Marcar Leída
                                                </button>
                                            </div>
                                        </div>

                                        {/* Botón Cerrar */}
                                        <button
                                            onClick={() => dismissToast(toast.toastId)}
                                            className="h-6 w-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                                            title="Cerrar notificación"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    return useContext(NotificationContext)
}

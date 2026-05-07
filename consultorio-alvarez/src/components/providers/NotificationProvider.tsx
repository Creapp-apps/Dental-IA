'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notificacion } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, CalendarClock, X } from 'lucide-react'
import { createPortal } from 'react-dom'

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

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notificacion[]>([])
    const [activeAlert, setActiveAlert] = useState<Notificacion | null>(null)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
        let isMounted = true

        const fetchInitial = async () => {
            const { data } = await supabase
                .from('notificaciones')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (data && isMounted) {
                setNotifications(data as Notificacion[])
            }
        }

        fetchInitial()

        const channel = supabase
            .channel('notificaciones-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notificaciones' },
                (payload) => {
                    const newNotif = payload.new as Notificacion
                    setNotifications(prev => [newNotif, ...prev])
                    
                    if (newNotif.tipo === 'turno_nuevo') {
                        setActiveAlert(newNotif)
                        // Reproducir sonido
                        const audio = new Audio('/sounds/bell.ogg')
                        audio.volume = 0.5
                        audio.play().catch(e => console.log('Audio autoplay blocked:', e))
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notificaciones' },
                (payload) => {
                    setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notificacion : n))
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
        await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.leida).map(n => n.id)
        if (unreadIds.length === 0) return

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
        await supabase.from('notificaciones').update({ leida: true }).in('id', unreadIds)
    }

    const unreadCount = notifications.filter(n => !n.leida).length

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}

            {/* Modal central de Nuevo Turno */}
            {mounted && createPortal(
                <AnimatePresence>
                    {activeAlert && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            onClick={() => setActiveAlert(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-sm glass rounded-2xl shadow-2xl border border-primary/20 overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Pulso animado de fondo */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                                
                                <div className="p-6 text-center flex flex-col items-center">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                                        <div className="relative h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                                            <BellRing className="h-8 w-8 text-primary animate-bounce" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-foreground mb-2">
                                        ¡Nuevo Turno Recibido!
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {activeAlert.mensaje}
                                    </p>

                                    <button
                                        onClick={() => {
                                            setActiveAlert(null)
                                            markAsRead(activeAlert.id)
                                        }}
                                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
                                    >
                                        <CalendarClock className="h-4 w-4" />
                                        Ver Turno
                                    </button>
                                </div>
                                
                                <button
                                    onClick={() => setActiveAlert(null)}
                                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    return useContext(NotificationContext)
}

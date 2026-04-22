'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notificacion } from '@/types'

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
    const supabase = createClient()

    useEffect(() => {
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
                    setNotifications(prev => [payload.new as Notificacion, ...prev])
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
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    return useContext(NotificationContext)
}

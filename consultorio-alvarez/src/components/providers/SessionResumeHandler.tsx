'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCw, CheckCircle2, Sparkles, Sun, Coffee } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SessionResumeHandlerProps {
    themeColor?: string
}

export function SessionResumeHandler({ themeColor = '#2563eb' }: SessionResumeHandlerProps) {
    const router = useRouter()
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('idle')
    const [syncMessage, setSyncMessage] = useState({ title: '', detail: '' })
    const lastActiveRef = useRef<number>(Date.now())
    const isSyncingRef = useRef<boolean>(false)

    useEffect(() => {
        const supabase = createClient()

        // 1. Silent Heartbeat cada 9 minutos (mantiene Vercel y Supabase calientes sin molestar al usuario)
        const HEARTBEAT_INTERVAL_MS = 9 * 60 * 1000
        const heartbeatTimer = setInterval(() => {
            fetch('/api/ping', { method: 'GET', keepalive: true }).catch(() => {})
            // Silenciosamente refresca el token de sesión si está próximo a expirar
            supabase.auth.getSession().catch(() => {})
        }, HEARTBEAT_INTERVAL_MS)

        // 2. Rastreo de actividad del usuario
        const recordActivity = () => {
            lastActiveRef.current = Date.now()
        }

        window.addEventListener('mousemove', recordActivity, { passive: true })
        window.addEventListener('keydown', recordActivity, { passive: true })
        window.addEventListener('click', recordActivity, { passive: true })

        // 3. Detección de regreso tras descanso/inactividad (Page Visibility API + Window Focus)
        const checkResumeFromBreak = () => {
            if (document.hidden) return

            const now = Date.now()
            const inactiveMinutes = (now - lastActiveRef.current) / (1000 * 60)
            lastActiveRef.current = now

            // Si estuvo inactivo más de 15 minutos (ej: horario de almuerzo o PC suspendida)
            if (inactiveMinutes >= 15 && !isSyncingRef.current) {
                isSyncingRef.current = true

                const hour = new Date().getHours()
                const isAfternoon = hour >= 13 && hour < 20

                setSyncMessage({
                    title: isAfternoon ? '¡Buenas tardes!' : '¡Hola de nuevo!',
                    detail: isAfternoon 
                        ? 'Sincronizando agenda y novedades del turno tarde...' 
                        : 'Sincronizando agenda y actualizaciones...'
                })
                setSyncState('syncing')

                // Heartbeat inmediato + refresco silencioso de datos
                fetch('/api/ping', { method: 'GET', keepalive: true }).catch(() => {})
                supabase.auth.getSession().catch(() => {})

                try {
                    router.refresh()
                } catch (e) {
                    console.error('Error refreshing router:', e)
                }

                // Transición a estado "sincronizado" y posterior cierre
                setTimeout(() => {
                    setSyncState('synced')
                    setTimeout(() => {
                        setSyncState('idle')
                        isSyncingRef.current = false
                    }, 2200)
                }, 1800)
            }
        }

        document.addEventListener('visibilitychange', checkResumeFromBreak)
        window.addEventListener('focus', checkResumeFromBreak)

        return () => {
            clearInterval(heartbeatTimer)
            window.removeEventListener('mousemove', recordActivity)
            window.removeEventListener('keydown', recordActivity)
            window.removeEventListener('click', recordActivity)
            document.removeEventListener('visibilitychange', checkResumeFromBreak)
            window.removeEventListener('focus', checkResumeFromBreak)
        }
    }, [router])

    const hour = new Date().getHours()
    const isAfternoon = hour >= 13 && hour < 20

    return (
        <AnimatePresence>
            {syncState !== 'idle' && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 bg-slate-900/90 text-white text-xs sm:text-sm font-medium"
                        style={{
                            boxShadow: `0 15px 35px -5px rgba(0,0,0,0.5), 0 0 20px -3px ${themeColor}40`
                        }}
                    >
                        <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/10 shrink-0">
                            {syncState === 'syncing' ? (
                                <RotateCw className="w-4 h-4 text-primary animate-spin" style={{ color: themeColor }} />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                        </div>

                        <div className="flex flex-col pr-1">
                            <span className="font-semibold text-white/95 flex items-center gap-1.5">
                                {isAfternoon ? (
                                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                {syncMessage.title}
                            </span>
                            <span className="text-[11px] text-white/60 font-normal">
                                {syncState === 'syncing' ? syncMessage.detail : 'Agenda y registros sincronizados'}
                            </span>
                        </div>

                        {syncState === 'synced' && (
                            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Al día
                            </span>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

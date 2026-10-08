'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SavingPhase = 'guardando' | 'listo' | 'sin-conexion'

/** Mínimo que el overlay queda a la vista, para que no sea un parpadeo. */
const MIN_VISIBLE_MS = 1200
/** Techo de espera: pasado esto cerramos aunque la nube no haya contestado. */
const MAX_WAIT_MS = 3000
/** Cuánto dura el estado final antes de cerrar. */
const OUTRO_MS = 700

const PHASE_CONFIG: Record<SavingPhase, { icon: typeof Check; iconClass: string }> = {
    guardando: { icon: Loader2, iconClass: 'text-primary animate-spin' },
    listo: { icon: Check, iconClass: 'text-emerald-500 dark:text-emerald-400' },
    'sin-conexion': { icon: CloudOff, iconClass: 'text-amber-500 dark:text-amber-400' },
}

interface SavingOverlayProps {
    open: boolean
    phase: SavingPhase
    title: string
    description?: string
    className?: string
}

/**
 * Cartel flotante centrado para confirmar un guardado.
 *
 * El <Toaster> global de la app está en top-right y lo comparten todas las
 * pantallas, así que esto va aparte en vez de reconfigurarlo.
 */
export function SavingOverlay({ open, phase, title, description, className }: SavingOverlayProps) {
    const config = PHASE_CONFIG[phase]
    const Icon = config.icon

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="saving-overlay"
                    className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/35"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    // Puramente informativo: no hay nada que tocar mientras está.
                    aria-live="polite"
                    role="status"
                >
                    <motion.div
                        className={cn(
                            'glass rounded-2xl shadow-glass-lg px-7 py-6 mx-4',
                            'flex flex-col items-center gap-3 text-center min-w-[240px] max-w-sm',
                            className
                        )}
                        initial={{ opacity: 0, scale: 0.94, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 4 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        <Icon className={cn('h-8 w-8', config.iconClass)} />
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface RunLabels {
    guardando: string
    listo: string
    sinConexion: string
    descripcionSinConexion?: string
}

/**
 * La tarea puede devolver esto para fijar el cartel de cierre, cuando el
 * resultado real no es el final feliz por defecto.
 */
export interface SavingResult {
    phase: SavingPhase
    title: string
    description?: string
}

interface SavingFlowState {
    open: boolean
    phase: SavingPhase
    title: string
    description?: string
}

/**
 * Maneja los tiempos del overlay: lo muestra mientras corre `tarea`, lo
 * sostiene un mínimo para que se lea, y lo corta a los MAX_WAIT_MS si la nube
 * tarda. El dato ya está en IndexedDB antes de llamar acá, así que cerrar
 * temprano no pierde nada: el outbox termina de subirlo solo.
 */
export function useSavingFlow(labels: RunLabels) {
    const [state, setState] = useState<SavingFlowState>({
        open: false,
        phase: 'guardando',
        title: labels.guardando,
    })
    const corriendo = useRef(false)
    // `labels` suele llegar como objeto literal, distinto en cada render.
    // Guardándolo en un ref, `run` mantiene identidad estable.
    const labelsRef = useRef(labels)
    useEffect(() => {
        labelsRef.current = labels
    }, [labels])

    const run = useCallback(async (tarea: () => Promise<SavingResult | void>) => {
        if (corriendo.current) return
        corriendo.current = true

        const labels = labelsRef.current
        const t0 = Date.now()
        const hayConexion = typeof navigator === 'undefined' ? true : navigator.onLine

        setState({ open: true, phase: 'guardando', title: labels.guardando })

        let resultado: SavingResult | void = undefined

        try {
            if (hayConexion) {
                // Si se pasa del techo no esperamos más. La tarea sigue en
                // segundo plano; lo único que cortamos es la espera visual.
                resultado = await Promise.race([tarea(), sleep(MAX_WAIT_MS)]) as SavingResult | void
            } else {
                // No tiene sentido esperar un sync que no va a ocurrir.
                tarea().catch(err => console.warn('[SAVING FLOW] Error en tarea offline:', err))
            }
        } catch (err) {
            console.warn('[SAVING FLOW] Error durante el guardado:', err)
        }

        const transcurrido = Date.now() - t0
        if (transcurrido < MIN_VISIBLE_MS) {
            await sleep(MIN_VISIBLE_MS - transcurrido)
        }

        setState(resultado
            ? { open: true, ...resultado }
            : {
                open: true,
                phase: hayConexion ? 'listo' : 'sin-conexion',
                title: hayConexion ? labels.listo : labels.sinConexion,
                description: hayConexion ? undefined : labels.descripcionSinConexion,
            })

        await sleep(OUTRO_MS)
        setState(prev => ({ ...prev, open: false }))
        corriendo.current = false
    }, [])

    return { ...state, run }
}

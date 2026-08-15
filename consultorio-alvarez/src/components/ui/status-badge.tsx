'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { EstadoTurno } from '@/types'

const statusBadgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition-all shadow-sm',
    {
        variants: {
            status: {
                PENDIENTE: 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/50 font-extrabold shadow-[0_0_14px_rgba(245,158,11,0.25)]',
                CONFIRMADO: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/40 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]',
                EN_SALA: 'bg-violet-500/20 text-violet-900 dark:text-violet-200 border-violet-500/40 font-bold shadow-[0_0_12px_rgba(139,92,246,0.2)]',
                ATENDIDO: 'bg-teal-500/20 text-teal-900 dark:text-teal-200 border-teal-500/40 font-bold shadow-[0_0_12px_rgba(20,184,166,0.2)]',
                CANCELADO: 'bg-red-500/25 text-red-900 dark:text-red-200 border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.35)] font-black',
                AUSENTE: 'bg-gray-500/20 text-gray-800 dark:text-gray-300 border-gray-500/30',
            },
        },
        defaultVariants: {
            status: 'PENDIENTE',
        },
    }
)

const STATUS_ICONS: Record<EstadoTurno, string> = {
    PENDIENTE: '⏳',
    CONFIRMADO: '✓',
    EN_SALA: '🔔',
    ATENDIDO: '✅',
    CANCELADO: '✕',
    AUSENTE: '—',
}

const STATUS_LABELS: Record<EstadoTurno, string> = {
    PENDIENTE: 'Sin confirmar',
    CONFIRMADO: 'Confirmado',
    EN_SALA: 'En sala',
    ATENDIDO: 'Atendido',
    CANCELADO: 'Cancelado',
    AUSENTE: 'Ausente',
}

const STATUS_LABELS_COMPACT: Record<EstadoTurno, string> = {
    PENDIENTE: 'Sin conf.',
    CONFIRMADO: 'Conf.',
    EN_SALA: 'En sala',
    ATENDIDO: 'Atendido',
    CANCELADO: 'Canc.',
    AUSENTE: 'Ausente',
}

export interface StatusBadgeProps {
    status: EstadoTurno
    pulse?: boolean
    showIcon?: boolean
    compact?: boolean
    className?: string
}

export function StatusBadge({
    status,
    pulse,
    showIcon = true,
    compact = false,
    className,
}: StatusBadgeProps) {
    const shouldPulse = pulse ?? (status === 'CANCELADO' || status === 'EN_SALA' || status === 'PENDIENTE')

    const glowColor = status === 'CANCELADO'
        ? 'rgba(239,68,68,0.5)'
        : status === 'PENDIENTE'
        ? 'rgba(245,158,11,0.5)'
        : 'rgba(139,92,246,0.4)'

    const labelText = compact ? STATUS_LABELS_COMPACT[status] : STATUS_LABELS[status]

    return (
        <motion.span
            title={`Estado: ${STATUS_LABELS[status]}`}
            className={cn(statusBadgeVariants({ status }), className, "will-change-transform transform-gpu")}
            initial={{ opacity: 1, scale: 1 }}
            animate={
                shouldPulse
                    ? {
                          scale: [1, 1.08, 1],
                          boxShadow: [
                              `0 0 4px ${glowColor}`,
                              `0 0 16px ${glowColor}`,
                              `0 0 4px ${glowColor}`
                          ],
                          opacity: 1,
                      }
                    : { scale: 1, opacity: 1 }
            }
            transition={
                shouldPulse
                    ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                      }
                    : { type: 'spring', stiffness: 400, damping: 20 }
            }
        >
            {shouldPulse && (
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
            )}
            {showIcon && !shouldPulse && (
                <span className="text-[11px]">{STATUS_ICONS[status]}</span>
            )}
            <span>{labelText}</span>
        </motion.span>
    )
}

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { EstadoTurno } from '@/types'

const statusBadgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
    {
        variants: {
            status: {
                PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
                CONFIRMADO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
                EN_SALA: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
                ATENDIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
                CANCELADO: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
                AUSENTE: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
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
    PENDIENTE: 'Pendiente',
    CONFIRMADO: 'Confirmado',
    EN_SALA: 'En sala',
    ATENDIDO: 'Atendido',
    CANCELADO: 'Cancelado',
    AUSENTE: 'Ausente',
}

export interface StatusBadgeProps {
    status: EstadoTurno
    pulse?: boolean
    showIcon?: boolean
    className?: string
}

export function StatusBadge({
    status,
    pulse,
    showIcon = true,
    className,
}: StatusBadgeProps) {
    const shouldPulse = pulse ?? status === 'EN_SALA'

    return (
        <motion.span
            className={cn(statusBadgeVariants({ status }), className)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            {shouldPulse && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
            )}
            {showIcon && !shouldPulse && (
                <span className="text-[10px]">{STATUS_ICONS[status]}</span>
            )}
            {STATUS_LABELS[status]}
        </motion.span>
    )
}

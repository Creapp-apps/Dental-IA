'use client'

import { toast as sonnerToast } from 'sonner'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

interface GlassAlertOptions {
    title: string
    description?: string
    duration?: number
    action?: {
        label: string
        onClick: () => void
    }
}

const VARIANT_CONFIG: Record<AlertVariant, {
    icon: typeof CheckCircle2
    iconClass: string
    borderClass: string
}> = {
    success: {
        icon: CheckCircle2,
        iconClass: 'text-emerald-500 dark:text-emerald-400',
        borderClass: 'border-l-emerald-500',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-amber-500 dark:text-amber-400',
        borderClass: 'border-l-amber-500',
    },
    error: {
        icon: XCircle,
        iconClass: 'text-red-500 dark:text-red-400',
        borderClass: 'border-l-red-500',
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-500 dark:text-blue-400',
        borderClass: 'border-l-blue-500',
    },
}

function showGlassAlert(variant: AlertVariant, options: GlassAlertOptions) {
    const config = VARIANT_CONFIG[variant]
    const Icon = config.icon

    return sonnerToast.custom(
        (id) => (
            <div
                className={cn(
                    'w-full glass rounded-xl shadow-glass-lg p-4 border-l-4',
                    config.borderClass,
                )}
            >
                <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                            {options.title}
                        </p>
                        {options.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {options.description}
                            </p>
                        )}
                        {options.action && (
                            <button
                                onClick={() => {
                                    options.action!.onClick()
                                    sonnerToast.dismiss(id)
                                }}
                                className="text-xs font-medium text-primary hover:underline mt-2 cursor-pointer"
                            >
                                {options.action.label}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => sonnerToast.dismiss(id)}
                        className="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        ),
        {
            duration: options.duration ?? 4000,
        }
    )
}

export const glassAlert = {
    success: (options: GlassAlertOptions) => showGlassAlert('success', options),
    warning: (options: GlassAlertOptions) => showGlassAlert('warning', options),
    error: (options: GlassAlertOptions) => showGlassAlert('error', options),
    info: (options: GlassAlertOptions) => showGlassAlert('info', options),
}

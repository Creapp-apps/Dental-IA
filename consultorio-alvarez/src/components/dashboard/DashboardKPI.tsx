'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

const COLOR_MAP = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50',
}

interface DashboardKPIProps {
    icon: React.ReactNode
    label: string
    value: number
    sub: string
    color: keyof typeof COLOR_MAP
    delay?: number
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
    const count = useMotionValue(0)
    const rounded = useTransform(count, (latest) => Math.round(latest))

    useEffect(() => {
        const controls = animate(count, value, {
            duration: 1.2,
            ease: 'easeOut',
            delay,
        })
        return controls.stop
    }, [value, count, delay])

    return <motion.span>{rounded}</motion.span>
}

export function DashboardKPI({ icon, label, value, sub, color, delay = 0 }: DashboardKPIProps) {
    return (
        <motion.div
            className="glass rounded-2xl shadow-glass p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">
                        <AnimatedNumber value={value} delay={delay} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                <div className={cn('rounded-xl p-2.5', COLOR_MAP[color])}>
                    {icon}
                </div>
            </div>
        </motion.div>
    )
}

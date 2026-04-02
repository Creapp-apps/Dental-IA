'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) {
        return (
            <div className={cn('h-9 w-9 rounded-xl', className)} />
        )
    }

    const isDark = resolvedTheme === 'dark'

    return (
        <motion.button
            className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-xl',
                'glass shadow-glass cursor-pointer',
                'hover:shadow-glass-lg transition-shadow',
                className
            )}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.div
                        key="moon"
                        initial={{ rotate: -90, scale: 0, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: 90, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Moon className="h-4 w-4 text-blue-300" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ rotate: 90, scale: 0, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: -90, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Sun className="h-4 w-4 text-amber-500" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    )
}

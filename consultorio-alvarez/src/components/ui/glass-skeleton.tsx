'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface GlassSkeletonProps {
    className?: string
    variant?: 'text' | 'circular' | 'rectangular' | 'card'
    width?: string | number
    height?: string | number
}

export function GlassSkeleton({
    className,
    variant = 'rectangular',
    width,
    height,
}: GlassSkeletonProps) {
    const variantClass = {
        text: 'h-4 rounded-md',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
        card: 'rounded-2xl min-h-[120px]',
    }

    return (
        <div
            className={cn(
                'relative overflow-hidden glass',
                variantClass[variant],
                className
            )}
            style={{ width, height }}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />
        </div>
    )
}

/* ──────────── Pre-built skeleton compositions ──────────── */

export function SkeletonCard() {
    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
            <div className="flex items-center gap-3">
                <GlassSkeleton variant="circular" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                    <GlassSkeleton variant="text" className="w-3/4" />
                    <GlassSkeleton variant="text" className="w-1/2 h-3" />
                </div>
            </div>
            <GlassSkeleton variant="rectangular" className="h-20" />
            <div className="flex gap-2">
                <GlassSkeleton variant="rectangular" className="h-8 w-20 rounded-lg" />
                <GlassSkeleton variant="rectangular" className="h-8 w-20 rounded-lg" />
            </div>
        </div>
    )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="glass rounded-2xl shadow-glass overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-border">
                {[1, 2, 3, 4].map((i) => (
                    <GlassSkeleton key={i} variant="text" className="flex-1 h-4" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-border last:border-0">
                    {[1, 2, 3, 4].map((j) => (
                        <GlassSkeleton key={j} variant="text" className="flex-1 h-4" />
                    ))}
                </div>
            ))}
        </div>
    )
}

export function SkeletonKPI() {
    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-3">
            <GlassSkeleton variant="text" className="w-1/3 h-3" />
            <GlassSkeleton variant="text" className="w-1/2 h-8" />
            <GlassSkeleton variant="text" className="w-2/3 h-3" />
        </div>
    )
}

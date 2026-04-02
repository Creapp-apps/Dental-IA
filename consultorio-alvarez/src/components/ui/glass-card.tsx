'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'

/* ──────────── GlassCard ──────────── */

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    hover?: boolean
    gradient?: boolean
    children?: React.ReactNode
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hover = true, gradient = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    'glass rounded-2xl shadow-glass p-5',
                    gradient && 'bg-gradient-to-br from-glass to-transparent',
                    className
                )}
                {...(hover && {
                    whileHover: {
                        y: -2,
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.10), 0 4px 12px rgba(0, 0, 0, 0.06)',
                    },
                    transition: {
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                    },
                })}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)
GlassCard.displayName = 'GlassCard'

/* ──────────── GlassCardHeader ──────────── */

const GlassCardHeader = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 pb-4', className)}
        {...props}
    />
))
GlassCardHeader.displayName = 'GlassCardHeader'

/* ──────────── GlassCardTitle ──────────── */

const GlassCardTitle = forwardRef<
    HTMLHeadingElement,
    HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
    />
))
GlassCardTitle.displayName = 'GlassCardTitle'

/* ──────────── GlassCardDescription ──────────── */

const GlassCardDescription = forwardRef<
    HTMLParagraphElement,
    HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
))
GlassCardDescription.displayName = 'GlassCardDescription'

/* ──────────── GlassCardContent ──────────── */

const GlassCardContent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

/* ──────────── GlassCardFooter ──────────── */

const GlassCardFooter = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center gap-2 pt-4', className)}
        {...props}
    />
))
GlassCardFooter.displayName = 'GlassCardFooter'

export {
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardDescription,
    GlassCardContent,
    GlassCardFooter,
}

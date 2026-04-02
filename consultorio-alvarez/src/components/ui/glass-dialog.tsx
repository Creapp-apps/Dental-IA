'use client'

import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const GlassDialog = DialogPrimitive.Root
const GlassDialogTrigger = DialogPrimitive.Trigger
const GlassDialogClose = DialogPrimitive.Close
const GlassDialogPortal = DialogPrimitive.Portal

/* ──────────── Overlay ──────────── */

const GlassDialogOverlay = forwardRef<
    React.ComponentRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'fixed inset-0 z-50 backdrop-blur-sm bg-black/30',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            className
        )}
        {...props}
    />
))
GlassDialogOverlay.displayName = 'GlassDialogOverlay'

/* ──────────── Content ──────────── */

const GlassDialogContent = forwardRef<
    React.ComponentRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <GlassDialogPortal>
        <GlassDialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
                'glass-strong rounded-2xl shadow-glass-xl p-6',
                'duration-300',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer">
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </GlassDialogPortal>
))
GlassDialogContent.displayName = 'GlassDialogContent'

/* ──────────── Header ──────────── */

const GlassDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
        {...props}
    />
)
GlassDialogHeader.displayName = 'GlassDialogHeader'

/* ──────────── Footer ──────────── */

const GlassDialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4',
            className
        )}
        {...props}
    />
)
GlassDialogFooter.displayName = 'GlassDialogFooter'

/* ──────────── Title ──────────── */

const GlassDialogTitle = forwardRef<
    React.ComponentRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
    />
))
GlassDialogTitle.displayName = 'GlassDialogTitle'

/* ──────────── Description ──────────── */

const GlassDialogDescription = forwardRef<
    React.ComponentRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
))
GlassDialogDescription.displayName = 'GlassDialogDescription'

export {
    GlassDialog,
    GlassDialogPortal,
    GlassDialogOverlay,
    GlassDialogTrigger,
    GlassDialogClose,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogFooter,
    GlassDialogTitle,
    GlassDialogDescription,
}

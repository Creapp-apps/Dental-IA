'use client'

import * as React from 'react'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Context ──────────────────────────────────────────────── */
interface TopSheetCtx {
    open: boolean
    setOpen: (v: boolean) => void
}
const Ctx = createContext<TopSheetCtx>({ open: false, setOpen: () => { } })

/* ── Root ──────────────────────────────────────────────────── */
interface TopSheetProps {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
}

function TopSheet({ children, open: controlledOpen, onOpenChange, defaultOpen = false }: TopSheetProps) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = useCallback(
        (v: boolean) => {
            if (!isControlled) setInternalOpen(v)
            onOpenChange?.(v)
        },
        [isControlled, onOpenChange],
    )

    return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}

/* ── Trigger ──────────────────────────────────────────────── */
interface TopSheetTriggerProps {
    children: React.ReactNode
    asChild?: boolean
    className?: string
}

function TopSheetTrigger({ children, asChild, className }: TopSheetTriggerProps) {
    const { setOpen } = useContext(Ctx)
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            onClick: (e: React.MouseEvent) => {
                (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e)
                setOpen(true)
            },
        })
    }
    return (
        <button className={className} onClick={() => setOpen(true)}>
            {children}
        </button>
    )
}

/* ── Content ──────────────────────────────────────────────── */
interface TopSheetContentProps {
    children: React.ReactNode
    className?: string
    height?: string
}

function TopSheetContent({ children, className, height = '85vh' }: TopSheetContentProps) {
    const { open, setOpen } = useContext(Ctx)

    // Lock body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = '' }
        }
    }, [open])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '-100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={cn(
                            'fixed inset-x-0 top-0 z-50 flex flex-col bg-white shadow-2xl rounded-b-2xl overflow-hidden',
                            className,
                        )}
                        style={{ maxHeight: height }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

/* ── Subcomponents ────────────────────────────────────────── */
function TopSheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('px-6 pt-6 pb-2', className)}>{children}</div>
}

function TopSheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h2 className={cn('text-lg font-bold text-gray-900', className)}>{children}</h2>
}

function TopSheetDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return <p className={cn('text-sm text-gray-500 mt-1', className)}>{children}</p>
}

function TopSheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mt-auto px-6 py-4 border-t border-gray-100', className)}>{children}</div>
}

function TopSheetClose({ children, asChild, className }: { children: React.ReactNode; asChild?: boolean; className?: string }) {
    const { setOpen } = useContext(Ctx)
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            onClick: (e: React.MouseEvent) => {
                (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e)
                setOpen(false)
            },
        })
    }
    return (
        <button className={className} onClick={() => setOpen(false)}>
            {children}
        </button>
    )
}

export default TopSheet
export {
    TopSheet,
    TopSheetTrigger,
    TopSheetContent,
    TopSheetHeader,
    TopSheetTitle,
    TopSheetDescription,
    TopSheetFooter,
    TopSheetClose,
}

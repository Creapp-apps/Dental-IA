import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface GlassDatePickerProps {
    fecha: string
    onChange: (f: string) => void
    placeholder?: string
    className?: string
}

export function GlassDatePicker({ fecha, onChange, placeholder = 'Seleccionar fecha', className }: GlassDatePickerProps) {
    const [open, setOpen] = useState(false)
    const dateObj = fecha ? parseISO(fecha) : undefined

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-input px-3 py-2 text-sm bg-background hover:bg-accent focus:ring-2 focus:ring-ring/50 transition-all outline-none",
                    !fecha && "text-muted-foreground",
                    className
                )}
            >
                <span>{fecha && dateObj ? format(dateObj, 'PP', { locale: es }) : placeholder}</span>
                <CalendarIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 mt-1.5 z-[99999] bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl rounded-xl p-3 border border-border"
                        >
                            <Calendar
                                mode="single"
                                selected={dateObj}
                                onSelect={(d) => {
                                    if (d) {
                                        onChange(format(d, 'yyyy-MM-dd'))
                                        setOpen(false)
                                    }
                                }}
                                locale={es}
                                captionLayout="dropdown"
                                fromYear={1900}
                                toYear={new Date().getFullYear() + 10}
                                className="bg-transparent"
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

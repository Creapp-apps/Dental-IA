import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlassSelectProps {
    value: string
    onChange: (val: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    className?: string
}

export function GlassSelect({ value, onChange, options, placeholder = 'Seleccionar...', className }: GlassSelectProps) {
    const [open, setOpen] = useState(false)
    const selected = options.find(o => o.value === value)

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-input px-3 py-2 text-sm bg-background hover:bg-accent focus:ring-2 focus:ring-ring/50 transition-all outline-none",
                    !selected && "text-muted-foreground",
                    className
                )}
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
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
                            className="absolute top-full left-0 w-full mt-1.5 z-[99999] bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl rounded-xl p-1.5 overflow-y-auto max-h-[250px] border border-border custom-scrollbar"
                        >
                            {options.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => { onChange(o.value); setOpen(false) }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-start gap-2",
                                        value === o.value
                                            ? 'bg-primary text-primary-foreground font-medium'
                                            : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                                    )}
                                >
                                    <span className="flex-1 leading-snug">{o.label}</span>
                                    {value === o.value && <span className="text-primary-foreground text-xs mt-0.5 shrink-0">✓</span>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

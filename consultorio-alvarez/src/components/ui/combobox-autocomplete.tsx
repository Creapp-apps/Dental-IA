'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AutocompleteOption {
    id?: string
    label: string
    [key: string]: any
}

interface ComboboxAutocompleteProps {
    value: string
    onChange: (val: string) => void
    options: (string | AutocompleteOption)[]
    placeholder?: string
    className?: string
    inputClassName?: string
    disabled?: boolean
    maxVisibleItems?: number
    allowCustom?: boolean
    name?: string
    id?: string
    onSelectOption?: (option: AutocompleteOption) => void
    direction?: 'up' | 'down'
    onOpenChange?: (isOpen: boolean) => void
}

export function ComboboxAutocomplete({
    value,
    onChange,
    options,
    placeholder = 'Seleccionar...',
    className,
    inputClassName,
    disabled = false,
    maxVisibleItems = 15,
    allowCustom = true,
    name,
    id,
    onSelectOption,
    direction = 'down',
    onOpenChange
}: ComboboxAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
    const [isTyping, setIsTyping] = useState(false)
    const [dynamicMaxHeight, setDynamicMaxHeight] = useState<string>('440px')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Normalizar opciones a objetos { id, label }
    const normalizedOptions: AutocompleteOption[] = useMemo(() => {
        return options.map((opt, idx) => {
            if (typeof opt === 'string') {
                return { id: `opt-${idx}`, label: opt }
            }
            return {
                ...opt,
                id: opt.id || `opt-${idx}`,
                label: opt.label ?? String(opt)
            }
        })
    }, [options])

    // Normalizador de texto para búsquedas (sin tildes, minúsculas)
    const normalizeText = (text: string) =>
        text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()

    // Opciones filtradas
    const filteredOptions = useMemo(() => {
        if (!isTyping || !value.trim()) {
            return normalizedOptions
        }
        const query = normalizeText(value)
        return normalizedOptions.filter((opt) =>
            normalizeText(opt.label).includes(query)
        )
    }, [normalizedOptions, value, isTyping])

    // Cerrar al hacer clic afuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setIsTyping(false)
                setHighlightedIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Altura calculada para mostrar ítems
    const maxCalculatedHeight = `${maxVisibleItems * 36 + 12}px`

    // Notificar cambios en el estado de apertura
    useEffect(() => {
        onOpenChange?.(isOpen)
    }, [isOpen, onOpenChange])

    // Calcular altura máxima disponible para no tocar el borde superior de la página y permitir más opciones
    useEffect(() => {
        if (!isOpen || !containerRef.current) return

        if (direction === 'up') {
            const updateDynamicHeight = () => {
                if (!containerRef.current) return
                const rect = containerRef.current.getBoundingClientRect()
                // Margen de seguridad con respecto al límite superior del viewport (32px)
                const safetyMargin = 32
                const spaceAbove = rect.top - safetyMargin
                // Espacio para mostrar más opciones (hasta 13-14 ítems ~480px)
                const targetHeight = Math.min(maxVisibleItems * 38 + 16, 480)

                // Si la ventana tiene scroll y el espacio superior es reducido, ajustar suavemente el scroll de la página
                if (spaceAbove < targetHeight && window.scrollY > 0) {
                    const scrollAmount = Math.min(targetHeight - spaceAbove, window.scrollY)
                    window.scrollBy({ top: -scrollAmount, behavior: 'smooth' })
                }

                // Altura disponible real para garantizar que NUNCA sobrepase el límite de la página
                const availableSpace = Math.max(160, Math.floor(rect.top - safetyMargin))
                const finalMaxHeight = Math.min(targetHeight, availableSpace)
                setDynamicMaxHeight(`${finalMaxHeight}px`)
            }

            updateDynamicHeight()
            window.addEventListener('resize', updateDynamicHeight)
            window.addEventListener('scroll', updateDynamicHeight, { passive: true })
            return () => {
                window.removeEventListener('resize', updateDynamicHeight)
                window.removeEventListener('scroll', updateDynamicHeight)
            }
        } else {
            setDynamicMaxHeight(`min(${maxCalculatedHeight}, 68vh)`)
        }
    }, [isOpen, direction, maxVisibleItems, maxCalculatedHeight])

    // Ajustar scroll automático suave cuando cambia el índice resaltado o al abrir con opción preseleccionada
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const timer = setTimeout(() => {
                const listElement = listRef.current
                if (!listElement) return
                const itemElement = listElement.children[highlightedIndex] as HTMLElement
                if (itemElement) {
                    itemElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                }
            }, 60)
            return () => clearTimeout(timer)
        }
    }, [isOpen, highlightedIndex])

    const handleSelect = (option: AutocompleteOption) => {
        onChange(option.label)
        if (onSelectOption) {
            onSelectOption(option)
        }
        setIsOpen(false)
        setIsTyping(false)
        setHighlightedIndex(-1)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsTyping(true)
        setIsOpen(true)
        setHighlightedIndex(0)
        onChange(e.target.value)
    }

    const handleInputFocus = () => {
        if (!disabled) {
            setIsTyping(false)
            setIsOpen(true)
            // Resaltar la opción seleccionada si coincide
            const matchedIndex = normalizedOptions.findIndex(
                (opt) => normalizeText(opt.label) === normalizeText(value)
            )
            setHighlightedIndex(matchedIndex >= 0 ? matchedIndex : 0)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!isOpen) {
                setIsOpen(true)
                setHighlightedIndex(0)
            } else {
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                )
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!isOpen) {
                setIsOpen(true)
                setHighlightedIndex(filteredOptions.length - 1)
            } else {
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                )
            }
        } else if (e.key === 'Enter') {
            if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                e.preventDefault()
                handleSelect(filteredOptions[highlightedIndex])
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false)
            setHighlightedIndex(-1)
        }
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange('')
        setIsTyping(false)
        inputRef.current?.focus()
        setIsOpen(true)
    }

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type="text"
                    disabled={disabled}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={cn(
                        'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-16',
                        inputClassName
                    )}
                />

                <div className="absolute right-1.5 flex items-center gap-1">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            tabIndex={-1}
                            aria-label="Limpiar campo"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={disabled}
                        onClick={() => {
                            if (isOpen) {
                                setIsOpen(false)
                            } else {
                                handleInputFocus()
                                inputRef.current?.focus()
                            }
                        }}
                        aria-label="Desplegar opciones"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronDown
                            className={cn(
                                'h-4 w-4 transition-transform duration-200',
                                isOpen && 'rotate-180'
                            )}
                        />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: direction === 'up' ? 4 : -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: direction === 'up' ? 4 : -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            maxHeight: dynamicMaxHeight,
                            transformOrigin: direction === 'up' ? 'bottom' : 'top'
                        }}
                        className={cn(
                            "absolute left-0 w-full z-[100] bg-popover text-popover-foreground rounded-xl p-1.5 border border-border backdrop-blur-xl overflow-y-auto scroll-smooth custom-scrollbar",
                            direction === 'up'
                                ? "bottom-full mb-1.5 shadow-[0_-15px_35px_rgba(0,0,0,0.35)] dark:shadow-[0_-20px_45px_rgba(0,0,0,0.75)]"
                                : "top-full mt-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.45)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.85)]"
                        )}
                    >
                        <div ref={listRef} className="space-y-0.5">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => {
                                    const isSelected =
                                        normalizeText(option.label) === normalizeText(value)
                                    const isHighlighted = highlightedIndex === index

                                    return (
                                        <button
                                            key={option.id || index}
                                            type="button"
                                            onClick={() => handleSelect(option)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between min-h-[36px] cursor-pointer',
                                                isSelected
                                                    ? 'bg-primary/15 text-primary font-medium dark:bg-primary/25'
                                                    : isHighlighted
                                                    ? 'bg-accent text-accent-foreground'
                                                    : 'text-foreground hover:bg-accent/60'
                                            )}
                                        >
                                            <span className="truncate pr-2">{option.label}</span>
                                            {isSelected && (
                                                <Check className="h-4 w-4 shrink-0 text-primary" />
                                            )}
                                        </button>
                                    )
                                })
                            ) : (
                                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                                    {allowCustom && value.trim() ? (
                                        <span>
                                            Sin coincidencias directas. Presioná enter o hacé clic afuera para guardar{' '}
                                            <strong className="text-foreground font-semibold">
                                                "{value}"
                                            </strong>
                                            .
                                        </span>
                                    ) : (
                                        <span>No hay opciones disponibles</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

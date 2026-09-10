'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionContextType {
  openValues: string[]
  toggleItem: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined)

interface AccordionItemContextType {
  value: string
  isOpen: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextType | undefined>(undefined)

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  type?: 'single' | 'multiple'
  collapsible?: boolean
  children: React.ReactNode
}

export function Accordion({
  defaultValue,
  value: controlledValue,
  onValueChange,
  type = 'single',
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) {
  const getInitialValues = (): string[] => {
    if (controlledValue !== undefined) {
      return Array.isArray(controlledValue) ? controlledValue : [controlledValue]
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    }
    return []
  }

  const [openValues, setOpenValues] = React.useState<string[]>(getInitialValues)

  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setOpenValues(Array.isArray(controlledValue) ? controlledValue : [controlledValue])
    }
  }, [controlledValue])

  const toggleItem = React.useCallback(
    (itemValue: string) => {
      setOpenValues((prev) => {
        let next: string[]
        const isCurrentlyOpen = prev.includes(itemValue)

        if (type === 'multiple') {
          if (isCurrentlyOpen) {
            next = prev.filter((v) => v !== itemValue)
          } else {
            next = [...prev, itemValue]
          }
        } else {
          // single mode
          if (isCurrentlyOpen) {
            next = collapsible ? [] : prev
          } else {
            next = [itemValue]
          }
        }

        if (onValueChange) {
          onValueChange(type === 'multiple' ? next : next[0] || '')
        }
        return next
      })
    },
    [type, collapsible, onValueChange]
  )

  return (
    <AccordionContext.Provider value={{ openValues, toggleItem }}>
      <div data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function AccordionItem({ value, className, children, ...props }: AccordionItemProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error('AccordionItem must be used within an Accordion')

  const isOpen = context.openValues.includes(value)

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        data-slot="accordion-item"
        data-state={isOpen ? 'open' : 'closed'}
        className={cn('transition-all', className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  const accordionContext = React.useContext(AccordionContext)
  const itemContext = React.useContext(AccordionItemContext)

  if (!accordionContext || !itemContext) {
    throw new Error('AccordionTrigger must be used within an AccordionItem')
  }

  const { value, isOpen } = itemContext
  const { toggleItem } = accordionContext

  return (
    <div className="flex w-full">
      <button
        type="button"
        data-slot="accordion-trigger"
        data-state={isOpen ? 'open' : 'closed'}
        aria-expanded={isOpen}
        onClick={() => toggleItem(value)}
        className={cn(
          'group/trigger flex flex-1 items-center justify-between gap-4 py-5 text-left text-sm sm:text-base font-semibold text-slate-900 transition-all outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 cursor-pointer select-none',
          className
        )}
        {...props}
      >
        <span className="flex-1">{children}</span>
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 group-hover/trigger:bg-blue-50 group-hover/trigger:text-blue-600',
            isOpen && 'rotate-180 bg-blue-100 text-blue-700'
          )}
        >
          <ChevronDown className="size-4 shrink-0 transition-transform duration-300" />
        </div>
      </button>
    </div>
  )
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  const itemContext = React.useContext(AccordionItemContext)
  if (!itemContext) {
    throw new Error('AccordionContent must be used within an AccordionItem')
  }

  const { isOpen } = itemContext

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          data-slot="accordion-content"
          data-state="open"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.25, delay: 0.05, ease: 'easeOut' },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.18, ease: 'easeIn' },
            },
          }}
          className="overflow-hidden"
        >
          <div
            className={cn('pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed', className)}
            {...props}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

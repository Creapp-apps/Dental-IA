'use client'

import React, { useEffect } from 'react'

/**
 * NumpadTabProvider
 * Intercepta la tecla Enter del teclado numérico (NumpadEnter)
 * y la transforma en navegación secuencial (función Tab) entre inputs
 * para agilizar la carga rápida de datos en recepción/consultorio.
 */
export function NumpadTabProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Detectar tecla Enter del teclado numérico
            const isNumpadEnter = e.code === 'NumpadEnter' || (e.key === 'Enter' && e.location === 3)
            if (!isNumpadEnter) return

            const activeEl = document.activeElement as HTMLElement | null
            if (!activeEl) return

            // Determinar el contenedor más cercano (formulario, diálogo/modal o contenedor principal)
            const container = 
                activeEl.closest('form') || 
                activeEl.closest('[role="dialog"]') || 
                activeEl.closest('.modal') || 
                document.querySelector('main') || 
                document.body

            if (!container) return

            // Buscar todos los elementos navegables válidos
            const selector = [
                'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
                'select:not([disabled]):not([tabindex="-1"])',
                'textarea:not([disabled]):not([tabindex="-1"])',
                'button:not([disabled]):not([tabindex="-1"])',
                '[tabindex="0"]:not([disabled])'
            ].join(', ')

            const allElements = Array.from(container.querySelectorAll<HTMLElement>(selector))

            // Filtrar solo los elementos visibles en el DOM
            const focusable = allElements.filter(el => {
                // Chequear si está visible
                const isHidden = 
                    el.offsetParent === null && 
                    el.offsetWidth === 0 && 
                    el.offsetHeight === 0

                if (isHidden) return false

                const style = window.getComputedStyle(el)
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
            })

            if (focusable.length === 0) return

            const currentIndex = focusable.indexOf(activeEl)

            // Prevenir acción por defecto del Enter (evita submit prematuro de form o salto de línea)
            e.preventDefault()
            e.stopPropagation()

            let nextIndex: number
            if (e.shiftKey) {
                // Retroceder si presiona Shift + NumpadEnter
                nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1
            } else {
                // Avanzar al siguiente input
                nextIndex = currentIndex >= 0 && currentIndex < focusable.length - 1 ? currentIndex + 1 : 0
            }

            const nextEl = focusable[nextIndex]
            if (nextEl) {
                nextEl.focus()

                // Si es un input de texto o número, auto-seleccionar el contenido para facilitar edición inmediata
                if (nextEl instanceof HTMLInputElement && /^(text|number|tel|email|search|url)$/i.test(nextEl.type)) {
                    try {
                        nextEl.select()
                    } catch {
                        // Algunos tipos de input en ciertos browsers no soportan select(), ignorar
                    }
                }

                // Asegurar visibilidad en pantalla si hay scroll
                try {
                    nextEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                } catch {
                    // Fallback
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true)
        }
    }, [])

    return <>{children}</>
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes Argentine phone numbers to the official Meta Cloud API format.
 * Meta requires: Country Code (54) + Area Code + Local Number (without the country's mobile prefix '9' or the local mobile prefix '15').
 * The final payload must be: '54' + 10-digit number.
 */
export function normalizarTelefonoArgentino(telefono: string): string {
    // 1. Clean all non-digit characters
    let clean = telefono.replace(/\D/g, '')

    if (!clean) return ''

    // 2. Remove country code prefixes if present
    if (clean.startsWith('549')) {
        clean = clean.slice(3)
    } else if (clean.startsWith('54')) {
        clean = clean.slice(2)
    }

    // 3. Remove national long-distance prefix '0' if present
    if (clean.startsWith('0')) {
        clean = clean.slice(1)
    }

    // 4. Remove local mobile prefix '15'
    // Case A: Starts with 15 and is 10 digits long (e.g. 1544445555) -> Assume Buenos Aires (11)
    if (clean.length === 10 && clean.startsWith('15')) {
        clean = '11' + clean.slice(2)
    }
    // Case B: 12 digits, and '15' is after 2-digit area code (e.g. 11 15 4444 5555) -> Remove '15'
    else if (clean.length === 12 && clean.slice(2, 4) === '15') {
        clean = clean.slice(0, 2) + clean.slice(4)
    }
    // Case C: 12 digits, and '15' is after 3-digit area code (e.g. 341 15 444 5555) -> Remove '15'
    else if (clean.length === 12 && clean.slice(3, 5) === '15') {
        clean = clean.slice(0, 3) + clean.slice(5)
    }
    // Case D: 13 digits, and '15' is after 4-digit area code (e.g. 3361 15 44 5555) -> Remove '15'
    else if (clean.length === 13 && clean.slice(4, 6) === '15') {
        clean = clean.slice(0, 4) + clean.slice(6)
    }

    // 5. If we ended up with 11 digits starting with 15, strip it
    if (clean.length === 11 && clean.startsWith('15')) {
        clean = clean.slice(2)
    }

    // 6. If the number is exactly 10 digits (Standard Argentine Area Code + Local Number), prepend '54'
    if (clean.length === 10) {
        return `54${clean}`
    }

    // 7. Fallback: If longer than 10 digits, take the last 10 digits (the core local number) and prepend '54'
    if (clean.length > 10) {
        return `54${clean.slice(-10)}`
    }

    // Fallback: prepend '54' to whatever is left
    return `54${clean}`
}

/**
 * Quita los prefijos honoríficos o títulos médicos como "Dr.", "Dr/a.", "Dra." etc.
 * al principio del nombre de un profesional para evitar duplicaciones en plantillas.
 */
export function limpiarTituloProfesional(nombre: string): string {
    if (!nombre) return ''
    return nombre.replace(/^(dr\/?a?\.?\s+|dra\.?\s+)/i, '').trim()
}


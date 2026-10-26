import { describe, it, expect } from 'vitest'
import {
    capHorizonte, horizonteMaximo, fechaEnLista, tieneFechasFuturas,
    esquemaFechasAHorario, HORIZONTE_RECURRENTE, HORIZONTE_FECHAS,
} from './disponibilidad-core'

describe('capHorizonte', () => {
    it('recurrente = 21, fechas = 90', () => {
        expect(capHorizonte('recurrente')).toBe(HORIZONTE_RECURRENTE)
        expect(capHorizonte('fechas')).toBe(HORIZONTE_FECHAS)
    })
})

describe('horizonteMaximo', () => {
    it('90 si hay al menos un fechas', () => {
        expect(horizonteMaximo(['recurrente', 'fechas'])).toBe(90)
    })
    it('21 si todos recurrentes, 21 si vacío', () => {
        expect(horizonteMaximo(['recurrente', 'recurrente'])).toBe(21)
        expect(horizonteMaximo([])).toBe(21)
    })
})

describe('fechaEnLista', () => {
    it('match exacto', () => {
        expect(fechaEnLista(['2026-11-10', '2026-11-24'], '2026-11-10')).toBe(true)
        expect(fechaEnLista(['2026-11-10'], '2026-11-03')).toBe(false)
    })
    it('null/undefined/vacío = false', () => {
        expect(fechaEnLista(null, '2026-11-10')).toBe(false)
        expect(fechaEnLista([], '2026-11-10')).toBe(false)
    })
})

describe('tieneFechasFuturas', () => {
    it('hoy-inclusive', () => {
        expect(tieneFechasFuturas(['2026-10-26'], '2026-10-26')).toBe(true)
        expect(tieneFechasFuturas(['2026-11-10'], '2026-10-26')).toBe(true)
        expect(tieneFechasFuturas(['2026-01-01'], '2026-10-26')).toBe(false)
    })
    it('null/vacío = false', () => {
        expect(tieneFechasFuturas(null, '2026-10-26')).toBe(false)
        expect(tieneFechasFuturas([], '2026-10-26')).toBe(false)
    })
})

describe('esquemaFechasAHorario', () => {
    it('null si no hay esquema', () => {
        expect(esquemaFechasAHorario(null)).toBeNull()
        expect(esquemaFechasAHorario(undefined)).toBeNull()
    })
    it('agrega activo:true y preserva campos', () => {
        const r = esquemaFechasAHorario({ activo_manana: true, apertura_manana: '09:00', cierre_manana: '13:00' } as any)
        expect(r?.activo).toBe(true)
        expect(r?.apertura_manana).toBe('09:00')
    })
})

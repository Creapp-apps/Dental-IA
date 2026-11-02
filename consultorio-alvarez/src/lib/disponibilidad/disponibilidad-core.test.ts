import { describe, it, expect } from 'vitest'
import {
    capHorizonte, horizonteMaximo, fechaEnLista, tieneFechasFuturas,
    esquemaFechasAHorario, HORIZONTE_RECURRENTE, HORIZONTE_FECHAS,
    slotColisiona, type TurnoRango,
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

describe('slotColisiona', () => {
    // Slot de referencia 10:00–10:20 (20 min).
    const S = 0
    const E = 20 * 60 * 1000
    const t = (profesional_id: string | null, startMs: number, durMin = 20): TurnoRango => ({
        profesional_id, startMs, endMs: startMs + durMin * 60 * 1000,
    })

    it('mismo profesional: choca con o sin sillón compartido', () => {
        expect(slotColisiona([t('pedro', S)], S, E, 'pedro', false)).toBe(true)
        expect(slotColisiona([t('pedro', S)], S, E, 'pedro', true)).toBe(true)
    })

    it('REGRESIÓN sillón: turno de otro profesional NO choca sin flag, SÍ con flag', () => {
        // Caso real: Eduardo ocupa 10:00; el bot le ofrece 10:00 a Pedro.
        const turnos = [t('eduardo', S)]
        expect(slotColisiona(turnos, S, E, 'pedro', false)).toBe(false) // bug actual
        expect(slotColisiona(turnos, S, E, 'pedro', true)).toBe(true)   // un solo sillón
    })

    it('sin solape no choca aunque el sillón sea compartido', () => {
        const turnos = [t('eduardo', E)] // empieza justo cuando el slot termina
        expect(slotColisiona(turnos, S, E, 'pedro', true)).toBe(false)
    })

    it('turno largo de otro cubre el slot (sillón compartido)', () => {
        const turnos = [t('eduardo', S - 40 * 60 * 1000, 80)] // 08:40–10:00? cubre si solapa
        // Empieza 40 min antes y dura 80 → termina 40 min después del inicio del slot: solapa.
        expect(slotColisiona(turnos, S, E, 'pedro', true)).toBe(true)
    })

    it('turno sin profesional asignado bloquea global sólo con sillón compartido', () => {
        const turnos = [t(null, S)]
        expect(slotColisiona(turnos, S, E, 'pedro', false)).toBe(false)
        expect(slotColisiona(turnos, S, E, 'pedro', true)).toBe(true)
    })
})

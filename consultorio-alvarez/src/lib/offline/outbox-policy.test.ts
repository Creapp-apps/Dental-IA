import { describe, it, expect } from 'vitest'
import { calcularProximoIntento, esElegible } from './outbox-policy'

const AHORA = new Date('2026-10-08T12:00:00.000Z')

describe('calcularProximoIntento', () => {
    it('devuelve la espera de la escalera para cada intento', () => {
        expect(calcularProximoIntento(1, AHORA)).toBe('2026-10-08T12:00:05.000Z')
        expect(calcularProximoIntento(2, AHORA)).toBe('2026-10-08T12:00:15.000Z')
        expect(calcularProximoIntento(3, AHORA)).toBe('2026-10-08T12:01:00.000Z')
        expect(calcularProximoIntento(4, AHORA)).toBe('2026-10-08T12:05:00.000Z')
        expect(calcularProximoIntento(5, AHORA)).toBe('2026-10-08T12:15:00.000Z')
        expect(calcularProximoIntento(6, AHORA)).toBe('2026-10-08T13:00:00.000Z')
    })

    it('devuelve null cuando se agota la escalera', () => {
        expect(calcularProximoIntento(7, AHORA)).toBeNull()
    })

    // Review Focus 1: base local vieja o dato corrupto
    it('devuelve null con un contador fuera de rango en vez de romper', () => {
        expect(calcularProximoIntento(99, AHORA)).toBeNull()
        expect(calcularProximoIntento(0, AHORA)).toBeNull()
        expect(calcularProximoIntento(-3, AHORA)).toBeNull()
    })
})

describe('esElegible', () => {
    it('toma un pendiente sin espera pendiente', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: null }, AHORA)).toBe(true)
    })

    it('toma un pendiente cuya espera ya pasó', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T11:59:59.000Z' }
        expect(esElegible(item, AHORA)).toBe(true)
    })

    it('deja pasar un pendiente cuya espera todavía no venció', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T12:00:01.000Z' }
        expect(esElegible(item, AHORA)).toBe(false)
    })

    it('nunca toma un atascado', () => {
        expect(esElegible({ status: 'ATASCADO', next_attempt_at: null }, AHORA)).toBe(false)
    })

    // Review Focus 2: no quedar bloqueado para siempre por un valor corrupto
    it('considera elegible un pendiente con next_attempt_at inválido', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: '' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: 'no es fecha' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE' }, AHORA)).toBe(true)
    })
})

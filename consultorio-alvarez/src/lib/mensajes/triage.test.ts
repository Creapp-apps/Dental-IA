import { describe, test, expect } from 'vitest'
import { carrilDe, debeEstampar } from './triage'

describe('carrilDe: el estado manda', () => {
    test('PENDIENTE + rojo -> carril rojo con etiqueta del motivo', () => {
        expect(carrilDe({ estado: 'HUMANO_PENDIENTE', prioridad: 'rojo', motivo: 'urgencia' }))
            .toEqual({ carril: 'rojo', etiqueta: '🚨 Dolor / urgencia' })
    })
    test('PENDIENTE + prioridad null -> amarillo (nunca se oculta)', () => {
        expect(carrilDe({ estado: 'HUMANO_PENDIENTE', prioridad: null, motivo: null }).carril).toBe('amarillo')
    })
    test('ATENDIENDO -> azul con nombre del operador', () => {
        expect(carrilDe({ estado: 'HUMANO_ATENDIENDO', prioridad: 'rojo', motivo: 'urgencia', asignadoNombre: 'Eduardo' }))
            .toEqual({ carril: 'azul', etiqueta: '👤 Atiende: Eduardo' })
    })
    test('ATENDIENDO sin nombre -> azul sin romper', () => {
        expect(carrilDe({ estado: 'HUMANO_ATENDIENDO', prioridad: null, motivo: null, asignadoNombre: null }).carril).toBe('azul')
    })
    test('BOT + turno_confirmado -> verde "Turno confirmado"', () => {
        expect(carrilDe({ estado: 'BOT', prioridad: 'verde', motivo: 'turno_confirmado' }))
            .toEqual({ carril: 'verde', etiqueta: '✅ Turno confirmado' })
    })
    test('BOT sin motivo -> verde "Bot gestionando"', () => {
        expect(carrilDe({ estado: 'BOT', prioridad: null, motivo: null }))
            .toEqual({ carril: 'verde', etiqueta: '🤖 Bot gestionando' })
    })
})

describe('debeEstampar: no degradar', () => {
    test('no degrada rojo a amarillo', () => { expect(debeEstampar('rojo', 'amarillo')).toBe(false) })
    test('sube amarillo a rojo', () => { expect(debeEstampar('amarillo', 'rojo')).toBe(true) })
    test('estampa sobre null', () => { expect(debeEstampar(null, 'amarillo')).toBe(true) })
})

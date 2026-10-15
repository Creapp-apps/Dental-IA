import { describe, it, expect } from 'vitest'
import { fechaVencimiento, estadoEfectivo, VIGENCIA_DIAS_DEFAULT } from './vigencia'

describe('fechaVencimiento', () => {
    it('suma los días de vigencia', () => {
        expect(fechaVencimiento('2026-10-01', 7)).toBe('2026-10-08')
    })
    it('cruza fin de mes', () => {
        expect(fechaVencimiento('2026-10-28', 7)).toBe('2026-11-04')
    })
    it('usa el default si vigencia no es válida', () => {
        expect(fechaVencimiento('2026-10-01', 0)).toBe('2026-10-08')
        expect(fechaVencimiento('2026-10-01', null)).toBe('2026-10-08')
    })
    it('sin fecha → null', () => {
        expect(fechaVencimiento(null, 7)).toBeNull()
    })
    it('default = 7', () => expect(VIGENCIA_DIAS_DEFAULT).toBe(7))
})

describe('estadoEfectivo', () => {
    const hoy = new Date('2026-10-15T12:00:00')

    it('PRESENTADO ya vencido → VENCIDO', () => {
        expect(estadoEfectivo({ estado: 'PRESENTADO', fecha_presentacion: '2026-10-01', vigencia_dias: 7 }, hoy)).toBe('VENCIDO')
    })
    it('PRESENTADO aún vigente → PRESENTADO', () => {
        expect(estadoEfectivo({ estado: 'PRESENTADO', fecha_presentacion: '2026-10-12', vigencia_dias: 7 }, hoy)).toBe('PRESENTADO')
    })
    it('vale el día del vencimiento inclusive', () => {
        // presentado 2026-10-08 + 7 = vence 2026-10-15 → hoy 2026-10-15 todavía vale
        expect(estadoEfectivo({ estado: 'PRESENTADO', fecha_presentacion: '2026-10-08', vigencia_dias: 7 }, hoy)).toBe('PRESENTADO')
    })
    it('APROBADO vencido NO se marca VENCIDO', () => {
        expect(estadoEfectivo({ estado: 'APROBADO', fecha_presentacion: '2026-10-01', vigencia_dias: 7 }, hoy)).toBe('APROBADO')
    })
    it('RECHAZADO se muestra tal cual', () => {
        expect(estadoEfectivo({ estado: 'RECHAZADO', fecha_presentacion: '2026-10-01', vigencia_dias: 7 }, hoy)).toBe('RECHAZADO')
    })
    it('BORRADOR no vence', () => {
        expect(estadoEfectivo({ estado: 'BORRADOR', fecha_presentacion: '2026-10-01', vigencia_dias: 7 }, hoy)).toBe('BORRADOR')
    })
})

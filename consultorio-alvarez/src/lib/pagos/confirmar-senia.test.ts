import { describe, it, expect } from 'vitest'
import { construirNotasSeniaAbonada } from './confirmar-senia'

describe('construirNotasSeniaAbonada', () => {
    it('saca la marca de seña pendiente y antepone la de abonada con el id del pago', () => {
        const r = construirNotasSeniaAbonada('[SEÑA PENDIENTE: $10.000]\nNota del paciente', 10000, '123456')
        expect(r).toBe('[SEÑA ABONADA MP: $10.000 - Ref: 123456]\nNota del paciente')
    })

    it('conserva otras marcas (ej. cobertura) y sólo saca la de seña pendiente', () => {
        const original = '[Cobertura: OSDE - Plan: 210]\n[SEÑA PENDIENTE: $10.000]\nComentario'
        const r = construirNotasSeniaAbonada(original, 10000, '99')
        expect(r).toBe('[SEÑA ABONADA MP: $10.000 - Ref: 99]\n[Cobertura: OSDE - Plan: 210]\nComentario')
    })

    it('funciona aunque no haya nota de seña pendiente', () => {
        expect(construirNotasSeniaAbonada('Solo un comentario', 5000, '7')).toBe('[SEÑA ABONADA MP: $5.000 - Ref: 7]\nSolo un comentario')
    })

    it('funciona con notas vacías o nulas', () => {
        expect(construirNotasSeniaAbonada('', 5000, '7')).toBe('[SEÑA ABONADA MP: $5.000 - Ref: 7]\n')
        expect(construirNotasSeniaAbonada(null, 5000, '7')).toBe('[SEÑA ABONADA MP: $5.000 - Ref: 7]\n')
        expect(construirNotasSeniaAbonada(undefined, 5000, '7')).toBe('[SEÑA ABONADA MP: $5.000 - Ref: 7]\n')
    })

    it('formatea el monto en es-AR (punto de miles)', () => {
        expect(construirNotasSeniaAbonada(null, 1234567, 'x')).toContain('$1.234.567')
    })
})

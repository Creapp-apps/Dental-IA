import { describe, it, expect } from 'vitest'
import { calcularSenia } from './senia'

describe('calcularSenia', () => {
    it('requiere seña con integración activa, cobro on y monto > 0', () => {
        const r = calcularSenia({ isActive: true, credentials: { cobrar_senia: true, monto_senia: 15000 } })
        expect(r).toEqual({ requiereSenia: true, monto: 15000 })
    })

    it('acepta monto como string numérico', () => {
        const r = calcularSenia({ isActive: true, credentials: { cobrar_senia: true, monto_senia: '15000' } })
        expect(r).toEqual({ requiereSenia: true, monto: 15000 })
    })

    it('no requiere seña si la integración está inactiva', () => {
        const r = calcularSenia({ isActive: false, credentials: { cobrar_senia: true, monto_senia: 15000 } })
        expect(r).toEqual({ requiereSenia: false, monto: 0 })
    })

    it('no requiere seña si cobrar_senia está apagado', () => {
        const r = calcularSenia({ isActive: true, credentials: { cobrar_senia: false, monto_senia: 15000 } })
        expect(r).toEqual({ requiereSenia: false, monto: 0 })
    })

    it('no requiere seña si el monto es 0', () => {
        const r = calcularSenia({ isActive: true, credentials: { cobrar_senia: true, monto_senia: 0 } })
        expect(r).toEqual({ requiereSenia: false, monto: 0 })
    })

    it('no requiere seña si el monto es negativo o no numérico', () => {
        expect(calcularSenia({ isActive: true, credentials: { cobrar_senia: true, monto_senia: -100 } })).toEqual({ requiereSenia: false, monto: 0 })
        expect(calcularSenia({ isActive: true, credentials: { cobrar_senia: true, monto_senia: 'gratis' } })).toEqual({ requiereSenia: false, monto: 0 })
    })

    it('no requiere seña con credenciales o flags ausentes', () => {
        expect(calcularSenia({ isActive: true, credentials: null })).toEqual({ requiereSenia: false, monto: 0 })
        expect(calcularSenia({ isActive: null, credentials: undefined })).toEqual({ requiereSenia: false, monto: 0 })
        expect(calcularSenia({ isActive: true, credentials: {} })).toEqual({ requiereSenia: false, monto: 0 })
    })
})

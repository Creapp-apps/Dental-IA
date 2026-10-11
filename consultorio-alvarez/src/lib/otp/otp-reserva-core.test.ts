import { describe, it, expect } from 'vitest'
import {
    generarCodigoOtp,
    hashCodigo,
    codigoCoincide,
    estaExpirado,
    elegirCanal,
    permitirSolicitud,
    evaluarVerificacion,
    OTP_LARGO,
    OTP_MAX_INTENTOS,
} from './otp-reserva-core'

describe('generarCodigoOtp', () => {
    it('devuelve una cadena de OTP_LARGO dígitos', () => {
        for (let i = 0; i < 500; i++) {
            const codigo = generarCodigoOtp()
            expect(codigo).toMatch(new RegExp(`^\\d{${OTP_LARGO}}$`))
        }
    })

    it('conserva ceros a la izquierda (longitud fija)', () => {
        // Con 500 muestras es casi seguro ver al menos un código < 100000.
        const muestras = Array.from({ length: 500 }, () => generarCodigoOtp())
        expect(muestras.every((c) => c.length === OTP_LARGO)).toBe(true)
    })
})

describe('hashCodigo / codigoCoincide', () => {
    it('nunca devuelve el código en texto plano', () => {
        const hash = hashCodigo('123456', 'salt-a', 'pepper')
        expect(hash).not.toContain('123456')
    })

    it('es determinístico para el mismo código+salt+pepper', () => {
        expect(hashCodigo('123456', 'salt-a', 'pep')).toBe(hashCodigo('123456', 'salt-a', 'pep'))
    })

    it('cambia si cambia el salt', () => {
        expect(hashCodigo('123456', 'salt-a', 'pep')).not.toBe(hashCodigo('123456', 'salt-b', 'pep'))
    })

    it('cambia si cambia el pepper', () => {
        expect(hashCodigo('123456', 'salt-a', 'pep-1')).not.toBe(hashCodigo('123456', 'salt-a', 'pep-2'))
    })

    it('codigoCoincide valida contra el hash correcto', () => {
        const hash = hashCodigo('987654', 'sal', 'pep')
        expect(codigoCoincide('987654', 'sal', 'pep', hash)).toBe(true)
        expect(codigoCoincide('000000', 'sal', 'pep', hash)).toBe(false)
    })
})

describe('estaExpirado', () => {
    it('es true cuando now supera expires_at', () => {
        expect(estaExpirado(1000, 1001)).toBe(true)
    })
    it('es false cuando now es anterior o igual a expires_at', () => {
        expect(estaExpirado(1000, 1000)).toBe(false)
        expect(estaExpirado(1000, 999)).toBe(false)
    })
})

describe('elegirCanal', () => {
    it('prefiere whatsapp cuando está disponible', () => {
        expect(elegirCanal({ whatsappDisponible: true, email: 'a@b.com' })).toBe('whatsapp')
    })
    it('cae a email cuando no hay whatsapp y el email es válido', () => {
        expect(elegirCanal({ whatsappDisponible: false, email: 'a@b.com' })).toBe('email')
    })
    it('devuelve null sin whatsapp y sin email válido', () => {
        expect(elegirCanal({ whatsappDisponible: false, email: null })).toBe(null)
        expect(elegirCanal({ whatsappDisponible: false, email: 'no-es-email' })).toBe(null)
        expect(elegirCanal({ whatsappDisponible: false, email: '' })).toBe(null)
    })
})

describe('permitirSolicitud (rate-limit)', () => {
    it('permite mientras no se alcance el máximo', () => {
        expect(permitirSolicitud(0, 3)).toBe(true)
        expect(permitirSolicitud(2, 3)).toBe(true)
    })
    it('bloquea al alcanzar o superar el máximo', () => {
        expect(permitirSolicitud(3, 3)).toBe(false)
        expect(permitirSolicitud(4, 3)).toBe(false)
    })
})

describe('evaluarVerificacion', () => {
    const base = {
        codeHash: hashCodigo('123456', 'sal', 'pep'),
        salt: 'sal',
        expiresAtMs: 2000,
        intentos: 0,
        maxIntentos: OTP_MAX_INTENTOS,
        consumedAtMs: null as number | null,
    }

    it('ok con código correcto, no expirado, con intentos', () => {
        const r = evaluarVerificacion({ fila: base, codigo: '123456', pepper: 'pep', nowMs: 1000 })
        expect(r.ok).toBe(true)
    })

    it('inexistente cuando no hay fila (no revela nada)', () => {
        const r = evaluarVerificacion({ fila: null, codigo: '123456', pepper: 'pep', nowMs: 1000 })
        expect(r).toEqual({ ok: false, motivo: 'inexistente' })
    })

    it('expirado cuando now supera expires_at', () => {
        const r = evaluarVerificacion({ fila: base, codigo: '123456', pepper: 'pep', nowMs: 3000 })
        expect(r).toEqual({ ok: false, motivo: 'expirado' })
    })

    it('consumido si ya se usó', () => {
        const r = evaluarVerificacion({ fila: { ...base, consumedAtMs: 1500 }, codigo: '123456', pepper: 'pep', nowMs: 1000 })
        expect(r).toEqual({ ok: false, motivo: 'consumido' })
    })

    it('sin_intentos cuando se agotaron', () => {
        const r = evaluarVerificacion({ fila: { ...base, intentos: OTP_MAX_INTENTOS }, codigo: '123456', pepper: 'pep', nowMs: 1000 })
        expect(r).toEqual({ ok: false, motivo: 'sin_intentos' })
    })

    it('codigo_incorrecto con código equivocado', () => {
        const r = evaluarVerificacion({ fila: base, codigo: '000000', pepper: 'pep', nowMs: 1000 })
        expect(r).toEqual({ ok: false, motivo: 'codigo_incorrecto' })
    })
})

import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { parseXSignature, buildManifest, verifyMercadoPagoSignature } from './mp-signature'

const secret = 'test_secret_key'
const dataId = '123456'
const requestId = 'req-abc-123'
const ts = '1704908010'

function firmar(manifest: string, key = secret): string {
    return createHmac('sha256', key).update(manifest).digest('hex')
}

describe('parseXSignature', () => {
    it('extrae ts y v1 en cualquier orden', () => {
        expect(parseXSignature('ts=1704908010,v1=abc123')).toEqual({ ts: '1704908010', v1: 'abc123' })
        expect(parseXSignature('v1=abc123,ts=1704908010')).toEqual({ ts: '1704908010', v1: 'abc123' })
    })

    it('tolera espacios alrededor de cada parte', () => {
        expect(parseXSignature(' ts=10 , v1=xyz ')).toEqual({ ts: '10', v1: 'xyz' })
    })

    it('devuelve null si falta ts, v1 o el header entero', () => {
        expect(parseXSignature('ts=10')).toBeNull()
        expect(parseXSignature('v1=xyz')).toBeNull()
        expect(parseXSignature('basura')).toBeNull()
        expect(parseXSignature('')).toBeNull()
        expect(parseXSignature(null)).toBeNull()
        expect(parseXSignature(undefined)).toBeNull()
    })
})

describe('buildManifest', () => {
    it('arma el template oficial y pasa el id a minúscula', () => {
        expect(buildManifest({ dataId: 'ABC123', requestId: 'r1', ts: '99' })).toBe('id:abc123;request-id:r1;ts:99;')
    })

    it('omite los campos ausentes', () => {
        expect(buildManifest({ ts: '99' })).toBe('ts:99;')
        expect(buildManifest({ dataId: '5', ts: '99' })).toBe('id:5;ts:99;')
        expect(buildManifest({ requestId: 'r1', ts: '99' })).toBe('request-id:r1;ts:99;')
    })
})

describe('verifyMercadoPagoSignature', () => {
    const manifest = buildManifest({ dataId, requestId, ts })
    const v1 = firmar(manifest)
    const xSignature = `ts=${ts},v1=${v1}`

    it('acepta una firma válida', () => {
        expect(verifyMercadoPagoSignature({ secret, xSignature, xRequestId: requestId, dataId })).toBe(true)
    })

    it('rechaza si el v1 fue manipulado', () => {
        const falso = `ts=${ts},v1=${'0'.repeat(v1.length)}`
        expect(verifyMercadoPagoSignature({ secret, xSignature: falso, xRequestId: requestId, dataId })).toBe(false)
    })

    it('rechaza con el secret equivocado', () => {
        expect(verifyMercadoPagoSignature({ secret: 'otro', xSignature, xRequestId: requestId, dataId })).toBe(false)
    })

    it('rechaza si cambia el dataId o el requestId (manifest distinto)', () => {
        expect(verifyMercadoPagoSignature({ secret, xSignature, xRequestId: requestId, dataId: '999' })).toBe(false)
        expect(verifyMercadoPagoSignature({ secret, xSignature, xRequestId: 'otro-req', dataId })).toBe(false)
    })

    it('rechaza sin secret o sin header de firma', () => {
        expect(verifyMercadoPagoSignature({ secret: '', xSignature, xRequestId: requestId, dataId })).toBe(false)
        expect(verifyMercadoPagoSignature({ secret: null, xSignature, xRequestId: requestId, dataId })).toBe(false)
        expect(verifyMercadoPagoSignature({ secret, xSignature: null, xRequestId: requestId, dataId })).toBe(false)
    })
})

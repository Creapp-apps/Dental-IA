// ============================================================
// Validación de la firma x-signature de los webhooks de Mercado Pago.
// Receta oficial: manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
// (se omite el campo ausente, el id va en minúscula), HMAC-SHA256 hex con la
// clave secreta de la app como key, comparado contra el valor v1 del header.
// Doc: https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks
// La verificación es por tenant: solo los tenants que cargaron su webhook_secret
// quedan blindados; los que no lo cargaron siguen por el fallback del route.
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto'

export interface ParsedSignature {
    ts: string
    v1: string
}

// Parsea el header x-signature con forma `ts=<unix>,v1=<hmac>`.
export function parseXSignature(header: string | null | undefined): ParsedSignature | null {
    if (!header) return null
    let ts = ''
    let v1 = ''
    for (const part of header.split(',')) {
        const idx = part.indexOf('=')
        if (idx === -1) continue
        const key = part.slice(0, idx).trim()
        const val = part.slice(idx + 1).trim()
        if (!key || !val) continue
        if (key === 'ts') ts = val
        else if (key === 'v1') v1 = val
    }
    if (!ts || !v1) return null
    return { ts, v1 }
}

// Arma el manifest con solo los campos presentes; el id va en minúscula.
export function buildManifest(input: {
    dataId?: string | null
    requestId?: string | null
    ts: string
}): string {
    let manifest = ''
    if (input.dataId) manifest += `id:${input.dataId.toLowerCase()};`
    if (input.requestId) manifest += `request-id:${input.requestId};`
    manifest += `ts:${input.ts};`
    return manifest
}

// true solo si la firma es válida para el secret dado. Comparación en tiempo
// constante (timingSafeEqual) para no filtrar info por timing.
export function verifyMercadoPagoSignature(input: {
    secret: string | null | undefined
    xSignature: string | null | undefined
    xRequestId: string | null | undefined
    dataId: string | null | undefined
}): boolean {
    if (!input.secret) return false
    const parsed = parseXSignature(input.xSignature)
    if (!parsed) return false

    const manifest = buildManifest({
        dataId: input.dataId,
        requestId: input.xRequestId,
        ts: parsed.ts,
    })
    const computed = createHmac('sha256', input.secret).update(manifest).digest('hex')

    const a = Buffer.from(computed, 'utf8')
    const b = Buffer.from(parsed.v1, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}

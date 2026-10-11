import { createHash, randomInt } from 'node:crypto'

// ============================================================
// OTP de reserva — lógica pura (sin IO, testeable).
// Arregla DT-001: PII de pacientes ya no se devuelve a un anónimo;
// primero hay que probar posesión del contacto registrado con un código.
// Diseño: brainstorm 2026-10-10 (protocolo OTP, canal WhatsApp con fallback email).
// ============================================================

export const OTP_LARGO = 6
export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutos
export const OTP_MAX_INTENTOS = 5
export const OTP_MAX_SOLICITUDES_POR_VENTANA = 3
export const OTP_VENTANA_MS = 15 * 60 * 1000 // 15 minutos

/** Código numérico de longitud fija. Mantiene ceros a la izquierda. */
export function generarCodigoOtp(): string {
    const max = 10 ** OTP_LARGO // randomInt es [min, max)
    return String(randomInt(0, max)).padStart(OTP_LARGO, '0')
}

/** Hash del código. Nunca se guarda el código en texto plano. */
export function hashCodigo(codigo: string, salt: string, pepper: string): string {
    return createHash('sha256').update(`${salt}:${pepper}:${codigo}`).digest('hex')
}

export function codigoCoincide(codigo: string, salt: string, pepper: string, hash: string): boolean {
    return hashCodigo(codigo, salt, pepper) === hash
}

export function estaExpirado(expiresAtMs: number, nowMs: number): boolean {
    return nowMs > expiresAtMs
}

/** Prefiere WhatsApp; cae a email sólo si el email es plausible. null si no hay canal. */
export function elegirCanal(opts: { whatsappDisponible: boolean; email?: string | null }): 'whatsapp' | 'email' | null {
    if (opts.whatsappDisponible) return 'whatsapp'
    if (opts.email && opts.email.includes('@')) return 'email'
    return null
}

/** true mientras no se alcance el máximo de solicitudes en la ventana. */
export function permitirSolicitud(solicitudesEnVentana: number, max: number = OTP_MAX_SOLICITUDES_POR_VENTANA): boolean {
    return solicitudesEnVentana < max
}

export interface FilaOtp {
    codeHash: string
    salt: string
    expiresAtMs: number
    intentos: number
    maxIntentos: number
    consumedAtMs: number | null
}

export type ResultadoVerificacion =
    | { ok: true }
    | { ok: false; motivo: 'inexistente' | 'expirado' | 'consumido' | 'sin_intentos' | 'codigo_incorrecto' }

export function evaluarVerificacion(params: {
    fila: FilaOtp | null
    codigo: string
    pepper: string
    nowMs: number
}): ResultadoVerificacion {
    const { fila, codigo, pepper, nowMs } = params
    if (!fila) return { ok: false, motivo: 'inexistente' }
    if (fila.consumedAtMs !== null) return { ok: false, motivo: 'consumido' }
    if (estaExpirado(fila.expiresAtMs, nowMs)) return { ok: false, motivo: 'expirado' }
    if (fila.intentos >= fila.maxIntentos) return { ok: false, motivo: 'sin_intentos' }
    if (!codigoCoincide(codigo, fila.salt, pepper, fila.codeHash)) return { ok: false, motivo: 'codigo_incorrecto' }
    return { ok: true }
}

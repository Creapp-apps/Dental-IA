'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWhatsAppCredentialsForTenant } from '@/lib/whatsapp'
import { buscarPacientePorDniInterno } from '@/lib/pacientes-lookup'
import { enviarOtpWhatsApp, enviarOtpEmail } from '@/lib/otp/otp-envio'
import {
    generarCodigoOtp,
    hashCodigo,
    elegirCanal,
    permitirSolicitud,
    evaluarVerificacion,
    OTP_TTL_MS,
    OTP_MAX_INTENTOS,
    OTP_VENTANA_MS,
    type FilaOtp,
} from '@/lib/otp/otp-reserva-core'

// ============================================================
// Reemplazo seguro de getPacientePorDni (DT-001). El flujo "paciente existente"
// de la reserva pública ya no devuelve PII a un anónimo: primero manda un código
// de un solo uso al contacto registrado (WhatsApp, fallback email) y sólo tras
// verificarlo revela los datos. Respuestas genéricas para no revelar si un DNI
// es paciente de la clínica (ese dato es sensible por asociación en salud).
// ============================================================

const PEPPER = process.env.OTP_PEPPER || ''

async function getTenant(slug: string) {
    if (!slug) return null
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('tenants')
        .select('id, nombre')
        .eq('slug', slug)
        .maybeSingle()
    return data as { id: string; nombre: string } | null
}

async function getRequestIp(): Promise<string | null> {
    try {
        const h = await headers()
        const fwd = h.get('x-forwarded-for')
        if (fwd) return fwd.split(',')[0].trim()
        return h.get('x-real-ip')
    } catch {
        return null
    }
}

/**
 * Solicita el envío de un OTP para un DNI. Responde SIEMPRE { ok: true } genérico,
 * exista o no el paciente y se haya podido entregar o no (anti-enumeración).
 */
export async function solicitarOtpReserva(tenantSlug: string, dni: string): Promise<{ ok: true }> {
    const generico = { ok: true } as const
    try {
        const limpio = (dni || '').replace(/\D/g, '')
        if (!limpio) return generico

        const tenant = await getTenant(tenantSlug)
        if (!tenant) return generico

        const supabase = createAdminClient()
        const ip = await getRequestIp()
        const desde = new Date(Date.now() - OTP_VENTANA_MS).toISOString()

        // Rate-limit por (tenant, dni) y por IP dentro de la ventana.
        const [{ count: porDni }, { count: porIp }] = await Promise.all([
            supabase
                .from('otp_reserva')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenant.id)
                .eq('dni', limpio)
                .gte('created_at', desde),
            ip
                ? supabase
                      .from('otp_reserva')
                      .select('id', { count: 'exact', head: true })
                      .eq('request_ip', ip)
                      .gte('created_at', desde)
                : Promise.resolve({ count: 0 } as { count: number }),
        ])

        if (!permitirSolicitud(porDni ?? 0) || !permitirSolicitud((porIp ?? 0), 15)) {
            return generico // silenciosamente ignorado
        }

        const paciente = await buscarPacientePorDniInterno(tenant.id, limpio)

        // Datos del código (incluso si no hay paciente, se inserta fila señuelo
        // con hash aleatorio para que conteos y comportamiento no delaten existencia).
        const codigo = generarCodigoOtp()
        const salt = randomBytes(16).toString('hex')
        const waCreds = paciente ? await getWhatsAppCredentialsForTenant(tenant.id) : null
        const whatsappDisponible = Boolean(waCreds) && Boolean(process.env.META_WA_OTP_TEMPLATE)
        const canal = paciente ? elegirCanal({ whatsappDisponible, email: paciente.email }) : null

        const codeHash = paciente
            ? hashCodigo(codigo, salt, PEPPER)
            : randomBytes(32).toString('hex') // señuelo: ningún código coincide

        await supabase.from('otp_reserva').insert({
            tenant_id: tenant.id,
            dni: limpio,
            paciente_id: paciente?.id ?? null,
            canal,
            code_hash: codeHash,
            salt,
            max_intentos: OTP_MAX_INTENTOS,
            expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
            request_ip: ip,
        })

        if (paciente && canal) {
            let entregado = false
            if (canal === 'whatsapp' && waCreds) {
                entregado = await enviarOtpWhatsApp(waCreds, paciente.telefono, codigo)
                if (!entregado) {
                    // Fallback a email si WhatsApp falló.
                    entregado = await enviarOtpEmail(paciente.email, codigo, tenant.nombre)
                }
            } else if (canal === 'email') {
                entregado = await enviarOtpEmail(paciente.email, codigo, tenant.nombre)
            }
            // Si no se entregó, igual respondemos genérico: el atacante no aprende nada.
            void entregado
        }

        return generico
    } catch (e) {
        console.error('[OTP] Error en solicitarOtpReserva:', e)
        return generico
    }
}

export type VerificarOtpResult =
    | {
          ok: true
          paciente: {
              id: string
              nombre: string
              apellido: string
              telefono: string | null
              email: string | null
              obra_social_id: string | null
          }
      }
    | { ok: false; motivo: 'invalido' | 'expirado' | 'bloqueado' }

/**
 * Verifica el código y, sólo si es correcto, devuelve la PII del paciente.
 * Los motivos de fallo no distinguen "no era paciente" de "código incorrecto".
 */
export async function verificarOtpReserva(
    tenantSlug: string,
    dni: string,
    codigo: string
): Promise<VerificarOtpResult> {
    try {
        const limpio = (dni || '').replace(/\D/g, '')
        const code = (codigo || '').replace(/\D/g, '')
        const tenant = await getTenant(tenantSlug)
        if (!tenant || !limpio || !code) return { ok: false, motivo: 'invalido' }

        const supabase = createAdminClient()
        const { data: fila } = await supabase
            .from('otp_reserva')
            .select('id, code_hash, salt, expires_at, intentos, max_intentos, consumed_at, paciente_id')
            .eq('tenant_id', tenant.id)
            .eq('dni', limpio)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        const filaCore: FilaOtp | null = fila
            ? {
                  codeHash: fila.code_hash,
                  salt: fila.salt,
                  expiresAtMs: new Date(fila.expires_at).getTime(),
                  intentos: fila.intentos,
                  maxIntentos: fila.max_intentos,
                  consumedAtMs: fila.consumed_at ? new Date(fila.consumed_at).getTime() : null,
              }
            : null

        const res = evaluarVerificacion({ fila: filaCore, codigo: code, pepper: PEPPER, nowMs: Date.now() })

        if (!res.ok) {
            // Sumar intento sólo cuando hubo fila y el código era incorrecto (brute force).
            if (fila && res.motivo === 'codigo_incorrecto') {
                await supabase
                    .from('otp_reserva')
                    .update({ intentos: fila.intentos + 1 })
                    .eq('id', fila.id)
            }
            const motivo = res.motivo === 'expirado' ? 'expirado' : res.motivo === 'sin_intentos' ? 'bloqueado' : 'invalido'
            return { ok: false, motivo }
        }

        // Correcto: consumir y devolver PII mínima del paciente.
        await supabase.from('otp_reserva').update({ consumed_at: new Date().toISOString() }).eq('id', fila!.id)

        if (!fila!.paciente_id) return { ok: false, motivo: 'invalido' }

        const { data: paciente } = await supabase
            .from('pacientes')
            .select('id, nombre, apellido, telefono, email, obra_social_id')
            .eq('tenant_id', tenant.id)
            .eq('id', fila!.paciente_id)
            .maybeSingle()

        if (!paciente) return { ok: false, motivo: 'invalido' }

        return {
            ok: true,
            paciente: {
                id: paciente.id,
                nombre: paciente.nombre,
                apellido: paciente.apellido,
                telefono: paciente.telefono ?? null,
                email: paciente.email ?? null,
                obra_social_id: paciente.obra_social_id ?? null,
            },
        }
    } catch (e) {
        console.error('[OTP] Error en verificarOtpReserva:', e)
        return { ok: false, motivo: 'invalido' }
    }
}

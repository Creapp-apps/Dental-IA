import { Resend } from 'resend'
import type { WhatsAppTenantCredentials } from '@/lib/whatsapp'

// ============================================================
// Entrega del código OTP de reserva. Server-only (usa service creds / API keys).
// Nunca loguea el código. Cada sender devuelve boolean: true si se despachó.
// ============================================================

/** Normaliza un teléfono argentino al formato E.164 sin '+' que espera la API de Meta. */
function normalizarTelefonoMeta(telefono: string): string {
    let limpio = telefono.replace(/\D/g, '')
    if (limpio.startsWith('11') || limpio.length === 10) {
        limpio = `54${limpio}`
    } else if (limpio.startsWith('549')) {
        limpio = limpio.replace(/^549/, '54')
    }
    return limpio
}

/**
 * Envía el OTP por WhatsApp Cloud API usando un template de categoría authentication.
 * El nombre del template es configurable (META_WA_OTP_TEMPLATE); debe aceptar el código
 * como único parámetro del body. Devuelve false ante cualquier fallo (el llamador cae a email).
 */
export async function enviarOtpWhatsApp(
    creds: WhatsAppTenantCredentials,
    telefono: string | null,
    codigo: string
): Promise<boolean> {
    if (!telefono) return false
    const template = process.env.META_WA_OTP_TEMPLATE
    if (!template) return false

    try {
        const to = normalizarTelefonoMeta(telefono)
        const resp = await fetch(`https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: template,
                    language: { code: 'es_AR' },
                    components: [
                        {
                            type: 'body',
                            parameters: [{ type: 'text', text: codigo }],
                        },
                        // Los templates authentication de Meta exigen el código también
                        // en el botón de copia (sub_type 'url' / index 0).
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: 0,
                            parameters: [{ type: 'text', text: codigo }],
                        },
                    ],
                },
            }),
        })
        if (!resp.ok) {
            const err = await resp.json().catch(() => null)
            console.error('[OTP WA] Error Meta API:', err?.error?.message || resp.status)
            return false
        }
        return true
    } catch (e) {
        console.error('[OTP WA] Excepción al enviar OTP:', e)
        return false
    }
}

/** Envía el OTP por email con Resend. Devuelve false si no hay key, no hay email o falla. */
export async function enviarOtpEmail(
    email: string | null,
    codigo: string,
    clinicaNombre: string
): Promise<boolean> {
    if (!email || !email.includes('@') || !process.env.RESEND_API_KEY) return false

    try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
            from: `${clinicaNombre} <onboarding@resend.dev>`,
            to: email,
            subject: `Tu código de verificación: ${codigo}`,
            text: `Tu código para continuar con la reserva en ${clinicaNombre} es: ${codigo}\n\nVence en 10 minutos. Si no fuiste vos, ignorá este mensaje.`,
        })
        return true
    } catch (e) {
        console.error('[OTP EMAIL] Excepción al enviar OTP:', e)
        return false
    }
}

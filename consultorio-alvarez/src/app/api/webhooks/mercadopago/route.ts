import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMercadoPagoSignature } from '@/lib/pagos/mp-signature'
import { confirmarSeniaPorPago } from '@/lib/pagos/confirmar-senia'

export async function GET() {
    return NextResponse.json({ status: 'Mercado Pago Webhook Active' }, { status: 200 })
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        let paymentId = searchParams.get('data.id') || searchParams.get('id')
        const type = searchParams.get('type') || searchParams.get('topic')

        // Si no vino por query param, leer body
        let body: any = {}
        try {
            body = await request.json()
            if (!paymentId) {
                paymentId = body?.data?.id || body?.id
            }
        } catch (_) {
            // Body vacío o no JSON
        }

        console.log(`💳 [MP Webhook] Evento recibido. Type: ${type || body?.type || body?.action}, PaymentId: ${paymentId}`)

        if (!paymentId) {
            return NextResponse.json({ status: 'ignored', message: 'No payment ID provided' }, { status: 200 })
        }

        const admin = createAdminClient()

        // 1. Obtener los tenants con integración de Mercado Pago activa
        const { data: integraciones, error: intErr } = await admin
            .from('tenant_integrations')
            .select('tenant_id, credentials')
            .eq('provider', 'mercadopago')
            .eq('is_active', true)

        if (intErr || !integraciones || integraciones.length === 0) {
            console.warn('⚠️ [MP Webhook] No hay integraciones de Mercado Pago configuradas.')
            return NextResponse.json({ status: 'no_integrations' }, { status: 200 })
        }

        // 1.b Validación de firma por tenant (opt-in). Un tenant que cargó su
        // webhook_secret queda blindado: solo aceptamos su notificación si la
        // firma x-signature valida. Los tenants que NO cargaron secret siguen
        // por el fallback de abajo (MP es opcional por consultorio).
        const xSignature = request.headers.get('x-signature')
        const xRequestId = request.headers.get('x-request-id')

        const conSecret = integraciones.filter((i) => (i.credentials as any)?.webhook_secret)
        const sinSecret = integraciones.filter((i) => !(i.credentials as any)?.webhook_secret)

        let integracionPorFirma: typeof integraciones[number] | null = null
        for (const integ of conSecret) {
            const ok = verifyMercadoPagoSignature({
                secret: (integ.credentials as any).webhook_secret,
                xSignature,
                xRequestId,
                dataId: paymentId,
            })
            if (ok) {
                integracionPorFirma = integ
                break
            }
        }

        // Candidatos a consultar el pago:
        // - Si una firma validó → solo ese tenant (identificado y verificado).
        // - Si ninguna validó → solo los tenants SIN secret (los que optaron por
        //   no blindar). Un tenant con secret jamás cae al fallback: si su firma
        //   no valida, su notificación se descarta.
        const candidatos = integracionPorFirma ? [integracionPorFirma] : sinSecret

        if (candidatos.length === 0) {
            console.warn('🔒 [MP Webhook] Firma inválida o ausente para tenants con secret; notificación descartada.')
            return NextResponse.json({ status: 'invalid_signature' }, { status: 401 })
        }

        // 2. Buscar el pago en Mercado Pago usando los tokens de los tenants
        let paymentData: any = null
        let tenantIdEncontrado: string | null = null

        for (const integ of candidatos) {
            const token = (integ.credentials as any)?.access_token
            if (!token) continue

            try {
                const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (res.ok) {
                    paymentData = await res.json()
                    tenantIdEncontrado = integ.tenant_id
                    break
                }
            } catch (fetchErr) {
                console.error(`Error consultando pago con tenant ${integ.tenant_id}:`, fetchErr)
            }
        }

        if (!paymentData) {
            console.warn(`⚠️ [MP Webhook] No se encontró el pago ${paymentId} en ningún tenant registrado.`)
            return NextResponse.json({ status: 'payment_not_found' }, { status: 200 })
        }

        console.log(`✅ [MP Webhook] Pago encontrado: ID=${paymentData.id}, Status=${paymentData.status}, ExternalRef=${paymentData.external_reference}`)

        // Confirmación idempotente (compartida con la reconciliación al volver del pago).
        const resultado = await confirmarSeniaPorPago(admin, paymentData)
        console.log(`🧾 [MP Webhook] Confirmación seña: ${resultado.status} (pago ${paymentData.id}, tenant ${tenantIdEncontrado})`)

        return NextResponse.json({ success: true, result: resultado.status }, { status: 200 })
    } catch (error: any) {
        console.error('❌ Error general en Webhook de Mercado Pago:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

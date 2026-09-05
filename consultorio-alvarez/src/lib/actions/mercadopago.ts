'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface CrearPreferenciaSeniaParams {
    tenantId: string
    turnoId: string
    pacienteNombre: string
    pacienteEmail?: string
    monto: number
    clinicaNombre?: string
}

export async function crearPreferenciaPagoSenia({
    tenantId,
    turnoId,
    pacienteNombre,
    pacienteEmail,
    monto,
    clinicaNombre = 'Consultorio Odontológico'
}: CrearPreferenciaSeniaParams) {
    try {
        const admin = createAdminClient()

        // 1. Obtener las credenciales de Mercado Pago del tenant
        const { data: integracion, error: intError } = await admin
            .from('tenant_integrations')
            .select('credentials, is_active')
            .eq('tenant_id', tenantId)
            .eq('provider', 'mercadopago')
            .maybeSingle()

        if (intError || !integracion || !integracion.is_active) {
            console.error('Integración de Mercado Pago no configurada para el tenant:', tenantId)
            return { error: 'El consultorio no tiene configurada la pasarela de pagos' }
        }

        const credentials = integracion.credentials as any
        const accessToken = credentials?.access_token

        if (!accessToken) {
            return { error: 'Credenciales de Mercado Pago incompletas en el consultorio' }
        }

        // 2. Determinar la URL base de la aplicación
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:3000')

        const cleanAppUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`

        // 3. Crear la preferencia en Mercado Pago API
        const preferencePayload = {
            items: [
                {
                    id: `senia-${turnoId}`,
                    title: `Seña Turno - ${clinicaNombre}`,
                    description: `Reserva y confirmación de turno odontológico`,
                    quantity: 1,
                    unit_price: Number(monto),
                    currency_id: 'ARS'
                }
            ],
            payer: {
                name: pacienteNombre,
                email: pacienteEmail && pacienteEmail.includes('@') ? pacienteEmail : 'paciente@dental-ia.com'
            },
            external_reference: turnoId,
            metadata: {
                turno_id: turnoId,
                tenant_id: tenantId,
                tipo: 'senia_turno'
            },
            back_urls: {
                success: `${cleanAppUrl}/reservar?status=approved&turno=${turnoId}`,
                pending: `${cleanAppUrl}/reservar?status=pending&turno=${turnoId}`,
                failure: `${cleanAppUrl}/reservar?status=failure&turno=${turnoId}`
            },
            auto_return: 'approved',
            notification_url: `${cleanAppUrl}/api/webhooks/mercadopago`
        }

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferencePayload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Error al crear preferencia en Mercado Pago:', data)
            return { error: data.message || 'Error al comunicarse con Mercado Pago' }
        }

        return {
            success: true,
            preferenceId: data.id,
            initPoint: data.init_point,
            sandboxInitPoint: data.sandbox_init_point
        }
    } catch (err: any) {
        console.error('Excepción en crearPreferenciaPagoSenia:', err)
        return { error: err.message || 'Error inesperado al generar el link de pago' }
    }
}

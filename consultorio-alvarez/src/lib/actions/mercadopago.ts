'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { calcularSenia } from '@/lib/pagos/senia'

// DT-004: la action recibe SÓLO turnoId. El monto, el tenant y los datos del
// payer se derivan server-side desde la base; nunca se confía un monto del cliente.
interface CrearPreferenciaSeniaParams {
    turnoId: string
}

export async function crearPreferenciaPagoSenia({ turnoId }: CrearPreferenciaSeniaParams) {
    try {
        if (!turnoId) return { error: 'Falta el turno' }
        const admin = createAdminClient()

        // 1. Turno → tenant y paciente (autoritativo; ignora cualquier dato del cliente).
        const { data: turno } = await admin
            .from('turnos')
            .select('id, tenant_id, paciente_id')
            .eq('id', turnoId)
            .maybeSingle()

        if (!turno) return { error: 'Turno no encontrado' }
        const tenantId = turno.tenant_id

        // 2. Credenciales de Mercado Pago del tenant.
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

        // 3. Monto de la seña calculado desde los creds guardados (DT-004), nunca del cliente.
        const { requiereSenia, monto } = calcularSenia({ isActive: integracion.is_active, credentials })
        if (!requiereSenia) {
            return { error: 'Este turno no requiere seña' }
        }

        // 4. Datos del payer y clínica derivados del turno.
        const [{ data: paciente }, { data: tenant }] = await Promise.all([
            admin.from('pacientes').select('nombre, apellido, email').eq('id', turno.paciente_id).maybeSingle(),
            admin.from('tenants').select('nombre').eq('id', tenantId).maybeSingle(),
        ])
        const clinicaNombre = tenant?.nombre || 'Consultorio Odontológico'
        const pacienteNombre = paciente ? `${paciente.nombre ?? ''} ${paciente.apellido ?? ''}`.trim() : ''
        const pacienteEmail = paciente?.email ?? undefined

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

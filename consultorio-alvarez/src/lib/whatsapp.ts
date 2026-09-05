import { createAdminClient } from '@/lib/supabase/admin'

export interface WhatsAppTenantCredentials {
    accessToken: string
    phoneNumberId: string
    isDefaultFallback?: boolean
}

/**
 * Obtiene las credenciales de WhatsApp Cloud API para un tenant específico.
 * - Busca primero en `tenant_integrations` (donde cada clínica carga su Access Token y Phone Number ID).
 * - Solo si el tenant es 'alvarez', permite el fallback a las variables de entorno (.env).
 * - Para cualquier otro consultorio, si no tiene credenciales propias configuradas, retorna null (aislamiento estricto).
 */
export async function getWhatsAppCredentialsForTenant(tenantId: string): Promise<WhatsAppTenantCredentials | null> {
    if (!tenantId) return null

    const admin = createAdminClient()

    try {
        // 1. Buscar credenciales específicas en tenant_integrations
        const { data: integracion } = await admin
            .from('tenant_integrations')
            .select('credentials, is_active')
            .eq('tenant_id', tenantId)
            .eq('provider', 'whatsapp')
            .maybeSingle()

        if (integracion?.is_active && integracion?.credentials) {
            const creds = integracion.credentials as any
            if (creds.access_token && creds.phone_number_id) {
                return {
                    accessToken: creds.access_token,
                    phoneNumberId: creds.phone_number_id,
                    isDefaultFallback: false,
                }
            }
        }

        // 2. Verificar si el tenant es 'alvarez' para permitir el fallback histórico de .env
        const { data: tenant } = await admin
            .from('tenants')
            .select('slug')
            .eq('id', tenantId)
            .maybeSingle()

        if (tenant?.slug === 'alvarez' && process.env.META_WA_ACCESS_TOKEN && process.env.META_WA_PHONE_NUMBER_ID) {
            return {
                accessToken: process.env.META_WA_ACCESS_TOKEN,
                phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID,
                isDefaultFallback: true,
            }
        }

        // 3. Cualquier otra clínica sin credenciales configuradas
        return null
    } catch (err) {
        console.error('[WA HELPER] Error al resolver credenciales para tenant:', tenantId, err)
        return null
    }
}

/**
 * Resuelve el tenant_id a partir del incoming phone_number_id recibido en un webhook de Meta.
 * Si el número no pertenece a ninguna clínica registrada, retorna null.
 */
export async function resolveTenantByPhoneNumberId(incomingPhoneNumberId: string): Promise<string | null> {
    if (!incomingPhoneNumberId) return null

    const admin = createAdminClient()

    try {
        // 1. Buscar en tenant_integrations
        const { data: tiList } = await admin
            .from('tenant_integrations')
            .select('tenant_id, credentials, is_active')
            .eq('provider', 'whatsapp')
            .eq('is_active', true)

        if (tiList && tiList.length > 0) {
            const match = tiList.find((ti: any) => {
                const creds = ti.credentials as any
                return creds?.phone_number_id === incomingPhoneNumberId
            })
            if (match) {
                return match.tenant_id
            }
        }

        // 2. Solo si coincide exactamente con el número oficial de Álvarez en .env
        if (process.env.META_WA_PHONE_NUMBER_ID && incomingPhoneNumberId === process.env.META_WA_PHONE_NUMBER_ID) {
            const { data: alvarezTenant } = await admin
                .from('tenants')
                .select('id')
                .eq('slug', 'alvarez')
                .maybeSingle()

            return alvarezTenant?.id || null
        }

        // 3. No reconocido
        return null
    } catch (err) {
        console.error('[WA HELPER] Error al buscar tenant por phone_number_id:', incomingPhoneNumberId, err)
        return null
    }
}

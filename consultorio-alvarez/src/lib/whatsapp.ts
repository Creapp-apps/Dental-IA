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

/**
 * Descarga un archivo multimedia (imagen, audio, video) desde Meta Graph API
 * y lo persiste en el bucket 'paciente_adjuntos' de Supabase Storage para acceso permanente.
 */
export async function descargarYGuardarMediaWhatsApp(
    mediaId: string,
    accessToken: string,
    tenantId: string,
    extensionFallback: string = 'jpg'
): Promise<string | null> {
    if (!mediaId || !accessToken || !tenantId) return null

    const admin = createAdminClient()

    try {
        // 1. Obtener la URL temporal del archivo desde Meta Graph API
        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })

        if (!metaRes.ok) {
            console.error(`[WA MEDIA] Error al consultar media ID ${mediaId} en Meta:`, await metaRes.text())
            return null
        }

        const metaData = await metaRes.json()
        const downloadUrl = metaData?.url
        const mimeType = metaData?.mime_type || 'image/jpeg'

        if (!downloadUrl) {
            console.error('[WA MEDIA] No se obtuvo URL de descarga para mediaId:', mediaId)
            return null
        }

        // Determinar extensión adecuada
        let ext = extensionFallback
        if (mimeType.includes('ogg') || mimeType.includes('audio')) ext = 'ogg'
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg'
        else if (mimeType.includes('png')) ext = 'png'
        else if (mimeType.includes('mp4')) ext = 'mp4'
        else if (mimeType.includes('pdf')) ext = 'pdf'

        // 2. Descargar el binario con el Bearer token (Meta requiere auth para el downloadUrl)
        const fileRes = await fetch(downloadUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })

        if (!fileRes.ok) {
            console.error('[WA MEDIA] Error al descargar binario desde Meta:', fileRes.statusText)
            return null
        }

        const arrayBuffer = await fileRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 3. Subir a Supabase Storage en paciente_adjuntos
        const filePath = `wa-media/${tenantId}/${Date.now()}_${mediaId}.${ext}`
        const { error: uploadError } = await admin.storage
            .from('paciente_adjuntos')
            .upload(filePath, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (uploadError) {
            console.error('[WA MEDIA] Error al subir archivo a Supabase Storage:', uploadError)
            return null
        }

        // 4. Retornar URL pública
        const { data: publicData } = admin.storage
            .from('paciente_adjuntos')
            .getPublicUrl(filePath)

        return publicData?.publicUrl || null
    } catch (err) {
        console.error('[WA MEDIA] Excepción al procesar media de WhatsApp:', err)
        return null
    }
}


'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getTenantId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data } = await admin
        .from('usuarios')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    return data?.tenant_id ?? null
}

export async function uploadTenantLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
    try {
        const file = formData.get('file') as File
        if (!file) return { error: 'No se incluyó ningún archivo' }

        const tenantId = await getTenantId()
        if (!tenantId) return { error: 'No autorizado / Tenant_id no encontrado' }

        const supabase = await createClient()

        // Generar un nombre único usando timestamp para evitar problemas de caché, 
        // pero mantenemos la estructura dentro del folder del tenant.
        const fileExt = file.name.split('.').pop()
        const fileName = `${tenantId}/logos/logo_${Date.now()}.${fileExt}`

        const { data, error } = await supabase.storage
            .from('tenant_assets')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) {
            console.error('Error subiendo logo:', error)
            return { error: 'Error del servidor al guardar la imagen.' }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('tenant_assets')
            .getPublicUrl(fileName)

        return { url: publicUrl }
    } catch (e: any) {
        console.error('Error en uploadTenantLogo:', e)
        return { error: e.message || 'Error interno al subir el logo.' }
    }
}

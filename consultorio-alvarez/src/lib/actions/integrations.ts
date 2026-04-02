'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function guardarIntegracion(provider: 'whatsapp' | 'mercadopago' | 'arca', credentials: any) {
    try {
        const supabase = await createClient()

        // 1. Get user -> tenant_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No autorizado' }

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (!profile?.tenant_id) return { error: 'Tenant no encontrado' }

        // 2. Upsert the integration
        const { error } = await supabase
            .from('tenant_integrations')
            .upsert(
                {
                    tenant_id: profile.tenant_id,
                    provider,
                    credentials,
                    is_active: credentials && Object.keys(credentials).length > 0, // simple validation check
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'tenant_id,provider' }
            )

        if (error) {
            console.error('Error guardando integración:', error)
            return { error: 'Error del servidor al guardar credenciales' }
        }

        revalidatePath('/configuracion')
        return { success: true }
    } catch (err: any) {
        console.error('Exception guardando integracion:', err)
        return { error: err.message }
    }
}

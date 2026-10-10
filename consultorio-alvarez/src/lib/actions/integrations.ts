'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/actor'
import { revalidatePath } from 'next/cache'

// Las credenciales de WhatsApp, Mercado Pago y ARCA son del consultorio:
// sólo admin las toca. Diseño: §12
export async function guardarIntegracion(provider: 'whatsapp' | 'mercadopago' | 'arca', credentials: any) {
    try {
        const { ok, actor, error: denied } = await requireAdmin()
        if (!ok) return { error: denied }

        const supabase = await createClient()

        // Upsert the integration
        const { error } = await supabase
            .from('tenant_integrations')
            .upsert(
                {
                    tenant_id: actor.tenantId,
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

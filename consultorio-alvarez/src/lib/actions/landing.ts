'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { LandingConfig } from '@/lib/types/landing'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'

// ── Lectura pública (sin auth — para la landing page) ─────────────

export async function getLandingConfigPublica(tenantSlug: string): Promise<LandingConfig | null> {
    const supabase = createAdminClient()
    const { data: tenant } = await supabase
        .from('tenants').select('id').eq('slug', tenantSlug).single()
    if (!tenant) return null

    const { data } = await supabase
        .from('landing_config').select('*').eq('tenant_id', tenant.id).single()

    if (!data) {
        return { id: '', tenant_id: tenant.id, ...DEFAULT_LANDING_CONFIG }
    }
    return data as LandingConfig
}

// ── Lectura autenticada (para el panel admin) ─────────────────────

export async function getLandingConfigAdmin(): Promise<LandingConfig | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get tenant_id from tenants table using user metadata or admin client
    const adminSupabase = createAdminClient()
    const { data: userTenant } = await adminSupabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single()

    if (!userTenant) return null

    const { data } = await adminSupabase
        .from('landing_config').select('*').eq('tenant_id', userTenant.id).single()

    if (!data) {
        return { id: '', tenant_id: userTenant.id, ...DEFAULT_LANDING_CONFIG }
    }
    return data as LandingConfig
}

// ── Guardar / upsert ──────────────────────────────────────────────

export async function guardarLandingConfig(
    updates: Partial<Omit<LandingConfig, 'id' | 'tenant_id' | 'domain_verified' | 'custom_domain'>>
) {
    const supabase = createAdminClient()

    // Get first tenant (for now — single tenant per admin session)
    const { data: tenant } = await supabase
        .from('tenants').select('id').limit(1).single()

    if (!tenant) return { error: 'Tenant no encontrado' }

    const { error } = await supabase
        .from('landing_config')
        .upsert({ tenant_id: tenant.id, ...updates }, { onConflict: 'tenant_id' })

    if (error) return { error: error.message }

    revalidatePath('/c/[slug]', 'page')
    revalidatePath('/configuracion')
    return { success: true }
}

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
        .from('tenants')
        .select('id, nombre, color_primario, color_secundario, direccion, ciudad, telefono, email_contacto')
        .eq('slug', tenantSlug)
        .single()
    if (!tenant) return null

    const { data } = await supabase
        .from('landing_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single()

    if (!data) {
        return {
            id: '',
            tenant_id: tenant.id,
            ...DEFAULT_LANDING_CONFIG,
            meta_title: tenant.nombre,
            color_primary: tenant.color_primario || DEFAULT_LANDING_CONFIG.color_primary,
            color_primary_hover: tenant.color_secundario || DEFAULT_LANDING_CONFIG.color_primary_hover,
            footer_address: tenant.direccion ? `${tenant.direccion}${tenant.ciudad ? `, ${tenant.ciudad}` : ''}` : null,
            footer_phone: tenant.telefono || null,
            footer_email: tenant.email_contacto || null,
            logo_config: {
                type: 'text',
                image_url: null,
                text: tenant.nombre,
                font: 'font-sans',
                icon: 'Stethoscope',
                color_style: 'gradient',
            },
        }
    }

    const config = { ...data } as LandingConfig
    // Garantizar que el nombre del logo y el título pertenezcan a este tenant
    if (!config.logo_config || !config.logo_config.text) {
        config.logo_config = {
            type: 'text',
            image_url: null,
            text: tenant.nombre,
            font: 'font-sans',
            icon: 'Stethoscope',
            color_style: 'gradient',
        }
    }
    if (!config.meta_title) {
        config.meta_title = tenant.nombre
    }

    return config
}

// ── Lectura autenticada (para el panel admin) ─────────────────────

export async function getLandingConfigAdmin(tenantSlug?: string): Promise<LandingConfig | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adminSupabase = createAdminClient()
    let query = adminSupabase.from('tenants').select('id, nombre, color_primario, color_secundario')
    if (tenantSlug) {
        query = query.eq('slug', tenantSlug)
    }
    const { data: userTenant } = await query.limit(1).single()

    if (!userTenant) return null

    const { data } = await adminSupabase
        .from('landing_config')
        .select('*')
        .eq('tenant_id', userTenant.id)
        .single()

    if (!data) {
        return {
            id: '',
            tenant_id: userTenant.id,
            ...DEFAULT_LANDING_CONFIG,
            meta_title: userTenant.nombre,
            color_primary: userTenant.color_primario || DEFAULT_LANDING_CONFIG.color_primary,
            color_primary_hover: userTenant.color_secundario || DEFAULT_LANDING_CONFIG.color_primary_hover,
            logo_config: {
                type: 'text',
                image_url: null,
                text: userTenant.nombre,
                font: 'font-sans',
                icon: 'Stethoscope',
                color_style: 'gradient',
            },
        }
    }
    return data as LandingConfig
}

// ── Guardar / upsert ──────────────────────────────────────────────

export async function guardarLandingConfig(
    updates: Partial<Omit<LandingConfig, 'id' | 'tenant_id' | 'domain_verified' | 'custom_domain'>>,
    tenantSlug?: string
) {
    const supabase = createAdminClient()

    let tenantId: string | null = null
    if (tenantSlug) {
        const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
        tenantId = t?.id ?? null
    }

    if (!tenantId) {
        const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single()
        tenantId = tenant?.id ?? null
    }

    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Sincronizar colores principales en la tabla tenants
    if (updates.color_primary || updates.color_primary_hover) {
        await supabase.from('tenants').update({
            ...(updates.color_primary ? { color_primario: updates.color_primary } : {}),
            ...(updates.color_primary_hover ? { color_secundario: updates.color_primary_hover } : {}),
        }).eq('id', tenantId)
    }

    const { error } = await supabase
        .from('landing_config')
        .upsert({ tenant_id: tenantId, ...updates }, { onConflict: 'tenant_id' })

    if (error) return { error: error.message }

    revalidatePath('/')
    revalidatePath('/reservar')
    revalidatePath('/configuracion')
    return { success: true }
}

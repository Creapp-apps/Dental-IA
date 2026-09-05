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
        .select('id, slug, nombre, color_primario, color_secundario, direccion, ciudad, telefono, email_contacto')
        .eq('slug', tenantSlug)
        .single()
    if (!tenant) return null

    const { data } = await supabase
        .from('landing_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single()

    const defaultEmail = tenant.email_contacto || (tenant.slug === 'alvarez' ? 'turnos@consultorioalvarez.com.ar' : `turnos@${tenant.slug}.com.ar`)
    const defaultPhone = tenant.telefono || (tenant.slug === 'alvarez' ? '+54 9 11 4567-8900' : '+54 9 11 0000-0000')
    const defaultAddress = tenant.direccion 
        ? `${tenant.direccion}${tenant.ciudad ? `, ${tenant.ciudad}` : ''}` 
        : (tenant.slug === 'alvarez' ? 'Av. Corrientes 1234, Piso 3, Of. 5, Buenos Aires' : 'Atención Odontológica Personalizada')
    const defaultMetaTitle = tenant.slug === 'curadent' 
        ? 'Curadent - Clinica Odontologica' 
        : `${tenant.nombre || 'Consultorio'} - Clinica Odontologica`

    if (!data) {
        return {
            id: '',
            tenant_id: tenant.id,
            ...DEFAULT_LANDING_CONFIG,
            meta_title: defaultMetaTitle,
            color_primary: tenant.color_primario || DEFAULT_LANDING_CONFIG.color_primary,
            color_primary_hover: tenant.color_secundario || DEFAULT_LANDING_CONFIG.color_primary_hover,
            footer_address: defaultAddress,
            footer_phone: defaultPhone,
            footer_email: defaultEmail,
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
    // Garantizar que el nombre del logo, título y contacto pertenezcan a este tenant
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
        config.meta_title = defaultMetaTitle
    }
    if (!config.footer_email) {
        config.footer_email = defaultEmail
    }
    if (!config.footer_phone) {
        config.footer_phone = defaultPhone
    }
    if (!config.footer_address) {
        config.footer_address = defaultAddress
    }

    return config
}

// ── Lectura autenticada (para el panel admin) ─────────────────────

export async function getLandingConfigAdmin(tenantSlug?: string): Promise<LandingConfig | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adminSupabase = createAdminClient()

    let tenantId: string | null = null
    let userTenant: any = null

    if (tenantSlug) {
        const { data } = await adminSupabase
            .from('tenants')
            .select('id, nombre, color_primario, color_secundario')
            .eq('slug', tenantSlug)
            .single()
        userTenant = data
        tenantId = data?.id ?? null
    } else {
        const { data: usuario } = await adminSupabase
            .from('usuarios')
            .select('tenant_id')
            .eq('id', user.id)
            .single()
        
        if (usuario?.tenant_id) {
            tenantId = usuario.tenant_id
            const { data } = await adminSupabase
                .from('tenants')
                .select('id, nombre, color_primario, color_secundario')
                .eq('id', tenantId)
                .single()
            userTenant = data
        }
    }

    if (!tenantId || !userTenant) return null

    const { data } = await adminSupabase
        .from('landing_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (!data) {
        return {
            id: '',
            tenant_id: tenantId,
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

    const config = { ...data } as LandingConfig
    if (!config.logo_config || !config.logo_config.text) {
        config.logo_config = {
            type: 'text',
            image_url: null,
            text: userTenant.nombre,
            font: 'font-sans',
            icon: 'Stethoscope',
            color_style: 'gradient',
        }
    }
    return config
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

import { createAdminClient } from '@/lib/supabase/admin'

export interface TenantInfo {
    id: string
    nombre: string
    slug: string
    custom_domain?: string | null
    logo_url?: string | null
    telefono?: string | null
    email_contacto?: string | null
    direccion?: string | null
    ciudad?: string | null
    provincia?: string | null
    color_primario?: string
    color_secundario?: string
    horarios?: any
    activo: boolean
}

/**
 * Normaliza un nombre de host para búsqueda limpia:
 * remueve puertos (ej: ":3000") y subdominios estándar como "www."
 */
export function normalizeHost(rawHost: string): string {
    if (!rawHost) return ''
    return rawHost
        .split(':')[0]
        .toLowerCase()
        .replace(/^www\./, '')
        .trim()
}

/**
 * Mapeo estático de dominios a slugs de consultorio (Fallback de alta resiliencia).
 * Asegura que dominios productivos conocidos resuelvan inmediatamente a su clínica
 * incluso si la columna custom_domain aún no fue migrada en la base de datos.
 */
const STATIC_DOMAIN_MAP: Record<string, string> = {
    'dentalva.ar': 'alvarez',
}

/**
 * Resuelve un tenant a partir de un host (ej: "curadent.com.ar", "dentalva.ar", "curadent.dental-ia.com")
 * o de un slug explícito (ej: "alvarez", "curadent").
 * 
 * Si el host corresponde al dominio principal de la plataforma (ej: "dental-ia.com", "localhost")
 * y no se especificó un slug de consultorio, retorna `null` (indicando que es la plataforma Dental-IA SaaS).
 */
export async function resolveTenant(hostOrSlug?: string | null): Promise<TenantInfo | null> {
    const supabase = createAdminClient()
    const cleanIdentifier = hostOrSlug ? normalizeHost(hostOrSlug) : ''

    if (!cleanIdentifier) {
        return null
    }

    // 0. Fallback directo por mapeo estático de dominios conocidos
    const mappedSlug = STATIC_DOMAIN_MAP[cleanIdentifier]
    if (mappedSlug) {
        const { data: tenantByStatic } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', mappedSlug)
            .eq('activo', true)
            .maybeSingle()

        if (tenantByStatic) {
            return {
                ...tenantByStatic,
                custom_domain: tenantByStatic.custom_domain || cleanIdentifier,
            } as TenantInfo
        }
    }

    // 1. Buscar primero por slug directo (ej: "curadent", "alvarez")
    const { data: tenantBySlug } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', cleanIdentifier)
        .eq('activo', true)
        .maybeSingle()

    if (tenantBySlug) {
        return tenantBySlug as TenantInfo
    }

    // 2. Buscar por custom_domain exacto en tabla tenants
    try {
        const { data: tenantByDomain, error: domainErr } = await supabase
            .from('tenants')
            .select('*')
            .eq('custom_domain', cleanIdentifier)
            .eq('activo', true)
            .maybeSingle()

        if (tenantByDomain && !domainErr) {
            return tenantByDomain as TenantInfo
        }
    } catch {
        // Ignorar si la columna custom_domain aún no existe en Supabase
    }

    // 2b. Fallback: buscar si está configurado en landing_config
    try {
        const { data: landingData, error: landingErr } = await supabase
            .from('landing_config')
            .select('tenant_id')
            .eq('custom_domain', cleanIdentifier)
            .maybeSingle()

        if (landingData?.tenant_id && !landingErr) {
            const { data: tenantFromLanding } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', landingData.tenant_id)
                .eq('activo', true)
                .maybeSingle()

            if (tenantFromLanding) {
                return {
                    ...tenantFromLanding,
                    custom_domain: cleanIdentifier,
                } as TenantInfo
            }
        }
    } catch {
        // Ignorar si falla la consulta
    }

    // 3. Buscar por subdominio (ej: "curadent.dental-ia.com", "curadent.local", "curadent.localhost")
    const parts = cleanIdentifier.split('.')
    if (parts.length > 1) {
        const sub = parts[0]
        const reservedSubs = ['www', 'app', 'admin', 'superadmin', 'api', 'dental-ia', 'mail']
        if (sub && !reservedSubs.includes(sub)) {
            const { data: tenantBySub } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', sub)
                .eq('activo', true)
                .maybeSingle()

            if (tenantBySub) {
                return tenantBySub as TenantInfo
            }
        }
    }

    // 4. Si es el dominio principal de la plataforma (ej: dental-ia.com, localhost, vercel.app) sin subdominio de tenant
    return null
}

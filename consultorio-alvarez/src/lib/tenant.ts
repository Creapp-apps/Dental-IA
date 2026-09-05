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
 * Resuelve un tenant a partir de un host (ej: "curadent.com.ar", "dentalva.ar")
 * o de un slug explícito (ej: "alvarez", "curadent").
 */
export async function resolveTenant(hostOrSlug?: string | null): Promise<TenantInfo | null> {
    const supabase = createAdminClient()
    const cleanIdentifier = hostOrSlug ? normalizeHost(hostOrSlug) : ''

    // 1. Si no hay identificador o es localhost/vercel dev, fallback seguro al slug por defecto
    const defaultSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'alvarez'
    const isLocalOrInternal = !cleanIdentifier || 
        cleanIdentifier === 'localhost' || 
        cleanIdentifier === '127.0.0.1' || 
        cleanIdentifier.endsWith('.vercel.app')

    if (!isLocalOrInternal) {
        // 2. Buscar primero por custom_domain exacto (si la columna existe en el schema)
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

        // 3. Buscar por slug directo (ej: "curadent", "alvarez")
        const { data: tenantBySlug } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', cleanIdentifier)
            .eq('activo', true)
            .maybeSingle()

        if (tenantBySlug) {
            return tenantBySlug as TenantInfo
        }

        // 4. Buscar por subdominio (ej: "curadent.local", "curadent.localhost", "curadent.vercel.app")
        const parts = cleanIdentifier.split('.')
        if (parts.length > 1) {
            const sub = parts[0]
            if (sub && sub !== 'www') {
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
    }

    // 5. Fallback: Cargar el tenant por defecto (Álvarez) para entornos locales o de desarrollo
    const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', defaultSlug)
        .eq('activo', true)
        .maybeSingle()

    return defaultTenant ? (defaultTenant as TenantInfo) : null
}

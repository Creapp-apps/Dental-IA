import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { createClient } from '@/lib/supabase/server'
import LoginClient from './LoginClient'

export async function generateMetadata(props: {
    searchParams?: Promise<{ slug?: string; error?: string }>
}): Promise<Metadata> {
    const searchParams = await props.searchParams
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(searchParams?.slug || rawHost)
    const slug = tenant?.slug || searchParams?.slug || undefined
    
    const title = !slug
        ? 'Iniciar Sesión | Dental-IA'
        : (slug === 'curadent' 
            ? 'Curadent - Iniciar Sesión' 
            : (tenant?.nombre ? `${tenant.nombre} - Iniciar Sesión` : 'Iniciar Sesión | Dental-IA'))

    return {
        title,
        description: 'Acceso a la plataforma de gestión odontológica Dental-IA',
        icons: {
            icon: [
                { url: '/favicon.ico', sizes: 'any' },
                { url: '/icon.png', type: 'image/png' },
            ],
            apple: '/apple-icon.png',
        },
    }
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ error?: string; slug?: string }>
}) {
    const params = await searchParams
    const errorMsg = params?.error ? decodeURIComponent(params.error) : null
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(params?.slug || rawHost)
    const slug = tenant?.slug || params?.slug || undefined
    const config = slug ? await getLandingConfigPublica(slug) : null

    // Si hay una sesión activa de otro tenant, cerrarla automáticamente
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && tenant) {
        const { data: usuario } = await supabase.from('usuarios').select('tenant_id').eq('id', user.id).single()
        if (usuario && usuario.tenant_id !== tenant.id) {
            await supabase.auth.signOut()
        }
    }

    const tenantNombre = tenant?.nombre || (slug === 'curadent' ? 'Curadent Odontología' : (slug === 'alvarez' ? 'Consultorio Odontológico Álvarez' : 'Dental-IA'))
    const colorPrimary = config?.color_primary || tenant?.color_primario || '#2563eb'
    const logoUrl = config?.logo_url || tenant?.logo_url || null

    return (
        <LoginClient 
            errorMsg={errorMsg} 
            tenantNombre={tenantNombre}
            colorPrimary={colorPrimary}
            logoUrl={logoUrl}
            slug={slug}
        />
    )
}

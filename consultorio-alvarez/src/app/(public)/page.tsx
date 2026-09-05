import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { getProfesionalesPublicos, getObrasSocialesPublicas } from '@/lib/actions/reservas'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'
import { LandingPageClient } from '@/components/landing-v2/LandingPageClient'

export async function generateMetadata(props: {
    searchParams?: Promise<{ slug?: string }>
}): Promise<Metadata> {
    const searchParams = await props.searchParams
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(searchParams?.slug || rawHost)
    const slug = tenant?.slug || searchParams?.slug || 'alvarez'
    const config = await getLandingConfigPublica(slug)

    const title = slug === 'curadent'
        ? 'Curadent - Clinica Odontologica'
        : (config?.meta_title || (tenant?.nombre ? `${tenant.nombre} - Clinica Odontologica` : 'Consultorio Odontológico'))

    return {
        title,
        description: config?.meta_description || `Atención odontológica integral y turnos online en ${tenant?.nombre || 'nuestro consultorio'}.`,
        icons: {
            icon: '/favicon.ico',
            apple: '/LOGO-NOTIF.png',
        },
    }
}

export default async function LandingPage(props: {
    searchParams?: Promise<{ slug?: string }>
}) {
    const searchParams = await props.searchParams
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(searchParams?.slug || rawHost)
    const slug = tenant?.slug || searchParams?.slug || process.env.NEXT_PUBLIC_TENANT_SLUG || 'alvarez'

    const tenantNombre = tenant?.nombre || (slug === 'curadent' ? 'Curadent Odontología' : 'Consultorio Odontológico')

    const [config, profesionales, obrasSociales] = await Promise.all([
        getLandingConfigPublica(slug).then(c => c ?? { id: '', tenant_id: '', ...DEFAULT_LANDING_CONFIG }),
        getProfesionalesPublicos(slug),
        getObrasSocialesPublicas(slug)
    ])

    return (
        <>
            {/* Inject tenant CSS variables for colors, ensuring total congruence across Tailwind and landing tokens */}
            <style>{`
                :root {
                    --primary: ${config.color_primary};
                    --primary-foreground: #ffffff;
                    --color-primary: ${config.color_primary};
                    --ring: ${config.color_primary};
                    --color-ring: ${config.color_primary};
                    --landing-primary: ${config.color_primary};
                    --landing-primary-hover: ${config.color_primary_hover};
                    --landing-accent: ${config.color_accent};
                    --landing-bg-hero: ${config.color_bg_hero};
                    --landing-bg-dark: ${config.color_bg_dark};
                }
            `}</style>
            <LandingPageClient
                slug={slug}
                tenantNombre={tenantNombre}
                config={config}
                professionals={profesionales}
                obrasSociales={obrasSociales}
            />
        </>
    )
}

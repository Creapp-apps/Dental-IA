// Server Component — fetches landing config from DB and injects it as CSS variables
import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { getProfesionalesPublicos, getObrasSocialesPublicas } from '@/lib/actions/reservas'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'
import { LandingPageClient } from '@/components/landing-v2/LandingPageClient'

export default async function LandingPage() {
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(rawHost)
    const slug = tenant?.slug || process.env.NEXT_PUBLIC_TENANT_SLUG || 'alvarez'

    const [config, profesionales, obrasSociales] = await Promise.all([
        getLandingConfigPublica(slug).then(c => c ?? { id: '', tenant_id: '', ...DEFAULT_LANDING_CONFIG }),
        getProfesionalesPublicos(slug),
        getObrasSocialesPublicas(slug)
    ])

    return (
        <>
            {/* Inject tenant CSS variables for colors */}
            <style>{`
                :root {
                    --landing-primary: ${config.color_primary};
                    --landing-primary-hover: ${config.color_primary_hover};
                    --landing-accent: ${config.color_accent};
                    --landing-bg-hero: ${config.color_bg_hero};
                    --landing-bg-dark: ${config.color_bg_dark};
                }
            `}</style>
            <LandingPageClient
                slug={slug}
                config={config}
                professionals={profesionales}
                obrasSociales={obrasSociales}
            />
        </>
    )
}

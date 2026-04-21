// Server Component — fetches landing config from DB and injects it as CSS variables
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'
import { LandingPageClient } from '@/components/landing-v2/LandingPageClient'

export default async function LandingPage() {
    const slug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'alvarez'
    const config = (await getLandingConfigPublica(slug)) ?? { id: '', tenant_id: '', ...DEFAULT_LANDING_CONFIG }

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
            />
        </>
    )
}

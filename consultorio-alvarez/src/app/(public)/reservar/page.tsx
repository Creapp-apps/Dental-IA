import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'
import { BookingSection } from '@/components/landing-v2/sections/BookingSection'
import { MeshGradient } from '@/components/landing-v2/ui/MeshGradient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ReservarPage() {
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(rawHost)
    const slug = tenant?.slug || process.env.NEXT_PUBLIC_TENANT_SLUG || 'alvarez'
    const config = (await getLandingConfigPublica(slug)) ?? { id: '', tenant_id: '', ...DEFAULT_LANDING_CONFIG }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* CSS Variables maestro para el V2 BookingSection */}
            <style>{`
                :root {
                    --landing-primary: ${config.color_primary};
                    --landing-primary-hover: ${config.color_primary_hover};
                    --landing-accent: ${config.color_accent};
                    --landing-bg-hero: ${config.color_bg_hero};
                    --landing-bg-dark: ${config.color_bg_dark};
                }
            `}</style>

            {/* Fondo estático v2 */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -1,
                    backgroundColor: config.color_bg_hero,
                }}
            />

            {/* Capa Apple-style Glassmorphism Texturizada */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
                <MeshGradient scrollProgress={0.6} />
            </div>

            {/* Back button flotante minimalista */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50">
                <Link
                    href="/"
                    className="flex justify-center items-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </div>

            <main className="relative z-10 min-h-screen flex flex-col justify-center pb-12">
                <BookingSection config={config} slug={slug} />
            </main>
        </div>
    )
}

export async function generateMetadata() {
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(rawHost)
    const nombre = tenant?.nombre || 'Consultorio Odontológico'
    return {
        title: `Reservar turno — ${nombre}`,
        description: `Solicitá tu turno online en ${nombre}`,
    }
}

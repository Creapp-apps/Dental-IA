import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveTenant } from '@/lib/tenant'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing'
import { BookingSection } from '@/components/landing-v2/sections/BookingSection'
import { PaymentResult, normalizePaymentStatus } from '@/components/landing-v2/booking/PaymentResult'
import { verificarPagoSenia } from '@/lib/actions/mercadopago'
import { MeshGradient } from '@/components/landing-v2/ui/MeshGradient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata(props: {
    searchParams?: Promise<{ slug?: string }>
}): Promise<Metadata> {
    const searchParams = await props.searchParams
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(searchParams?.slug || rawHost)
    // Blindaje multi-tenant: sin tenant resuelto NO asumimos 'alvarez'.
    const slug = tenant?.slug
    const config = slug ? await getLandingConfigPublica(slug) : null

    const title = slug === 'curadent'
        ? 'Curadent - Reservar Turno'
        : (tenant?.nombre ? `${tenant.nombre} - Reservar Turno` : 'Reservar Turno Online')

    return {
        title,
        description: config?.meta_description || `Reservá tu turno odontológico online en ${tenant?.nombre || 'nuestro consultorio'}.`,
        icons: {
            icon: [
                { url: '/favicon.ico', sizes: 'any' },
                { url: '/icon.png', type: 'image/png' },
            ],
            apple: '/apple-icon.png',
        },
    }
}

export default async function ReservarPage(props: {
    searchParams?: Promise<{ slug?: string; status?: string; turno?: string }>
}) {
    const searchParams = await props.searchParams
    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const tenant = await resolveTenant(searchParams?.slug || rawHost)
    // Blindaje multi-tenant: si no se resuelve un consultorio real, mostramos 404
    // en vez de caer por default a 'alvarez' (evita que un turno entre en otra agenda).
    if (!tenant?.slug) {
        notFound()
    }
    const slug = tenant.slug
    const config = (await getLandingConfigPublica(slug)) ?? { id: '', tenant_id: '', ...DEFAULT_LANDING_CONFIG }

    // Si el paciente vuelve del checkout, reconciliamos el pago contra MP (no
    // confiamos en el ?status de la URL) y confirmamos el turno si corresponde.
    let paymentStatus = searchParams?.status ? normalizePaymentStatus(searchParams.status) : null
    if (searchParams?.status && searchParams?.turno && paymentStatus !== 'failure') {
        const recon = await verificarPagoSenia(searchParams.turno)
        if (recon.status === 'approved') paymentStatus = 'approved'
        else if (recon.status === 'pending') paymentStatus = 'pending'
        else if (recon.status === 'rejected') paymentStatus = 'failure'
        // 'none'/'error': dejamos el status derivado de la URL.
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* CSS Variables maestro para el V2 BookingSection */}
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
                    href={slug ? `/${slug}` : "/"}
                    className="flex justify-center items-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </div>

            <main className="relative z-10 min-h-screen flex flex-col justify-center pb-12">
                {paymentStatus ? (
                    <PaymentResult status={paymentStatus} slug={slug} />
                ) : (
                    <BookingSection config={config} slug={slug} />
                )}
            </main>
        </div>
    )
}

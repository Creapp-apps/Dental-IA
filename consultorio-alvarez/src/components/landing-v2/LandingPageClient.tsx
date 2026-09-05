'use client'

import { useEffect, useRef, useState } from 'react'
import { MeshGradient } from '@/components/landing-v2/ui/MeshGradient'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HeroSection } from '@/components/landing-v2/sections/HeroSection'
import { AboutUsSection } from '@/components/landing-v2/sections/AboutUsSection'
import { ServicesSection } from '@/components/landing-v2/sections/ServicesSection'
import { TeamSection } from '@/components/landing-v2/sections/TeamSection'
import { ObrasSocialesSection } from '@/components/landing-v2/sections/ObrasSocialesSection'
import { BookingSection } from '@/components/landing-v2/sections/BookingSection'
import { FooterSection } from '@/components/landing-v2/sections/FooterSection'
import { FloatingChatbot } from '@/components/landing-v2/ui/FloatingChatbot'
import type { LandingConfig } from '@/lib/types/landing'

gsap.registerPlugin(ScrollTrigger)

function getBackground(progress: number, bgHero = '#f0fdfa', bgDark = '#0b1525'): string {
    if (progress < 0.50) {
        return bgHero
    } else if (progress < 0.75) {
        return bgDark
    } else {
        return bgHero
    }
}

interface LandingPageClientProps {
    slug: string
    tenantNombre?: string
    config: LandingConfig & { id: string; tenant_id: string }
    professionals: any[]
    obrasSociales: any[]
}

export function LandingPageClient({ slug, tenantNombre, config, professionals, obrasSociales }: LandingPageClientProps) {
    const [scrollProgress, setScrollProgress] = useState(0)
    const mainRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)
    const lenisRef = useRef<Lenis | null>(null)

    const clinicName = tenantNombre || ((config as any)?.logo_config?.text) || config?.meta_title || 'Consultorio Odontológico'

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.8,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        })
        lenisRef.current = lenis

        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add((time) => { lenis.raf(time * 1000) })
        gsap.ticker.lagSmoothing(0)

        const st = ScrollTrigger.create({
            trigger: mainRef.current,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                setScrollProgress(self.progress)
            },
        })

        return () => {
            lenis.destroy()
            lenisRef.current = null
            st.kill()
            gsap.ticker.remove(() => { })
        }
    }, [])

    useEffect(() => {
        if (bgRef.current) {
            bgRef.current.style.backgroundColor = getBackground(
                scrollProgress,
                config.color_bg_hero,
                config.color_bg_dark
            )
        }
    }, [scrollProgress, config.color_bg_hero, config.color_bg_dark])

    const scrollToBooking = () => {
        const target = document.getElementById('reservar')
        if (target) {
            if (lenisRef.current) {
                lenisRef.current.scrollTo(target, { duration: 1.5 })
            }
            target.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <div ref={mainRef}>
            <div
                ref={bgRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -1,
                    backgroundColor: config.color_bg_hero,
                    transition: 'background-color 0.4s ease',
                }}
            />
            <MeshGradient scrollProgress={scrollProgress} />
            <main className="relative z-10">
                <HeroSection onBookingClick={scrollToBooking} config={config} clinicName={clinicName} />
                <AboutUsSection onBookingClick={scrollToBooking} colorPrimary={config.color_primary} bgHero={config.color_bg_hero} />
                <ServicesSection onBookingClick={scrollToBooking} config={config} />
                <TeamSection config={config} professionals={professionals} />
                {obrasSociales && obrasSociales.length > 0 && (
                    <ObrasSocialesSection config={config} obrasSociales={obrasSociales} />
                )}
                <BookingSection config={config} slug={slug} />
                <FooterSection config={config} clinicName={clinicName} />
                <FloatingChatbot
                    slug={slug}
                    clinicName={clinicName}
                    colorPrimary={config.color_primary}
                    professionals={professionals}
                    obrasSociales={obrasSociales}
                />
            </main>
        </div>
    )
}

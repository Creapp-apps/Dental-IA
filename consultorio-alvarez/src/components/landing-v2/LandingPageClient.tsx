'use client'

import { useEffect, useRef, useState } from 'react'
import { MeshGradient } from '@/components/landing-v2/ui/MeshGradient'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HeroSection } from '@/components/landing-v2/sections/HeroSection'
import { ServicesSection } from '@/components/landing-v2/sections/ServicesSection'
import { TeamSection } from '@/components/landing-v2/sections/TeamSection'
import { BookingSection } from '@/components/landing-v2/sections/BookingSection'
import { FooterSection } from '@/components/landing-v2/sections/FooterSection'
import type { LandingConfig } from '@/lib/types/landing'

gsap.registerPlugin(ScrollTrigger)

function getBackground(progress: number): string {
    if (progress < 0.25) {
        const t = progress / 0.25
        return `rgb(${Math.round(238 - t * 15)},${Math.round(246 - t * 20)},255)`
    } else if (progress < 0.55) {
        const t = (progress - 0.25) / 0.3
        return `rgb(${Math.round(223 - t * 212)},${Math.round(226 - t * 205)},${Math.round(245 - t * 208)})`
    } else if (progress < 0.8) {
        return 'rgb(11,21,37)'
    } else {
        const t = (progress - 0.8) / 0.2
        return `rgb(${Math.round(11 + t * 230)},${Math.round(21 + t * 228)},${Math.round(37 + t * 218)})`
    }
}

interface LandingPageClientProps {
    slug: string
    config: LandingConfig & { id: string; tenant_id: string }
    professionals: any[]
}

export function LandingPageClient({ slug, config, professionals }: LandingPageClientProps) {
    const [scrollProgress, setScrollProgress] = useState(0)
    const mainRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.8,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        })

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
            st.kill()
            gsap.ticker.remove(() => { })
        }
    }, [])

    useEffect(() => {
        if (bgRef.current) {
            bgRef.current.style.backgroundColor = getBackground(scrollProgress)
        }
    }, [scrollProgress])

    const scrollToBooking = () => {
        document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' })
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
                <HeroSection onBookingClick={scrollToBooking} config={config} />
                <ServicesSection config={config} />
                <TeamSection config={config} professionals={professionals} />
                <BookingSection config={config} />
                <FooterSection config={config} />
            </main>
        </div>
    )
}

'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { CLINIC } from '@/lib/landing-constants'
import { MapPin, Phone, ChevronDown } from 'lucide-react'
import { StaggerButton } from '@/components/landing-v2/ui/stagger-button'
import type { LandingConfig } from '@/lib/types/landing'
import { TenantLogo } from '@/components/ui/tenant-logo'

interface Props {
    onBookingClick: () => void
    config?: Pick<LandingConfig, 'hero_badge' | 'hero_titulo' | 'hero_subtitulo' | 'color_primary' | 'color_accent' | 'footer_address' | 'footer_phone'>
}

export function HeroSection({ onBookingClick, config }: Props) {
    const heroBadgeRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const ctaRef = useRef<HTMLDivElement>(null)
    const chipsRef = useRef<HTMLDivElement>(null)
    const badge1Ref = useRef<HTMLDivElement>(null)
    const badge2Ref = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Simple, safe stagger — animate the two lines as blocks (no DOM manipulation)
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        if (heroBadgeRef.current) {
            tl.fromTo(
                heroBadgeRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6 },
                0.1
            )
        }

        tl.fromTo(
            titleRef.current,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.7 },
            0.2
        )
        tl.fromTo(
            subtitleRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6 },
            0.45
        )
        tl.fromTo(
            ctaRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5 },
            0.65
        )
        tl.fromTo(
            chipsRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5 },
            0.8
        )
        tl.fromTo(
            badge1Ref.current,
            { opacity: 0, scale: 0.85, x: 20 },
            { opacity: 1, scale: 1, x: 0, duration: 0.6, ease: 'back.out(1.7)' },
            0.95
        )
        tl.fromTo(
            badge2Ref.current,
            { opacity: 0, scale: 0.85, x: -20 },
            { opacity: 1, scale: 1, x: 0, duration: 0.6, ease: 'back.out(1.7)' },
            1.1
        )
        tl.fromTo(
            badge1Ref.current,
            { opacity: 0, scale: 0.85, x: 20 },
            { opacity: 1, scale: 1, x: 0, duration: 0.6, ease: 'back.out(1.7)' },
            1.15
        )
        tl.fromTo(
            badge2Ref.current,
            { opacity: 0, scale: 0.85, x: -20 },
            { opacity: 1, scale: 1, x: 0, duration: 0.6, ease: 'back.out(1.7)' },
            1.3
        )

        // Floating badges loop
        gsap.to(badge1Ref.current, {
            y: -10,
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: 1.8,
        })
        gsap.to(badge2Ref.current, {
            y: -8,
            x: 3,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: 2.1,
        })

        return () => { tl.kill() }
    }, [])

    return (
        <section className="relative min-h-screen flex items-center z-10">
            {/* Header público: Logo en la esquina superior izquierda */}
            <div className="absolute top-6 left-6 lg:top-8 lg:left-10 z-50">
                <TenantLogo
                    config={(config as any)?.logo_config}
                    colorPrimary={config?.color_primary}
                    fallbackName={CLINIC.name}
                />
            </div>

            <div
                ref={containerRef}
                className="max-w-7xl mx-auto px-6 sm:px-10 pt-24 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-screen w-full"
            >
                {/* LEFT — Text */}
                <div className="flex flex-col justify-center order-2 lg:order-1">
                    {config?.hero_badge && (
                        <div className="mb-4" style={{ opacity: 0 }} ref={heroBadgeRef}>
                            <span
                                className="text-xs font-bold px-3 py-1.5 rounded-full text-white tracking-wider uppercase inline-block"
                                style={{ backgroundColor: config?.color_primary ?? '#0d9488' }}
                            >
                                {config.hero_badge}
                            </span>
                        </div>
                    )}
                    <h1
                        ref={titleRef}
                        className="mb-7 block text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-gray-900"
                        style={{ opacity: 0 }}
                    >
                        {(config?.hero_titulo || 'Tu sonrisa, elevada.').split(' ').map((w, i, arr) => (
                            i === arr.length - 1
                                ? <span key={i} className="text-gradient-landing">{w}</span>
                                : <span key={i}>{w} </span>
                        ))}
                    </h1>

                    <p
                        ref={subtitleRef}
                        className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-md mb-8"
                        style={{ opacity: 0 }}
                    >
                        {config?.hero_subtitulo || CLINIC.description}
                    </p>

                    <div ref={ctaRef} className="flex flex-wrap gap-3 mb-8" style={{ opacity: 0 }}>
                        <StaggerButton
                            onClick={onBookingClick}
                            text="Reservar turno online"
                            direction="up"
                            className="rounded-full px-7 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer border-0 h-auto"
                            style={{ background: `linear-gradient(135deg, ${config?.color_primary ?? '#0d9488'}, ${config?.color_accent ?? '#2dd4bf'})` } as React.CSSProperties}
                        >
                            Reservar turno online
                        </StaggerButton>
                        <a
                            href="#servicios"
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all hover:-translate-y-0.5"
                        >
                            Ver servicios
                        </a>
                    </div>

                    <div ref={chipsRef} className="flex flex-wrap gap-2" style={{ opacity: 0 }}>
                        <div className="flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {config?.footer_address ?? `${CLINIC.address}, ${CLINIC.city}`}
                        </div>
                        {(config?.footer_phone ?? CLINIC.phone).split(/\|/).map((phoneStr, idx) => {
                            const [num, lbl] = phoneStr.split('::')
                            const trimmedNum = num?.trim()
                            const trimmedLbl = lbl?.trim()
                            if (!trimmedNum && !trimmedLbl) return null
                            return (
                                <div key={idx} className="flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs text-gray-500">
                                    <Phone className="h-3 w-3" />
                                    {trimmedNum} {trimmedLbl && <span className="text-gray-400 font-medium">({trimmedLbl})</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* RIGHT — Hero visual: glowing circle + image */}
                <div className="relative flex items-center justify-center order-1 lg:order-2 min-h-[420px]">
                    {/* Outer decorative ring */}
                    <div
                        style={{
                            position: 'absolute',
                            width: '340px', height: '340px',
                            borderRadius: '50%',
                            border: '1.5px solid rgba(13,148,136,0.2)',
                            animation: 'spin-slow 20s linear infinite',
                        }}
                    />

                    {/* Main glowing circle */}
                    <div
                        style={{
                            width: '300px', height: '300px',
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 40% 30%, ${config?.color_accent ?? '#2dd4bf'}58, ${config?.color_primary ?? '#0d9488'}8c 60%, rgba(8,51,68,0.7))`,
                            boxShadow: `0 0 80px ${config?.color_primary ?? '#0d9488'}4d, inset 0 0 60px ${config?.color_primary ?? '#0d9488'}1a`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Tooth image */}
                        <img
                            src="/DIENTE_compressed.webp"
                            alt="Diente sano con tratamiento estético"
                            style={{
                                width: '240px', height: '240px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25)) brightness(1.05)',
                                animation: 'float-hero 4s ease-in-out infinite',
                                position: 'relative', zIndex: 1,
                            }}
                        />
                    </div>

                    {/* Rating badge — top right */}
                    <div
                        ref={badge1Ref}
                        className="absolute top-4 right-0 lg:right-4 z-10 glass-light rounded-2xl px-4 py-3 flex items-center gap-2.5"
                        style={{ opacity: 0 }}
                    >
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            ))}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900 leading-none">4.9</p>
                            <p className="text-[10px] text-gray-400 leading-none mt-0.5">valoración</p>
                        </div>
                    </div>

                    {/* Turnos badge — bottom left */}
                    <div
                        ref={badge2Ref}
                        className="absolute bottom-4 left-0 lg:-left-4 z-10 glass-light rounded-2xl px-4 py-3 flex items-center gap-3"
                        style={{ opacity: 0 }}
                    >
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                            style={{ backgroundColor: config?.color_primary ?? '#0d9488' }}
                        >
                            ✓
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900 leading-none">Turnos online</p>
                            <p className="text-[10px] text-gray-400 leading-none mt-0.5">disponibles 24h</p>
                        </div>
                    </div>

                    {/* Sparkle dots */}
                    {[
                        { top: '15%', left: '8%', size: 8, delay: '0s' },
                        { top: '70%', right: '10%', size: 6, delay: '1.2s' },
                        { bottom: '20%', left: '15%', size: 5, delay: '2s' },
                    ].map((dot, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute', ...dot,
                                width: dot.size, height: dot.size,
                                borderRadius: '50%',
                                backgroundColor: `${config?.color_primary ?? '#14b8a6'}99`,
                                animation: `pulse-dot 2.5s ease-in-out ${dot.delay} infinite`,
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium tracking-[0.2em] uppercase">Scroll</span>
                <ChevronDown className="h-4 w-4 text-gray-400 animate-bounce" />
            </div>
        </section>
    )
}

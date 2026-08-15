'use client'

import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { CLINIC } from '@/lib/landing-constants'
import { MapPin, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LandingConfig } from '@/lib/types/landing'
import { TenantLogo } from '@/components/ui/tenant-logo'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
    {
        image: '/consultorio/slide_1.webp',
        title: 'Odontologia Digitalizada',
        description: 'Escaneos para diagnosticos de la cavidad oral.',
        tag: 'Tecnología de última generación'
    },
    {
        image: '/consultorio/slide_2.webp',
        title: 'Implantología',
        description: 'Rehabilitación bucal integral con implantes de última tecnología, prótesis fijas y soluciones avanzadas a tu medida.',
        tag: 'Rehabilitación Oral'
    },
    {
        image: '/consultorio/slide_3.webp',
        title: 'Estética Dental',
        description: 'Diseño de sonrisa y blanqueamiento con resultados naturales.',
        tag: 'Resultados Naturales'
    },
    {
        image: '/landing_slide4.png',
        title: 'Placas digitalizadas',
        description: 'Diagnóstico por imágenes e impresión de placas dentales digitales a medida.',
        tag: 'Diagnóstico Digital'
    }
]

interface Props {
    onBookingClick: () => void
    config?: Pick<LandingConfig, 'hero_badge' | 'hero_titulo' | 'hero_subtitulo' | 'color_primary' | 'color_accent' | 'footer_address' | 'footer_phone' | 'logo_config'>
}

export function HeroSection({ onBookingClick, config }: Props) {
    const titleRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const ctaRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [currentSlide, setCurrentSlide] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [progress, setProgress] = useState(0)

    // Autoplay & progress bar effect
    useEffect(() => {
        if (isHovered) return

        const slideInterval = 5000 // 5 seconds per slide
        const stepTime = 50 // step every 50ms for smooth bar progress
        const steps = slideInterval / stepTime
        let currentStep = 0

        const interval = setInterval(() => {
            currentStep++
            setProgress((currentStep / steps) * 100)

            if (currentStep >= steps) {
                setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
                currentStep = 0
                setProgress(0)
            }
        }, stepTime)

        return () => clearInterval(interval)
    }, [currentSlide, isHovered])

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
        setProgress(0)
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
        setProgress(0)
    }

    // GSAP animations for slide content changes
    useEffect(() => {
        if (!titleRef.current || !subtitleRef.current || !ctaRef.current) return

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        
        tl.fromTo(
            [titleRef.current, subtitleRef.current],
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }
        )
        tl.fromTo(
            ctaRef.current,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.4 },
            '-=0.2'
        )

        return () => { tl.kill() }
    }, [currentSlide])

    return (
        <div className="w-full flex flex-col z-10 bg-transparent">
            {/* TOP HEADER BAR (Transparent Glass overlay, floating) */}
            <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-white/85 via-white/40 to-transparent border-b-0">
                <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                    {/* Logo */}
                    <TenantLogo
                        config={(config as any)?.logo_config}
                        colorPrimary={config?.color_primary}
                        fallbackName={CLINIC.name}
                    />
                    
                    {/* Call-to-Action */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBookingClick}
                            className="hidden sm:inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-black text-white shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ backgroundColor: config?.color_primary ?? '#0d9488' }}
                        >
                            RESERVA TU TURNO ONLINE
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO IMAGE BANNER SLIDER (Horizontal format) */}
            <section 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative w-full h-[500px] md:h-[580px] overflow-hidden"
            >
                {/* BACKGROUND CAROUSEL */}
                <div className="absolute inset-0 w-full h-full z-0">
                    <div
                        className="flex h-full w-full transition-transform duration-1000 ease-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {SLIDES.map((slide, idx) => (
                            <div key={idx} className="relative w-full h-full shrink-0 overflow-hidden">
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    style={{
                                        objectPosition: (slide as any).objectPosition || 'center 45%'
                                    }}
                                    className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${
                                        currentSlide === idx ? 'scale-105' : 'scale-100'
                                    }`}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Subtle dark filter to keep image details soft */}
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                </div>

                {/* BLENDING GRADIENTS (Smooth transitions to web background) */}
                {/* Top Fade to White/Ice Blue */}
                <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#eef6ff] via-[#eef6ff]/35 to-transparent pointer-events-none z-10" />
                
                {/* Bottom Fade to White/Ice Blue */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#eef6ff] via-[#eef6ff]/50 to-transparent pointer-events-none z-10" />

                {/* OVERLAY CARD (Left-aligned, white, rounded) */}
                <div className="absolute left-6 md:left-20 lg:left-32 top-[55%] md:top-[50%] -translate-y-1/2 z-20 w-[calc(100%-3rem)] sm:w-auto sm:max-w-md">
                    <div 
                        ref={containerRef}
                        className="bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-start text-left"
                    >
                        {/* Highlight Category Tag */}
                        <div className="mb-1.5 flex items-center gap-2 overflow-hidden h-6">
                            <span 
                                className="text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300"
                                style={{ color: config?.color_primary ?? '#0d9488' }}
                            >
                                {SLIDES[currentSlide].tag || 'Tecnología de última generación'}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 
                            ref={titleRef}
                            className="text-2xl md:text-3.5xl font-black text-slate-900 leading-tight mb-3 tracking-tight"
                            style={{ opacity: 0 }}
                        >
                            {SLIDES[currentSlide].title}
                        </h1>

                        {/* Subtitle / Description */}
                        <p 
                            ref={subtitleRef}
                            className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6"
                            style={{ opacity: 0 }}
                        >
                            {SLIDES[currentSlide].description}
                        </p>

                        {/* CTA Button inside Card */}
                        <div ref={ctaRef} className="w-full" style={{ opacity: 0 }}>
                            <button
                                onClick={onBookingClick}
                                className="w-full rounded-xl py-4 text-xs font-black text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer border-0 transition-all duration-300 relative group overflow-hidden uppercase tracking-wider"
                                style={{ backgroundColor: config?.color_primary ?? '#0d9488' }}
                            >
                                RESERVA TU TURNO ONLINE
                                <span className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* SCREEN EDGE ARROWS (for slide nav) */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/25 hover:bg-white/45 border border-white/20 text-slate-800 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer z-40"
                    aria-label="Anterior"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/25 hover:bg-white/45 border border-white/20 text-slate-800 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer z-40"
                    aria-label="Siguiente"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>

                {/* DOT INDICATORS (Bottom Right to prevent overlap) */}
                <div className="absolute bottom-16 right-6 md:right-20 lg:right-32 flex gap-2 z-40 bg-white/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/30 shadow-sm transition-all duration-300">
                    {SLIDES.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentSlide(idx)
                                setProgress(0)
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                currentSlide === idx ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-600/60'
                            }`}
                            aria-label={`Ir a slide ${idx + 1}`}
                        />
                    ))}
                </div>

                {/* TOP PROGRESS BAR INDICATORS */}
                <div className="absolute top-0 left-0 right-0 h-1 flex gap-1 z-40">
                    {SLIDES.map((_, idx) => (
                        <div key={idx} className="h-full bg-slate-800/10 flex-1 overflow-hidden">
                            <div
                                className="h-full bg-slate-800/60 transition-all duration-100 ease-linear"
                                style={{
                                    width: currentSlide === idx ? `${progress}%` : currentSlide > idx ? '100%' : '0%',
                                    transition: progress === 0 && currentSlide === idx ? 'none' : undefined
                                }}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* FLOATING CONTACT CHIPS (Premium glass cards overlapping bottom edge) */}
            <div className="w-full relative -mt-8 pb-8 z-30 px-6">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3">
                    {/* Google Rating Badge */}
                    <div className="flex items-center gap-2 bg-white/85 backdrop-blur-md border border-white/80 rounded-full px-5 py-3 shadow-lg shadow-slate-200/50 hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            ))}
                        </div>
                        <span className="text-xs font-black text-slate-800">4.9 Valoración Google</span>
                    </div>

                    {/* Address Chip */}
                    <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(config?.footer_address ?? `${CLINIC.address}, ${CLINIC.city}`)}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-md border border-white/80 px-5 py-3 text-xs text-slate-800 font-black shadow-lg shadow-slate-200/50 hover:scale-[1.02] hover:bg-white transition-all cursor-pointer"
                    >
                        <MapPin className="h-4 w-4" style={{ color: config?.color_primary ?? '#0d9488' }} />
                        {config?.footer_address ?? `${CLINIC.address}, ${CLINIC.city}`}
                    </a>

                    {/* Phone / WhatsApp Chips */}
                    {(config?.footer_phone ?? CLINIC.phone).split(/\|/).map((phoneStr, idx) => {
                        const [num, lbl] = phoneStr.split('::')
                        const trimmedNum = num?.trim()
                        const trimmedLbl = lbl?.trim()
                        if (!trimmedNum && !trimmedLbl) return null
                        const telClean = trimmedNum?.replace(/[^\d+]/g, '') || ''
                        const isMobile = telClean.replace('+', '').length >= 10
                        const href = isMobile ? `https://wa.me/549${telClean.replace(/^\+?549?/, '')}` : `tel:${telClean}`
                        return (
                            <a 
                                key={idx} 
                                href={href} 
                                target={isMobile ? "_blank" : undefined} 
                                rel={isMobile ? "noopener noreferrer" : undefined} 
                                className="flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-md border border-white/80 px-5 py-3 text-xs text-slate-800 font-black shadow-lg shadow-slate-200/50 hover:scale-[1.02] hover:bg-white transition-all cursor-pointer"
                            >
                                <Phone className="h-4 w-4" style={{ color: config?.color_primary ?? '#0d9488' }} />
                                {trimmedNum} {trimmedLbl && <span className="text-slate-400 font-medium">({trimmedLbl})</span>}
                            </a>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

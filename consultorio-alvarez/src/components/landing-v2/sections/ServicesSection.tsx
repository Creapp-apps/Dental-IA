'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SERVICES } from '@/lib/landing-constants'
import type { LandingConfig } from '@/lib/types/landing'
import { Shield, Clock, Star, Heart } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const ICON_MAP: Record<string, React.ReactNode> = {
    shield: <Shield className="h-5 w-5" />,
    clock: <Clock className="h-5 w-5" />,
    star: <Star className="h-5 w-5" />,
    heart: <Heart className="h-5 w-5" />,
}

export function ServicesSection({ config }: { config?: Pick<LandingConfig, 'servicios' | 'servicios_titulo' | 'color_primary' | 'color_accent'> }) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)

    useEffect(() => {
        if (!sectionRef.current || !cardsRef.current || !titleRef.current) return

        // Use a scoped context so cleanup ONLY kills THIS component's triggers
        const ctx = gsap.context(() => {
            // Pin the section
            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: 'top top',
                end: '+=150%',
                pin: true,
                pinSpacing: true,
            })

            // Title reveal
            gsap.fromTo(
                titleRef.current,
                { opacity: 0, y: 60 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        end: 'top 40%',
                        scrub: 1,
                    },
                }
            )

            // Cards stagger
            const cards = cardsRef.current!.querySelectorAll('.service-card')
            gsap.fromTo(
                cards,
                {
                    opacity: 0,
                    y: 80,
                    x: (i) => (i % 2 === 0 ? -40 : 40),
                    scale: 0.9,
                },
                {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 60%',
                        end: 'top 10%',
                        scrub: 1,
                    },
                }
            )
        }, sectionRef)

        return () => ctx.revert() // Only kills triggers scoped to this component
    }, [])

    return (
        <section
            ref={sectionRef}
            id="servicios"
            className="relative min-h-screen flex flex-col justify-center z-10 py-20"
        >
            <div className="max-w-6xl mx-auto px-6 sm:px-10 w-full">
                <div ref={titleRef} className="mb-16 text-center" style={{ opacity: 0 }}>
                    <span
                        className="text-xs font-semibold tracking-[0.25em] uppercase mb-3 block"
                        style={{ color: config?.color_primary ?? '#0d9488' }}
                    >
                        {config?.servicios_titulo ?? 'Nuestros servicios'}
                    </span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                        Tecnología de
                        <span className="text-gradient-landing"> vanguardia</span>
                    </h2>
                    <p className="mt-4 text-white/80 font-medium max-w-lg mx-auto text-base">
                        Cada tratamiento combina precisión clínica con la más alta estética dental.
                    </p>
                </div>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {config?.servicios ? (
                        config.servicios.map((service, idx) => (
                            <div key={idx} className="service-card glass rounded-3xl p-7 hover:bg-white/10 transition-all duration-500 group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all"
                                        style={{
                                            backgroundColor: `${config?.color_primary ?? '#0d9488'}26`,
                                            color: config?.color_primary ?? '#0d9488',
                                        }}
                                    >
                                        {ICON_MAP[service.icono] ?? <Star className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">{service.titulo}</h3>
                                        <p className="text-sm text-white/80 font-medium drop-shadow-sm leading-relaxed">{service.descripcion}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        SERVICES.map((service) => (
                            <div key={service.id} className="service-card glass rounded-3xl p-7 hover:bg-white/10 transition-all duration-500 group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-teal-500/15 flex items-center justify-center text-xl text-teal-400 shrink-0 group-hover:bg-teal-500/25 transition-colors">
                                        {service.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">{service.title}</h3>
                                        <p className="text-xs font-semibold text-teal-300 drop-shadow-sm mb-3">{service.subtitle}</p>
                                        <p className="text-sm text-white/80 font-medium drop-shadow-sm leading-relaxed">{service.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    )
}

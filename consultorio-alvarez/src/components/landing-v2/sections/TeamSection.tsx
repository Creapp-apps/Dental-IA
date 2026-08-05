'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { LandingConfig } from '@/lib/types/landing'

gsap.registerPlugin(ScrollTrigger)

export function TeamSection({ config, professionals = [] }: { config?: Pick<LandingConfig, 'equipo_titulo' | 'equipo_subtitulo' | 'color_primary'>, professionals?: any[] }) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current || !cardsRef.current || !titleRef.current) return

        const ctx = gsap.context(() => {
            gsap.fromTo(
                titleRef.current,
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                }
            )

            const cards = cardsRef.current!.querySelectorAll('.team-card')
            gsap.fromTo(
                cards,
                { opacity: 0, y: 50, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: cardsRef.current,
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                }
            )
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const primaryColor = config?.color_primary ?? '#0d9488'

    return (
        <section
            ref={sectionRef}
            id="equipo"
            className="relative min-h-screen flex flex-col justify-center z-10 py-24"
        >
            <div className="max-w-5xl mx-auto px-6 sm:px-10 w-full">
                <div ref={titleRef} className="mb-16 text-center" style={{ opacity: 0 }}>
                    <span
                        className="text-xs font-semibold tracking-[0.25em] uppercase mb-3 block"
                        style={{ color: primaryColor }}
                    >
                        {config?.equipo_titulo ?? 'Nuestro equipo'}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                        Profesionales de
                        <span className="text-gradient-landing"> confianza</span>
                    </h2>
                    <p className="mt-4 text-slate-300 font-medium max-w-lg mx-auto text-base">
                        {config?.equipo_subtitulo || 'Un equipo multidisciplinario con más de 15 años de experiencia.'}
                    </p>
                </div>

                <div ref={cardsRef} className="flex flex-wrap justify-center gap-6">
                    {professionals.length > 0 ? professionals.map((prof) => {
                        const initials = `${prof.nombre?.[0] || ''}${prof.apellido?.[0] || ''}`
                        return (
                            <div
                                key={prof.id}
                                className="team-card bg-white/10 backdrop-blur-xl border border-white/15 w-full md:w-[calc(33.333%-1rem)] max-w-sm rounded-3xl p-8 text-center shadow-2xl hover:bg-white/15 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div
                                    className="mx-auto mb-5 h-20 w-20 relative overflow-hidden rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-4 ring-white/20"
                                    style={{ backgroundColor: prof.color_agenda || primaryColor }}
                                >
                                    {prof.avatar_url ? (
                                        <img src={prof.avatar_url} alt={`Dr. ${prof.nombre}`} className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <h3 className="text-xl font-extrabold text-white tracking-tight mb-2">
                                    Dr/a. {prof.nombre} {prof.apellido}
                                </h3>
                                <div className="mt-3">
                                    <span
                                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border shadow-xs"
                                        style={{ 
                                            backgroundColor: `${primaryColor}25`, 
                                            borderColor: `${primaryColor}40`,
                                            color: '#5eead4' 
                                        }}
                                    >
                                        {prof.especialidad || 'Odontología General'}
                                    </span>
                                </div>
                                {prof.matricula && (
                                    <p className="text-xs text-slate-400 mt-4 font-semibold tracking-wider uppercase">{prof.matricula}</p>
                                )}
                            </div>
                        )
                    }) : (
                        <p className="text-slate-400 w-full col-span-full text-center py-10">Agregue profesionales desde el panel administrativo.</p>
                    )}
                </div>
            </div>
        </section>
    )
}

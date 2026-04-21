'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PROFESSIONALS } from '@/lib/landing-constants'
import type { LandingConfig } from '@/lib/types/landing'

gsap.registerPlugin(ScrollTrigger)

export function TeamSection({ config, professionals = [] }: { config?: Pick<LandingConfig, 'equipo_titulo'>, professionals?: any[] }) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current || !cardsRef.current || !titleRef.current) return

        const ctx = gsap.context(() => {
            // Title parallax
            gsap.fromTo(
                titleRef.current,
                { opacity: 0, y: 100 },
                {
                    opacity: 1,
                    y: 0,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        end: 'top 30%',
                        scrub: 1,
                    },
                }
            )

            // Cards heavy parallax
            const cards = cardsRef.current!.querySelectorAll('.team-card')
            cards.forEach((card, i) => {
                gsap.fromTo(
                    card,
                    { opacity: 0, y: 150 + i * 30, scale: 0.92 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: `top ${70 - i * 10}%`,
                            end: `top ${20 - i * 5}%`,
                            scrub: 1.5,
                        },
                    }
                )
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

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
                        style={{ color: config?.equipo_titulo ? 'var(--landing-primary, #0d9488)' : '#0d9488' }}
                    >
                        {config?.equipo_titulo ?? 'Nuestro equipo'}
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                        Profesionales de
                        <span className="text-gradient-landing"> confianza</span>
                    </h2>
                    <p className="mt-4 text-white/40 max-w-lg mx-auto text-base">
                        Un equipo multidisciplinario con más de 15 años de experiencia.
                    </p>
                </div>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {professionals.length > 0 ? professionals.map((prof) => {
                        const initials = `${prof.nombre?.[0] || ''}${prof.apellido?.[0] || ''}`
                        return (
                            <div
                                key={prof.id}
                                className="team-card glass rounded-3xl p-8 text-center hover:bg-white/10 transition-all duration-500"
                            >
                                <div
                                    className="mx-auto mb-5 h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                                    style={{ backgroundColor: prof.color_agenda || 'var(--landing-primary, #0d9488)' }}
                                >
                                    {initials}
                                </div>
                                <h3 className="text-lg font-bold text-white drop-shadow-sm">
                                    Dr/a. {prof.nombre} {prof.apellido}
                                </h3>
                                <p
                                    className="text-sm mt-1 drop-shadow-sm font-medium"
                                    style={{ color: 'var(--landing-primary, #0d9488)' }}
                                >{prof.especialidad || 'Odontología General'}</p>
                                {prof.matricula && (
                                    <p className="text-xs text-white/40 mt-3 tracking-wide">{prof.matricula}</p>
                                )}
                            </div>
                        )
                    }) : (
                        <p className="text-white/50 w-full col-span-full text-center py-10">Agregue profesionales desde el panel administrativo.</p>
                    )}
                </div>
            </div>
        </section>
    )
}

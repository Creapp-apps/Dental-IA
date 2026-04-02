'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BookingForm } from '@/components/landing-v2/booking/BookingForm'
import type { LandingConfig } from '@/lib/types/landing'

gsap.registerPlugin(ScrollTrigger)

export function BookingSection({ config }: { config?: Pick<LandingConfig, 'booking_titulo' | 'booking_subtitulo' | 'color_primary'> }) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sectionRef.current || !contentRef.current || !titleRef.current) return

        const ctx = gsap.context(() => {
            gsap.fromTo(
                titleRef.current,
                { opacity: 0, y: 60 },
                {
                    opacity: 1,
                    y: 0,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        end: 'top 50%',
                        scrub: 1,
                    },
                }
            )

            gsap.fromTo(
                contentRef.current,
                { opacity: 0, y: 80, scale: 0.96 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 60%',
                        end: 'top 20%',
                        scrub: 1,
                    },
                }
            )
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={sectionRef}
            id="reservar"
            className="relative min-h-screen flex flex-col justify-center z-10 py-24"
        >
            <div className="max-w-3xl mx-auto px-6 sm:px-10 w-full">
                <div ref={titleRef} className="mb-12 text-center" style={{ opacity: 0 }}>
                    <span
                        className="text-xs font-semibold tracking-[0.25em] uppercase mb-3 block"
                        style={{ color: config?.color_primary ?? '#0d9488' }}
                    >
                        Reservar turno
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                        {config?.booking_titulo ?? 'Agenda tu visita'}
                    </h2>
                    <p className="mt-4 text-gray-500 max-w-lg mx-auto text-base">
                        {config?.booking_subtitulo ?? 'Seleccioná día, horario y profesional. Te confirmaremos a la brevedad.'}
                    </p>
                </div>

                <div
                    ref={contentRef}
                    className="glass-strong rounded-3xl shadow-2xl shadow-black/5 overflow-hidden"
                    style={{ opacity: 0 }}
                >
                    <BookingForm />
                </div>
            </div>
        </section>
    )
}

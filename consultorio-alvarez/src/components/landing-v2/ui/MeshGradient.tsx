'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface Props {
    scrollProgress: number
}

export function MeshGradient({ scrollProgress }: Props) {
    const orb1Ref = useRef<HTMLDivElement>(null) // teal — top right corner
    const orb2Ref = useRef<HTMLDivElement>(null) // royal blue — bottom left
    const orb3Ref = useRef<HTMLDivElement>(null) // sky blue — centre-top
    const orb4Ref = useRef<HTMLDivElement>(null) // navy glow — bottom right

    useEffect(() => {
        const p = scrollProgress

        if (p < 0.25) {
            gsap.to(orb1Ref.current, { opacity: 0.55, x: 0, y: 0, duration: 0.9, ease: 'power2.out' })
            gsap.to(orb2Ref.current, { opacity: 0.4, x: 0, y: 0, duration: 0.9 })
            gsap.to(orb3Ref.current, { opacity: 0.45, duration: 0.9 })
            gsap.to(orb4Ref.current, { opacity: 0.3, duration: 0.9 })
        } else if (p < 0.55) {
            const t = (p - 0.25) / 0.3
            gsap.to(orb1Ref.current, { opacity: 0.55 + t * 0.2, x: '10%', y: '-15%', duration: 1.2 })
            gsap.to(orb2Ref.current, { opacity: 0.4 + t * 0.2, x: '-8%', y: '8%', duration: 1.2 })
            gsap.to(orb3Ref.current, { opacity: 0.45 + t * 0.15, duration: 1.2 })
            gsap.to(orb4Ref.current, { opacity: 0.3 + t * 0.3, x: '5%', y: '-10%', duration: 1.2 })
        } else if (p < 0.8) {
            gsap.to(orb1Ref.current, { opacity: 0.75, x: '20%', y: '-20%', duration: 1 })
            gsap.to(orb2Ref.current, { opacity: 0.65, x: '-15%', y: '12%', duration: 1 })
            gsap.to(orb3Ref.current, { opacity: 0.6, duration: 1 })
            gsap.to(orb4Ref.current, { opacity: 0.6, x: '8%', y: '-5%', duration: 1 })
        } else {
            const t = (p - 0.8) / 0.2
            gsap.to(orb1Ref.current, { opacity: 0.75 - t * 0.45, x: 0, y: 0, duration: 1 })
            gsap.to(orb2Ref.current, { opacity: 0.65 - t * 0.4, x: 0, y: 0, duration: 1 })
            gsap.to(orb3Ref.current, { opacity: 0.6 - t * 0.35, duration: 1 })
            gsap.to(orb4Ref.current, { opacity: 0.6 - t * 0.4, x: 0, y: 0, duration: 1 })
        }
    }, [scrollProgress])

    // Ambient float
    useEffect(() => {
        gsap.to(orb1Ref.current, { y: '-=35', x: '+=18', duration: 9, repeat: -1, yoyo: true, ease: 'sine.inOut' })
        gsap.to(orb2Ref.current, { y: '+=28', x: '-=22', duration: 11, repeat: -1, yoyo: true, ease: 'sine.inOut' })
        gsap.to(orb3Ref.current, { y: '-=22', x: '+=12', duration: 13, repeat: -1, yoyo: true, ease: 'sine.inOut' })
        gsap.to(orb4Ref.current, { y: '+=18', x: '+=26', duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    }, [])

    return (
        <div
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
        >
            {/* Orb 1 — large teal, top-right (primary brand color) */}
            <div ref={orb1Ref} style={{
                position: 'absolute', top: '-15%', right: '-8%',
                width: '65vw', height: '65vw', borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 40%, rgba(14,165,233,0.75), rgba(6,182,212,0.4) 40%, transparent 68%)',
                filter: 'blur(90px)', opacity: 0.55, willChange: 'transform, opacity',
            }} />

            {/* Orb 2 — royal blue, bottom-left */}
            <div ref={orb2Ref} style={{
                position: 'absolute', bottom: '5%', left: '-10%',
                width: '55vw', height: '55vw', borderRadius: '50%',
                background: 'radial-gradient(circle at 60% 60%, rgba(37,99,235,0.65), rgba(29,78,216,0.3) 45%, transparent 68%)',
                filter: 'blur(100px)', opacity: 0.4, willChange: 'transform, opacity',
            }} />

            {/* Orb 3 — sky blue, centre */}
            <div ref={orb3Ref} style={{
                position: 'absolute', top: '20%', left: '25%',
                width: '50vw', height: '50vw', borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 50%, rgba(56,189,248,0.5), rgba(14,165,233,0.2) 50%, transparent 70%)',
                filter: 'blur(110px)', opacity: 0.45, willChange: 'transform, opacity',
            }} />

            {/* Orb 4 — deep indigo, bottom-right corner */}
            <div ref={orb4Ref} style={{
                position: 'absolute', bottom: '15%', right: '5%',
                width: '40vw', height: '40vw', borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.55), rgba(79,70,229,0.2) 50%, transparent 70%)',
                filter: 'blur(80px)', opacity: 0.3, willChange: 'transform, opacity',
            }} />
        </div>
    )
}

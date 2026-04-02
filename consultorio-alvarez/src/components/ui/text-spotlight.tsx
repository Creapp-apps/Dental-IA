'use client'

import * as React from 'react'
import { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TextSpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
    text: string
    textClassName?: string
    spotlightColor?: string
    spotlightSize?: number
    spotlightOpacity?: number
    spotlightArea?: number
    animateOnPhone?: boolean
    colorDuration?: number
}

export function TextSpotlight({
    text,
    className,
    textClassName,
    spotlightColor = '255, 255, 255',
    spotlightSize = 450,
    spotlightOpacity = 1,
    spotlightArea,
    animateOnPhone = false,
    colorDuration = 2000,
    ...props
}: TextSpotlightProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: -999, y: -999 })
    const [isHovering, setIsHovering] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [mobileRevealed, setMobileRevealed] = useState(false)
    const animRef = useRef<number>(null)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Auto-animate on phone  
    useEffect(() => {
        if (!animateOnPhone || !isMobile || !containerRef.current) return

        const el = containerRef.current
        const rect = el.getBoundingClientRect()
        const w = rect.width
        const h = rect.height
        let start: number | null = null

        function animate(ts: number) {
            if (!start) start = ts
            const elapsed = ts - start
            const progress = (elapsed % (colorDuration * 2)) / (colorDuration * 2)
            // Sweep left-to-right then right-to-left
            const x = progress < 0.5
                ? (progress * 2) * w
                : (1 - (progress - 0.5) * 2) * w
            const y = h / 2
            setPosition({ x, y })
            setMobileRevealed(true)
            animRef.current = requestAnimationFrame(animate)
        }

        animRef.current = requestAnimationFrame(animate)
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
    }, [animateOnPhone, isMobile, colorDuration])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isMobile && !animateOnPhone) return
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        })
    }, [isMobile, animateOnPhone])

    const handleTouch = useCallback((e: React.TouchEvent) => {
        const el = containerRef.current
        if (!el || !e.touches[0]) return
        const rect = el.getBoundingClientRect()
        setPosition({
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
        })
        setMobileRevealed(true)
    }, [])

    const showSpotlight = isHovering || (isMobile && mobileRevealed)
    const area = spotlightArea ?? spotlightSize

    return (
        <div
            ref={containerRef}
            className={cn('relative inline-block select-none', className)}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => { setIsHovering(false); setPosition({ x: -999, y: -999 }) }}
            onTouchMove={handleTouch}
            onTouchStart={handleTouch}
            {...props}
        >
            {/* Base text (dimmed) */}
            <span
                className={cn(textClassName, 'block transition-opacity duration-300')}
                style={{ color: `rgba(${spotlightColor}, 0.15)` }}
            >
                {text}
            </span>

            {/* Spotlight text (clipped to radial gradient) */}
            <span
                aria-hidden
                className={cn(textClassName, 'block absolute inset-0 transition-opacity duration-300')}
                style={{
                    color: `rgba(${spotlightColor}, ${spotlightOpacity})`,
                    opacity: showSpotlight ? 1 : 0,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    backgroundImage: `radial-gradient(${area}px ${area}px at ${position.x}px ${position.y}px, rgba(${spotlightColor}, ${spotlightOpacity}) 0%, rgba(${spotlightColor}, 0.5) 40%, transparent 70%)`,
                    backgroundSize: `${spotlightSize * 2}px ${spotlightSize * 2}px`,
                    backgroundPosition: `${position.x - spotlightSize}px ${position.y - spotlightSize}px`,
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {text}
            </span>
        </div>
    )
}

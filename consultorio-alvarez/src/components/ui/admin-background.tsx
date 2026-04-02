'use client'

import Iridescence from '@/components/Iridescence'
import { useMemo } from 'react'

// Convertir color HEX de base de datos a vector [R, G, B] flotante que pide el shader
function hexToRGBArray(hex: string) {
    hex = hex.replace('#', '')
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('')
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    return [r, g, b]
}

export function AdminBackground({ colorHex = '#2563eb' }: { colorHex?: string }) {
    const colorArray = useMemo(() => hexToRGBArray(colorHex), [colorHex])

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-20">
            <Iridescence
                color={colorArray}
                speed={0.4}          // Slow, soothing motion
                amplitude={0.03}     // Gentle ripples
                mouseReact={true}
            />
            {/* Un pequeño viñeteo radial para oscurecer y enmarcar la app */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.6)_100%)]" />
        </div>
    )
}

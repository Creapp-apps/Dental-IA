'use client'

import { Stethoscope, Leaf, Heart, Sparkles, Activity, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const LOGO_ICONS: Record<string, any> = {
    Stethoscope, Leaf, Heart, Sparkles, Activity, Plus
}

export function TenantLogo({
    config,
    fallbackName = "Consultorio",
    className,
    colorPrimary = "#2563eb",
    forceWhite = false
}: {
    config?: any,
    fallbackName?: string,
    className?: string,
    colorPrimary?: string,
    forceWhite?: boolean
}) {
    const type = config?.type || 'text'

    // Si es imagen
    if (type === 'image' && config?.image_url) {
        return (
            <img
                src={config.image_url}
                alt="Logo"
                className={cn("h-8 object-contain", className)}
            />
        )
    }

    // Modalidad Texto (Logo Builder)
    const text = config?.text || fallbackName
    const font = config?.font || 'font-sans'
    const iconName = config?.icon || 'Stethoscope'
    const style = config?.color_style || 'gradient' // 'gradient', 'solid', 'monochrome'

    const Icon = LOGO_ICONS[iconName]

    // Si estamos en un modo oscuro estricto (ej: Footer), forzamos monocromático blanco
    const effectiveStyle = forceWhite ? 'monochrome' : style

    // Determinar estilo del texto
    const textStyle: React.CSSProperties = {}
    if (effectiveStyle === 'gradient') {
        textStyle.backgroundImage = `linear-gradient(135deg, ${colorPrimary} 0%, #2dd4bf 100%)`
        textStyle.WebkitBackgroundClip = 'text'
        textStyle.WebkitTextFillColor = 'transparent'
    } else if (effectiveStyle === 'solid') {
        textStyle.color = colorPrimary
    } else {
        textStyle.color = forceWhite ? 'white' : 'currentColor'
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {Icon && iconName !== 'none' && (
                <div
                    className={cn(
                        "flex shrink-0 items-center justify-center rounded-lg",
                        (effectiveStyle === 'gradient' || effectiveStyle === 'solid') ? "p-1.5" : "p-0"
                    )}
                    style={{
                        backgroundColor: (effectiveStyle === 'gradient' || effectiveStyle === 'solid') ? colorPrimary : 'transparent',
                        color: (effectiveStyle === 'gradient' || effectiveStyle === 'solid') ? 'white' : (forceWhite ? 'white' : 'currentColor')
                    }}
                >
                    <Icon className={cn(effectiveStyle === 'monochrome' ? "h-6 w-6" : "h-5 w-5")} strokeWidth={2.5} />
                </div>
            )}
            <span
                className={cn(
                    "font-bold tracking-tight text-xl",
                    font
                )}
                style={textStyle}
            >
                {text}
            </span>
        </div>
    )
}

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'
import { hexToHsl } from '@/lib/theme'

const FloatingLines = dynamic(() => import('@/components/FloatingLines'), { ssr: false })

export default function LoginClient({ 
    errorMsg, 
    tenantNombre, 
    colorPrimary = '#2563eb', 
    logoUrl,
    slug 
}: { 
    errorMsg: string | null
    tenantNombre?: string
    colorPrimary?: string
    logoUrl?: string | null
    slug?: string 
}) {
    const [showPassword, setShowPassword] = useState(false)
    const [status, setStatus] = useState<'idle' | 'verificando' | 'ingresando'>('idle')
    const [localError, setLocalError] = useState<string | null>(null)

    const isAlvarez = !slug || slug === 'alvarez'
    const { h, r, g, b } = hexToHsl(colorPrimary)

    const activeError = localError || (errorMsg?.includes('Invalid login credentials')
        ? 'Email o contraseña incorrectos.'
        : errorMsg ?? null)

    // Paleta armónica dinámica para las líneas fluidas de fondo (FloatingLines)
    const linesGradient = [
        `hsl(${h}, 35%, 8%)`,
        `hsl(${h}, 60%, 22%)`,
        colorPrimary,
        `hsl(${h}, 85%, 55%)`,
        `hsl(${h}, 90%, 80%)`,
        '#ffffff',
    ]

    // Diferencia de tono respecto al azul nativo del icono (#2563eb -> hue 221°)
    const hueDelta = (h - 221) % 360

    return (
        <div 
            className="relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-500"
            style={{
                backgroundColor: `hsl(${h}, 30%, 4%)`
            }}
        >
            {/* Animated background — mixBlendMode "normal" avoids GPU re-compositing on CSS repaints */}
            <div className="absolute inset-0 z-0" style={{ willChange: 'transform' }}>
                <FloatingLines
                    linesGradient={linesGradient}
                    enabledWaves={['top', 'middle', 'bottom']}
                    lineCount={[8, 8, 6]}
                    lineDistance={[8, 6, 8]}
                    topWavePosition={{ x: 10.0, y: 0.5, rotate: -0.4 }}
                    middleWavePosition={{ x: 5.0, y: 0.0, rotate: 0.2 }}
                    bottomWavePosition={{ x: 2.0, y: -0.7, rotate: -1 }}
                    animationSpeed={0.8}
                    interactive={true}
                    bendRadius={4.0}
                    bendStrength={-0.4}
                    parallax={true}
                    parallaxStrength={0.15}
                    mixBlendMode="normal"
                />
            </div>

            {/* Dark brand overlay */}
            <div 
                className="absolute inset-0 z-[1] pointer-events-none" 
                style={{
                    background: `linear-gradient(135deg, hsl(${h}, 30%, 4%, 0.88) 0%, hsl(${h}, 26%, 7%, 0.65) 50%, hsl(${h}, 32%, 11%, 0.78) 100%)`
                }}
            />
            <div 
                className="absolute inset-0 z-[1] pointer-events-none" 
                style={{
                    background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(${r}, ${g}, ${b}, 0.12), transparent)`
                }}
            />

            {/* Form container — isolated stacking context */}
            <div className="relative z-10 w-full max-w-md px-6" style={{ isolation: 'isolate' }}>

                {/* Logo & brand */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                        <div 
                            className="absolute -inset-3 rounded-3xl blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-700" 
                            style={{
                                background: `radial-gradient(circle, ${colorPrimary}66 0%, transparent 70%)`
                            }}
                        />
                        <img
                            src={logoUrl || "/LOGO-DENTAL.png"}
                            alt={tenantNombre || "Dental-IA"}
                            className="relative h-16 w-auto object-contain transition-all duration-300"
                            style={{
                                filter: logoUrl 
                                    ? `drop-shadow(0 0 16px ${colorPrimary}40)` 
                                    : `hue-rotate(${hueDelta}deg) drop-shadow(0 0 20px ${colorPrimary}66)`
                            }}
                        />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            {isAlvarez ? (
                                <>
                                    Dental
                                    <span 
                                        className="bg-clip-text text-transparent"
                                        style={{
                                            backgroundImage: `linear-gradient(to right, ${colorPrimary}, hsl(${h}, 90%, 80%))`
                                        }}
                                    >
                                        -IA
                                    </span>
                                </>
                            ) : (
                                tenantNombre || 'Consultorio Odontológico'
                            )}
                        </h1>
                        <p 
                            className="text-sm mt-1.5 font-medium tracking-wide"
                            style={{ color: `hsl(${h}, 40%, 82%, 0.75)` }}
                        >
                            {isAlvarez ? 'Plataforma de gestión odontológica' : 'Panel de Gestión Odontológica'}
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="relative">
                    <div 
                        className="absolute -inset-px rounded-2xl" 
                        style={{
                            background: `linear-gradient(135deg, ${colorPrimary}40 0%, transparent 50%, ${colorPrimary}20 100%)`
                        }}
                    />
                    <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 p-8">

                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
                            <p 
                                className="text-sm mt-0.5"
                                style={{ color: `hsl(${h}, 30%, 80%, 0.6)` }}
                            >
                                {isAlvarez ? 'Ingresá con tus credenciales de acceso' : `Ingresá al panel de ${tenantNombre || 'tu consultorio'}`}
                            </p>
                        </div>

                        {activeError && (
                            <div className="flex items-center gap-2.5 mb-5 rounded-xl bg-red-500/10 text-red-300 px-4 py-3 text-sm border border-red-500/20 animate-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{activeError}</span>
                            </div>
                        )}

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                if (status !== 'idle') return
                                setStatus('verificando')
                                setLocalError(null)
                                const formData = new FormData(e.currentTarget)
                                try {
                                    const result = await loginAction(formData)
                                    if (result?.error) {
                                        setLocalError(
                                            result.error.includes('Invalid login credentials')
                                                ? 'Email o contraseña incorrectos.'
                                                : result.error
                                        )
                                        setStatus('idle')
                                        return
                                    }

                                    if (result?.success && result?.redirectTo) {
                                        setStatus('ingresando')
                                        window.location.assign(result.redirectTo)
                                        return
                                    }

                                    setStatus('idle')
                                } catch (err) {
                                    console.error(err)
                                    setLocalError('Error de conexión con el servidor. Intente nuevamente.')
                                    setStatus('idle')
                                }
                            }}
                            className="space-y-4"
                        >
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="email"
                                    className="block text-xs font-semibold uppercase tracking-widest transition-colors duration-200"
                                    style={{ color: `hsl(${h}, 35%, 75%, 0.6)` }}
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    disabled={status !== 'idle'}
                                    placeholder="admin@consultorio.com"
                                    autoComplete="email"
                                    required
                                    className="
                                        w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20
                                        bg-white/[0.06] border border-white/10
                                        transition-[border-color,background-color,box-shadow] duration-200 outline-none
                                        hover:border-white/20
                                        disabled:opacity-60 disabled:cursor-not-allowed
                                    "
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = `${colorPrimary}aa`
                                        e.currentTarget.style.boxShadow = `0 0 0 2px ${colorPrimary}33`
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)'
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = ''
                                        e.currentTarget.style.boxShadow = ''
                                        e.currentTarget.style.backgroundColor = ''
                                    }}
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-semibold uppercase tracking-widest transition-colors duration-200"
                                    style={{ color: `hsl(${h}, 35%, 75%, 0.6)` }}
                                >
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        disabled={status !== 'idle'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        required
                                        className="
                                            w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-white/20
                                            bg-white/[0.06] border border-white/10
                                            transition-[border-color,background-color,box-shadow] duration-200 outline-none
                                            hover:border-white/20
                                            disabled:opacity-60 disabled:cursor-not-allowed
                                        "
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = `${colorPrimary}aa`
                                            e.currentTarget.style.boxShadow = `0 0 0 2px ${colorPrimary}33`
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)'
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = ''
                                            e.currentTarget.style.boxShadow = ''
                                            e.currentTarget.style.backgroundColor = ''
                                        }}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        disabled={status !== 'idle'}
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 disabled:opacity-40"
                                        style={{ color: `hsl(${h}, 40%, 80%, 0.5)` }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = colorPrimary }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = `hsl(${h}, 40%, 80%, 0.5)` }}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={status !== 'idle'}
                                    className="group relative w-full py-3.5 px-6 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-85 disabled:cursor-wait disabled:hover:scale-100"
                                    style={{
                                        boxShadow: `0 10px 25px -5px ${colorPrimary}40`
                                    }}
                                >
                                    <div 
                                        className="absolute inset-0 transition-all duration-300 group-hover:brightness-110" 
                                        style={{
                                            background: `linear-gradient(135deg, ${colorPrimary} 0%, ${colorPrimary}dd 100%)`
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative flex items-center justify-center gap-2.5">
                                        {status === 'verificando' && (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                <span>Verificando credenciales...</span>
                                            </>
                                        )}
                                        {status === 'ingresando' && (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                <span>Ingresando al panel...</span>
                                            </>
                                        )}
                                        {status === 'idle' && (
                                            <>
                                                <span>Ingresar al sistema</span>
                                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <p 
                    className="text-center text-xs mt-5 tracking-wide"
                    style={{ color: `hsl(${h}, 30%, 80%, 0.35)` }}
                >
                    🔒 Acceso restringido — solo personal autorizado
                </p>
            </div>

            {/* Decorative orbs in brand color */}
            <div 
                className="pointer-events-none absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl z-[1]" 
                style={{ backgroundColor: colorPrimary, opacity: 0.12 }}
            />
            <div 
                className="pointer-events-none absolute bottom-1/4 -right-20 w-80 h-80 rounded-full blur-3xl z-[1]" 
                style={{ backgroundColor: colorPrimary, opacity: 0.10 }}
            />
        </div>
    )
}

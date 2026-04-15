'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Stethoscope, AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'

const FloatingLines = dynamic(() => import('@/components/FloatingLines'), { ssr: false })

export default function LoginClient({ errorMsg }: { errorMsg: string | null }) {
    const [showPassword, setShowPassword] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [isPending, startTransition] = useTransition()

    const friendlyError = errorMsg?.includes('Invalid login credentials')
        ? 'Email o contraseña incorrectos.'
        : errorMsg ?? null

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050d1a]">

            {/* Animated background */}
            <div className="absolute inset-0 z-0">
                <FloatingLines
                    linesGradient={['#0a1628', '#1e3a8a', '#2563eb', '#3b82f6', '#93c5fd', '#ffffff']}
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
                    mixBlendMode="screen"
                />
            </div>

            {/* Deep blue gradient overlay */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#050d1a]/90 via-[#0a1628]/70 to-[#0f2350]/80" />

            {/* Radial glow center */}
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(37,99,235,0.12),transparent)]" />

            {/* Form container */}
            <div className="relative z-10 w-full max-w-md px-6">

                {/* Logo & brand */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-blue-500/40 to-blue-700/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-900/50 border border-blue-400/20">
                            <Stethoscope className="h-8 w-8 text-white" strokeWidth={1.6} />
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            Dental
                            <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">-IA</span>
                        </h1>
                        <p className="text-sm text-blue-300/70 mt-1.5 font-medium tracking-wide">
                            Plataforma de gestión odontológica
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="relative">
                    {/* Card border glow */}
                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/30 via-transparent to-blue-700/20" />
                    <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 p-8">

                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
                            <p className="text-sm text-blue-200/50 mt-0.5">Ingresá con tus credenciales de acceso</p>
                        </div>

                        {/* Error */}
                        {friendlyError && (
                            <div className="flex items-center gap-2.5 mb-5 rounded-xl bg-red-500/10 text-red-300 px-4 py-3 text-sm border border-red-500/20 animate-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{friendlyError}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form action={loginAction} className="space-y-4">

                            {/* Email field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-200 ${emailFocused ? 'text-blue-400' : 'text-blue-200/40'}`}>
                                    Email
                                </label>
                                <div className={`relative transition-all duration-300 ${emailFocused ? 'drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]' : ''}`}>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="admin@consultorio.com"
                                        autoComplete="email"
                                        required
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        className={`
                                            w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-blue-200/25
                                            bg-white/[0.06] border transition-all duration-300 outline-none
                                            ${emailFocused
                                                ? 'border-blue-500/60 bg-white/[0.09] ring-2 ring-blue-500/20'
                                                : 'border-white/10 hover:border-white/20'
                                            }
                                        `}
                                    />
                                    {/* Active indicator line */}
                                    <div className={`absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent transition-all duration-500 ${emailFocused ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
                                </div>
                            </div>

                            {/* Password field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-200 ${passwordFocused ? 'text-blue-400' : 'text-blue-200/40'}`}>
                                    Contraseña
                                </label>
                                <div className={`relative transition-all duration-300 ${passwordFocused ? 'drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]' : ''}`}>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        required
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        className={`
                                            w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-blue-200/25
                                            bg-white/[0.06] border transition-all duration-300 outline-none
                                            ${passwordFocused
                                                ? 'border-blue-500/60 bg-white/[0.09] ring-2 ring-blue-500/20'
                                                : 'border-white/10 hover:border-white/20'
                                            }
                                        `}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/40 hover:text-blue-300 transition-colors duration-200"
                                    >
                                        {showPassword
                                            ? <EyeOff className="h-4 w-4" />
                                            : <Eye className="h-4 w-4" />
                                        }
                                    </button>
                                    <div className={`absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent transition-all duration-500 ${passwordFocused ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
                                </div>
                            </div>

                            {/* Submit button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="group relative w-full py-3 px-6 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {/* Button gradient background */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-400" />
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    {/* Shadow on hover */}
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_30px_rgba(59,130,246,0.5)]" />

                                    <span className="relative flex items-center justify-center gap-2">
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Verificando...
                                            </>
                                        ) : (
                                            <>
                                                Ingresar al sistema
                                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-blue-300/30 mt-5 tracking-wide">
                    🔒 Acceso restringido — solo personal autorizado
                </p>
            </div>

            {/* Decorative orbs */}
            <div className="pointer-events-none absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-blue-600/10 blur-3xl z-[1]" />
            <div className="pointer-events-none absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-blue-400/8 blur-3xl z-[1]" />
        </div>
    )
}

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'

const FloatingLines = dynamic(() => import('@/components/FloatingLines'), { ssr: false })

export default function LoginClient({ errorMsg }: { errorMsg: string | null }) {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const friendlyError = errorMsg?.includes('Invalid login credentials')
        ? 'Email o contraseña incorrectos.'
        : errorMsg ?? null

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050d1a]">

            {/* Animated background — mixBlendMode "normal" avoids GPU re-compositing on CSS repaints */}
            <div className="absolute inset-0 z-0" style={{ willChange: 'transform' }}>
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
                    mixBlendMode="normal"
                />
            </div>

            {/* Dark overlay */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#050d1a]/85 via-[#0a1628]/65 to-[#0f2350]/75 pointer-events-none" />
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(37,99,235,0.10),transparent)] pointer-events-none" />

            {/* Form container — isolated stacking context */}
            <div className="relative z-10 w-full max-w-md px-6" style={{ isolation: 'isolate' }}>

                {/* Logo & brand */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-500/30 to-blue-700/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <img
                            src="/LOGO-DENTAL.png"
                            alt="Dental-IA"
                            className="relative h-16 w-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                        />
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
                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/30 via-transparent to-blue-700/20" />
                    <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 p-8">

                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
                            <p className="text-sm text-blue-200/50 mt-0.5">Ingresá con tus credenciales de acceso</p>
                        </div>

                        {friendlyError && (
                            <div className="flex items-center gap-2.5 mb-5 rounded-xl bg-red-500/10 text-red-300 px-4 py-3 text-sm border border-red-500/20 animate-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{friendlyError}</span>
                            </div>
                        )}

                        <form
                            action={async (formData) => {
                                setLoading(true)
                                await loginAction(formData)
                                setLoading(false)
                            }}
                            className="space-y-4"
                        >
                            {/* Email — focus handled entirely by CSS, no React state */}
                            <div className="group/email space-y-1.5">
                                <label
                                    htmlFor="email"
                                    className="block text-xs font-semibold uppercase tracking-widest text-blue-200/40 transition-colors duration-200 group-focus-within/email:text-blue-400"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@consultorio.com"
                                    autoComplete="email"
                                    required
                                    className="
                                        w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-blue-200/25
                                        bg-white/[0.06] border border-white/10
                                        transition-[border-color,background-color,box-shadow] duration-200 outline-none
                                        hover:border-white/20
                                        focus:border-blue-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0
                                    "
                                />
                            </div>

                            {/* Password — focus handled entirely by CSS, no React state */}
                            <div className="group/password space-y-1.5">
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-semibold uppercase tracking-widest text-blue-200/40 transition-colors duration-200 group-focus-within/password:text-blue-400"
                                >
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        required
                                        className="
                                            w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-blue-200/25
                                            bg-white/[0.06] border border-white/10
                                            transition-[border-color,background-color,box-shadow] duration-200 outline-none
                                            hover:border-white/20
                                            focus:border-blue-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0
                                        "
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/40 hover:text-blue-300 transition-colors duration-200"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full py-3 px-6 rounded-xl text-sm font-semibold text-white overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-400" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative flex items-center justify-center gap-2">
                                        {loading ? (
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

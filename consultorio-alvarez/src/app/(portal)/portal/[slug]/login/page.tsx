'use client'

import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { sendMagicLink } from '@/lib/actions/portal-auth'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'

export default function PortalLoginPage({ params }: { params: Promise<{ slug: string }> }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [nombre, setNombre] = useState('')
    const [slug, setSlug] = useState('')

    // Resolve params on first render
    if (!slug) {
        params.then(p => setSlug(p.slug))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await sendMagicLink(email, slug)

        if (result.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        setNombre(result.nombre || '')
        setSent(true)
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10">
                        <Mail className="h-7 w-7 text-primary" strokeWidth={1.8} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Portal del Paciente
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Accedé a tu información clínica de forma segura
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
                    {sent ? (
                        /* ── Éxito: link enviado ── */
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">¡Link enviado!</h2>
                                <p className="text-sm text-slate-300 mt-2">
                                    {nombre && <>Hola <strong className="text-white">{nombre}</strong>. </>}
                                    Revisá tu casilla de email y hacé clic en el enlace para acceder.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500">
                                El enlace es válido por 15 minutos. Revisá tu carpeta de spam si no lo encontrás.
                            </p>
                        </div>
                    ) : (
                        /* ── Formulario de login ── */
                        <>
                            <div className="mb-4">
                                <h2 className="text-base font-semibold text-white">Ingresar</h2>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    Te enviaremos un enlace seguro a tu email
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 mb-4 rounded-lg bg-red-500/10 text-red-300 px-3 py-2.5 text-sm border border-red-500/20">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-300">
                                        Email registrado
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        required
                                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                                    />
                                </div>
                                <GlassButton
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full"
                                    variant="glass"
                                >
                                    {loading ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                                    ) : (
                                        <><ArrowRight className="h-4 w-4 mr-2" /> Enviar enlace de acceso</>
                                    )}
                                </GlassButton>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-slate-600">
                    🔒 Acceso seguro sin contraseña — solo para pacientes registrados
                </p>
            </div>
        </div>
    )
}

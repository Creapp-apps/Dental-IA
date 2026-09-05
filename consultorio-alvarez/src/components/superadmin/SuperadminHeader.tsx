'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowUpRight, LogOut, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface SuperadminHeaderProps {
    userEmail: string
    tenants: Array<{ id: string; slug: string; nombre: string }>
}

export function SuperadminHeader({ userEmail, tenants }: SuperadminHeaderProps) {
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = () => {
        setIsRefreshing(true)
        router.refresh()
        setTimeout(() => setIsRefreshing(false), 600)
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo & Marca SaaS */}
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8.5 2 7 5 7 7c0 4 3 6 3 13 0 1 .5 2 2 2s2-1 2-2c0-7 3-9 3-13 0-2-1.5-5-5-5z" />
                            <path d="M9 7h6" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                Dental<span className="text-cyan-400">-IA</span>
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1 shadow-sm">
                                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                                Superadmin SaaS
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Centro de control de suscripciones y tenants de la plataforma
                        </p>
                    </div>
                </div>

                {/* Acciones y Switcher rápido */}
                <div className="flex items-center gap-3">
                    {/* Botón Refrescar */}
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>

                    {/* Switcher a backoffice de consultorios */}
                    <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-2 py-1">
                        <span className="text-xs text-slate-400 pl-1">Ir a consultorio:</span>
                        {tenants.map(t => (
                            <a
                                key={t.id}
                                href={`/admin?slug=${t.slug}`}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                            >
                                {t.slug.toUpperCase()}
                                <ArrowUpRight className="w-3 h-3 opacity-60" />
                            </a>
                        ))}
                    </div>

                    {/* Perfil & Logout */}
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-slate-200">{userEmail}</p>
                            <p className="text-[10px] text-cyan-400">Superadministrador</p>
                        </div>
                        <Link
                            href="/api/auth/logout?redirectTo=/login"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    )
}

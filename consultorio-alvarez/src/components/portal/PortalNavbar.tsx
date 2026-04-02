'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, User, LogOut } from 'lucide-react'
import { TenantLogo } from '@/components/ui/tenant-logo'
import { cn } from '@/lib/utils'
import type { LogoConfig } from '@/lib/types/landing'

interface PortalNavbarProps {
    slug: string
    patientName: string
    themeColor: string
    logoConfig?: LogoConfig | null
}

const NAV_ITEMS = [
    { label: 'Inicio', icon: Home, path: '' },
    { label: 'Mis Turnos', icon: Calendar, path: '/turnos' },
    { label: 'Mi Perfil', icon: User, path: '/perfil' },
]

export function PortalNavbar({ slug, patientName, themeColor, logoConfig }: PortalNavbarProps) {
    const pathname = usePathname()
    const basePath = `/portal/${slug}`

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
            <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <TenantLogo
                        config={logoConfig || undefined}
                        colorPrimary={themeColor}
                        fallbackName="Portal"
                        className="scale-90"
                    />
                </div>

                {/* Navegación central */}
                <div className="hidden sm:flex items-center gap-1">
                    {NAV_ITEMS.map(item => {
                        const href = `${basePath}${item.path}`
                        const isActive = item.path === ''
                            ? pathname === basePath
                            : pathname.startsWith(href)

                        return (
                            <Link
                                key={item.path}
                                href={href}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </div>

                {/* Usuario + Logout */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 hidden md:block">
                        Hola, <span className="text-white font-medium">{patientName}</span>
                    </span>
                    <form action={`/api/portal-logout?slug=${slug}`} method="POST">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Mobile bottom nav */}
            <div className="sm:hidden flex border-t border-white/5">
                {NAV_ITEMS.map(item => {
                    const href = `${basePath}${item.path}`
                    const isActive = item.path === ''
                        ? pathname === basePath
                        : pathname.startsWith(href)

                    return (
                        <Link
                            key={item.path}
                            href={href}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

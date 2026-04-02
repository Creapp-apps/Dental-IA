'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    Users,
    CreditCard,
    Settings,
    LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { logoutAction } from '@/lib/actions/auth'
import { TenantLogo } from '@/components/ui/tenant-logo'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Agenda', href: '/agenda', icon: Calendar },
    { label: 'Pacientes', href: '/pacientes', icon: Users },
    { label: 'Cobros', href: '/cobros', icon: CreditCard },
    { label: 'Configuración', href: '/configuracion', icon: Settings },
]

interface SidebarProps {
    userEmail?: string
    themeColor?: string
    logoConfig?: any
}

export function Sidebar({ userEmail, themeColor, logoConfig }: SidebarProps) {
    const pathname = usePathname()
    const [pendingPath, setPendingPath] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        setPendingPath(null)
    }, [pathname])

    function handleLogout() {
        startTransition(() => {
            logoutAction()
        })
    }

    return (
        <aside className="flex h-screen w-64 flex-col bg-sidebar/30 backdrop-blur-2xl border-r border-sidebar-border/50">
            {/* Logo */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
                <TenantLogo
                    config={logoConfig}
                    colorPrimary={themeColor}
                    fallbackName="Consultorio"
                />
                <ThemeToggle />
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {navItems.map((item) => {
                    const isActuallyActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const isOptimisticActive = pendingPath === item.href
                    const isActive = isActuallyActive || isOptimisticActive
                    const isWaiting = isOptimisticActive && !isActuallyActive

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                                if (!isActuallyActive) setPendingPath(item.href)
                            }}
                            className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                                isActive
                                    ? 'text-white shadow-sm'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                isWaiting && 'opacity-80 animate-pulse'
                            )}
                            style={isActive ? { backgroundColor: themeColor || 'var(--sidebar-primary)' } : undefined}
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
                {/* Email del usuario */}
                {userEmail && (
                    <p className="px-3 py-1 text-xs text-sidebar-accent-foreground truncate" title={userEmail}>
                        {userEmail}
                    </p>
                )}
                <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
            </div>
        </aside>
    )
}

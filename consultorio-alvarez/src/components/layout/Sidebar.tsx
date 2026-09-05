'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    Sun,
    Moon,
    Plus,
    Clock,
    CalendarCheck,
    ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/actions/auth'
import { TenantLogo } from '@/components/ui/tenant-logo'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useTheme } from 'next-themes'

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Agenda', href: '/agenda', icon: Calendar },
    { label: 'Pacientes', href: '/pacientes', icon: Users },
    { label: 'Mis Pagos', href: '/mis-pagos', icon: CreditCard },
    { label: 'Configuración', href: '/configuracion', icon: Settings },
]

export interface TodaySummary {
    turnosHoy: number
    turnosConfirmados: number
    turnosPendientes: number
    proximoTurno?: {
        hora: string
        pacienteNombre: string
    } | null
}

interface SidebarProps {
    userEmail?: string
    userRole?: string
    themeColor?: string
    logoConfig?: any
    showBillingAlert?: boolean
    todaySummary?: TodaySummary
}

function RealtimeClockWidget() {
    const [time, setTime] = useState<Date | null>(null)

    useEffect(() => {
        setTime(new Date())
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (!time) {
        return (
            <div className="p-3.5 rounded-xl border border-sidebar-border bg-sidebar-accent/20 animate-pulse h-24 my-2" />
        )
    }

    // Formato 24 Horas estricto
    const hours = String(time.getHours()).padStart(2, '0')
    const minutes = String(time.getMinutes()).padStart(2, '0')
    const seconds = String(time.getSeconds()).padStart(2, '0')

    // Fecha en español formateada limpiamente
    const rawDay = time.toLocaleDateString('es-AR', { weekday: 'long' })
    const dayName = rawDay.charAt(0).toUpperCase() + rawDay.slice(1)
    const dayNumber = time.getDate()
    const rawMonth = time.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
    const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
    const year = time.getFullYear()

    const formattedDate = `${dayName}, ${dayNumber} de ${monthName} ${year}`

    return (
        <div className="p-3.5 rounded-xl border border-sidebar-border bg-sidebar-accent/25 backdrop-blur-sm shadow-sm space-y-2 my-2">
            {/* Encabezado: Etiqueta e Indicador 24H */}
            <div className="flex items-center justify-between text-[10px] font-semibold text-sidebar-foreground/60 tracking-wider uppercase border-b border-sidebar-border/30 pb-1.5">
                <span className="flex items-center gap-1.5 text-sidebar-foreground/80">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Hora Local</span>
                </span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    24H
                </span>
            </div>

            {/* Cuerpo: Hora 24h & Fecha en filas ordenadas */}
            <div className="space-y-1">
                <div className="flex items-baseline gap-1.5 font-mono tracking-tight font-extrabold text-sidebar-foreground">
                    <span className="text-3xl leading-none">{hours}:{minutes}</span>
                    <span className="text-xs text-sidebar-foreground/50 font-semibold font-mono animate-pulse">:{seconds}</span>
                </div>

                <p className="text-xs font-medium text-sidebar-foreground/80 truncate">
                    {formattedDate}
                </p>
            </div>
        </div>
    )
}

function TodaySummaryWidget({ summary }: { summary?: TodaySummary }) {
    const total = summary?.turnosHoy ?? 0
    const confirmados = summary?.turnosConfirmados ?? 0
    const pendientes = summary?.turnosPendientes ?? 0
    const proximo = summary?.proximoTurno

    return (
        <Link
            href="/agenda"
            className="block p-3.5 rounded-xl border border-sidebar-border bg-sidebar-accent/25 hover:bg-sidebar-accent/40 backdrop-blur-sm shadow-xs space-y-2.5 my-2 transition-all group cursor-pointer"
        >
            {/* Header con enlace */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-sidebar-foreground">Agenda de Hoy</span>
                </div>
                <span className="text-[10px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver agenda <ArrowUpRight className="h-3 w-3" />
                </span>
            </div>

            {/* Métricas: Total, Confirmados, Pendientes */}
            <div className="grid grid-cols-3 gap-1.5">
                <div className="p-1.5 rounded-lg bg-background/60 border border-sidebar-border/40 text-center">
                    <p className="text-[9px] uppercase font-bold text-sidebar-foreground/60">Total</p>
                    <p className="text-sm font-extrabold text-sidebar-foreground leading-tight mt-0.5">{total}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Listos</p>
                    <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">{confirmados}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400">Pend.</p>
                    <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">{pendientes}</p>
                </div>
            </div>

            {/* Próximo turno o estado */}
            {proximo ? (
                <div className="pt-1.5 flex items-center justify-between border-t border-sidebar-border/40 text-[10px] text-sidebar-foreground/80">
                    <span className="text-sidebar-foreground/60 font-medium">Próximo:</span>
                    <span className="font-semibold text-sidebar-foreground truncate max-w-[130px]" title={`${proximo.hora} - ${proximo.pacienteNombre}`}>
                        {proximo.hora} • {proximo.pacienteNombre}
                    </span>
                </div>
            ) : total > 0 ? (
                <div className="pt-1.5 flex items-center justify-between border-t border-sidebar-border/40 text-[10px] text-sidebar-foreground/60">
                    <span>Estado del día</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Completada</span>
                </div>
            ) : (
                <div className="pt-1.5 flex items-center justify-between border-t border-sidebar-border/40 text-[10px] text-sidebar-foreground/60">
                    <span>Sin turnos programados</span>
                </div>
            )}
        </Link>
    )
}

export function Sidebar({ userEmail, userRole, themeColor, logoConfig, showBillingAlert, todaySummary }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [pendingPath, setPendingPath] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(false)

    const isProfesional = userRole === 'profesional'

    useEffect(() => {
        setMounted(true)
        setPendingPath(null)
        setIsOpen(false)
    }, [pathname])

    function handleLogout() {
        startTransition(() => {
            logoutAction()
        })
    }

    function handleNuevoTurnoClick(e: React.MouseEvent) {
        setIsOpen(false)
        if (pathname === '/agenda' || pathname.startsWith('/agenda')) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('open-nuevo-turno-modal'))
        }
    }

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex items-center justify-center px-6 py-5 border-b border-sidebar-border min-h-[5rem] shrink-0">
                <TenantLogo
                    config={logoConfig}
                    colorPrimary={themeColor}
                    fallbackName="Consultorio"
                />
            </div>

            {/* Quick Action Button */}
            <div className="px-3 pt-4 pb-2 shrink-0">
                <Link
                    href="/agenda?nuevo=true"
                    prefetch={true}
                    onClick={handleNuevoTurnoClick}
                    className="flex items-center justify-center gap-2.5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                    style={{ backgroundColor: themeColor || 'var(--sidebar-primary)' }}
                >
                    <Plus className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-90 duration-300" />
                    <span>Nuevo Turno</span>
                </Link>
            </div>

            {/* Nav Menu */}
            <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
                {/* Categoría 1: MENÚ PRINCIPAL */}
                <div className="space-y-1">
                    <p className="text-[10px] font-bold tracking-wider text-sidebar-foreground/50 px-3 py-1 uppercase">
                        Principal
                    </p>
                    {navItems.slice(0, 3).map((item) => {
                        const isActuallyActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const isOptimisticActive = pendingPath === item.href
                        const isActive = isActuallyActive || isOptimisticActive
                        const isWaiting = isOptimisticActive && !isActuallyActive

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={() => {
                                    if (!isActuallyActive) setPendingPath(item.href)
                                }}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                        ? 'text-white shadow-sm font-semibold'
                                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    isWaiting && 'opacity-80 animate-pulse'
                                )}
                                style={isActive ? { backgroundColor: themeColor || 'var(--sidebar-primary)' } : undefined}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="flex-1">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>

                {/* Categoría 2: GESTIÓN & CONFIGURACIÓN (Solo para Admins y Superadmins) */}
                {!isProfesional && (
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold tracking-wider text-sidebar-foreground/50 px-3 py-1 uppercase">
                            Gestión
                        </p>
                        {navItems.slice(3).map((item) => {
                            const isActuallyActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            const isOptimisticActive = pendingPath === item.href
                            const isActive = isActuallyActive || isOptimisticActive
                            const isWaiting = isOptimisticActive && !isActuallyActive

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={true}
                                    onClick={() => {
                                        if (!isActuallyActive) setPendingPath(item.href)
                                    }}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                                        isActive
                                            ? 'text-white shadow-sm font-semibold'
                                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        isWaiting && 'opacity-80 animate-pulse'
                                    )}
                                    style={isActive ? { backgroundColor: themeColor || 'var(--sidebar-primary)' } : undefined}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{item.label}</span>
                                    {item.href === '/mis-pagos' && showBillingAlert && (
                                        <span className="animate-breathing text-xs flex items-center justify-center select-none" title="Abono próximo a vencer">
                                            ⚠️
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}

                {/* Widget de Resumen Operativo de Hoy (Mini Agenda) */}
                <TodaySummaryWidget summary={todaySummary} />

                {/* Widget de Hora & Fecha en Tiempo Real */}
                <RealtimeClockWidget />
            </nav>

            {/* Footer de Usuario */}
            <div className="border-t border-sidebar-border p-3 space-y-2.5 shrink-0 bg-sidebar-accent/10">
                {/* User Info Bar */}
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/40">
                    <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 text-sidebar-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-sidebar-primary/30" style={themeColor ? { color: themeColor, borderColor: `${themeColor}40` } : undefined}>
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-sidebar-foreground truncate" title={userEmail}>
                            {userEmail || 'Usuario'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                                "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                isProfesional
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                    : "bg-primary/10 text-primary border border-primary/20"
                            )}>
                                {isProfesional ? 'Profesional' : userRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                En línea
                            </span>
                        </div>
                    </div>
                    <NotificationBell themeColor={themeColor} />
                </div>

                {/* Quick Actions Row */}
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer border border-sidebar-border/40"
                        title="Cambiar tema"
                    >
                        {!mounted ? (
                            <div className="h-3.5 w-3.5 rounded-full bg-sidebar-foreground/20 animate-pulse shrink-0" />
                        ) : theme === 'dark' ? (
                            <>
                                <Sun className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                <span>Claro</span>
                            </>
                        ) : (
                            <>
                                <Moon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                <span>Oscuro</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        disabled={isPending}
                        className="flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50 border border-sidebar-border/40"
                        title="Cerrar sesión"
                    >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>{isPending ? 'Salir…' : 'Salir'}</span>
                    </button>
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile Top Nav */}
            <div id="mobile-top-nav" className="lg:hidden flex items-center justify-between p-4 border-b border-sidebar-border/50 bg-background/80 backdrop-blur-md w-full shrink-0">
                <div className="flex items-center gap-4">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger className="p-1 -ml-1 rounded-md text-foreground hover:bg-sidebar-accent transition-colors">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle Menu</span>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col pt-0 gap-0 text-sidebar-foreground">
                            <SheetTitle className="sr-only">Menú Principal</SheetTitle>
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                    <div className="scale-90 origin-left">
                        <TenantLogo
                            config={logoConfig}
                            colorPrimary={themeColor}
                            fallbackName="Consultorio"
                        />
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside id="desktop-sidebar" className="hidden lg:flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border shrink-0 text-sidebar-foreground">
                <SidebarContent />
            </aside>
        </>
    )
}

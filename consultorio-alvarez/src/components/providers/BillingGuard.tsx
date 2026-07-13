'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Lock, ArrowRight } from 'lucide-react'

interface BillingGuardProps {
    isBlocked: boolean
    children: React.ReactNode
}

export function BillingGuard({ isBlocked, children }: BillingGuardProps) {
    const pathname = usePathname()
    const router = useRouter()

    const shouldBlock = isBlocked && pathname !== '/mis-pagos'

    if (shouldBlock) {
        return (
            <div className="relative w-full h-full min-h-screen">
                {/* Content with blur and interaction disabled */}
                <div className="w-full h-full min-h-screen blur-md pointer-events-none select-none">
                    {children}
                </div>

                {/* Locked overlay */}
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/50 backdrop-blur-[4px] p-4">
                    <div className="w-full max-w-md p-8 rounded-2xl glass border border-destructive/30 shadow-glass text-center space-y-6 animate-red-banner-pulse">
                        {/* Suspended Icon */}
                        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                            <Lock className="h-8 w-8 animate-[pulse_1.5s_infinite_ease-in-out]" />
                        </div>

                        {/* Text details */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground">Servicio suspendido</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Su acceso a la plataforma ha sido temporalmente restringido por falta de abono mensual. Por favor, regularice su situación.
                            </p>
                        </div>

                        {/* Navigation link */}
                        <button
                            onClick={() => router.push('/mis-pagos')}
                            className="w-full py-3 px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group shadow-md"
                        >
                            <span>Ir a Mis Pagos</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

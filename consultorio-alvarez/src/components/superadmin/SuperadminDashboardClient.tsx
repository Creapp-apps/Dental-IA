'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SaasTenantSummary, SaasMetrics } from '@/lib/actions/superadmin'
import { SaasMetricsCards } from './SaasMetricsCards'
import { TenantsTable } from './TenantsTable'
import { CrearTenantModal } from './CrearTenantModal'
import { Plus, Sparkles, ShieldCheck } from 'lucide-react'

interface SuperadminDashboardClientProps {
    initialTenants: SaasTenantSummary[]
    initialMetrics: SaasMetrics
}

export function SuperadminDashboardClient({
    initialTenants,
    initialMetrics
}: SuperadminDashboardClientProps) {
    const router = useRouter()
    const [isCrearOpen, setIsCrearOpen] = useState(false)

    const handleRefresh = () => {
        router.refresh()
    }

    return (
        <div className="space-y-6">
            {/* Header del Dashboard con botón CTA de Alta */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                        Control General de Plataforma SaaS
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Supervisión de ingresos, vencimientos de suscripción y estado de servicios en tiempo real.
                    </p>
                </div>

                <button
                    onClick={() => setIsCrearOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Nuevo Consultorio
                </button>
            </div>

            {/* Tarjetas de Métricas Globales */}
            <SaasMetricsCards metrics={initialMetrics} />

            {/* Directorio y Tabla de Tenants */}
            <div className="pt-2">
                <TenantsTable
                    tenants={initialTenants}
                    onRefresh={handleRefresh}
                />
            </div>

            {/* Modal de Alta de Tenant */}
            <CrearTenantModal
                isOpen={isCrearOpen}
                onClose={() => setIsCrearOpen(false)}
                onSuccess={() => {
                    setIsCrearOpen(false)
                    handleRefresh()
                }}
            />
        </div>
    )
}

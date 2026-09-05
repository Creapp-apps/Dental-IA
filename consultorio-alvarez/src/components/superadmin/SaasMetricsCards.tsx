'use client'

import { SaasMetrics } from '@/lib/actions/superadmin'
import { DollarSign, Building2, AlertTriangle, ShieldAlert, Users, CalendarCheck, TrendingUp } from 'lucide-react'

interface SaasMetricsCardsProps {
    metrics: SaasMetrics
}

export function SaasMetricsCards({ metrics }: SaasMetricsCardsProps) {
    const formattedMrr = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(metrics.mrr)

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tarjeta 1: MRR */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-md group hover:border-cyan-500/40 transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-cyan-500/10 blur-2xl group-hover:bg-cyan-500/20 transition-all" />
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        MRR Activo
                    </span>
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <p className="text-2xl font-black text-white tracking-tight">
                        {formattedMrr}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <span className="text-cyan-400 font-medium">{metrics.activeCount} consultorios</span> aportando abono
                    </p>
                </div>
            </div>

            {/* Tarjeta 2: Consultorios Activos */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-md group hover:border-emerald-500/40 transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Consultorios
                    </span>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Building2 className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-white tracking-tight">
                            {metrics.activeCount}
                        </p>
                        <span className="text-xs text-slate-400">/ {metrics.totalTenants} totales</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {metrics.trialCount > 0 ? (
                            <span className="text-indigo-400 font-medium">{metrics.trialCount} en período de prueba</span>
                        ) : (
                            'Todos operando en producción'
                        )}
                    </p>
                </div>
            </div>

            {/* Tarjeta 3: Vencimientos Próximos */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-md group hover:border-amber-500/40 transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all" />
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Por Vencer (7 días)
                    </span>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <p className="text-2xl font-black text-white tracking-tight">
                        {metrics.expiringSoonCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {metrics.expiringSoonCount > 0 
                            ? 'Requieren recordatorio de cobro' 
                            : 'Sin vencimientos en los próximos 7 días'}
                    </p>
                </div>
            </div>

            {/* Tarjeta 4: Suspendidos / Cortes */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-md group hover:border-rose-500/40 transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all" />
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Suspendidos
                    </span>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <p className="text-2xl font-black text-white tracking-tight">
                        {metrics.suspendedCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {metrics.suspendedCount > 0 
                            ? 'Con acceso bloqueado por falta de pago' 
                            : 'Ningún servicio bloqueado'}
                    </p>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { SaasTenantSummary, updateTenantStatus, extendTenantDueDate } from '@/lib/actions/superadmin'
import { TenantBillingModal } from './TenantBillingModal'
import { RegistrarPagoModal } from './RegistrarPagoModal'
import { 
    Building2, 
    MoreVertical, 
    Play, 
    Pause, 
    CalendarPlus, 
    Receipt, 
    Settings, 
    ExternalLink, 
    Search,
    ShieldAlert,
    ShieldCheck,
    Clock,
    CheckCircle2,
    Users,
    Calendar,
    ArrowUpRight
} from 'lucide-react'

interface TenantsTableProps {
    tenants: SaasTenantSummary[]
    onRefresh: () => void
}

export function TenantsTable({ tenants, onRefresh }: TenantsTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVO' | 'PRUEBA' | 'SUSPENDIDO' | 'VENCIDO'>('ALL')
    
    // Modales
    const [editingTenant, setEditingTenant] = useState<SaasTenantSummary | null>(null)
    const [payingTenant, setPayingTenant] = useState<SaasTenantSummary | null>(null)

    const [isPending, startTransition] = useTransition()

    // Filtrado
    const filteredTenants = tenants.filter(t => {
        const matchesSearch = 
            t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.email_contacto && t.email_contacto.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus = statusFilter === 'ALL' || t.billing.estado === statusFilter
        return matchesSearch && matchesStatus
    })

    // Acciones directas
    const handleToggleStatus = (tenant: SaasTenantSummary) => {
        const nextStatus = tenant.billing.estado === 'SUSPENDIDO' ? 'ACTIVO' : 'SUSPENDIDO'
        const actionLabel = nextStatus === 'SUSPENDIDO' ? 'suspender' : 'activar'
        
        if (!confirm(`¿Estás seguro de que deseas ${actionLabel} el consultorio "${tenant.nombre}"?`)) {
            return
        }

        startTransition(async () => {
            await updateTenantStatus(tenant.id, nextStatus)
            onRefresh()
        })
    }

    const handleExtend30Days = (tenant: SaasTenantSummary) => {
        startTransition(async () => {
            await extendTenantDueDate(tenant.id, 30)
            onRefresh()
        })
    }

    const getStatusBadge = (estado: SaasTenantSummary['billing']['estado'], dueDateStr: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let daysLeft: number | null = null

        if (dueDateStr) {
            const due = new Date(dueDateStr + 'T00:00:00')
            daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }

        switch (estado) {
            case 'ACTIVO':
                if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Vence en {daysLeft}d
                        </span>
                    )
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Activo
                    </span>
                )
            case 'PRUEBA':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Clock className="w-3 h-3" />
                        Prueba {daysLeft !== null ? `(${daysLeft}d)` : ''}
                    </span>
                )
            case 'SUSPENDIDO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <ShieldAlert className="w-3 h-3" />
                        Suspendido
                    </span>
                )
            case 'VENCIDO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Clock className="w-3 h-3" />
                        Vencido
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {estado}
                    </span>
                )
        }
    }

    return (
        <div className="space-y-4">
            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por consultorio, slug o email..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {(['ALL', 'ACTIVO', 'PRUEBA', 'SUSPENDIDO', 'VENCIDO'] as const).map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap ${
                                statusFilter === st
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/20'
                                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {st === 'ALL' ? 'Todos' : st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla de Tenants */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                <th className="py-3.5 px-4">Consultorio / Slug</th>
                                <th className="py-3.5 px-4">Estado SaaS</th>
                                <th className="py-3.5 px-4">Abono Mensual</th>
                                <th className="py-3.5 px-4">Próximo Vencimiento</th>
                                <th className="py-3.5 px-4">Operatividad</th>
                                <th className="py-3.5 px-4 text-right">Acciones Rápidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">
                                        No se encontraron consultorios con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map(t => {
                                    const formattedAbono = new Intl.NumberFormat('es-AR', {
                                        style: 'currency',
                                        currency: 'ARS',
                                        maximumFractionDigits: 0
                                    }).format(t.billing.monto_abono)

                                    return (
                                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Consultorio & Identidad */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0"
                                                        style={{ backgroundColor: t.color_primario || '#2563eb' }}
                                                    >
                                                        {t.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                                {t.nombre}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-[11px] text-cyan-400/90 font-medium">
                                                                {t.slug}
                                                            </span>
                                                            <a
                                                                href={`/login?slug=${t.slug}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-slate-500 hover:text-cyan-300 transition-colors inline-flex items-center gap-0.5 text-[10px]"
                                                                title="Abrir login del consultorio"
                                                            >
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Estado SaaS */}
                                            <td className="py-4 px-4">
                                                {getStatusBadge(t.billing.estado, t.billing.fecha_vencimiento)}
                                            </td>

                                            {/* Abono Mensual */}
                                            <td className="py-4 px-4">
                                                <span className="font-semibold text-white">
                                                    {formattedAbono}
                                                </span>
                                                <span className="text-[10px] text-slate-500 block">
                                                    Plan {t.plan.toUpperCase()}
                                                </span>
                                            </td>

                                            {/* Vencimiento */}
                                            <td className="py-4 px-4">
                                                <span className="font-medium text-slate-200">
                                                    {t.billing.fecha_vencimiento || 'Sin fecha'}
                                                </span>
                                                {t.ultimoPago && (
                                                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                                                        Pagado: {t.ultimoPago.periodo}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Operatividad */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                                                    <span title="Profesionales" className="flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-slate-500" />
                                                        {t.stats.totalProfesionales} prof.
                                                    </span>
                                                    <span title="Pacientes" className="flex items-center gap-1">
                                                        {t.stats.totalPacientes} pac.
                                                    </span>
                                                    <span title="Turnos este mes" className="text-cyan-400 font-medium">
                                                        {t.stats.turnosEsteMes} turnos/mes
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Botón Switcher / Impersonate */}
                                                    <a
                                                        href={`/admin?slug=${t.slug}`}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
                                                        title="Ingresar a backoffice como Admin"
                                                    >
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </a>

                                                    {/* Registrar Cobro */}
                                                    <button
                                                        onClick={() => setPayingTenant(t)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                                        title="Registrar cobro de este mes"
                                                    >
                                                        <Receipt className="w-3 h-3" />
                                                        Cobrar
                                                    </button>

                                                    {/* Prorrogar +30 días */}
                                                    <button
                                                        onClick={() => handleExtend30Days(t)}
                                                        disabled={isPending}
                                                        className="px-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors text-[11px] font-semibold"
                                                        title="Extender vencimiento 30 días"
                                                    >
                                                        +30d
                                                    </button>

                                                    {/* Suspender / Activar */}
                                                    <button
                                                        onClick={() => handleToggleStatus(t)}
                                                        disabled={isPending}
                                                        className={`p-1.5 rounded-lg border transition-colors ${
                                                            t.billing.estado === 'SUSPENDIDO'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                                        }`}
                                                        title={t.billing.estado === 'SUSPENDIDO' ? 'Reactivar Servicio' : 'Suspender Acceso'}
                                                    >
                                                        {t.billing.estado === 'SUSPENDIDO' ? (
                                                            <Play className="w-3.5 h-3.5 fill-current" />
                                                        ) : (
                                                            <Pause className="w-3.5 h-3.5 fill-current" />
                                                        )}
                                                    </button>

                                                    {/* Ajustes de Cobro */}
                                                    <button
                                                        onClick={() => setEditingTenant(t)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-colors"
                                                        title="Editar abono, vencimiento y datos de pago"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modales de Gestión */}
            {editingTenant && (
                <TenantBillingModal
                    tenant={editingTenant}
                    isOpen={!!editingTenant}
                    onClose={() => setEditingTenant(null)}
                    onSuccess={() => {
                        setEditingTenant(null)
                        onRefresh()
                    }}
                />
            )}

            {payingTenant && (
                <RegistrarPagoModal
                    tenant={payingTenant}
                    isOpen={!!payingTenant}
                    onClose={() => setPayingTenant(null)}
                    onSuccess={() => {
                        setPayingTenant(null)
                        onRefresh()
                    }}
                />
            )}
        </div>
    )
}

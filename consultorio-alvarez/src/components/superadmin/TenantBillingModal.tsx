'use client'

import { useState, useTransition } from 'react'
import { SaasTenantSummary, updateTenantBillingDetails, TenantBillingInfo } from '@/lib/actions/superadmin'
import { X, DollarSign, Calendar, Landmark, Link as LinkIcon, Check, Loader2 } from 'lucide-react'

interface TenantBillingModalProps {
    tenant: SaasTenantSummary
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function TenantBillingModal({ tenant, isOpen, onClose, onSuccess }: TenantBillingModalProps) {
    const [montoAbono, setMontoAbono] = useState(tenant.billing.monto_abono)
    const [fechaVencimiento, setFechaVencimiento] = useState(tenant.billing.fecha_vencimiento || '')
    const [estado, setEstado] = useState<TenantBillingInfo['estado']>(tenant.billing.estado)
    const [alias, setAlias] = useState(tenant.billing.alias_transferencia || '')
    const [cbu, setCbu] = useState(tenant.billing.cbu_transferencia || '')
    const [banco, setBanco] = useState(tenant.billing.banco_transferencia || '')
    const [mpLink, setMpLink] = useState(tenant.billing.mp_link || '')

    const [isPending, startTransition] = useTransition()
    const [errorMsg, setErrorMsg] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        startTransition(async () => {
            try {
                await updateTenantBillingDetails(tenant.id, {
                    monto_abono: Number(montoAbono),
                    fecha_vencimiento: fechaVencimiento,
                    estado,
                    alias_transferencia: alias.trim(),
                    cbu_transferencia: cbu.trim(),
                    banco_transferencia: banco.trim(),
                    mp_link: mpLink.trim()
                })
                onSuccess()
                onClose()
            } catch (err: any) {
                setErrorMsg(err.message || 'Error al guardar los cambios.')
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/40">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            Ajustes de Suscripción y Cobro
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {tenant.nombre} <span className="text-cyan-400">({tenant.slug})</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                            {errorMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Monto Abono (ARS)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={montoAbono}
                                    onChange={e => setMontoAbono(Number(e.target.value))}
                                    className="w-full pl-7 pr-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Próximo Vencimiento
                            </label>
                            <input
                                type="date"
                                value={fechaVencimiento}
                                onChange={e => setFechaVencimiento(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Estado del Servicio (Billing)
                        </label>
                        <select
                            value={estado}
                            onChange={e => setEstado(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="ACTIVO">ACTIVO (Acceso normal al backoffice)</option>
                            <option value="PRUEBA">PRUEBA (Período de cortesía/demo)</option>
                            <option value="PENDIENTE_PAGO">PENDIENTE_PAGO (Aviso en backoffice)</option>
                            <option value="SUSPENDIDO">SUSPENDIDO (Bloqueo inmediato por BillingGuard)</option>
                            <option value="VENCIDO">VENCIDO (Bloqueo por falta de pago)</option>
                        </select>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                        <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                            Datos Bancarios / Pago informados al Consultorio
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Alias</label>
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={e => setAlias(e.target.value)}
                                    placeholder="ej: dentalia.pagos"
                                    className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Banco / Billetera</label>
                                <input
                                    type="text"
                                    value={banco}
                                    onChange={e => setBanco(e.target.value)}
                                    placeholder="ej: MercadoPago o Santander"
                                    className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="block text-[11px] text-slate-400 mb-1">CBU / CVU</label>
                            <input
                                type="text"
                                value={cbu}
                                onChange={e => setCbu(e.target.value)}
                                placeholder="00000031000..."
                                className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div className="mt-3">
                            <label className="block text-[11px] text-slate-400 mb-1">Link de Cobro Mercado Pago (opcional)</label>
                            <input
                                type="url"
                                value={mpLink}
                                onChange={e => setMpLink(e.target.value)}
                                placeholder="https://mpago.la/..."
                                className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

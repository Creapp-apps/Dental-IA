'use client'

import { useState, useTransition } from 'react'
import { SaasTenantSummary, registrarCobroSaaS } from '@/lib/actions/superadmin'
import { X, Check, Loader2, DollarSign, Calendar, CreditCard, Receipt } from 'lucide-react'

interface RegistrarPagoModalProps {
    tenant: SaasTenantSummary
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function RegistrarPagoModal({ tenant, isOpen, onClose, onSuccess }: RegistrarPagoModalProps) {
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Mes actual formateado (ej: "Septiembre 2026")
    const currentMonthStr = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date())
    const defaultPeriodo = currentMonthStr.charAt(0).toUpperCase() + currentMonthStr.slice(1)

    const [monto, setMonto] = useState(tenant.billing.monto_abono || 0)
    const [periodo, setPeriodo] = useState(defaultPeriodo)
    const [metodo, setMetodo] = useState('TRANSFERENCIA')
    const [fechaPago, setFechaPago] = useState(todayStr)
    const [comprobante, setComprobante] = useState('')
    const [renovarVencimiento, setRenovarVencimiento] = useState(true)

    const [isPending, startTransition] = useTransition()
    const [errorMsg, setErrorMsg] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        if (Number(monto) <= 0) {
            setErrorMsg('El monto debe ser mayor a 0.')
            return
        }

        startTransition(async () => {
            try {
                await registrarCobroSaaS(tenant.id, {
                    monto: Number(monto),
                    periodo: periodo.trim(),
                    metodo,
                    fecha_pago: fechaPago,
                    comprobante: comprobante.trim(),
                    renovarVencimiento
                })
                onSuccess()
                onClose()
            } catch (err: any) {
                setErrorMsg(err.message || 'Error al registrar el cobro.')
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/40">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-emerald-400" />
                            Registrar Cobro SaaS
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

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Monto Abonado (ARS)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                            <input
                                type="number"
                                min="1"
                                value={monto}
                                onChange={e => setMonto(Number(e.target.value))}
                                className="w-full pl-7 pr-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-semibold"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Período Saldado
                            </label>
                            <input
                                type="text"
                                value={periodo}
                                onChange={e => setPeriodo(e.target.value)}
                                placeholder="ej: Septiembre 2026"
                                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Método de Pago
                            </label>
                            <select
                                value={metodo}
                                onChange={e => setMetodo(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="TRANSFERENCIA">Transferencia / Alias</option>
                                <option value="MERCADOPAGO">Mercado Pago</option>
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Fecha de Pago
                            </label>
                            <input
                                type="date"
                                value={fechaPago}
                                onChange={e => setFechaPago(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Ref. / N° Comprobante
                            </label>
                            <input
                                type="text"
                                value={comprobante}
                                onChange={e => setComprobante(e.target.value)}
                                placeholder="ej: 9812480"
                                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Checkbox auto-renovación */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 mt-3">
                        <input
                            type="checkbox"
                            id="renovarVencimiento"
                            checked={renovarVencimiento}
                            onChange={e => setRenovarVencimiento(e.target.checked)}
                            className="mt-0.5 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
                        />
                        <label htmlFor="renovarVencimiento" className="text-xs text-slate-300 leading-snug cursor-pointer">
                            <span className="font-semibold text-emerald-400">Prorrogar vencimiento (+30 días)</span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Mantiene el consultorio en estado ACTIVO y traslada el próximo cobro un mes hacia adelante.
                            </p>
                        </label>
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
                            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Confirmar Cobro
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

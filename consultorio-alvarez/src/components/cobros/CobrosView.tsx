'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, CreditCard, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { registrarPago } from '@/lib/actions/finanzas'
import { glassAlert } from '@/components/ui/glass-alert'
import { cn } from '@/lib/utils'

// ── Apple-style staggered spring animation ─────────────────────
const sectionVariants = {
    hidden: { opacity: 0, x: -40, filter: 'blur(6px)' },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
            delay: i * 0.08,
            type: 'spring' as const,
            stiffness: 260,
            damping: 24,
        },
    }),
}

const FILTROS = [
    { value: 'todos', label: 'Todos', icon: DollarSign },
    { value: 'PENDIENTE', label: 'Pendientes', icon: Clock },
    { value: 'PARCIAL', label: 'Parciales', icon: AlertCircle },
    { value: 'PAGADO', label: 'Pagados', icon: CheckCircle },
] as const

const ESTADO_STYLE: Record<string, { badge: string; icon: typeof Clock }> = {
    PENDIENTE: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', icon: Clock },
    PARCIAL: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300', icon: AlertCircle },
    PAGADO: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', icon: CheckCircle },
}

const METODO_LABEL: Record<string, string> = {
    EFECTIVO: '💵 Efectivo',
    TRANSFERENCIA: '🏦 Transferencia',
    TARJETA: '💳 Tarjeta',
    OBRA_SOCIAL: '🏥 Obra Social',
}

interface CobrosViewProps {
    cobros: any[]
    filtroActual: string
}

export function CobrosView({ cobros, filtroActual }: CobrosViewProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [pagoModal, setPagoModal] = useState<{ cobroId: string; pendiente: number } | null>(null)
    const [montoPago, setMontoPago] = useState('')

    function handleFiltro(f: string) {
        router.replace(f === 'todos' ? '/cobros' : `/cobros?filtro=${f}`, { scroll: false })
    }

    function handlePago() {
        if (!pagoModal || !montoPago) return
        const monto = parseFloat(montoPago)
        if (isNaN(monto) || monto <= 0) {
            glassAlert.warning({ title: 'Ingresá un monto válido' })
            return
        }

        startTransition(async () => {
            const result = await registrarPago(pagoModal.cobroId, monto)
            if (result.error) {
                glassAlert.error({ title: 'Error', description: result.error })
            } else {
                glassAlert.success({ title: 'Pago registrado', description: `$${monto.toLocaleString('es-AR')}` })
                setPagoModal(null)
                setMontoPago('')
            }
        })
    }

    // Stats
    const totalPendiente = cobros.filter(c => c.estado !== 'PAGADO').reduce((s, c) => s + (c.monto_total - c.monto_pagado), 0)
    const totalRecaudado = cobros.reduce((s, c) => s + c.monto_pagado, 0)

    return (
        <div className="space-y-4">
            {/* KPIs */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass rounded-2xl shadow-glass p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendiente de cobro</p>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                        ${totalPendiente.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="glass rounded-2xl shadow-glass p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total recaudado</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                        ${totalRecaudado.toLocaleString('es-AR')}
                    </p>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="flex gap-1 glass rounded-xl p-1 shadow-glass overflow-x-auto">
                {FILTROS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => handleFiltro(f.value)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer whitespace-nowrap',
                            filtroActual === f.value
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <f.icon className="h-4 w-4 shrink-0" />
                        <span>{f.label}</span>
                    </button>
                ))}
            </motion.div>

            {/* List */}
            {cobros.length === 0 ? (
                <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="glass rounded-2xl shadow-glass p-12 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Sin cobros registrados</h3>
                    <p className="text-sm text-muted-foreground mt-1">Los cobros aparecerán cuando se registren desde la ficha del paciente</p>
                </motion.div>
            ) : (
                <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {cobros.map((cobro: any, i: number) => {
                            const style = ESTADO_STYLE[cobro.estado] || ESTADO_STYLE.PENDIENTE
                            const pendiente = cobro.monto_total - cobro.monto_pagado
                            const porcentaje = cobro.monto_total > 0 ? (cobro.monto_pagado / cobro.monto_total) * 100 : 0

                            return (
                                <motion.div
                                    key={cobro.id}
                                    className="glass rounded-xl p-4 shadow-glass hover:shadow-glass-lg transition-all"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {cobro.paciente?.apellido}, {cobro.paciente?.nombre}
                                                </p>
                                                <span className={cn('text-xs px-2 py-0.5 rounded-lg font-medium', style.badge)}>
                                                    {cobro.estado}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span>{METODO_LABEL[cobro.metodo_pago] ?? cobro.metodo_pago}</span>
                                                <span>•</span>
                                                <span>{format(new Date(cobro.created_at), "d MMM yyyy", { locale: es })}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-foreground tabular-nums">
                                                ${cobro.monto_total.toLocaleString('es-AR')}
                                            </p>
                                            {cobro.estado !== 'PAGADO' && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                                                    Pendiente: ${pendiente.toLocaleString('es-AR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {cobro.estado !== 'PAGADO' && cobro.monto_pagado > 0 && (
                                        <div className="mt-2">
                                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                                    style={{ width: `${porcentaje}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {cobro.estado !== 'PAGADO' && (
                                        <div className="flex gap-2 mt-3">
                                            <GlassButton
                                                size="sm"
                                                variant="glass"
                                                className="h-7 text-xs"
                                                onClick={() => setPagoModal({ cobroId: cobro.id, pendiente })}
                                            >
                                                <DollarSign className="h-3 w-3 mr-1" /> Registrar pago
                                            </GlassButton>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Pago modal */}
            {pagoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPagoModal(null)}>
                    <motion.div
                        className="glass-strong rounded-2xl shadow-glass-xl p-6 w-full max-w-sm mx-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-foreground mb-1">Registrar pago</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Pendiente: <strong className="text-foreground">${pagoModal.pendiente.toLocaleString('es-AR')}</strong>
                        </p>
                        <div className="space-y-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    value={montoPago}
                                    onChange={(e) => setMontoPago(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <GlassButton variant="ghost" className="flex-1" onClick={() => setPagoModal(null)}>
                                    Cancelar
                                </GlassButton>
                                <GlassButton variant="success" className="flex-1" onClick={handlePago} loading={isPending}>
                                    Confirmar
                                </GlassButton>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

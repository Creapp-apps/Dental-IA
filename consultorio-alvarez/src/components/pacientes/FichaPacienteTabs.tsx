'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CalendarDays, FileText, Stethoscope, ClipboardList, DollarSign } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { OdontogramaInteractivo } from '@/components/pacientes/OdontogramaInteractivo'
import { type EstadoTurno } from '@/types'

const TABS = [
    { id: 'consulta', label: 'Consulta', icon: Stethoscope },
    { id: 'turnos', label: 'Turnos', icon: CalendarDays },
    { id: 'evoluciones', label: 'Evoluciones', icon: FileText },
    { id: 'odontograma', label: 'Odontograma', icon: ClipboardList },
    { id: 'presupuestos', label: 'Presupuestos', icon: DollarSign },
] as const

type TabId = typeof TABS[number]['id']

interface FichaPacienteTabsProps {
    pacienteId: string
    turnos: any[]
    historial: any[]
    odontograma: any[]
    presupuestos: any[]
    motivoConsulta: string | null
}

export function FichaPacienteTabs({
    pacienteId,
    turnos,
    historial,
    odontograma,
    presupuestos,
    motivoConsulta,
}: FichaPacienteTabsProps) {
    const [tab, setTab] = useState<TabId>('consulta')

    return (
        <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-1 glass rounded-xl p-1 shadow-glass">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer',
                            tab === t.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <t.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {tab === 'consulta' && <TabConsulta motivoConsulta={motivoConsulta} />}
                    {tab === 'turnos' && <TabTurnos turnos={turnos} />}
                    {tab === 'evoluciones' && <TabEvoluciones historial={historial} />}
                    {tab === 'odontograma' && (
                        <OdontogramaInteractivo pacienteId={pacienteId} piezasData={odontograma} />
                    )}
                    {tab === 'presupuestos' && <TabPresupuestos presupuestos={presupuestos} />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

/* ──────────── Tab: Consulta ──────────── */
function TabConsulta({ motivoConsulta }: { motivoConsulta: string | null }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-primary" />
                Motivo de Consulta
            </h3>
            {motivoConsulta ? (
                <div className="glass-subtle rounded-xl px-4 py-3">
                    <p className="text-sm text-foreground">{motivoConsulta}</p>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">Sin motivo de consulta registrado</p>
            )}
        </div>
    )
}

/* ──────────── Tab: Turnos ──────────── */
function TabTurnos({ turnos }: { turnos: any[] }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Turnos ({turnos.length})
            </h3>
            {turnos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin turnos registrados</p>
            ) : (
                <div className="space-y-1">
                    {turnos.map((t: any) => (
                        <div key={t.id} className="flex items-start justify-between gap-2 py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {t.tipo_tratamiento?.nombre ?? '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(t.fecha_inicio), "d MMM yyyy, HH:mm", { locale: es })}
                                    {' · Dr. '}{t.profesional?.nombre} {t.profesional?.apellido}
                                </p>
                            </div>
                            <StatusBadge status={t.estado as EstadoTurno} className="shrink-0" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ──────────── Tab: Evoluciones ──────────── */
function TabEvoluciones({ historial }: { historial: any[] }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Evoluciones ({historial.length})
            </h3>
            {historial.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin evoluciones registradas</p>
            ) : (
                <div className="space-y-1">
                    {historial.map((h: any) => (
                        <div key={h.id} className="py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    {h.procedimiento_realizado && (
                                        <p className="text-sm font-medium text-foreground">{h.procedimiento_realizado}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(h.fecha), "d MMM yyyy", { locale: es })}
                                        {' · Dr. '}{h.profesional?.nombre} {h.profesional?.apellido}
                                    </p>
                                </div>
                                {h.presupuesto && (
                                    <span className="text-xs font-semibold text-foreground shrink-0">
                                        ${Number(h.presupuesto).toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                            {h.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{h.observaciones}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ──────────── Tab: Presupuestos ──────────── */
const PRESUPUESTO_BADGE: Record<string, string> = {
    BORRADOR: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    PRESENTADO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    APROBADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECHAZADO: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    VENCIDO: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

function TabPresupuestos({ presupuestos }: { presupuestos: any[] }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Presupuestos ({presupuestos.length})
            </h3>
            {presupuestos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin presupuestos registrados</p>
            ) : (
                <div className="space-y-3">
                    {presupuestos.map((p: any) => (
                        <div key={p.id} className="glass-subtle rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            ${Number(p.monto_total).toLocaleString('es-AR')}
                                        </p>
                                        <span className={cn('text-xs px-2 py-0.5 rounded-lg font-medium', PRESUPUESTO_BADGE[p.estado] ?? PRESUPUESTO_BADGE.BORRADOR)}>
                                            {p.estado}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Dr. {p.profesional?.nombre} {p.profesional?.apellido}
                                        {p.fecha_presentacion && ` · Presentado: ${p.fecha_presentacion}`}
                                    </p>
                                </div>
                            </div>
                            {p.items && p.items.length > 0 && (
                                <div className="space-y-1 mt-2">
                                    {p.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                {item.tipo_tratamiento?.nombre}
                                                {item.pieza_dental && ` (pieza ${item.pieza_dental})`}
                                                {item.cantidad > 1 && ` x${item.cantidad}`}
                                            </span>
                                            <span className="font-medium text-foreground tabular-nums">
                                                ${Number(item.subtotal).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

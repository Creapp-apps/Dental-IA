'use client'

import { useState, useEffect, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { estadoEfectivo, fechaVencimiento } from '@/lib/presupuestos/vigencia'
import { CalendarDays, FileText, Stethoscope, ClipboardList, DollarSign, Paperclip, Box, Plus, Zap, HeartPulse, Printer } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { OdontogramaInteractivo } from '@/components/pacientes/OdontogramaInteractivo'
import type { OdontogramaTipo } from '@/lib/pacientes/odontograma'
import { TabAdjuntos } from '@/components/pacientes/TabAdjuntos'
import { TabEscaneos3D } from '@/components/pacientes/TabEscaneos3D'
import { TabEvoluciones } from '@/components/pacientes/TabEvoluciones'
import { AntecedentesSaludTab } from '@/components/pacientes/AntecedentesSaludTab'
import type { AntecedentesSalud } from '@/lib/pacientes/antecedentes-salud'
import { ModalCrearPresupuesto } from '@/components/pacientes/ModalCrearPresupuesto'
import { cambiarEstadoPresupuesto, eliminarPresupuesto } from '@/lib/actions/presupuestos'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { glassAlert } from '@/components/ui/glass-alert'
import { type EstadoTurno } from '@/types'
import { localDb, type LocalFichaReciente } from '@/lib/offline/db'

const TABS = [
    { id: 'consulta', label: 'Consulta', icon: Stethoscope },
    { id: 'antecedentes_salud', label: 'Antecedentes de Salud', icon: HeartPulse },
    { id: 'turnos', label: 'Turnos', icon: CalendarDays },
    { id: 'evoluciones', label: 'Evoluciones', icon: FileText },
    { id: 'odontograma', label: 'Odontograma', icon: ClipboardList },
    { id: 'escaneos3d', label: 'Escaneos 3D', icon: Box },
    { id: 'presupuestos', label: 'Presupuestos', icon: DollarSign },
    { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip },
] as const

type TabId = typeof TABS[number]['id']

interface FichaPacienteTabsProps {
    pacienteId: string
    tenantId: string
    turnos: any[]
    ausencias?: number
    historial: any[]
    odontograma: any[]
    presupuestos: any[]
    adjuntos: any[]
    escaneos3d?: any[]
    motivoConsulta: string | null
    antecedentesSalud?: AntecedentesSalud | null
    profesionales: any[]
    tiposTratamiento: any[]
    esProfesional?: boolean
    miProfesionalId?: string | null
    odontogramaTipo?: OdontogramaTipo
}

export function FichaPacienteTabs({
    pacienteId,
    tenantId,
    turnos,
    ausencias = 0,
    historial,
    odontograma,
    presupuestos,
    adjuntos,
    escaneos3d = [],
    motivoConsulta,
    antecedentesSalud = null,
    profesionales,
    tiposTratamiento,
    esProfesional = false,
    miProfesionalId = null,
    odontogramaTipo = 'ADULTO',
}: FichaPacienteTabsProps) {
    const [tab, setTab] = useState<TabId>('consulta')
    const [cachedData, setCachedData] = useState<LocalFichaReciente | null>(null)

    // Cargar ficha desde IndexedDB si estamos offline o como respaldo instantáneo
    useEffect(() => {
        if (!pacienteId) return
        localDb.fichas_recientes.get(pacienteId).then((cached) => {
            if (cached) {
                setCachedData(cached)
            }
        }).catch((err) => console.warn('Error leyendo ficha desde IndexedDB:', err))
    }, [pacienteId])

    // Guardar o actualizar la ficha en IndexedDB automáticamente (Stale-While-Revalidate)
    useEffect(() => {
        if (!pacienteId) return
        const hasServerData = 
            (turnos && turnos.length > 0) || 
            (historial && historial.length > 0) || 
            (odontograma && odontograma.length > 0) || 
            (presupuestos && presupuestos.length > 0) ||
            (adjuntos && adjuntos.length > 0) ||
            (escaneos3d && escaneos3d.length > 0)

        if (hasServerData) {
            localDb.fichas_recientes.put({
                paciente_id: pacienteId,
                turnos: turnos ?? [],
                historial: historial ?? [],
                odontograma: odontograma ?? [],
                presupuestos: presupuestos ?? [],
                adjuntos: adjuntos ?? [],
                escaneos3d: escaneos3d ?? [],
                cached_at: new Date().toISOString()
            }).catch(err => console.warn('Error guardando ficha en IndexedDB:', err))
        }
    }, [pacienteId, turnos, historial, odontograma, presupuestos, adjuntos, escaneos3d])

    const effectiveTurnos = (turnos && turnos.length > 0) ? turnos : (cachedData?.turnos ?? [])
    const effectiveHistorial = (historial && historial.length > 0) ? historial : (cachedData?.historial ?? [])
    const effectiveOdontograma = (odontograma && odontograma.length > 0) ? odontograma : (cachedData?.odontograma ?? [])
    const effectivePresupuestos = (presupuestos && presupuestos.length > 0) ? presupuestos : (cachedData?.presupuestos ?? [])
    const effectiveAdjuntos = (adjuntos && adjuntos.length > 0) ? adjuntos : (cachedData?.adjuntos ?? [])
    const effectiveEscaneos3d = (escaneos3d && escaneos3d.length > 0) ? escaneos3d : (cachedData?.escaneos3d ?? [])

    return (
        <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex flex-wrap gap-1 glass rounded-xl p-1 shadow-glass">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all justify-center cursor-pointer shrink-0 whitespace-nowrap',
                            tab === t.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <t.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                        {t.id === 'escaneos3d' && effectiveEscaneos3d.length > 0 && (
                            <span className={cn(
                                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                                tab === t.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                            )}>
                                {effectiveEscaneos3d.length}
                            </span>
                        )}
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
                    {tab === 'antecedentes_salud' && <AntecedentesSaludTab pacienteId={pacienteId} inicial={antecedentesSalud} />}
                    {tab === 'turnos' && <TabTurnos turnos={effectiveTurnos} ausencias={ausencias} />}
                    {tab === 'evoluciones' && (
                        <TabEvoluciones
                            pacienteId={pacienteId}
                            tenantId={tenantId}
                            historial={effectiveHistorial}
                            profesionales={profesionales}
                            turnos={effectiveTurnos}
                            esProfesional={esProfesional}
                            miProfesionalId={miProfesionalId}
                        />
                    )}
                    {tab === 'odontograma' && (
                        <OdontogramaInteractivo pacienteId={pacienteId} piezasData={effectiveOdontograma} tipoInicial={odontogramaTipo} />
                    )}
                    {tab === 'escaneos3d' && (
                        <TabEscaneos3D pacienteId={pacienteId} escaneosIniciales={effectiveEscaneos3d} />
                    )}
                    {tab === 'presupuestos' && (
                        <TabPresupuestos 
                            pacienteId={pacienteId} 
                            presupuestos={effectivePresupuestos} 
                            profesionales={profesionales} 
                            tiposTratamiento={tiposTratamiento} 
                        />
                    )}
                    {tab === 'adjuntos' && <TabAdjuntos pacienteId={pacienteId} adjuntos={effectiveAdjuntos} />}
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
function TabTurnos({ turnos, ausencias = 0 }: { turnos: any[]; ausencias?: number }) {
    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Turnos ({turnos.length})
                </span>
                {ausencias > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        {ausencias} {ausencias === 1 ? 'ausencia' : 'ausencias'} (no vino)
                    </span>
                )}
            </h3>
            {turnos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin turnos registrados</p>
            ) : (
                <div className="space-y-1">
                    {turnos.map((t: any) => (
                        <div key={t.id} className="flex items-start justify-between gap-2 py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {t.tipo_tratamiento?.nombre ?? '—'}
                                    </p>
                                    {t.numero_pieza && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 whitespace-nowrap">
                                            Pza. {t.numero_pieza}
                                        </span>
                                    )}
                                </div>
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

/* ──────────── Tab: Presupuestos ──────────── */
const PRESUPUESTO_BADGE: Record<string, string> = {
    BORRADOR: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    PRESENTADO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    APROBADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECHAZADO: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    VENCIDO: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

function TabPresupuestos({ 
    pacienteId,
    presupuestos,
    profesionales,
    tiposTratamiento
}: { 
    pacienteId: string,
    presupuestos: any[],
    profesionales: any[],
    tiposTratamiento: any[]
}) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<any | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function abrirCrear() {
        setEditTarget(null)
        setIsModalOpen(true)
    }

    function abrirEditar(p: any) {
        setEditTarget(p)
        setIsModalOpen(true)
    }

    function accionEstado(id: string, estado: 'APROBADO' | 'RECHAZADO') {
        startTransition(async () => {
            const r = await cambiarEstadoPresupuesto(id, estado)
            if (r.error) glassAlert.error({ title: 'Error', description: r.error })
            else glassAlert.success({ title: estado === 'APROBADO' ? 'Presupuesto aprobado' : 'Presupuesto rechazado' })
        })
    }

    function onConfirmDelete() {
        if (!confirmDeleteId) return
        startTransition(async () => {
            const r = await eliminarPresupuesto(confirmDeleteId)
            setConfirmDeleteId(null)
            if (r.error) glassAlert.error({ title: 'Error al eliminar', description: r.error })
            else glassAlert.success({ title: 'Presupuesto eliminado' })
        })
    }

    return (
        <div className="glass rounded-2xl shadow-glass p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Presupuestos ({presupuestos.length})
                </h3>
                <button
                    onClick={abrirCrear}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Crear presupuesto
                </button>
            </div>
            
            <ModalCrearPresupuesto
                open={isModalOpen}
                onOpenChange={(o) => { setIsModalOpen(o); if (!o) setEditTarget(null) }}
                pacienteId={pacienteId}
                profesionales={profesionales}
                tiposTratamiento={tiposTratamiento}
                presupuestoEditar={editTarget}
            />

            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(o) => { if (!o) setConfirmDeleteId(null) }}
                title="Eliminar presupuesto"
                description="Se eliminará el presupuesto y todos sus ítems. Esta acción no se puede deshacer."
                confirmText="Eliminar"
                onConfirm={onConfirmDelete}
                isPending={isPending}
            />
            
            {presupuestos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin presupuestos registrados</p>
            ) : (
                <div className="space-y-3">
                    {presupuestos.map((p: any) => {
                        const estadoShow = estadoEfectivo(p)
                        const venc = fechaVencimiento(p.fecha_presentacion, p.vigencia_dias)
                        return (
                        <div key={p.id} className="glass-subtle rounded-xl p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            ${Number(p.monto_total).toLocaleString('es-AR')}
                                        </p>
                                        <span className={cn('text-xs px-2 py-0.5 rounded-lg font-medium', PRESUPUESTO_BADGE[estadoShow] ?? PRESUPUESTO_BADGE.BORRADOR)}>
                                            {estadoShow === 'VENCIDO' ? 'Vencido' : estadoShow}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Dr. {p.profesional?.nombre} {p.profesional?.apellido}
                                        {p.fecha_presentacion && ` · Presentado: ${p.fecha_presentacion}`}
                                        {venc && ` · ${estadoShow === 'VENCIDO' ? 'Venció' : 'Vence'}: ${venc}`}
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

                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-border/40">
                                <a
                                    href={`/pacientes/${pacienteId}/presupuesto/${p.id}/imprimir`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-2.5 py-1 rounded-lg font-medium bg-muted/40 text-foreground hover:bg-muted/70 transition-colors inline-flex items-center gap-1"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
                                </a>
                                {estadoShow === 'PRESENTADO' && (
                                    <>
                                        <button onClick={() => accionEstado(p.id, 'APROBADO')} disabled={isPending}
                                            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                                            Aprobar
                                        </button>
                                        <button onClick={() => accionEstado(p.id, 'RECHAZADO')} disabled={isPending}
                                            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                            Rechazar
                                        </button>
                                    </>
                                )}
                                {estadoShow !== 'APROBADO' && estadoShow !== 'RECHAZADO' && (
                                    <button onClick={() => abrirEditar(p)} disabled={isPending}
                                        className="text-xs px-2.5 py-1 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
                                        Editar
                                    </button>
                                )}
                                <button onClick={() => setConfirmDeleteId(p.id)} disabled={isPending}
                                    className="text-xs px-2.5 py-1 rounded-lg font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 ml-auto">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    )
}

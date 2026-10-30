'use client'

import { useEffect, useState, useTransition } from 'react'
import { BellRing, Plus, Trash, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassSelect } from '@/components/ui/glass-select'
import { glassAlert } from '@/components/ui/glass-alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
    getRecallConfigsConEstado,
    crearRecallConfig,
    actualizarRecallConfig,
    eliminarRecallConfig,
    type RecallConfigConEstado,
} from '@/lib/actions/recall'

const INTERVALOS = [3, 4, 6, 8, 12, 18, 24]

function fechaLegible(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
}

export function TabRecall({ pacienteId, tiposTratamiento, puedeEditar = true }: { pacienteId: string; tiposTratamiento: any[]; puedeEditar?: boolean }) {
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(true)
    const [configs, setConfigs] = useState<RecallConfigConEstado[]>([])
    const [showForm, setShowForm] = useState(false)
    const [nuevoTrat, setNuevoTrat] = useState('')
    const [nuevoIntervalo, setNuevoIntervalo] = useState(6)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const recargar = () => {
        getRecallConfigsConEstado(pacienteId)
            .then(setConfigs)
            .catch(() => glassAlert.error({ title: 'Error', description: 'No se pudieron cargar los controles.' }))
            .finally(() => setLoading(false))
    }

    useEffect(() => { recargar() }, [pacienteId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Tratamientos que todavía no tienen un recordatorio de control configurado.
    const tratamientosDisponibles = (tiposTratamiento || []).filter(
        t => !configs.some(c => c.tipo_tratamiento_id === t.id)
    )

    const agregar = () => {
        if (!nuevoTrat) { glassAlert.error({ title: 'Elegí un tratamiento' }); return }
        startTransition(async () => {
            const r = await crearRecallConfig({ pacienteId, tipoTratamientoId: nuevoTrat, intervaloMeses: nuevoIntervalo })
            if (r?.error) glassAlert.error({ title: 'Error', description: r.error })
            else {
                glassAlert.success({ title: 'Recordatorio de control agregado' })
                setShowForm(false); setNuevoTrat(''); setNuevoIntervalo(6)
                recargar()
            }
        })
    }

    const cambiarIntervalo = (c: RecallConfigConEstado, meses: number) => {
        startTransition(async () => {
            const r = await actualizarRecallConfig(c.id, { intervalo_meses: meses }, pacienteId)
            if (r?.error) glassAlert.error({ title: 'Error', description: r.error })
            else recargar()
        })
    }

    const toggleActivo = (c: RecallConfigConEstado) => {
        startTransition(async () => {
            const r = await actualizarRecallConfig(c.id, { activo: !c.activo }, pacienteId)
            if (r?.error) glassAlert.error({ title: 'Error', description: r.error })
            else recargar()
        })
    }

    const borrar = () => {
        if (!confirmDeleteId) return
        const id = confirmDeleteId
        startTransition(async () => {
            const r = await eliminarRecallConfig(id, pacienteId)
            setConfirmDeleteId(null)
            if (r?.error) glassAlert.error({ title: 'Error', description: r.error })
            else { glassAlert.success({ title: 'Recordatorio eliminado' }); recargar() }
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Recordatorios de control (recall)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Avisos automáticos por WhatsApp para que el paciente agende un nuevo control
                            cada cierto tiempo, según el tratamiento.
                        </p>
                    </div>
                </div>
                {puedeEditar && tratamientosDisponibles.length > 0 && (
                    <GlassButton size="sm" onClick={() => setShowForm(v => !v)}>
                        <Plus className="h-4 w-4 mr-1.5" /> Agregar control
                    </GlassButton>
                )}
            </div>

            {showForm && (
                <div className="glass-subtle rounded-xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Tratamiento</label>
                        <GlassSelect
                            value={nuevoTrat}
                            onChange={setNuevoTrat}
                            placeholder="Elegí un tratamiento…"
                            options={tratamientosDisponibles.map(t => ({ value: t.id, label: t.nombre }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Cada</label>
                        <GlassSelect
                            value={String(nuevoIntervalo)}
                            onChange={v => setNuevoIntervalo(Number(v))}
                            options={INTERVALOS.map(m => ({ value: String(m), label: `${m} meses` }))}
                        />
                    </div>
                    <GlassButton onClick={agregar} loading={isPending}>Guardar</GlassButton>
                </div>
            )}

            {loading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Cargando controles…</p>
            ) : configs.length === 0 ? (
                <div className="glass-subtle rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Este paciente no tiene recordatorios de control configurados.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {configs.map(c => {
                        const estadoChip = c.estado === 'vencido'
                            ? { cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle, txt: 'Control vencido' }
                            : c.estado === 'al_dia'
                                ? { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2, txt: 'Al día' }
                                : { cls: 'bg-muted text-muted-foreground border-border', icon: Clock, txt: 'Sin control aún' }
                        const EstadoIcon = estadoChip.icon
                        return (
                            <div key={c.id} className={cn('glass-subtle rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3', !c.activo && 'opacity-60')}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-foreground">{c.tratamiento_nombre}</p>
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1', estadoChip.cls)}>
                                            <EstadoIcon className="h-2.5 w-2.5" /> {estadoChip.txt}
                                        </span>
                                        {!c.activo && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground font-medium">Pausado</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Último control: <span className="text-foreground">{fechaLegible(c.ancla_at)}</span>
                                        {' · '}Próximo aviso: <span className="text-foreground">{fechaLegible(c.proximo_envio_at)}</span>
                                        {c.ultimo_envio_at && <> {' · '}Último aviso enviado: {fechaLegible(c.ultimo_envio_at)}</>}
                                    </p>
                                </div>
                                {puedeEditar && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-28">
                                            <GlassSelect
                                                value={String(c.intervalo_meses)}
                                                onChange={v => cambiarIntervalo(c, Number(v))}
                                                options={INTERVALOS.map(m => ({ value: String(m), label: `${m} meses` }))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => toggleActivo(c)}
                                            className={cn('text-xs px-2 py-1.5 rounded-lg cursor-pointer transition-colors', c.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-muted text-muted-foreground')}
                                        >
                                            {c.activo ? 'Activo' : 'Pausado'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(c.id)}
                                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                            title="Eliminar recordatorio"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <ConfirmModal
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title="Eliminar recordatorio de control"
                description="¿Seguro que querés eliminar este recordatorio? El paciente dejará de recibir avisos de control para ese tratamiento."
                onConfirm={borrar}
                isPending={isPending}
                confirmText="Eliminar"
            />
        </div>
    )
}

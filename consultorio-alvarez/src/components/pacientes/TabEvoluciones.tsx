'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
    GlassDialogFooter,
} from '@/components/ui/glass-dialog'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassSelect } from '@/components/ui/glass-select'
import { GlassDatePicker } from '@/components/ui/glass-date-picker'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SavingOverlay, useSavingFlow, type SavingResult } from '@/components/ui/saving-overlay'
import type { LocalEvolucion } from '@/lib/offline/db'
import {
    esperarPushEvolucion,
    eliminarEvolucionLocal,
    getEvolucionesLocal,
    guardarEvolucionLocal,
    reconciliarEvolucionesLocal,
} from '@/lib/offline/local-queries'

interface TabEvolucionesProps {
    pacienteId: string
    tenantId: string
    /** Evoluciones tal como las trajo el server en el render de la ficha. */
    historial: any[]
    profesionales: any[]
    turnos: any[]
}

/**
 * Normaliza una fila de historial_clinico al formato local, aplanando el
 * profesional para poder mostrar el autor sin consultar otra tabla.
 */
function aEvolucionLocal(fila: any, pacienteId: string, tenantId: string): LocalEvolucion {
    return {
        id: fila.id,
        tenant_id: fila.tenant_id || tenantId,
        paciente_id: fila.paciente_id || pacienteId,
        profesional_id: fila.profesional_id,
        turno_id: fila.turno_id ?? null,
        fecha: fila.fecha,
        procedimiento_realizado: fila.procedimiento_realizado ?? null,
        observaciones: fila.observaciones ?? null,
        presupuesto: fila.presupuesto ?? null,
        created_at: fila.created_at,
        updated_at: fila.updated_at,
        profesional_nombre: fila.profesional?.nombre,
        profesional_apellido: fila.profesional?.apellido,
    }
}

/**
 * `fecha` es un DATE ('2025-10-08'). new Date() lo leería como medianoche UTC
 * y en Argentina mostraría el día anterior, así que va parseISO, que lo toma
 * como medianoche local.
 */
function formatearFecha(fecha: string): string {
    if (!fecha) return ''
    try {
        return format(parseISO(fecha), "d 'de' MMMM yyyy", { locale: es })
    } catch {
        return fecha
    }
}

function nombreProfesional(evolucion: LocalEvolucion, profesionales: any[]): string {
    if (evolucion.profesional_nombre || evolucion.profesional_apellido) {
        return `${evolucion.profesional_nombre ?? ''} ${evolucion.profesional_apellido ?? ''}`.trim()
    }
    const prof = profesionales.find(p => p.id === evolucion.profesional_id)
    return prof ? `${prof.nombre} ${prof.apellido}` : 'Profesional no identificado'
}

export function TabEvoluciones({
    pacienteId,
    tenantId,
    historial,
    profesionales,
    turnos,
}: TabEvolucionesProps) {
    const [modalAbierto, setModalAbierto] = useState(false)
    const [enEdicion, setEnEdicion] = useState<LocalEvolucion | null>(null)
    const [aEliminar, setAEliminar] = useState<LocalEvolucion | null>(null)

    const desdeServer = useMemo(
        () => historial.map(h => aEvolucionLocal(h, pacienteId, tenantId)),
        [historial, pacienteId, tenantId]
    )

    // Lo que trajo el server baja a IndexedDB, respetando lo que todavía no subió.
    useEffect(() => {
        if (!pacienteId) return
        reconciliarEvolucionesLocal(pacienteId, desdeServer)
    }, [pacienteId, desdeServer])

    // IndexedDB es la fuente de verdad de la lista: al guardar se repinta sola.
    const locales = useLiveQuery(() => getEvolucionesLocal(pacienteId), [pacienteId])
    // En el primer tick useLiveQuery devuelve undefined; mostramos lo del server
    // para no parpadear en vacío.
    const evoluciones = locales ?? desdeServer

    const flujoGuardado = useSavingFlow({
        guardando: 'Guardando evolución…',
        listo: 'Evolución guardada',
        sinConexion: 'Evolución guardada en este equipo',
        descripcionSinConexion: 'Se sincroniza sola cuando vuelva la conexión.',
    })

    const flujoBorrado = useSavingFlow({
        guardando: 'Eliminando evolución…',
        listo: 'Evolución eliminada',
        sinConexion: 'Evolución eliminada en este equipo',
        descripcionSinConexion: 'Se sincroniza sola cuando vuelva la conexión.',
    })

    const abrirNueva = () => {
        setEnEdicion(null)
        setModalAbierto(true)
    }

    const abrirEdicion = (evolucion: LocalEvolucion) => {
        setEnEdicion(evolucion)
        setModalAbierto(true)
    }

    const guardar = async (datos: {
        fecha: string
        profesionalId: string
        turnoId: string
        procedimiento: string
        observaciones: string
    }) => {
        const esNueva = !enEdicion
        const id = enEdicion?.id ?? crypto.randomUUID()
        const prof = profesionales.find(p => p.id === datos.profesionalId)

        setModalAbierto(false)

        flujoGuardado.run(async (): Promise<SavingResult | void> => {
            await guardarEvolucionLocal({
                ...(enEdicion ?? {}),
                id,
                tenant_id: tenantId,
                paciente_id: pacienteId,
                profesional_id: datos.profesionalId,
                turno_id: datos.turnoId || null,
                fecha: datos.fecha,
                procedimiento_realizado: datos.procedimiento.trim() || null,
                observaciones: datos.observaciones.trim() || null,
                profesional_nombre: prof?.nombre,
                profesional_apellido: prof?.apellido,
            }, esNueva)

            const estado = await esperarPushEvolucion(id)
            if (estado === 'error') {
                return {
                    phase: 'sin-conexion',
                    title: 'Evolución guardada en este equipo',
                    description: 'No se pudo subir a la nube. Revisá la conexión y sincronizá desde el panel.',
                }
            }
        })
    }

    const confirmarEliminacion = async () => {
        const evolucion = aEliminar
        if (!evolucion) return

        setAEliminar(null)

        flujoBorrado.run(async (): Promise<SavingResult | void> => {
            await eliminarEvolucionLocal(tenantId, evolucion.id)

            const estado = await esperarPushEvolucion(evolucion.id)
            if (estado === 'error') {
                return {
                    phase: 'sin-conexion',
                    title: 'Evolución eliminada en este equipo',
                    description: 'No se pudo borrar en la nube. Revisá la conexión y sincronizá desde el panel.',
                }
            }
        })
    }

    return (
        <>
            <div className="glass rounded-2xl shadow-glass p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Evoluciones ({evoluciones.length})
                    </h3>
                    <GlassButton size="sm" onClick={abrirNueva}>
                        <Plus className="h-4 w-4" />
                        Nueva evolución
                    </GlassButton>
                </div>

                {evoluciones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin evoluciones registradas</p>
                ) : (
                    <div className="space-y-1">
                        {evoluciones.map(evolucion => (
                            <div
                                key={evolucion.id}
                                className="group py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        {evolucion.procedimiento_realizado && (
                                            <p className="text-sm font-medium text-foreground">
                                                {evolucion.procedimiento_realizado}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {formatearFecha(evolucion.fecha)}
                                            {' · Dr. '}{nombreProfesional(evolucion, profesionales)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {evolucion.presupuesto != null && (
                                            <span className="text-xs font-semibold text-foreground mr-1">
                                                ${Number(evolucion.presupuesto).toLocaleString('es-AR')}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => abrirEdicion(evolucion)}
                                            aria-label="Editar evolución"
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAEliminar(evolucion)}
                                            aria-label="Eliminar evolución"
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {evolucion.observaciones && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                                        {evolucion.observaciones}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modalAbierto && (
                <ModalEvolucion
                    key={enEdicion?.id ?? 'nueva'}
                    open={modalAbierto}
                    onOpenChange={setModalAbierto}
                    evolucion={enEdicion}
                    profesionales={profesionales}
                    turnos={turnos}
                    onGuardar={guardar}
                />
            )}

            <ConfirmModal
                open={aEliminar !== null}
                onOpenChange={abierto => { if (!abierto) setAEliminar(null) }}
                title="Eliminar evolución"
                description="Se borra del historial clínico del paciente y no se puede recuperar."
                confirmText="Eliminar"
                onConfirm={confirmarEliminacion}
            />

            <SavingOverlay
                open={flujoGuardado.open}
                phase={flujoGuardado.phase}
                title={flujoGuardado.title}
                description={flujoGuardado.description}
            />
            <SavingOverlay
                open={flujoBorrado.open}
                phase={flujoBorrado.phase}
                title={flujoBorrado.title}
                description={flujoBorrado.description}
            />
        </>
    )
}

/* ──────────── Modal de alta y edición ──────────── */

interface ModalEvolucionProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    evolucion: LocalEvolucion | null
    profesionales: any[]
    turnos: any[]
    onGuardar: (datos: {
        fecha: string
        profesionalId: string
        turnoId: string
        procedimiento: string
        observaciones: string
    }) => void
}

function ModalEvolucion({
    open,
    onOpenChange,
    evolucion,
    profesionales,
    turnos,
    onGuardar,
}: ModalEvolucionProps) {
    const [fecha, setFecha] = useState(evolucion?.fecha ?? format(new Date(), 'yyyy-MM-dd'))
    const [profesionalId, setProfesionalId] = useState(evolucion?.profesional_id ?? '')
    const [turnoId, setTurnoId] = useState(evolucion?.turno_id ?? '')
    const [procedimiento, setProcedimiento] = useState(evolucion?.procedimiento_realizado ?? '')
    const [observaciones, setObservaciones] = useState(evolucion?.observaciones ?? '')

    const opcionesProfesionales = useMemo(
        () => profesionales.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellido}` })),
        [profesionales]
    )

    const opcionesTurnos = useMemo(() => ([
        { value: '', label: 'Sin turno asociado' },
        ...turnos.map(t => ({
            value: t.id,
            label: `${format(new Date(t.fecha_inicio), "d MMM yyyy", { locale: es })} · ${t.tipo_tratamiento?.nombre ?? 'Turno'}`,
        })),
    ]), [turnos])

    // profesional_id es NOT NULL en la tabla, y una evolución sin lo que se hizo
    // no aporta nada al historial.
    const puedeGuardar = Boolean(fecha && profesionalId && procedimiento.trim())

    const enviar = () => {
        if (!puedeGuardar) return
        onGuardar({ fecha, profesionalId, turnoId, procedimiento, observaciones })
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-lg">
                <GlassDialogHeader>
                    <GlassDialogTitle>
                        {evolucion ? 'Editar evolución' : 'Nueva evolución'}
                    </GlassDialogTitle>
                </GlassDialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>Fecha</Label>
                            <GlassDatePicker fecha={fecha} onChange={setFecha} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Profesional</Label>
                            <GlassSelect
                                value={profesionalId}
                                onChange={setProfesionalId}
                                options={opcionesProfesionales}
                                placeholder="Seleccionar profesional"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Turno asociado (opcional)</Label>
                        <GlassSelect
                            value={turnoId}
                            onChange={setTurnoId}
                            options={opcionesTurnos}
                            placeholder="Sin turno asociado"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="procedimiento">Procedimiento realizado</Label>
                        <Input
                            id="procedimiento"
                            value={procedimiento}
                            onChange={e => setProcedimiento(e.target.value)}
                            placeholder="Ej.: Endodoncia pieza 36"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="observaciones">Observaciones</Label>
                        <Textarea
                            id="observaciones"
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            placeholder="Evolución del tratamiento, indicaciones, próximos pasos…"
                            rows={4}
                        />
                    </div>
                </div>

                <GlassDialogFooter>
                    <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </GlassButton>
                    <GlassButton onClick={enviar} disabled={!puedeGuardar}>
                        Guardar evolución
                    </GlassButton>
                </GlassDialogFooter>
            </GlassDialogContent>
        </GlassDialog>
    )
}

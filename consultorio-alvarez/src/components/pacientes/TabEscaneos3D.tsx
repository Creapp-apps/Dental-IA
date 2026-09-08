'use client'

import { useState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { Visor3DModal } from './visor-3d/Visor3DModal'
import { ModalSubirEscaneo3D } from './ModalSubirEscaneo3D'
import {
    type Escaneo3D,
    eliminarEscaneo3DAction,
    sincronizarMeditLinkAction,
} from '@/lib/actions/escaneos-3d'
import {
    Box,
    Plus,
    RefreshCw,
    Trash2,
    Calendar,
    Sparkles,
    Truck,
    CheckCircle2,
    Layers,
    Clock,
    FileText,
    ArrowUpRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TabEscaneos3DProps {
    pacienteId: string
    escaneosIniciales?: Escaneo3D[]
}

export function TabEscaneos3D({ pacienteId, escaneosIniciales = [] }: TabEscaneos3DProps) {
    const [escaneos, setEscaneos] = useState<Escaneo3D[]>(escaneosIniciales)
    const [escaneoSeleccionado, setEscaneoSeleccionado] = useState<Escaneo3D | null>(null)
    const [isVisorOpen, setIsVisorOpen] = useState(false)
    const [isModalSubirOpen, setIsModalSubirOpen] = useState(false)
    const [isSincronizando, setIsSincronizando] = useState(false)

    const handleAbrirVisor = (escaneo: Escaneo3D) => {
        setEscaneoSeleccionado(escaneo)
        setIsVisorOpen(true)
    }

    const handleSincronizarMedit = async () => {
        setIsSincronizando(true)
        const toastId = toast.loading('Consultando casos en Medit Link Cloud...')

        try {
            const res = await sincronizarMeditLinkAction(pacienteId)
            if (res.success) {
                toast.success('¡Casos de Medit Link sincronizados correctamente!', { id: toastId })
                // Recargar página para refrescar datos del servidor
                window.location.reload()
            } else {
                toast.error(res.error || 'No se encontraron nuevos casos en Medit Link', { id: toastId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al conectar con Medit Link', { id: toastId })
        } finally {
            setIsSincronizando(false)
        }
    }

    const handleEliminar = async (escaneoId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Estás seguro de eliminar este escaneo 3D?')) return

        try {
            const res = await eliminarEscaneo3DAction(escaneoId, pacienteId)
            if (res.success) {
                setEscaneos((prev) => prev.filter((item) => item.id !== escaneoId))
                toast.success('Escaneo 3D eliminado')
            } else {
                toast.error(res.error || 'Error al eliminar escaneo')
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al eliminar escaneo')
        }
    }

    return (
        <div className="space-y-5">
            {/* Cabecera de la Pestaña */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass shadow-glass">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Box className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Modelos y Escaneos 3D
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {escaneos.length} {escaneos.length === 1 ? 'caso' : 'casos'}
                            </span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Visualización interactiva WebGL de arcadas dentales y trazabilidad con laboratorio.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={handleSincronizarMedit}
                        disabled={isSincronizando}
                        className="text-xs border border-border/80 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isSincronizando && 'animate-spin')} />
                        Sincronizar Medit Link
                    </GlassButton>

                    <GlassButton size="sm" onClick={() => setIsModalSubirOpen(true)} className="text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Subir Escaneo 3D
                    </GlassButton>
                </div>
            </div>

            {/* Estado Vacío */}
            {escaneos.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center shadow-glass flex flex-col items-center justify-center space-y-4">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <Box className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                        <h4 className="text-base font-bold text-foreground">
                            Aún no hay escaneos 3D registrados
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Podés sincronizar directamente los modelos desde tu cuenta de{' '}
                            <strong className="text-foreground">Medit Link</strong> o subir manualmente los archivos{' '}
                            <code className="text-primary font-mono text-[11px]">.stl</code> u{' '}
                            <code className="text-primary font-mono text-[11px]">.obj</code> de cualquier escáner intraoral.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 pt-2">
                        <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={handleSincronizarMedit}
                            disabled={isSincronizando}
                            className="text-xs border border-border"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Sincronizar Medit Link
                        </GlassButton>
                        <GlassButton size="sm" onClick={() => setIsModalSubirOpen(true)} className="text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Subir Archivo 3D
                        </GlassButton>
                    </div>
                </div>
            ) : (
                /* Grilla de Casos 3D */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {escaneos.map((escaneo) => {
                        const cantArchivos = escaneo.archivos?.length || 0
                        const ordenLab = escaneo.orden_laboratorio

                        return (
                            <div
                                key={escaneo.id}
                                onClick={() => handleAbrirVisor(escaneo)}
                                className="glass rounded-2xl p-4 shadow-glass border border-border/60 hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3 relative overflow-hidden"
                            >
                                {/* Fondo decorativo sutil en hover */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all" />

                                <div>
                                    {/* Cabecera de la Tarjeta */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {escaneo.nombre_caso}
                                                </h4>
                                                {escaneo.origen === 'medit_link' ? (
                                                    <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                        Medit Link
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-muted-foreground border border-border/50">
                                                        Manual
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(escaneo.fecha_escaneo), "d 'de' MMMM, yyyy", {
                                                    locale: es,
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => handleEliminar(escaneo.id, e)}
                                            className="text-muted-foreground hover:text-red-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar escaneo"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Piezas Dentales Involucradas */}
                                    {escaneo.piezas_dentales && escaneo.piezas_dentales.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap py-1">
                                            {escaneo.piezas_dentales.map((pz, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[11px] px-2 py-0.5 rounded-lg bg-background/80 border border-border/70 text-foreground font-medium flex items-center gap-1"
                                                >
                                                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                                                    Pza {pz.toothNo} • {pz.material || pz.category}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Trazabilidad de Laboratorio */}
                                    {ordenLab && (
                                        <div className="mt-2.5 p-2.5 rounded-xl bg-background/50 border border-border/50 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                <span className="font-medium text-foreground truncate">
                                                    {ordenLab.laboratorio_nombre}
                                                </span>
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                                                    ordenLab.estado === 'RECEIVED'
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : ordenLab.estado === 'SHIPPED'
                                                        ? 'bg-sky-500/15 text-sky-400'
                                                        : 'bg-amber-500/15 text-amber-400'
                                                )}
                                            >
                                                {ordenLab.estado === 'RECEIVED'
                                                    ? 'Recibido'
                                                    : ordenLab.estado === 'SHIPPED'
                                                    ? 'En Camino'
                                                    : 'En Lab'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Pie de la tarjeta: Archivos y Botón de Apertura */}
                                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <Layers className="h-3 w-3" />
                                        {cantArchivos} {cantArchivos === 1 ? 'modelo 3D' : 'modelos 3D'}
                                    </span>

                                    <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                        Abrir Visor 3D <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modales */}
            <Visor3DModal
                open={isVisorOpen}
                onOpenChange={setIsVisorOpen}
                escaneo={escaneoSeleccionado}
            />

            <ModalSubirEscaneo3D
                open={isModalSubirOpen}
                onOpenChange={setIsModalSubirOpen}
                pacienteId={pacienteId}
                onEscaneoCreado={() => {
                    window.location.reload()
                }}
            />
        </div>
    )
}

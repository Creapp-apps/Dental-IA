'use client'

import { useState, useRef } from 'react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
} from '@/components/ui/glass-dialog'
import { GlassButton } from '@/components/ui/glass-button'
import {
    DentalCanvas3D,
    type DentalCanvas3DRef,
    type ModoMaterial3D,
} from './DentalCanvas3D'
import type { Escaneo3D } from '@/lib/actions/escaneos-3d'
import {
    RotateCw,
    Camera,
    Download,
    Eye,
    EyeOff,
    Maximize2,
    Layers,
    Sparkles,
    Box,
    Truck,
    CheckCircle2,
    Clock,
    X,
    Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface Visor3DModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    escaneo: Escaneo3D | null
}

export function Visor3DModal({ open, onOpenChange, escaneo }: Visor3DModalProps) {
    const canvasRef = useRef<DentalCanvas3DRef>(null)

    // Controles de visibilidad
    const [mostrarSuperior, setMostrarSuperior] = useState(true)
    const [mostrarInferior, setMostrarInferior] = useState(true)
    const [posicionOclusion, setPosicionOclusion] = useState(true)
    const [modoMaterial, setModoMaterial] = useState<ModoMaterial3D>('esmalte')
    const [autoRotar, setAutoRotar] = useState(false)
    const [mostrarInfoPanel, setMostrarInfoPanel] = useState(true)

    if (!escaneo) return null

    // Encontrar URLs de STL superior e inferior si existen
    const archivoUpper = escaneo.archivos.find(
        (a) => a.tipo === 'maxilar_superior' || a.nombre.toLowerCase().includes('maxil') || a.nombre.toLowerCase().includes('upper')
    )
    const archivoLower = escaneo.archivos.find(
        (a) => a.tipo === 'maxilar_inferior' || a.nombre.toLowerCase().includes('mandib') || a.nombre.toLowerCase().includes('lower')
    )

    const handleTomarCaptura = () => {
        const dataUrl = canvasRef.current?.tomarCaptura()
        if (dataUrl) {
            const link = document.createElement('a')
            link.download = `captura-${escaneo.nombre_caso.toLowerCase().replace(/\s+/g, '-')}.png`
            link.href = dataUrl
            link.click()
            toast.success('Captura del modelo 3D descargada')
        } else {
            toast.error('No se pudo generar la captura')
        }
    }

    const handleResetCamera = () => {
        canvasRef.current?.resetCamera()
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 border-border/60">
                {/* Header Superior */}
                <GlassDialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between shrink-0 bg-background/50">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Box className="h-4 w-4" />
                        </div>
                        <div>
                            <GlassDialogTitle className="text-base flex items-center gap-2">
                                {escaneo.nombre_caso}
                                {escaneo.origen === 'medit_link' && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                        Medit Link
                                    </span>
                                )}
                            </GlassDialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Escaneado el{' '}
                                {format(new Date(escaneo.fecha_escaneo), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMostrarInfoPanel(!mostrarInfoPanel)}
                            className={cn(
                                'h-8 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer',
                                mostrarInfoPanel
                                    ? 'bg-primary/15 text-primary border-primary/30'
                                    : 'bg-background/60 text-muted-foreground border-border hover:text-foreground'
                            )}
                        >
                            <Info className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Detalles</span>
                        </button>
                    </div>
                </GlassDialogHeader>

                {/* Área Central: Visualizador 3D + Panel Lateral */}
                <div className="flex-1 relative flex overflow-hidden">
                    {/* Lienzo 3D */}
                    <div className="flex-1 h-full relative">
                        <DentalCanvas3D
                            ref={canvasRef}
                            stlUpperUrl={archivoUpper?.url}
                            stlLowerUrl={archivoLower?.url}
                            mostrarSuperior={mostrarSuperior}
                            mostrarInferior={mostrarInferior}
                            posicionOclusion={posicionOclusion}
                            modoMaterial={modoMaterial}
                            autoRotar={autoRotar}
                        />

                        {/* Barra de Controles Flotante Inferior */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl glass bg-background/80 border border-border/80 shadow-2xl backdrop-blur-md max-w-[95%] overflow-x-auto">
                            {/* Selector de Capas */}
                            <div className="flex items-center gap-1 pr-1.5 border-r border-border/60">
                                <button
                                    type="button"
                                    onClick={() => setMostrarSuperior(!mostrarSuperior)}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                                        mostrarSuperior
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-white/5 text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Alternar Maxilar Superior"
                                >
                                    {mostrarSuperior ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                    Superior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMostrarInferior(!mostrarInferior)}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                                        mostrarInferior
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-white/5 text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Alternar Mandíbula Inferior"
                                >
                                    {mostrarInferior ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                    Inferior
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPosicionOclusion(!posicionOclusion)}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                                        posicionOclusion
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-white/5 text-muted-foreground hover:text-foreground'
                                    )}
                                    title="Oclusión en mordida céntrica"
                                >
                                    <Layers className="h-3 w-3" />
                                    {posicionOclusion ? 'Cerrado' : 'Abierto'}
                                </button>
                            </div>

                            {/* Selector de Modo de Material */}
                            <div className="flex items-center gap-1 px-1.5 border-r border-border/60">
                                <button
                                    type="button"
                                    onClick={() => setModoMaterial('esmalte')}
                                    className={cn(
                                        'px-2 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                                        modoMaterial === 'esmalte'
                                            ? 'bg-white/20 text-white font-semibold shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Esmalte
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoMaterial('yeso')}
                                    className={cn(
                                        'px-2 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                                        modoMaterial === 'yeso'
                                            ? 'bg-amber-400/20 text-amber-200 font-semibold shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Yeso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoMaterial('wireframe')}
                                    className={cn(
                                        'px-2 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                                        modoMaterial === 'wireframe'
                                            ? 'bg-sky-500/20 text-sky-400 font-semibold shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Malla
                                </button>
                            </div>

                            {/* Acciones de Cámara */}
                            <div className="flex items-center gap-1 pl-1">
                                <button
                                    type="button"
                                    onClick={() => setAutoRotar(!autoRotar)}
                                    className={cn(
                                        'h-7 w-7 rounded-xl flex items-center justify-center transition-all cursor-pointer',
                                        autoRotar
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                                    )}
                                    title="Auto-rotar 360°"
                                >
                                    <RotateCw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetCamera}
                                    className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all cursor-pointer"
                                    title="Centrar vista"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTomarCaptura}
                                    className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all cursor-pointer"
                                    title="Tomar captura"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Panel Lateral de Información y Laboratorio */}
                    {mostrarInfoPanel && (
                        <div className="w-80 border-l border-border/50 bg-background/90 p-4 space-y-4 overflow-y-auto custom-scrollbar shrink-0">
                            {/* Piezas Dentales Involucradas */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Piezas y Tratamientos
                                </h4>
                                {escaneo.piezas_dentales && escaneo.piezas_dentales.length > 0 ? (
                                    <div className="space-y-2">
                                        {escaneo.piezas_dentales.map((pieza, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground flex items-center gap-1">
                                                        Pieza {pieza.toothNo}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                                        {pieza.category}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Material: <strong className="text-foreground">{pieza.material}</strong>
                                                </div>
                                                {pieza.shade && (
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Color/Tono: <strong className="text-foreground">{pieza.shade}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Arcada completa sin piezas individuales especificadas.
                                    </p>
                                )}
                            </div>

                            {/* Trazabilidad de Laboratorio Dental */}
                            {escaneo.orden_laboratorio && (
                                <div className="pt-2 border-t border-border/50">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Truck className="h-3.5 w-3.5 text-amber-500" /> Trazabilidad de Laboratorio
                                    </h4>
                                    <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-foreground">
                                                {escaneo.orden_laboratorio.laboratorio_nombre}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                                                    escaneo.orden_laboratorio.estado === 'RECEIVED'
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                        : escaneo.orden_laboratorio.estado === 'SHIPPED'
                                                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                )}
                                            >
                                                {escaneo.orden_laboratorio.estado === 'RECEIVED'
                                                    ? 'Recibido'
                                                    : escaneo.orden_laboratorio.estado === 'SHIPPED'
                                                    ? 'En Camino'
                                                    : 'En Producción'}
                                            </span>
                                        </div>

                                        {escaneo.orden_laboratorio.tracking_numero && (
                                            <div className="text-xs text-muted-foreground">
                                                Guía:{' '}
                                                <span className="font-mono text-foreground font-semibold">
                                                    {escaneo.orden_laboratorio.tracking_numero}
                                                </span>
                                            </div>
                                        )}

                                        {escaneo.orden_laboratorio.fecha_entrega_estimada && (
                                            <div className="text-xs text-muted-foreground">
                                                Entrega estimada:{' '}
                                                <strong className="text-foreground">
                                                    {format(
                                                        new Date(escaneo.orden_laboratorio.fecha_entrega_estimada),
                                                        "d 'de' MMMM",
                                                        { locale: es }
                                                    )}
                                                </strong>
                                            </div>
                                        )}

                                        {escaneo.orden_laboratorio.notas && (
                                            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                                {escaneo.orden_laboratorio.notas}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Archivos STL / OBJ Disponibles */}
                            <div className="pt-2 border-t border-border/50">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Download className="h-3.5 w-3.5 text-muted-foreground" /> Archivos 3D
                                </h4>
                                <div className="space-y-1.5">
                                    {escaneo.archivos.map((archivo) => (
                                        <div
                                            key={archivo.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-border/40 text-xs"
                                        >
                                            <div className="truncate pr-2">
                                                <div className="font-medium text-foreground truncate">
                                                    {archivo.nombre}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase">
                                                    {archivo.tipo.replace('_', ' ')} • {(archivo.size_bytes / (1024 * 1024)).toFixed(1)} MB
                                                </div>
                                            </div>
                                            {archivo.url && archivo.url.startsWith('http') && (
                                                <a
                                                    href={archivo.url}
                                                    download={archivo.nombre}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-primary transition-colors shrink-0"
                                                    title="Descargar archivo"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </GlassDialogContent>
        </GlassDialog>
    )
}

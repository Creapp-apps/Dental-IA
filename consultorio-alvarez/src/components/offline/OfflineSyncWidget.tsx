'use client'

import { useState, useEffect } from 'react'
import { syncManager, SyncStatus, NetworkQuality } from '@/lib/offline/sync-manager'
import { 
    RefreshCw, 
    CheckCircle2, 
    Database, 
    Download, 
    Upload, 
    Settings2, 
    Clock, 
    Wifi, 
    WifiOff,
    AlertTriangle,
    Zap,
    Activity,
    ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface OfflineSyncWidgetProps {
    themeColor?: string
    compact?: boolean
}

export function OfflineSyncWidget({ themeColor, compact = false }: OfflineSyncWidgetProps) {
    const [status, setStatus] = useState<SyncStatus>({
        isOnline: true,
        networkQuality: 'excelente',
        pingLatencyMs: null,
        isSyncing: false,
        lastSyncedAt: null,
        pendingOutboxCount: 0,
        atascadosCount: 0,
        authError: false,
        totalPacientesLocales: 0,
        totalTurnosLocales: 0,
        error: null
    })
    const [isOpen, setIsOpen] = useState(false)
    const [isCheckingPing, setIsCheckingPing] = useState(false)
    const [selectedInterval, setSelectedInterval] = useState<number>(15)

    useEffect(() => {
        const unsubscribe = syncManager.subscribe(newStatus => {
            setStatus(newStatus)
        })
        setSelectedInterval(syncManager.getIntervalMinutes())
        return () => unsubscribe()
    }, [])

    const handleSync = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        if (status.isSyncing) return

        if (!status.isOnline) {
            toast.warning('Esta computadora no tiene conexión a internet. Los cambios seguirán guardados en la PC hasta que vuelva la red.')
            return
        }

        toast.info('Sincronizando con la base central...')
        const res = await syncManager.synchronize()
        if (res.success) {
            toast.success(`¡Sincronización exitosa! ${res.pushed} subidos a la nube, ${res.pulled} novedades descargadas`)
        } else {
            toast.error(res.error || 'Error al sincronizar con la nube')
        }
    }

    const handleDownloadFull = async () => {
        if (status.isSyncing) return
        toast.info('Descargando copia limpia de pacientes y agenda...')
        const res = await syncManager.downloadFullSnapshot()
        if (res.success) {
            toast.success('¡Base local actualizada! Ya podés navegar en modo ultrarrápido.')
        } else {
            toast.error(res.error || 'Fallo en la descarga de datos')
        }
    }

    const handleManualPingCheck = async () => {
        setIsCheckingPing(true)
        try {
            const res = await syncManager.checkConnectionQuality()
            if (res.quality === 'desconectado') {
                toast.error('Sin conexión a internet en esta computadora.')
            } else if (res.quality === 'debil') {
                toast.warning(`Conexión lenta detectada (${res.pingMs} ms). El modo local mantendrá tu trabajo fluido.`)
            } else {
                toast.success(`Conexión excelente (${res.pingMs} ms). Comunicación con la nube en tiempo real.`)
            }
        } finally {
            setIsCheckingPing(false)
        }
    }

    const handleIntervalChange = (val: number) => {
        setSelectedInterval(val)
        syncManager.setIntervalMinutes(val)
        toast.success(`Frecuencia de sincronización: ${val === 0 ? 'Solo manual' : `cada ${val} min`}`)
    }

    const formatLastSync = (iso: string | null) => {
        if (!iso) return 'Sin sincronizar todavía'
        try {
            const date = new Date(iso)
            return 'Al día · Sync: ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
        } catch {
            return 'Sincronizado recientemente'
        }
    }

    // Helper de texto del estado principal
    const getWidgetTitle = () => {
        if (status.isSyncing) return 'Sincronizando...'
        if (!status.isOnline || status.networkQuality === 'desconectado') return 'Sin Internet'
        if (status.pendingOutboxCount > 0) {
            return `${status.pendingOutboxCount} ${status.pendingOutboxCount === 1 ? 'cambio sin subir' : 'cambios sin subir'}`
        }
        return 'Modo Local Activo'
    }

    const getWidgetSubtitle = () => {
        if (status.isSyncing) return 'Actualizando con la nube...'
        if (!status.isOnline || status.networkQuality === 'desconectado') {
            return status.pendingOutboxCount > 0 
                ? `Guardando en PC (${status.pendingOutboxCount} pendientes)` 
                : 'Operando seguro en esta PC'
        }
        if (status.pendingOutboxCount > 0) {
            return 'Tocá acá para subir a la nube'
        }
        return formatLastSync(status.lastSyncedAt)
    }

    return (
        <>
            {/* Tarjeta del Widget en la Barra Lateral */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsOpen(true)
                    }
                }}
                className={cn(
                    'group relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left',
                    status.isSyncing
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : !status.isOnline || status.networkQuality === 'desconectado'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                            : status.pendingOutboxCount > 0
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-xs'
                                : 'bg-sidebar-accent/30 border-sidebar-border/40 hover:bg-sidebar-accent/60 text-sidebar-foreground'
                )}
                title="Estado de Conexión y Modo Local (Clic para abrir detalles)"
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Icono de Estado */}
                    <div className="shrink-0">
                        {status.isSyncing ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        ) : !status.isOnline || status.networkQuality === 'desconectado' ? (
                            <div className="h-7 w-7 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <WifiOff className="h-3.5 w-3.5" />
                            </div>
                        ) : status.pendingOutboxCount > 0 ? (
                            <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 animate-pulse">
                                <Upload className="h-3.5 w-3.5" />
                            </div>
                        ) : (
                            <div className="h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        )}
                    </div>

                    {/* Textos descriptivos */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                                "text-[11px] font-bold tracking-tight truncate",
                                status.pendingOutboxCount > 0 && "text-amber-700 dark:text-amber-300"
                            )}>
                                {getWidgetTitle()}
                            </span>

                            {/* Badge en tiempo real de Internet */}
                            <div className="ml-auto shrink-0 flex items-center gap-1">
                                {status.isOnline && status.networkQuality !== 'desconectado' ? (
                                    <span 
                                        className={cn(
                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border",
                                            status.networkQuality === 'debil'
                                                ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                        )}
                                        title={`Latencia de red: ${status.pingLatencyMs ? `${status.pingLatencyMs}ms` : 'Verificada'}`}
                                    >
                                        <span className={cn(
                                            "h-1.5 w-1.5 rounded-full inline-block",
                                            status.networkQuality === 'debil' ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                                        )} />
                                        <span>{status.networkQuality === 'debil' ? 'Lento' : 'Online'}</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
                                        <span>Offline</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className={cn(
                            "text-[9.5px] truncate font-medium mt-0.5",
                            status.pendingOutboxCount > 0 
                                ? "text-amber-800/90 dark:text-amber-200/90 font-semibold" 
                                : "text-muted-foreground"
                        )}>
                            {getWidgetSubtitle()}
                        </p>
                    </div>
                </div>

                {/* Botón rápido de acción para forzar sync */}
                <button
                    type="button"
                    onClick={handleSync}
                    disabled={status.isSyncing || !status.isOnline}
                    className={cn(
                        'ml-2 p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs',
                        status.pendingOutboxCount > 0
                            ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 animate-bounce'
                            : 'bg-background/80 hover:bg-background border-border text-foreground disabled:opacity-40 disabled:pointer-events-none'
                    )}
                    title={status.pendingOutboxCount > 0 ? "Subir cambios pendientes ahora a la nube" : "Forzar sincronización ahora"}
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', status.isSyncing && 'animate-spin')} />
                </button>
            </div>

            {/* Modal de Control y Diagnóstico en Tiempo Real */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Database className="h-5 w-5 text-primary" />
                            <span>Panel de Conexión & Modo Local</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Estado en tiempo real de tu conexión a internet y sincronización con la base central.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-1">
                        {/* Monitor de Conexión de esta Computadora */}
                        <div className={cn(
                            "p-3 rounded-xl border space-y-2",
                            !status.isOnline || status.networkQuality === 'desconectado'
                                ? "bg-rose-500/10 border-rose-500/30"
                                : status.networkQuality === 'debil'
                                    ? "bg-amber-500/10 border-amber-500/30"
                                    : "bg-emerald-500/10 border-emerald-500/30"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {!status.isOnline || status.networkQuality === 'desconectado' ? (
                                        <WifiOff className="h-4 w-4 text-rose-600" />
                                    ) : (
                                        <Wifi className="h-4 w-4 text-emerald-600" />
                                    )}
                                    <span className="text-xs font-bold">
                                        {!status.isOnline || status.networkQuality === 'desconectado'
                                            ? 'Sin Conexión a Internet en esta PC'
                                            : status.networkQuality === 'debil'
                                                ? 'Internet Lento / Inestable'
                                                : 'Internet Conectado y Estable'}
                                    </span>
                                </div>

                                <button
                                    onClick={handleManualPingCheck}
                                    disabled={isCheckingPing}
                                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-background border border-border hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Medir tiempo de respuesta con el servidor"
                                >
                                    <Activity className={cn("h-3 w-3", isCheckingPing && "animate-spin text-primary")} />
                                    <span>{isCheckingPing ? 'Probando...' : 'Comprobar red'}</span>
                                </button>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {!status.isOnline || status.networkQuality === 'desconectado' ? (
                                    <>No hay internet en esta máquina. <strong>Tu consultorio sigue funcionando</strong>: podés dar turnos y buscar pacientes porque los datos están guardados en tu PC.</>
                                ) : status.networkQuality === 'debil' ? (
                                    <>La red presenta demoras ({status.pingLatencyMs} ms). El sistema utiliza la base local para que navegues a 0ms sin sentir la lentitud.</>
                                ) : (
                                    <>La PC se comunica en tiempo real con el servidor de la nube ({status.pingLatencyMs ? `${status.pingLatencyMs} ms de latencia` : 'latencia normal'}).</>
                                )}
                            </p>
                        </div>

                        {/* Alerta de Cambios Pendientes (si los hay) */}
                        {status.pendingOutboxCount > 0 && (
                            <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/15 space-y-1.5">
                                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span className="text-xs font-bold">
                                        {status.pendingOutboxCount} {status.pendingOutboxCount === 1 ? 'cambio pendiente de subir' : 'cambios pendientes de subir'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                                    Realizaste cambios en la agenda o pacientes en esta computadora. Para que el bot de WhatsApp y los demás profesionales los vean, tocan el botón de abajo para sincronizarlos con la nube.
                                </p>
                            </div>
                        )}

                        {/* Métricas de Datos en esta PC */}
                        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                <span>Memoria de esta computadora</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    0ms de latencia
                                </span>
                            </h4>

                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="p-2 rounded-lg bg-background border border-border/60">
                                    <span className="block text-base font-extrabold text-foreground">
                                        {status.totalPacientesLocales}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">Pacientes en PC</span>
                                </div>

                                <div className="p-2 rounded-lg bg-background border border-border/60">
                                    <span className="block text-base font-extrabold text-foreground">
                                        {status.totalTurnosLocales}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">Turnos en PC</span>
                                </div>

                                <div className="p-2 rounded-lg bg-background border border-border/60">
                                    <span className={cn(
                                        "block text-base font-extrabold",
                                        status.pendingOutboxCount > 0 ? "text-amber-600" : "text-emerald-600"
                                    )}>
                                        {status.pendingOutboxCount}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">Por subir</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Última sincronización con la nube: <strong>{formatLastSync(status.lastSyncedAt)}</strong></span>
                            </p>
                        </div>

                        {/* Frecuencia de Sincronización Automática */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                <Settings2 className="h-3.5 w-3.5 text-primary" />
                                <span>¿Cada cuánto tiempo sincronizar automáticamente?</span>
                            </label>
                            <select
                                value={selectedInterval}
                                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value={5}>Cada 5 minutos (Recomendado para consultorios con mucho movimiento)</option>
                                <option value={15}>Cada 15 minutos</option>
                                <option value={60}>Cada 1 hora</option>
                                <option value={360}>Cada 6 horas</option>
                                <option value={0}>Solo Manual (Cuando presione el botón)</option>
                            </select>
                        </div>

                        {/* Botones de Acción */}
                        <div className="space-y-2 pt-2">
                            <button
                                onClick={() => handleSync()}
                                disabled={status.isSyncing || !status.isOnline}
                                className={cn(
                                    "w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50",
                                    status.pendingOutboxCount > 0
                                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                                        : "bg-primary hover:opacity-95 text-primary-foreground"
                                )}
                            >
                                <RefreshCw className={cn('h-4 w-4', status.isSyncing && 'animate-spin')} />
                                <span>
                                    {status.isSyncing 
                                        ? 'Sincronizando con la nube...' 
                                        : status.pendingOutboxCount > 0 
                                            ? `Subir ${status.pendingOutboxCount} cambios pendientes ahora` 
                                            : 'Sincronizar Novedades Ahora'}
                                </span>
                            </button>

                            <button
                                onClick={handleDownloadFull}
                                disabled={status.isSyncing || !status.isOnline}
                                className="w-full py-2 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Descargar Copia Limpia Completa de la Nube</span>
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

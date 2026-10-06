'use client'

import { useState, useEffect } from 'react'
import { syncManager, SyncStatus } from '@/lib/offline/sync-manager'
import { 
    Cloud, 
    CloudOff, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Database, 
    Download, 
    Upload, 
    Settings2, 
    Clock, 
    Wifi, 
    WifiOff 
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
        isSyncing: false,
        lastSyncedAt: null,
        pendingOutboxCount: 0,
        totalPacientesLocales: 0,
        totalTurnosLocales: 0,
        error: null
    })
    const [isOpen, setIsOpen] = useState(false)
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

        toast.info('Iniciando sincronización con la nube...')
        const res = await syncManager.synchronize()
        if (res.success) {
            toast.success(`Sincronización completa: ${res.pushed} subidos, ${res.pulled} novedades descargadas`)
        } else {
            toast.error(res.error || 'Error al sincronizar')
        }
    }

    const handleDownloadFull = async () => {
        if (status.isSyncing) return
        toast.info('Descargando copia limpia integral del consultorio...')
        const res = await syncManager.downloadFullSnapshot()
        if (res.success) {
            toast.success('¡Base local actualizada al 100%! Ya podés navegar en modo ultra rápido.')
        } else {
            toast.error(res.error || 'Fallo en la descarga de datos')
        }
    }

    const handleIntervalChange = (val: number) => {
        setSelectedInterval(val)
        syncManager.setIntervalMinutes(val)
        toast.success(`Frecuencia de sincronización actualizada: ${val === 0 ? 'Solo manual' : `cada ${val} min`}`)
    }

    const formatLastSync = (iso: string | null) => {
        if (!iso) return 'Nunca sincronizado'
        try {
            const date = new Date(iso)
            return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs (' + date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ')'
        } catch {
            return 'Recientemente'
        }
    }

    return (
        <>
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
                    'group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left',
                    status.isSyncing
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : !status.isOnline
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                            : status.pendingOutboxCount > 0
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                                : 'bg-sidebar-accent/30 border-sidebar-border/40 hover:bg-sidebar-accent/60 text-sidebar-foreground'
                )}
                title="Centro de Sincronización Local / Offline"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {status.isSyncing ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
                    ) : !status.isOnline ? (
                        <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
                    ) : status.pendingOutboxCount > 0 ? (
                        <Upload className="h-4 w-4 text-blue-600 shrink-0 animate-bounce" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold tracking-tight truncate">
                                {status.isSyncing
                                    ? 'Sincronizando...'
                                    : !status.isOnline
                                        ? 'Modo Offline'
                                        : status.pendingOutboxCount > 0
                                            ? `${status.pendingOutboxCount} pendientes`
                                            : 'Local-First Activo'}
                            </span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">
                            {status.lastSyncedAt ? `Sync: ${formatLastSync(status.lastSyncedAt)}` : 'Sin sincronizar'}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSync}
                    disabled={status.isSyncing || !status.isOnline}
                    className={cn(
                        'p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer',
                        'bg-background/80 hover:bg-background border-border shadow-xs disabled:opacity-40 disabled:pointer-events-none'
                    )}
                    title="Forzar Sincronización Inmediata"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', status.isSyncing && 'animate-spin text-primary')} />
                </button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <Database className="h-5 w-5 text-primary" />
                        <span>Centro de Sincronización & Modo Offline</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Administrá la base de datos local (IndexedDB) para navegar y operar a 0ms de latencia incluso sin internet.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Tarjeta de Estado de Conectividad */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {status.isOnline ? (
                                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                    <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                                )}
                                <span>Conexión</span>
                            </div>
                            <p className="text-sm font-bold">
                                {status.isOnline ? 'En línea' : 'Sin conexión (Offline)'}
                            </p>
                        </div>

                        <div className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>Última Sync</span>
                            </div>
                            <p className="text-xs font-bold truncate">
                                {formatLastSync(status.lastSyncedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Métricas de Caché Local */}
                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Datos guardados en esta computadora</span>
                            <span className="text-[10px] text-emerald-600 font-bold">● Ultrarrápido (0ms)</span>
                        </h4>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                            <div className="p-2 rounded-lg bg-background border border-border/60">
                                <span className="block text-base font-extrabold text-foreground">
                                    {status.totalPacientesLocales}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Pacientes</span>
                            </div>

                            <div className="p-2 rounded-lg bg-background border border-border/60">
                                <span className="block text-base font-extrabold text-foreground">
                                    {status.totalTurnosLocales}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Turnos</span>
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
                    </div>

                    {/* Frecuencia de Sync Automática */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                            <Settings2 className="h-3.5 w-3.5 text-primary" />
                            <span>Intervalo de sincronización automática</span>
                        </label>
                        <select
                            value={selectedInterval}
                            onChange={(e) => handleIntervalChange(Number(e.target.value))}
                            className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value={5}>Cada 5 minutos (Alta intensidad)</option>
                            <option value={15}>Cada 15 minutos (Recomendado)</option>
                            <option value={60}>Cada 1 hora</option>
                            <option value={360}>Cada 6 horas</option>
                            <option value={0}>Solo Manual (A demanda por botón)</option>
                        </select>
                    </div>

                    {/* Botones de Acción */}
                    <div className="space-y-2 pt-2">
                        <button
                            onClick={() => handleSync()}
                            disabled={status.isSyncing || !status.isOnline}
                            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={cn('h-4 w-4', status.isSyncing && 'animate-spin')} />
                            <span>{status.isSyncing ? 'Sincronizando con Supabase...' : 'Sincronizar Novedades Ahora'}</span>
                        </button>

                        <button
                            onClick={handleDownloadFull}
                            disabled={status.isSyncing || !status.isOnline}
                            className="w-full py-2 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Descargar Base Completa (Snapshot Inicial)</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}

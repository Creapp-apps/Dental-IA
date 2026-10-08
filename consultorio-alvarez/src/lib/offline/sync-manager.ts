'use client'

import { localDb, SyncOutboxItem, LocalPaciente, LocalTurno } from './db'
import {
    fetchFullSnapshotAction,
    fetchIncrementalPullAction,
    pushOutboxChangesAction
} from '@/lib/actions/offline-sync'
import {
    esElegible,
    filtrarBloqueados,
    ordenarCola,
    siguienteEstadoTrasFallo,
    unaOperacionPorEntidad
} from './outbox-policy'

export type NetworkQuality = 'excelente' | 'buena' | 'debil' | 'desconectado'

export interface SyncStatus {
    isOnline: boolean
    networkQuality: NetworkQuality
    pingLatencyMs: number | null
    isSyncing: boolean
    lastSyncedAt: string | null
    pendingOutboxCount: number
    atascadosCount: number
    authError: boolean
    totalPacientesLocales: number
    totalTurnosLocales: number
    error: string | null
}

type SyncListener = (status: SyncStatus) => void

class OfflineSyncManager {
    private listeners: Set<SyncListener> = new Set()
    private intervalId: NodeJS.Timeout | null = null
    private heartbeatIntervalId: NodeJS.Timeout | null = null
    private currentIntervalMinutes: number = 15 // Default 15 min

    private status: SyncStatus = {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        networkQuality: typeof navigator !== 'undefined' && !navigator.onLine ? 'desconectado' : 'excelente',
        pingLatencyMs: null,
        isSyncing: false,
        lastSyncedAt: null,
        pendingOutboxCount: 0,
        atascadosCount: 0,
        authError: false,
        totalPacientesLocales: 0,
        totalTurnosLocales: 0,
        error: null
    }

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.updateStatus({ isOnline: true })
                this.checkConnectionQuality().then(async res => {
                    if (res.quality !== 'desconectado') {
                        try {
                            // La escalera esperaba por una condición que acaba de
                            // cambiar. Se conserva `attempts` para que reconectar
                            // varias veces no vuelva la escalera infinita, y es la
                            // válvula de escape si el reloj del equipo está mal.
                            await localDb.sync_outbox
                                .where('status').equals('PENDIENTE')
                                .modify({ next_attempt_at: null })
                        } catch (e) {
                            // Adelantar la escalera es una mejora, no un requisito:
                            // si Dexie rechaza, el push de reconexión tiene que
                            // salir igual.
                            console.warn('[SYNC MANAGER] No se pudo limpiar la espera al reconectar:', e)
                        }

                        // Intento automático de push/pull al recuperar internet
                        this.synchronize()
                    }
                }).catch(console.warn)
            })
            window.addEventListener('offline', () => {
                this.updateStatus({
                    isOnline: false,
                    networkQuality: 'desconectado',
                    pingLatencyMs: null
                })
            })

            // Inicializar métricas locales y chequeo de red
            this.refreshLocalMetrics()
            this.loadStoredSettings()
            this.setupHeartbeat()
        }
    }

    private async loadStoredSettings() {
        try {
            const metaInterval = await localDb.sync_meta.get('auto_sync_interval_min')
            if (metaInterval && typeof metaInterval.value === 'number') {
                this.currentIntervalMinutes = metaInterval.value
            }
            const lastSync = await localDb.sync_meta.get('last_synced_at')
            if (lastSync) {
                this.updateStatus({ lastSyncedAt: lastSync.value })
            }
            this.setupInterval()

            // Auto-reparar si la base local tiene la versión truncada previa en 1000
            const fullSnapshotV2 = await localDb.sync_meta.get('full_snapshot_v2')
            const pacCount = await localDb.pacientes.count()
            if (!fullSnapshotV2 || pacCount <= 1000) {
                if (typeof navigator !== 'undefined' && navigator.onLine) {
                    this.downloadFullSnapshot().catch(console.warn)
                }
            }
        } catch (e) {
            console.warn('[SYNC MANAGER] Error cargando settings iniciales:', e)
        }
    }

    public subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener)
        listener(this.status)
        return () => this.listeners.delete(listener)
    }

    private notify() {
        this.listeners.forEach(fn => fn({ ...this.status }))
    }

    private updateStatus(partial: Partial<SyncStatus>) {
        this.status = { ...this.status, ...partial }
        this.notify()
    }

    public async refreshLocalMetrics() {
        try {
            const [pendingCount, atascadosCount, pacientesCount, turnosCount, lastSyncMeta] = await Promise.all([
                localDb.sync_outbox.where('status').equals('PENDIENTE').count(),
                localDb.sync_outbox.where('status').equals('ATASCADO').count(),
                localDb.pacientes.count(),
                localDb.turnos.count(),
                localDb.sync_meta.get('last_synced_at')
            ])

            this.updateStatus({
                pendingOutboxCount: pendingCount,
                atascadosCount,
                totalPacientesLocales: pacientesCount,
                totalTurnosLocales: turnosCount,
                lastSyncedAt: lastSyncMeta?.value || null
            })
        } catch (e) {
            console.warn('[SYNC MANAGER] Error refrescando métricas locales:', e)
        }
    }

    /**
     * Mide la latencia real y calidad de conexión a internet de la PC hacia el servidor.
     */
    public async checkConnectionQuality(): Promise<{ quality: NetworkQuality; pingMs: number | null }> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.updateStatus({ isOnline: false, networkQuality: 'desconectado', pingLatencyMs: null })
            return { quality: 'desconectado', pingMs: null }
        }

        try {
            const start = performance.now()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3500)

            const res = await fetch('/api/ping', {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (!res.ok) {
                this.updateStatus({ isOnline: true, networkQuality: 'debil', pingLatencyMs: null })
                return { quality: 'debil', pingMs: null }
            }

            const pingMs = Math.round(performance.now() - start)
            let quality: NetworkQuality = 'excelente'
            if (pingMs > 500) {
                quality = 'debil'
            } else if (pingMs > 200) {
                quality = 'buena'
            } else {
                quality = 'excelente'
            }

            this.updateStatus({ isOnline: true, networkQuality: quality, pingLatencyMs: pingMs })
            return { quality, pingMs }
        } catch {
            const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false
            const quality: NetworkQuality = isOnline ? 'debil' : 'desconectado'
            this.updateStatus({
                isOnline,
                networkQuality: quality,
                pingLatencyMs: null
            })
            return { quality, pingMs: null }
        }
    }

    private setupHeartbeat() {
        if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId)
            this.heartbeatIntervalId = null
        }

        // Chequeo inicial
        this.checkConnectionQuality().catch(console.warn)

        // Monitoreo cada 25 segundos en tiempo real
        this.heartbeatIntervalId = setInterval(() => {
            this.checkConnectionQuality().catch(console.warn)
        }, 25000)
    }

    public setIntervalMinutes(minutes: number) {
        this.currentIntervalMinutes = minutes
        localDb.sync_meta.put({
            key: 'auto_sync_interval_min',
            value: minutes,
            updated_at: new Date().toISOString()
        })
        this.setupInterval()
    }

    public getIntervalMinutes(): number {
        return this.currentIntervalMinutes
    }

    private setupInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }

        // Si es 0 o negativo, es modo solo manual
        if (this.currentIntervalMinutes <= 0) return

        const ms = this.currentIntervalMinutes * 60 * 1000
        this.intervalId = setInterval(() => {
            if (navigator.onLine && !this.status.isSyncing) {
                console.log(`[SYNC MANAGER] Disparando sincronización periódica (${this.currentIntervalMinutes}m)...`)
                this.synchronize()
            }
        }, ms)
    }

    /**
     * Descarga una copia limpia completa desde cero (Snapshot Full).
     */
    public async downloadFullSnapshot(): Promise<{ success: boolean; error?: string }> {
        if (!navigator.onLine) {
            return { success: false, error: 'No hay conexión a internet para descargar la base de datos' }
        }

        this.updateStatus({ isSyncing: true, error: null })

        try {
            const res = await fetchFullSnapshotAction()
            if (!res.success) {
                this.updateStatus({ isSyncing: false, error: res.error || 'Error al descargar datos' })
                return { success: false, error: res.error }
            }

            // Transacción local: Limpiar tablas y repoblar
            await localDb.transaction('rw', [
                localDb.pacientes,
                localDb.turnos,
                localDb.profesionales,
                localDb.tipos_tratamiento,
                localDb.obras_sociales,
                localDb.sync_meta
            ], async () => {
                await localDb.pacientes.clear()
                await localDb.turnos.clear()
                await localDb.profesionales.clear()
                await localDb.tipos_tratamiento.clear()
                await localDb.obras_sociales.clear()

                if (res.pacientes.length > 0) await localDb.pacientes.bulkPut(res.pacientes)
                if (res.turnos.length > 0) await localDb.turnos.bulkPut(res.turnos)
                if (res.profesionales.length > 0) await localDb.profesionales.bulkPut(res.profesionales)
                if (res.tipos_tratamiento.length > 0) await localDb.tipos_tratamiento.bulkPut(res.tipos_tratamiento)
                if (res.obras_sociales.length > 0) await localDb.obras_sociales.bulkPut(res.obras_sociales)

                await localDb.sync_meta.put({
                    key: 'last_synced_at',
                    value: res.server_time,
                    updated_at: new Date().toISOString()
                })
                await localDb.sync_meta.put({
                    key: 'full_snapshot_v2',
                    value: 'true',
                    updated_at: new Date().toISOString()
                })
            })

            await this.refreshLocalMetrics()
            this.updateStatus({ isSyncing: false, lastSyncedAt: res.server_time, error: null })
            return { success: true }
        } catch (err: any) {
            console.error('[SYNC MANAGER] Excepción en downloadFullSnapshot:', err)
            this.updateStatus({ isSyncing: false, error: err.message || 'Error inesperado' })
            return { success: false, error: err.message }
        }
    }

    /**
     * Sincronización inteligente bidireccional:
     * 1. Push: Envía la cola local a Supabase
     * 2. Pull: Descarga novedades creadas por WhatsApp u otros puestos
     */
    public async synchronize(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
        if (!navigator.onLine) {
            return { success: false, pushed: 0, pulled: 0, error: 'Dispositivo sin conexión a internet' }
        }

        if (this.status.isSyncing) {
            return { success: false, pushed: 0, pulled: 0, error: 'Sincronización ya en curso' }
        }

        this.updateStatus({ isSyncing: true, error: null })

        let pushedCount = 0
        let pulledCount = 0

        try {
            // ── 1. PASO PUSH: Subir cola local ──
            const ahora = new Date()

            const [todosPendientes, atascados] = await Promise.all([
                localDb.sync_outbox.where('status').equals('PENDIENTE').toArray(),
                localDb.sync_outbox.where('status').equals('ATASCADO').toArray()
            ])

            // Un pendiente que todavía espera su turno en la escalera es una
            // operación sin aplicar sobre su fila, así que bloquea igual que un
            // atascado. Si no, la operación posterior se sube sola, no encuentra
            // la fila, Postgres no lo considera un error y el cambio se borra de
            // la cola sin haberse aplicado nunca.
            const enEspera = todosPendientes.filter(i => !esElegible(i, ahora))

            const elegibles = unaOperacionPorEntidad(
                filtrarBloqueados(
                    ordenarCola(todosPendientes.filter(i => esElegible(i, ahora))),
                    [...atascados, ...enEspera]
                )
            )

            if (elegibles.length > 0) {
                console.log(`[SYNC MANAGER] Subiendo ${elegibles.length} cambios pendientes a Supabase...`)
                const pushResults = await pushOutboxChangesAction(elegibles)

                // Lista de entrada no vacía y respuesta vacía significa que el
                // servidor no pudo resolver el tenant: la sesión venció. Sin
                // esto los items se quedan pendientes para siempre en silencio.
                if (pushResults.length === 0) {
                    this.updateStatus({ isSyncing: false, authError: true })
                    return { success: false, pushed: 0, pulled: 0, error: 'La sesión venció. Volvé a iniciar sesión.' }
                }

                this.updateStatus({ authError: false })

                for (const r of pushResults) {
                    if (r.success) {
                        await localDb.sync_outbox.delete(r.outbox_id)
                        pushedCount++
                        continue
                    }

                    const item = elegibles.find(i => i.id === r.outbox_id)
                    // El spread es para Dexie: su UpdateSpec sólo acepta un
                    // objeto literal, no un tipo nombrado como CambioDeEstado.
                    await localDb.sync_outbox.update(
                        r.outbox_id,
                        { ...siguienteEstadoTrasFallo(item?.attempts ?? 0, r.retriable, r.error_code, r.error, new Date()) }
                    )
                }
            }

            // ── 2. PASO PULL: Bajar novedades de la nube ──
            const lastSyncMeta = await localDb.sync_meta.get('last_synced_at')
            const sinceDate = lastSyncMeta?.value
            const fullSnapshotV2 = await localDb.sync_meta.get('full_snapshot_v2')

            if (!sinceDate || !fullSnapshotV2 || this.status.totalPacientesLocales <= 1000) {
                // Si nunca sincronizó o tiene la versión truncada (<=1000), hacer snapshot completo
                const snapRes = await this.downloadFullSnapshot()
                // Este camino también sale por éxito, así que tiene que apagar
                // el aviso de sesión vencida igual que el otro.
                if (snapRes.success) this.updateStatus({ authError: false })
                return { success: snapRes.success, pushed: pushedCount, pulled: this.status.totalTurnosLocales, error: snapRes.error }
            }

            const pullRes = await fetchIncrementalPullAction(sinceDate)
            if (pullRes.success) {
                await localDb.transaction('rw', [localDb.pacientes, localDb.turnos, localDb.sync_meta], async () => {
                    if (pullRes.pacientes.length > 0) {
                        await localDb.pacientes.bulkPut(pullRes.pacientes)
                        pulledCount += pullRes.pacientes.length
                    }
                    if (pullRes.turnos.length > 0) {
                        await localDb.turnos.bulkPut(pullRes.turnos)
                        pulledCount += pullRes.turnos.length
                    }
                    await localDb.sync_meta.put({
                        key: 'last_synced_at',
                        value: pullRes.server_time,
                        updated_at: new Date().toISOString()
                    })
                })
            }

            await this.refreshLocalMetrics()
            this.updateStatus({
                isSyncing: false,
                lastSyncedAt: pullRes.server_time || new Date().toISOString(),
                // Una sincronización que terminó bien desmiente el aviso de
                // sesión vencida: sin esto la bandera queda prendida para
                // siempre si después no hay items elegibles que la limpien.
                authError: false,
                error: null
            })

            return { success: true, pushed: pushedCount, pulled: pulledCount }
        } catch (err: any) {
            console.error('[SYNC MANAGER] Error durante synchronize:', err)
            this.updateStatus({ isSyncing: false, error: err.message || 'Error en sincronización' })
            return { success: false, pushed: pushedCount, pulled: pulledCount, error: err.message }
        }
    }

    /**
     * Encola una mutación local (INSERT/UPDATE/DELETE) para que se aplique instantáneamente
     * en IndexedDB y se suba en el próximo sync.
     */
    public async enqueueMutation(
        tenantId: string,
        entity: 'turnos' | 'pacientes' | 'evoluciones',
        entityId: string,
        operation: 'INSERT' | 'UPDATE' | 'DELETE',
        payload: any
    ) {
        await localDb.sync_outbox.add({
            tenant_id: tenantId,
            entity,
            entity_id: entityId,
            operation,
            payload,
            created_at: new Date().toISOString(),
            attempts: 0,
            status: 'PENDIENTE'
        })

        await this.refreshLocalMetrics()

        // Si estamos online, intentar push inmediato en segundo plano
        if (navigator.onLine && !this.status.isSyncing) {
            this.synchronize().catch(console.warn)
        }
    }
}

export const syncManager = new OfflineSyncManager()

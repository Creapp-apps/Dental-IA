'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Notificacion } from '@/types'
import { cn } from '@/lib/utils'

/**
 * Alerta llamativa (NO bloqueante) cuando un paciente reserva un turno desde la
 * web. Reusa la mecánica de ChatAtencionAlert, pero:
 *  - Escucha Realtime sobre `notificaciones` filtrando el turno web
 *    (`tipo='turno_nuevo'` + `motivo='reserva_web'`), fila que ya inserta
 *    `crearReservaPublica` (src/lib/actions/reservas.ts).
 *  - Suena UNA vez por turno (no repite en loop) y no cubre la pantalla: es una
 *    card flotante centrada; el resto del panel sigue usable.
 *  - "Ver turno" abre la agenda en ese turno (deep-link `/agenda?turno=<id>`,
 *    que AgendaView ya lee). Minimizar/cerrar no descarta: colapsa a un modal
 *    reducido pendiente abajo a la derecha, para que no se vaya de la vista.
 *
 * Solo reacciona a inserts en vivo (igual que los toasts del NotificationProvider):
 * no reprocesa turnos viejos al entrar al panel.
 */
type TurnoAlerta = {
    id: string // id de la notificación
    turnoId: string | null // referencia_id (id del turno)
    titulo: string
    mensaje: string
}

const limpiar = (texto: string) => texto.replace(/\*\*/g, '').trim()

export function TurnoWebAlert({ tenantId }: { tenantId?: string }) {
    const router = useRouter()
    const [cola, setCola] = useState<TurnoAlerta[]>([])
    const [minimizado, setMinimizado] = useState(false)

    const activa = cola[0] ?? null
    const restantes = cola.length - 1
    const visible = cola.length > 0

    // ---------- Sonido (WebAudio): una vez por turno ----------
    const audioCtxRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        const unlock = () => {
            if (!audioCtxRef.current) {
                try {
                    const Ctx =
                        window.AudioContext ||
                        (window as unknown as { webkitAudioContext: typeof AudioContext })
                            .webkitAudioContext
                    audioCtxRef.current = new Ctx()
                } catch {
                    /* sin audio disponible */
                }
            }
            if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
        }
        window.addEventListener('pointerdown', unlock)
        window.addEventListener('keydown', unlock)
        return () => {
            window.removeEventListener('pointerdown', unlock)
            window.removeEventListener('keydown', unlock)
        }
    }, [])

    const sonar = useCallback(() => {
        const ctx = audioCtxRef.current
        if (!ctx || ctx.state !== 'running') return
        const t = ctx.currentTime
        // Dos notas ascendentes, timbre amable (no alarmante).
        ;[587.33, 880].forEach((f, i) => {
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.type = 'sine'
            o.frequency.value = f
            const s = t + i * 0.16
            g.gain.setValueAtTime(0, s)
            g.gain.linearRampToValueAtTime(0.16, s + 0.02)
            g.gain.exponentialRampToValueAtTime(0.0001, s + 0.28)
            o.connect(g)
            g.connect(ctx.destination)
            o.start(s)
            o.stop(s + 0.3)
        })
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!reduce && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([120, 60, 120])
        }
    }, [])

    // ---------- Realtime: insert de notificación de turno web ----------
    useEffect(() => {
        if (!tenantId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`turno-web-alerta-${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `tenant_id=eq.${tenantId}`,
                },
                (payload) => {
                    const n = payload.new as Notificacion
                    if (n.tenant_id !== tenantId) return
                    if (n.tipo !== 'turno_nuevo' || n.motivo !== 'reserva_web') return
                    setCola((prev) => {
                        if (prev.some((t) => t.id === n.id)) return prev
                        return [
                            { id: n.id, turnoId: n.referencia_id, titulo: n.titulo, mensaje: n.mensaje },
                            ...prev,
                        ]
                    })
                    setMinimizado(false)
                    sonar()
                },
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId, sonar])

    // ---------- Acciones ----------
    const marcarLeida = useCallback(
        (notifId: string) => {
            const supabase = createClient()
            let query = supabase.from('notificaciones').update({ leida: true }).eq('id', notifId)
            if (tenantId) query = query.eq('tenant_id', tenantId)
            void query
        },
        [tenantId],
    )

    const verTurno = useCallback(
        (t: TurnoAlerta) => {
            marcarLeida(t.id)
            setCola((prev) => prev.filter((x) => x.id !== t.id))
            setMinimizado(true)
            router.push(t.turnoId ? `/agenda?turno=${t.turnoId}` : '/agenda')
        },
        [marcarLeida, router],
    )

    const descartar = useCallback(
        (t: TurnoAlerta) => {
            marcarLeida(t.id)
            setCola((prev) => prev.filter((x) => x.id !== t.id))
        },
        [marcarLeida],
    )

    // Cerrar/minimizar NO descarta: colapsa al pill pendiente.
    const minimizar = useCallback(() => setMinimizado(true), [])

    useEffect(() => {
        if (!visible || minimizado) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') minimizar()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [visible, minimizado, minimizar])

    if (!visible || !activa) return null

    // ---------- Pill reducido (pendiente, abajo-derecha) ----------
    if (minimizado) {
        return (
            <div className="fixed bottom-5 right-5 z-[80] twa-pop">
                <style>{twa_css}</style>
                <button
                    type="button"
                    onClick={() => setMinimizado(false)}
                    className="twa-ring flex max-w-[320px] items-center gap-3 rounded-2xl border border-emerald-500/50 bg-card px-4 py-3 text-left shadow-2xl transition hover:brightness-105"
                >
                    <span className="relative grid h-9 w-9 flex-none place-items-center rounded-full bg-emerald-500/15 text-lg">
                        🌟
                        {cola.length > 1 && (
                            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1 text-[0.7rem] font-bold text-white tabular-nums">
                                {cola.length}
                            </span>
                        )}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.86rem] font-bold text-foreground">
                            {cola.length > 1 ? `${cola.length} turnos web nuevos` : 'Nuevo turno web'}
                        </span>
                        <span className="block truncate text-[0.74rem] text-muted-foreground">
                            Tocá para ver el detalle
                        </span>
                    </span>
                </button>
            </div>
        )
    }

    // ---------- Card expandida (llamativa, no bloqueante) ----------
    return (
        // Wrapper sin fondo y sin captura de clicks: el panel sigue usable detrás.
        <div className="pointer-events-none fixed inset-0 z-[80] grid place-items-center p-4">
            <style>{twa_css}</style>
            <div className="twa-box pointer-events-auto relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Cabecera llamativa (positiva, no alarma) */}
                <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                    <span className="twa-ring grid h-9 w-9 flex-none place-items-center rounded-full bg-white/20 text-lg">
                        🌟
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[1.02rem] font-bold uppercase leading-tight tracking-wide">
                            Nuevo turno desde la web
                        </div>
                        <div className="mt-0.5 text-[0.76rem] font-medium opacity-90">
                            Un paciente acaba de reservar online
                        </div>
                    </div>
                    {cola.length > 1 && (
                        <span className="flex-none whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[0.74rem] font-bold">
                            1 de {cola.length}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={minimizar}
                        title="Minimizar"
                        aria-label="Minimizar"
                        className="grid place-items-center p-1 text-white opacity-90 transition-opacity hover:opacity-100"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                            <path d="M5 12h14" />
                        </svg>
                    </button>
                </div>

                {/* Detalle */}
                <div className="px-5 pb-1 pt-4">
                    <p className="text-[0.95rem] font-semibold leading-snug text-foreground">
                        {limpiar(activa.mensaje)}
                    </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2.5 px-5 pb-4 pt-4">
                    {restantes > 0 && (
                        <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-muted-foreground">
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 tabular-nums text-emerald-600 dark:text-emerald-400">
                                {restantes}
                            </span>
                            en espera
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => descartar(activa)}
                        className="rounded-xl border border-border px-3.5 py-3 text-[0.85rem] font-semibold text-muted-foreground transition hover:bg-muted"
                    >
                        Descartar
                    </button>
                    <button
                        type="button"
                        onClick={() => verTurno(activa)}
                        className="ml-auto flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-[18px] py-3 text-[0.9rem] font-bold text-white transition hover:brightness-110"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        Ver turno
                    </button>
                </div>
                <p className="px-5 pb-4 text-center text-[0.72rem] text-muted-foreground">
                    Podés minimizarlo y queda pendiente abajo a la derecha hasta que lo veas.
                </p>
            </div>
        </div>
    )
}

const twa_css = `
.twa-box { animation: twa-slide .45s cubic-bezier(.2,.8,.2,1); }
@keyframes twa-slide { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.twa-box::before { content: ""; position: absolute; inset: -3px; border-radius: 20px; border: 2px solid #10b981; z-index: -1; animation: twa-breathe 2.1s ease-in-out infinite; }
@keyframes twa-breathe { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); opacity: .5; } 50% { box-shadow: 0 0 0 9px rgba(16,185,129,.16); opacity: 1; } }
.twa-pop { animation: twa-pop .35s cubic-bezier(.2,.8,.2,1); }
@keyframes twa-pop { from { opacity: 0; transform: translateY(12px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.twa-ring { animation: twa-pulse 2.1s ease-in-out infinite; }
@keyframes twa-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@media (prefers-reduced-motion: reduce) { .twa-box, .twa-box::before, .twa-ring, .twa-pop { animation: none !important; } }
`

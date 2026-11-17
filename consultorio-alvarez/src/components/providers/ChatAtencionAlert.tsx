'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    getConversaciones,
    getMensajes,
    type WhatsAppConversacionRow,
    type WhatsAppMensajeRow,
} from '@/lib/actions/whatsapp-chat'
import { cn } from '@/lib/utils'

/**
 * Alerta global bloqueante: cuando una conversación de WhatsApp pasa a
 * `HUMANO_PENDIENTE` (el bot derivó a un humano), monta un modal central que no
 * se puede cerrar hasta atender. Muestra una cola con contador, preview del chat
 * y sonido + vibración. "Atender chat" abre ESA conversación en la bandeja.
 *
 * Reusa lo que ya existe: `getConversaciones('pendientes')`, Realtime sobre
 * `whatsapp_conversaciones` (igual que ChatsRequierenAtencionSection) y el
 * deep-link `/mensajes?conv=<id>` (ChatInboxView lo lee de la URL).
 */
export function ChatAtencionAlert({ tenantId }: { tenantId?: string }) {
    const router = useRouter()
    const [cola, setCola] = useState<WhatsAppConversacionRow[]>([])
    const [preview, setPreview] = useState<WhatsAppMensajeRow[] | null>(null)
    const [muted, setMuted] = useState(false)
    const [abierto, setAbierto] = useState(false)
    const [, startTransition] = useTransition()
    // Ids ya vistos (cerrados o atendidos): no vuelven a disparar el modal.
    // Solo reaparece cuando entra una conversación pendiente nueva.
    const vistasRef = useRef<Set<string>>(new Set())

    const activa = cola[0] ?? null
    const activaId = activa?.id ?? null
    const visible = abierto && cola.length > 0

    // ---------- Carga + Realtime ----------
    const refetch = useCallback(() => {
        startTransition(async () => {
            const { conversaciones } = await getConversaciones('pendientes')
            const pend = (conversaciones || [])
                .filter((c) => c.estado === 'HUMANO_PENDIENTE')
                // más viejo primero: el que espera hace más tiempo va al frente
                .sort((a, b) => (a.ultimo_mensaje_at < b.ultimo_mensaje_at ? -1 : 1))
            // Limpiar "vistas": soltar las que ya no están pendientes (si vuelve a
            // pendiente más adelante, vuelve a alertar).
            const pendIds = new Set(pend.map((c) => c.id))
            vistasRef.current.forEach((id) => {
                if (!pendIds.has(id)) vistasRef.current.delete(id)
            })
            const hayNoVista = pend.some((c) => !vistasRef.current.has(c.id))
            setCola(pend)
            if (hayNoVista) setAbierto(true)
            else if (pend.length === 0) setAbierto(false)
        })
    }, [])

    useEffect(() => {
        if (!tenantId) return
        refetch()
        const supabase = createClient()
        const channel = supabase
            .channel(`chat-atencion-${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_conversaciones',
                    filter: `tenant_id=eq.${tenantId}`,
                },
                refetch,
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId, refetch])

    // ---------- Preview de la conversación activa ----------
    useEffect(() => {
        if (!activaId) {
            setPreview(null)
            return
        }
        let cancelado = false
        setPreview(null)
        getMensajes(activaId, { limit: 6 }).then((res) => {
            if (!cancelado) setPreview(res.mensajes || [])
        })
        return () => {
            cancelado = true
        }
    }, [activaId])

    // ---------- Sonido (WebAudio) + vibración ----------
    const audioCtxRef = useRef<AudioContext | null>(null)

    // Habilita el audio en el primer gesto del usuario (los navegadores lo exigen).
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

    useEffect(() => {
        if (!visible || muted) return
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const beep = () => {
            const ctx = audioCtxRef.current
            if (!ctx || ctx.state !== 'running') return
            const t = ctx.currentTime
            ;[880, 660].forEach((f, i) => {
                const o = ctx.createOscillator()
                const g = ctx.createGain()
                o.type = 'sine'
                o.frequency.value = f
                const s = t + i * 0.22
                g.gain.setValueAtTime(0, s)
                g.gain.linearRampToValueAtTime(0.18, s + 0.02)
                g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2)
                o.connect(g)
                g.connect(ctx.destination)
                o.start(s)
                o.stop(s + 0.22)
            })
        }
        const vibrar = () => {
            if (!reduce && typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([300, 150, 300])
            }
        }
        beep()
        vibrar()
        const id = window.setInterval(() => {
            beep()
            vibrar()
        }, 2600)
        return () => {
            window.clearInterval(id)
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0)
        }
        // nuevo beep/vibración también al cambiar de chat activo
    }, [visible, muted, activaId])

    // ---------- Acciones ----------
    // Cerrar: marca todas las pendientes actuales como vistas y oculta el modal.
    // No vuelve a abrir hasta que entre una conversación nueva.
    const cerrar = useCallback(() => {
        cola.forEach((c) => vistasRef.current.add(c.id))
        setAbierto(false)
    }, [cola])

    const atender = () => {
        if (!activa) return
        const id = activa.id
        vistasRef.current.add(id)
        setCola((prev) => prev.filter((c) => c.id !== id))
        setAbierto(false)
        router.push(`/mensajes?conv=${id}`)
    }

    // Cerrar con Escape.
    useEffect(() => {
        if (!visible) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cerrar()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [visible, cerrar])

    if (!visible || !activa) return null

    const nombre =
        activa.paciente
            ? `${activa.paciente.nombre} ${activa.paciente.apellido}`.trim()
            : activa.nombre_contacto || activa.telefono
    const iniciales = nombre
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    const restantes = cola.length - 1

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="chat-atencion-title"
            onClick={cerrar}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-[2px] p-4 cae-fade"
        >
            <style>{cae_css}</style>
            <div
                onClick={(e) => e.stopPropagation()}
                className="cae-box relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
                {/* Cabecera alarmante */}
                <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
                    <span className="cae-ring grid h-9 w-9 flex-none place-items-center rounded-full bg-white/20">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                        <div id="chat-atencion-title" className="text-[1.02rem] font-bold uppercase leading-tight tracking-wide">
                            Un chat requiere tu atención
                        </div>
                        <div className="mt-0.5 text-[0.76rem] font-medium opacity-90">
                            {activa.motivo ? activa.motivo : 'El bot derivó la conversación a un humano'}
                        </div>
                    </div>
                    <span className="flex-none whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[0.74rem] font-bold">
                        1 de {cola.length}
                    </span>
                    <button
                        type="button"
                        onClick={() => setMuted((m) => !m)}
                        title={muted ? 'Activar sonido' : 'Silenciar'}
                        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                        className={cn('grid place-items-center p-1 text-white transition-opacity', muted ? 'opacity-40' : 'opacity-90')}
                    >
                        {muted ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                                <path d="M11 5 6 9H2v6h4l5 4z" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                                <path d="M11 5 6 9H2v6h4l5 4z" />
                                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                                <path d="M19 5a9 9 0 0 1 0 14" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={cerrar}
                        title="Cerrar"
                        aria-label="Cerrar"
                        className="grid place-items-center p-1 text-white opacity-90 transition-opacity hover:opacity-100"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Preview del chat */}
                <div className="px-4 pb-1 pt-4">
                    <div className="mb-2.5 flex items-center gap-2.5">
                        <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                            {iniciales}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-[0.92rem] font-bold text-foreground">{nombre}</div>
                            <div className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
                                <span className="cae-ring inline-block h-[7px] w-[7px] rounded-full bg-red-500" />
                                {activa.telefono}
                            </div>
                        </div>
                    </div>

                    <div className="flex max-h-[190px] flex-col gap-1.5 overflow-y-auto rounded-xl bg-muted/60 p-3">
                        {preview === null ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Cargando conversación…</div>
                        ) : preview.length === 0 ? (
                            <div className="rounded-lg bg-background px-2.5 py-2 text-[0.84rem] text-foreground">
                                {activa.ultimo_mensaje_texto || 'Sin mensajes para mostrar.'}
                            </div>
                        ) : (
                            preview.map((m) => {
                                const entrante = m.remitente === 'paciente'
                                return (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            'max-w-[82%] rounded-[10px] px-2.5 py-1.5 text-[0.84rem] leading-snug shadow-sm',
                                            entrante
                                                ? 'self-start rounded-tl-[3px] bg-background text-foreground'
                                                : 'self-end rounded-tr-[3px] bg-primary/15 text-foreground',
                                        )}
                                    >
                                        {m.contenido}
                                        <span className="mt-0.5 block text-right text-[0.64rem] text-muted-foreground">
                                            {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2.5 px-4 pb-3 pt-3.5">
                    {restantes > 0 && (
                        <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-muted-foreground">
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 tabular-nums text-red-600 dark:text-red-400">{restantes}</span>
                            en espera
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={atender}
                        className="ml-auto flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-[18px] py-3 text-[0.9rem] font-bold text-primary-foreground transition hover:brightness-110"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        Atender chat
                    </button>
                </div>
                <p className="px-4 pb-3.5 text-center text-[0.72rem] text-muted-foreground">
                    Podés cerrar y seguir trabajando: no vuelve a avisar por estos chats, solo por los nuevos.
                </p>
            </div>
        </div>
    )
}

const cae_css = `
.cae-fade { animation: cae-fade .35s ease; }
@keyframes cae-fade { from { opacity: 0; } to { opacity: 1; } }
.cae-box { animation: cae-slide .5s cubic-bezier(.2,.8,.2,1); }
@keyframes cae-slide { from { opacity: 0; transform: translateX(40px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
.cae-box::before { content: ""; position: absolute; inset: -3px; border-radius: 20px; border: 2px solid #dc2626; z-index: -1; animation: cae-breathe 1.9s ease-in-out infinite; }
@keyframes cae-breathe { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); opacity: .55; } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,.18); opacity: 1; } }
.cae-ring { animation: cae-pulse 1.9s ease-in-out infinite; }
@keyframes cae-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) { .cae-fade, .cae-box, .cae-box::before, .cae-ring { animation: none !important; } }
`

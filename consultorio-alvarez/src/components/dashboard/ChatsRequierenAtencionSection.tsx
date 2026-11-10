'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, MessageSquare, CheckCircle2, ChevronDown, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { carrilDe, MOTIVOS } from '@/lib/mensajes/triage'
import {
    getConversaciones,
    cambiarEstadoConversacion,
    type WhatsAppConversacionRow,
} from '@/lib/actions/whatsapp-chat'

interface Props {
    initial: WhatsAppConversacionRow[]
}

function nombreDe(c: WhatsAppConversacionRow): string {
    return c.paciente
        ? `${c.paciente.nombre} ${c.paciente.apellido}`
        : c.nombre_contacto || `+${c.telefono}`
}

function horaCorta(iso: string): string {
    const d = new Date(iso)
    const inicioDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const dif = Math.round((inicioDia(new Date()) - inicioDia(d)) / 86400000)
    if (dif <= 0) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    if (dif === 1) return 'Ayer'
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function ChatsRequierenAtencionSection({ initial }: Props) {
    const [convs, setConvs] = useState<WhatsAppConversacionRow[]>(initial)
    const [abierto, setAbierto] = useState(true)
    const [cerrandoId, setCerrandoId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    // Mantener sincronizado: refrescamos ante cualquier cambio en conversaciones.
    useEffect(() => {
        const supabase = createClient()
        const refetch = () => {
            startTransition(async () => {
                const { conversaciones } = await getConversaciones('pendientes')
                setConvs((conversaciones || []).filter(c => c.estado === 'HUMANO_PENDIENTE'))
            })
        }
        const channel = supabase
            .channel('chats-requieren-atencion')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversaciones' }, refetch)
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    async function handleFinalizar(id: string) {
        setCerrandoId(id)
        // Optimista: lo sacamos de la lista al toque.
        const previo = convs
        setConvs(prev => prev.filter(c => c.id !== id))
        try {
            const res = await cambiarEstadoConversacion(id, 'CERRADO')
            if (res.success) {
                toast.success('Chat finalizado')
            } else {
                setConvs(previo) // revertir
                toast.error('No se pudo finalizar: ' + res.error)
            }
        } finally {
            setCerrandoId(null)
        }
    }

    if (convs.length === 0) return null

    return (
        <div className="space-y-3">
            {/* Banner llamativo con pulso ámbar */}
            <div className={cn(
                'rounded-2xl border border-amber-500/40 border-l-[6px] border-l-amber-500',
                'bg-amber-500/10 dark:bg-amber-950/40 animate-card-pulse-amber shadow-sm'
            )}>
                <button
                    type="button"
                    onClick={() => setAbierto(v => !v)}
                    aria-expanded={abierto}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
                >
                    <span className="h-9 w-9 shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm md:text-base font-extrabold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                            {convs.length} chat{convs.length !== 1 ? 's' : ''} requieren tu atención
                        </span>
                        <span className="block text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                            Pacientes esperando respuesta en la bandeja de WhatsApp.
                        </span>
                    </span>
                    <Link
                        href="/mensajes"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 shadow-sm transition-colors"
                    >
                        Ir a la bandeja
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300 transition-transform', !abierto && '-rotate-90')} />
                </button>

                <AnimatePresence initial={false}>
                    {abierto && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="px-3 pb-3 space-y-2">
                                <AnimatePresence initial={false}>
                                    {convs.map((c, i) => {
                                        const { etiqueta } = carrilDe({
                                            estado: c.estado,
                                            prioridad: c.prioridad,
                                            motivo: c.motivo,
                                            asignadoNombre: c.asignado ? `${c.asignado.nombre} ${c.asignado.apellido}` : null,
                                        })
                                        const nombre = nombreDe(c)
                                        const iniciales = nombre.slice(0, 2).toUpperCase()
                                        const esRojo = c.prioridad === 'rojo'
                                        return (
                                            <motion.div
                                                key={c.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 8) * 0.04 }}
                                                className="flex items-center gap-3 rounded-xl bg-card/80 border border-border/60 px-3 py-2.5 shadow-sm"
                                            >
                                                <span className={cn(
                                                    'h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs',
                                                    esRojo ? 'bg-red-500/20 text-red-700 dark:text-red-300' : 'bg-primary/15 text-primary'
                                                )}>
                                                    {iniciales}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-bold text-sm text-foreground truncate">{nombre}</span>
                                                        <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{horaCorta(c.ultimo_mensaje_at)}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{c.ultimo_mensaje_texto || 'Sin mensajes'}</p>
                                                    <span className={cn(
                                                        'inline-flex items-center mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                                        esRojo ? 'text-red-700 dark:text-red-300 bg-red-500/15' : 'text-amber-700 dark:text-amber-300 bg-amber-500/15'
                                                    )}>
                                                        {etiqueta || MOTIVOS.revisar.etiqueta}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Link
                                                        href={`/mensajes?conv=${c.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/30 rounded-lg px-2.5 py-1.5 transition-colors"
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        Atender
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFinalizar(c.id)}
                                                        disabled={cerrandoId === c.id}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                                                        title="Marcar como resuelto y cerrar el chat"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Finalizar
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

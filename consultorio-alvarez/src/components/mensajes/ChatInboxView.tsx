'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { 
    WhatsAppConversacionRow, 
    WhatsAppMensajeRow,
    enviarMensajeAgente,
    cambiarEstadoConversacion,
    asignarConversacion,
    marcarConversacionLeida,
    EstadoWaConversacion,
    getMensajes
} from '@/lib/actions/whatsapp-chat'
import { createClient } from '@/lib/supabase/client'
import { 
    Search, 
    Send, 
    Bot, 
    User, 
    UserCheck, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Phone, 
    Calendar, 
    Sparkles, 
    RefreshCw, 
    ChevronRight,
    MessageSquare,
    Zap,
    ExternalLink,
    ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

interface ChatInboxViewProps {
    initialConversaciones: WhatsAppConversacionRow[]
    currentUsuario: {
        id: string
        nombre: string
        apellido: string
        rol: string
    }
    operadores: {
        id: string
        nombre: string
        apellido: string
        rol: string
    }[]
    tenantSlug: string
}

const RESPUESTAS_RAPIDAS = [
    {
        titulo: '👋 Saludo y presentación',
        texto: '¡Hola! Te escribe el equipo de recepción de Consultorio Álvarez. ¿En qué te podemos ayudar hoy?'
    },
    {
        titulo: '📸 Solicitar foto para triage',
        texto: 'Para que el profesional de guardia pueda evaluar mejor tu situación, ¿podrías enviarnos una foto clara y bien iluminada de la zona que te molesta?'
    },
    {
        titulo: '📍 Ubicación del consultorio',
        texto: 'Estamos en Consultorio Álvarez. Te esperamos para atenderte con gusto.'
    },
    {
        titulo: '⏳ Profesional en atención',
        texto: 'El odontólogo se encuentra en este momento en quirófano/atención. Ni bien se libere te responderá personalmente. ¡Gracias por tu paciencia!'
    }
]

export function ChatInboxView({
    initialConversaciones,
    currentUsuario,
    operadores,
    tenantSlug
}: ChatInboxViewProps) {
    const [conversaciones, setConversaciones] = useState<WhatsAppConversacionRow[]>(initialConversaciones)
    const [conversacionActivaId, setConversacionActivaId] = useState<string | null>(
        initialConversaciones.length > 0 ? initialConversaciones[0].id : null
    )
    const [mensajes, setMensajes] = useState<WhatsAppMensajeRow[]>([])
    const [isLoadingMensajes, setIsLoadingMensajes] = useState<boolean>(false)
    const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'mis_chats' | 'bot' | 'cerrados'>('todos')
    const [searchQuery, setSearchQuery] = useState('')
    const [textoInput, setTextoInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isPendingAction, startTransition] = useTransition()

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const conversacionActiva = conversaciones.find(c => c.id === conversacionActivaId) || null

    // Scroll to bottom helper
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior })
    }

    // Cargar mensajes cuando cambia la conversación activa
    useEffect(() => {
        if (!conversacionActivaId) {
            setMensajes([])
            return
        }

        let isMounted = true
        setIsLoadingMensajes(true)

        getMensajes(conversacionActivaId)
            .then(res => {
                if (isMounted) {
                    if (res.error) {
                        toast.error('Error al cargar mensajes: ' + res.error)
                    } else {
                        setMensajes(res.mensajes)
                        setTimeout(() => scrollToBottom('auto'), 80)
                    }
                    setIsLoadingMensajes(false)
                }
            })
            .catch(() => {
                if (isMounted) setIsLoadingMensajes(false)
            })

        // Marcar como leídos en la base de datos
        marcarConversacionLeida(conversacionActivaId)
        setConversaciones(prev => prev.map(c => c.id === conversacionActivaId ? { ...c, no_leidos_operador: 0 } : c))

        return () => {
            isMounted = false
        }
    }, [conversacionActivaId])

    // Suscripción Realtime a nuevas conversaciones y mensajes
    useEffect(() => {
        const supabase = createClient()

        // 1. Canal para mensajes nuevos
        const mensajesChannel = supabase
            .channel('wa-mensajes-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'whatsapp_mensajes'
                },
                (payload) => {
                    const nuevo = payload.new as WhatsAppMensajeRow
                    if (nuevo.conversacion_id === conversacionActivaId) {
                        setMensajes(prev => {
                            // Evitar duplicados si ya fue insertado optimísticamente
                            if (prev.some(m => m.id === nuevo.id || (m.wa_message_id && m.wa_message_id === nuevo.wa_message_id))) {
                                return prev
                            }
                            return [...prev, nuevo]
                        })
                        setTimeout(() => scrollToBottom('smooth'), 100)
                    }

                    // Actualizar el snippet del último mensaje en la lista izquierda
                    setConversaciones(prev => {
                        const index = prev.findIndex(c => c.id === nuevo.conversacion_id)
                        if (index === -1) return prev
                        const updated = [...prev]
                        const conv = updated[index]
                        updated[index] = {
                            ...conv,
                            ultimo_mensaje_at: nuevo.created_at,
                            ultimo_mensaje_texto: nuevo.contenido,
                            no_leidos_operador: nuevo.conversacion_id === conversacionActivaId 
                                ? 0 
                                : (conv.no_leidos_operador || 0) + (nuevo.remitente === 'paciente' ? 1 : 0)
                        }
                        // Reordenar para mover la más reciente arriba
                        return updated.sort((a, b) => new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime())
                    })
                }
            )
            .subscribe()

        // 2. Canal para cambios de estado de conversaciones
        const convsChannel = supabase
            .channel('wa-conversaciones-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_conversaciones'
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as WhatsAppConversacionRow
                        setConversaciones(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
                    } else if (payload.eventType === 'INSERT') {
                        const inserted = payload.new as WhatsAppConversacionRow
                        setConversaciones(prev => [inserted, ...prev])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(mensajesChannel)
            supabase.removeChannel(convsChannel)
        }
    }, [conversacionActivaId])

    // Enviar mensaje como operador
    async function handleEnviarMensaje(e?: React.FormEvent) {
        if (e) e.preventDefault()
        if (!conversacionActivaId || !textoInput.trim() || isSending) return

        const textoParaEnviar = textoInput.trim()
        setTextoInput('')
        setIsSending(true)

        // Actualización optimista del feed de mensajes
        const mensajeOptimista: WhatsAppMensajeRow = {
            id: 'temp-' + Date.now(),
            tenant_id: conversacionActiva?.tenant_id || '',
            conversacion_id: conversacionActivaId,
            tipo: 'texto',
            remitente: 'agente',
            agente_id: currentUsuario.id,
            agente_nombre: `${currentUsuario.nombre} ${currentUsuario.apellido}`,
            contenido: `[${currentUsuario.nombre} ${currentUsuario.apellido}]\n${textoParaEnviar}`,
            wa_message_id: null,
            estado_envio: 'enviado',
            created_at: new Date().toISOString()
        }

        setMensajes(prev => [...prev, mensajeOptimista])
        setTimeout(() => scrollToBottom('smooth'), 50)

        const res = await enviarMensajeAgente(conversacionActivaId, textoParaEnviar)
        setIsSending(false)

        if (!res.success) {
            toast.error(res.error || 'Error al enviar mensaje')
            // Revertir optimismo
            setMensajes(prev => prev.filter(m => m.id !== mensajeOptimista.id))
            setTextoInput(textoParaEnviar)
        } else {
            // Actualizar estado local a HUMANO_ATENDIENDO
            setConversaciones(prev => prev.map(c => c.id === conversacionActivaId ? {
                ...c,
                estado: 'HUMANO_ATENDIENDO',
                asignado_a: currentUsuario.id
            } : c))
        }
    }

    // Cambiar estado manual (Tomar chat, Reanudar Bot, Cerrar)
    function handleCambiarEstado(nuevoEstado: EstadoWaConversacion) {
        if (!conversacionActivaId) return

        startTransition(async () => {
            const res = await cambiarEstadoConversacion(conversacionActivaId, nuevoEstado)
            if (res.success) {
                toast.success(`Estado actualizado a: ${nuevoEstado}`)
                setConversaciones(prev => prev.map(c => c.id === conversacionActivaId ? {
                    ...c,
                    estado: nuevoEstado,
                    asignado_a: nuevoEstado === 'BOT' ? null : c.asignado_a
                } : c))
            } else {
                toast.error('Error al actualizar estado: ' + res.error)
            }
        })
    }

    // Tomar chat de inmediato
    function handleTomarChat() {
        if (!conversacionActivaId) return

        startTransition(async () => {
            const res = await asignarConversacion(conversacionActivaId, currentUsuario.id)
            if (res.success) {
                toast.success('Has tomado la atención de esta conversación')
                setConversaciones(prev => prev.map(c => c.id === conversacionActivaId ? {
                    ...c,
                    estado: 'HUMANO_ATENDIENDO',
                    asignado_a: currentUsuario.id
                } : c))
            } else {
                toast.error('Error al tomar chat: ' + res.error)
            }
        })
    }

    // Filtrado de conversaciones
    const conversacionesFiltradas = conversaciones.filter(c => {
        // Filtro por tab
        if (filtro === 'pendientes' && !['HUMANO_PENDIENTE', 'HUMANO_ATENDIENDO'].includes(c.estado)) {
            return false
        }
        if (filtro === 'mis_chats' && c.asignado_a !== currentUsuario.id) {
            return false
        }
        if (filtro === 'bot' && c.estado !== 'BOT') {
            return false
        }
        if (filtro === 'cerrados' && c.estado !== 'CERRADO') {
            return false
        }

        // Filtro por búsqueda
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            const nombre = c.paciente 
                ? `${c.paciente.nombre} ${c.paciente.apellido}`.toLowerCase()
                : (c.nombre_contacto || '').toLowerCase()
            const tel = c.telefono.toLowerCase()
            const ultimo = (c.ultimo_mensaje_texto || '').toLowerCase()

            return nombre.includes(q) || tel.includes(q) || ultimo.includes(q)
        }

        return true
    })

    const pendientesCount = conversaciones.filter(c => c.estado === 'HUMANO_PENDIENTE').length

    return (
        <div className="flex h-[calc(100vh-5.5rem)] rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xl backdrop-blur-md">
            {/* ── COLUMNA IZQUIERDA: LISTA DE CHATS ── */}
            <div className="w-80 md:w-96 border-r border-border flex flex-col bg-muted/20 shrink-0">
                {/* Cabecera & Buscador */}
                <div className="p-4 border-b border-border space-y-3 bg-card/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Mensajes WhatsApp</h1>
                                <p className="text-xs text-muted-foreground">Bandeja Multiatención</p>
                            </div>
                        </div>

                        {pendientesCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                <AlertCircle className="h-3 w-3" />
                                {pendientesCount} {pendientesCount === 1 ? 'urgencia' : 'urgencias'}
                            </span>
                        )}
                    </div>

                    {/* Barra de búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar paciente, teléfono o texto..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
                        />
                    </div>

                    {/* Filtros tipo Pills */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <button
                            onClick={() => setFiltro('todos')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'todos' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFiltro('pendientes')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                                filtro === 'pendientes' ? 'bg-amber-500 text-white shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Pendientes
                            {pendientesCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            )}
                        </button>
                        <button
                            onClick={() => setFiltro('mis_chats')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'mis_chats' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Mis Chats
                        </button>
                        <button
                            onClick={() => setFiltro('bot')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'bot' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Bot Activo
                        </button>
                        <button
                            onClick={() => setFiltro('cerrados')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'cerrados' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Cerrados
                        </button>
                    </div>
                </div>

                {/* Lista de Conversaciones */}
                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                    {conversacionesFiltradas.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
                            <p className="text-sm font-semibold text-muted-foreground">No hay conversaciones</p>
                            <p className="text-xs text-muted-foreground/70">
                                Cuando los pacientes escriban a WhatsApp, sus mensajes aparecerán acá en tiempo real.
                            </p>
                        </div>
                    ) : (
                        conversacionesFiltradas.map((conv) => {
                            const isSelected = conv.id === conversacionActivaId
                            const nombre = conv.paciente 
                                ? `${conv.paciente.nombre} ${conv.paciente.apellido}`
                                : conv.nombre_contacto || `+${conv.telefono}`
                            const iniciales = nombre.slice(0, 2).toUpperCase()

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setConversacionActivaId(conv.id)}
                                    className={cn(
                                        'w-full p-3.5 text-left flex items-start gap-3 transition-colors relative hover:bg-accent/40',
                                        isSelected && 'bg-primary/10 hover:bg-primary/15 border-l-4 border-primary'
                                    )}
                                >
                                    {/* Avatar con estado */}
                                    <div className="relative shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                            {iniciales}
                                        </div>
                                        <span 
                                            className={cn(
                                                'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
                                                conv.estado === 'BOT' && 'bg-emerald-500',
                                                conv.estado === 'HUMANO_PENDIENTE' && 'bg-amber-500 animate-pulse',
                                                conv.estado === 'HUMANO_ATENDIENDO' && 'bg-blue-500',
                                                conv.estado === 'CERRADO' && 'bg-zinc-400'
                                            )}
                                            title={`Estado: ${conv.estado}`}
                                        />
                                    </div>

                                    {/* Info principal */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <span className="font-semibold text-xs truncate text-foreground">
                                                {nombre}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                                {new Date(conv.ultimo_mensaje_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground truncate line-clamp-1">
                                            {conv.ultimo_mensaje_texto || 'Sin mensajes recientes'}
                                        </p>

                                        {/* Badges de estado & no leídos */}
                                        <div className="flex items-center justify-between mt-1.5 text-[10px]">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded',
                                                conv.estado === 'BOT' && 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                                                conv.estado === 'HUMANO_PENDIENTE' && 'text-amber-700 dark:text-amber-400 bg-amber-500/15 font-bold',
                                                conv.estado === 'HUMANO_ATENDIENDO' && 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
                                                conv.estado === 'CERRADO' && 'text-zinc-500 bg-zinc-500/10'
                                            )}>
                                                {conv.estado === 'BOT' && '🤖 Bot'}
                                                {conv.estado === 'HUMANO_PENDIENTE' && '⚠️ Requiere Atención'}
                                                {conv.estado === 'HUMANO_ATENDIENDO' && (conv.asignado ? `🙋 ${conv.asignado.nombre}` : '🙋 En atención')}
                                                {conv.estado === 'CERRADO' && '✓ Cerrado'}
                                            </span>

                                            {conv.no_leidos_operador > 0 && (
                                                <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px]">
                                                    {conv.no_leidos_operador}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── COLUMNA DERECHA: CHAT ACTIVO & MULTIATENCIÓN ── */}
            {conversacionActiva ? (
                <div className="flex-1 flex flex-col bg-background/50">
                    {/* Header del Chat */}
                    <div className="px-5 py-3.5 border-b border-border bg-card/40 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {conversacionActiva.paciente 
                                    ? conversacionActiva.paciente.nombre.slice(0, 1) + conversacionActiva.paciente.apellido.slice(0, 1)
                                    : 'WA'}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-sm truncate">
                                        {conversacionActiva.paciente 
                                            ? `${conversacionActiva.paciente.nombre} ${conversacionActiva.paciente.apellido}`
                                            : conversacionActiva.nombre_contacto || `+${conversacionActiva.telefono}`}
                                    </h2>
                                    {conversacionActiva.paciente && (
                                        <Link 
                                            href={`/pacientes?q=${conversacionActiva.paciente.dni || conversacionActiva.paciente.apellido}`}
                                            className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                                            title="Ver Ficha Clínica"
                                        >
                                            <span>Ficha</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="font-mono">+{conversacionActiva.telefono}</span>
                                    <span>•</span>
                                    <span>Estado: <strong>{conversacionActiva.estado}</strong></span>
                                </p>
                            </div>
                        </div>

                        {/* Botones de control del bot / operador */}
                        <div className="flex items-center gap-2 shrink-0">
                            {conversacionActiva.estado === 'BOT' ? (
                                <button
                                    onClick={handleTomarChat}
                                    disabled={isPendingAction}
                                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>Tomar conversación</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleCambiarEstado('BOT')}
                                        disabled={isPendingAction}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium text-xs flex items-center gap-1.5 hover:bg-emerald-500/25 transition-all cursor-pointer"
                                        title="Reactivar respuesta automática del bot"
                                    >
                                        <Bot className="h-3.5 w-3.5" />
                                        <span>Reactivar Bot</span>
                                    </button>

                                    {conversacionActiva.estado !== 'CERRADO' && (
                                        <button
                                            onClick={() => handleCambiarEstado('CERRADO')}
                                            disabled={isPendingAction}
                                            className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border font-medium text-xs hover:bg-muted/80 transition-all cursor-pointer"
                                        >
                                            <span>Finalizar Chat</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Aviso si el Bot está respondiendo */}
                    {conversacionActiva.estado === 'BOT' && (
                        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                            <span className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-emerald-600 animate-spin-slow shrink-0" />
                                <span>El bot de guardia y notificaciones está activo para este número. Al escribir, tomarás el control manual.</span>
                            </span>
                        </div>
                    )}

                    {conversacionActiva.estado === 'HUMANO_PENDIENTE' && (
                        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                            <span className="flex items-center gap-2 font-medium">
                                <AlertCircle className="h-4 w-4 text-amber-600 animate-bounce shrink-0" />
                                <span>El paciente solicitó atención urgente / recepcionista. Por favor respondé para asistirle.</span>
                            </span>
                            <button
                                onClick={handleTomarChat}
                                className="underline font-bold hover:text-amber-950 dark:hover:text-white cursor-pointer"
                            >
                                Atender ahora
                            </button>
                        </div>
                    )}

                    {/* Feed de Mensajes */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                        {isLoadingMensajes ? (
                            <div className="flex items-center justify-center h-full">
                                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : mensajes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 space-y-2">
                                <MessageSquare className="h-10 w-10 stroke-1" />
                                <p className="text-sm">No hay mensajes previos en esta conversación.</p>
                            </div>
                        ) : (
                            mensajes.map((msg) => {
                                const isPaciente = msg.remitente === 'paciente'
                                const isBot = msg.remitente === 'bot'
                                const isAgente = msg.remitente === 'agente'

                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            'flex flex-col max-w-[80%] md:max-w-[70%]',
                                            isPaciente ? 'self-start items-start' : 'self-end items-end'
                                        )}
                                    >
                                        {/* Remitente Header */}
                                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                                            {isPaciente && <span>{conversacionActiva.paciente?.nombre || 'Paciente'}</span>}
                                            {isBot && (
                                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Bot className="h-3 w-3" />
                                                    Bot Asistente
                                                </span>
                                            )}
                                            {isAgente && (
                                                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                                    <UserCheck className="h-3 w-3" />
                                                    {msg.agente_nombre || 'Operador'}
                                                </span>
                                            )}
                                            <span>•</span>
                                            <span className="font-mono text-[10px]">
                                                {new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* Burbuja de Mensaje */}
                                        <div
                                            className={cn(
                                                'p-3.5 rounded-2xl text-xs md:text-sm shadow-sm whitespace-pre-wrap leading-relaxed',
                                                isPaciente && 'bg-muted/80 text-foreground border border-border rounded-tl-sm',
                                                isBot && 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 border border-emerald-500/20 rounded-tr-sm',
                                                isAgente && 'bg-primary text-primary-foreground rounded-tr-sm font-medium'
                                            )}
                                        >
                                            {/* Imagen adjunta si existe */}
                                            {msg.tipo === 'imagen' && msg.metadata?.media_url && (
                                                <div className="mb-2.5 rounded-xl overflow-hidden border border-border/40 max-w-xs">
                                                    <a href={msg.metadata.media_url} target="_blank" rel="noopener noreferrer" className="block relative group">
                                                        <img 
                                                            src={msg.metadata.media_url} 
                                                            alt="Foto enviada por el paciente" 
                                                            className="w-full max-h-72 object-cover rounded-xl hover:opacity-95 transition-opacity"
                                                        />
                                                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                                                            🔍 Ver en grande
                                                        </span>
                                                    </a>
                                                </div>
                                            )}

                                            {/* Audio / Nota de voz si existe */}
                                            {msg.tipo === 'audio' && msg.metadata?.media_url && (
                                                <div className="mb-2">
                                                    <audio controls src={msg.metadata.media_url} className="w-full max-w-xs h-9 rounded-lg" />
                                                </div>
                                            )}

                                            <div>{msg.contenido}</div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Barra de Respuestas Rápidas */}
                    <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0">
                            <Zap className="h-3 w-3 text-amber-500" />
                            Respuestas Rápidas:
                        </span>
                        {RESPUESTAS_RAPIDAS.map((rr, idx) => (
                            <button
                                key={idx}
                                onClick={() => setTextoInput(rr.texto)}
                                className="px-2.5 py-1 rounded-lg text-xs bg-card border border-border hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground shrink-0 transition-all cursor-pointer"
                                title={rr.texto}
                            >
                                {rr.titulo}
                            </button>
                        ))}
                    </div>

                    {/* Input y Botón de Envío */}
                    <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-border bg-card/60 flex items-end gap-2">
                        <div className="flex-1 bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all p-2">
                            <textarea
                                ref={textareaRef}
                                rows={2}
                                value={textoInput}
                                onChange={e => setTextoInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleEnviarMensaje()
                                    }
                                }}
                                placeholder="Escribí un mensaje... (Presioná Enter para enviar, Shift+Enter para nueva línea)"
                                className="w-full text-xs md:text-sm bg-transparent border-0 focus:outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                            />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                <span className="flex items-center gap-1 font-mono">
                                    Firma: <strong>[{currentUsuario.nombre} {currentUsuario.apellido}]</strong>
                                </span>
                                <span className="text-[10px]">Shift+Enter para salto de línea</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!textoInput.trim() || isSending}
                            className={cn(
                                'h-11 w-11 rounded-xl flex items-center justify-center text-white transition-all shadow-md shrink-0 cursor-pointer',
                                textoInput.trim() && !isSending 
                                    ? 'bg-primary hover:scale-105 active:scale-95' 
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            )}
                            title="Enviar mensaje (Enter)"
                        >
                            {isSending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10 space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <MessageSquare className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold">Seleccioná una conversación</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                        Elegí un chat de la lista izquierda para responder como operador, consultar la ficha del paciente o gestionar la guardia odontológica.
                    </p>
                </div>
            )}
        </div>
    )
}

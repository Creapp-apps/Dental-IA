'use client'

import { useState, useEffect, useLayoutEffect, useRef, useTransition, type ReactNode } from 'react'
import { 
    WhatsAppConversacionRow, 
    WhatsAppMensajeRow,
    enviarMensajeAgente,
    enviarAdjuntoAgente,
    cambiarEstadoConversacion,
    asignarConversacion,
    marcarConversacionLeida,
    EstadoWaConversacion,
    getMensajes,
    getConversaciones,
    adjuntarMediaChatAFicha
} from '@/lib/actions/whatsapp-chat'
import { createClient } from '@/lib/supabase/client'
import { carrilDe, type Carril } from '@/lib/mensajes/triage'
import { useUrlFirmada } from '@/lib/storage/url-firmada'
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
    ChevronDown,
    ChevronLeft,
    MessageSquare,
    Zap,
    ExternalLink,
    ShieldAlert,
    Paperclip,
    Mic,
    Trash2,
    FileText
} from 'lucide-react'
import type { GrabadorVoz } from '@/lib/audio/grabador-voz'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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

const CARRILES: Carril[] = ['rojo', 'amarillo', 'azul', 'verde']
/** Tamaño de página de la lista de conversaciones (filas por "Ver más"). */
const PAGINA_LISTA = 30

/** Botón "Ver más" para paginar una lista de conversaciones. */
function VerMas({ restantes, onClick }: { restantes: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
        >
            Ver más ({restantes} {restantes === 1 ? 'chat' : 'chats'})
        </button>
    )
}

const CARRIL_UI: Record<Carril, {
    titulo: string
    chip: string
    chipActivo: string
    header: string
    badge: string
    punto: string
}> = {
    rojo: {
        titulo: 'Urgente — atención ya',
        chip: '🔴 Urgente',
        chipActivo: 'bg-red-500 text-white shadow-sm',
        header: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
        badge: 'text-red-700 dark:text-red-400 bg-red-500/15',
        punto: 'bg-red-500',
    },
    amarillo: {
        titulo: 'Requiere atención',
        chip: '🟡 Requiere atención',
        chipActivo: 'bg-amber-500 text-white shadow-sm',
        header: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        badge: 'text-amber-700 dark:text-amber-400 bg-amber-500/15',
        punto: 'bg-amber-500',
    },
    azul: {
        titulo: 'En curso',
        chip: '🔵 En curso',
        chipActivo: 'bg-blue-500 text-white shadow-sm',
        header: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
        badge: 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
        punto: 'bg-blue-500',
    },
    verde: {
        titulo: 'Bajo control (el bot se encarga)',
        chip: '🟢 Bajo control',
        chipActivo: 'bg-emerald-500 text-white shadow-sm',
        header: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        badge: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
        punto: 'bg-emerald-500',
    },
}

/**
 * Marca de tiempo estilo WhatsApp para la lista de chats:
 * hoy -> hora (11:19), ayer -> 'Ayer', esta semana -> día corto ('lun'), más viejo -> dd/mm/aa.
 */
function formatFechaChat(iso: string): string {
    const d = new Date(iso)
    const inicioDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const diffDias = Math.round((inicioDia(new Date()) - inicioDia(d)) / 86400000)

    if (diffDias <= 0) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    if (diffDias === 1) return 'Ayer'
    if (diffDias < 7) return d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Clave de día local (para agrupar). Ej: "2026-10-7". */
function claveDia(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Encabezado de día en negrita. Ej: "Viernes 07/11/2026". */
function formatDiaLargo(iso: string): string {
    const d = new Date(iso)
    const dia = d.toLocaleDateString('es-AR', { weekday: 'long' })
    const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${fecha}`
}

/** Fecha + hora completa para el timestamp de cada mensaje del chat.
 *  Ej: "Viernes 07/11/2026 - 05:41 p. m.". */
function formatFechaHoraMensaje(iso: string): string {
    const hora = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return `${formatDiaLargo(iso)} - ${hora}`
}

/**
 * Burbuja de media entrante (foto, nota de voz o documento). Vive aparte porque firmar la URL es un
 * hook y no se puede llamar dentro del .map de mensajes. Mientras firma no muestra nada; si falla, lo avisa.
 */
function MediaMensaje({ tipo, mediaUrl, nombreArchivo }: { tipo: string, mediaUrl: string, nombreArchivo?: string | null }) {
    const { url, cargando } = useUrlFirmada('paciente_adjuntos', mediaUrl)
    if (cargando) return null

    // Si no firmó, avisar que había un adjunto en vez de dejar la burbuja sin rastro.
    if (!url) {
        const queCosa = tipo === 'imagen' ? 'la foto' : tipo === 'documento' ? 'el documento' : 'el audio'
        return (
            <div className="mb-2 text-[11px] italic opacity-70">
                No se pudo cargar {queCosa} adjunto.
            </div>
        )
    }

    if (tipo === 'imagen') {
        return (
            <div className="mb-2.5 rounded-xl overflow-hidden border border-border/40 max-w-xs">
                <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">
                    <img
                        src={url}
                        alt="Foto adjunta"
                        className="w-full max-h-72 object-cover rounded-xl hover:opacity-95 transition-opacity"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                        🔍 Ver en grande
                    </span>
                </a>
            </div>
        )
    }

    if (tipo === 'documento') {
        return (
            <div className="mb-2">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/60 bg-card/60 hover:bg-accent hover:border-primary/40 transition-all max-w-xs"
                >
                    <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold truncate">{nombreArchivo || 'Documento adjunto'}</span>
                        <span className="block text-[10px] text-muted-foreground">Abrir documento</span>
                    </span>
                </a>
            </div>
        )
    }

    return (
        <div className="mb-2">
            <audio controls src={url} className="w-full max-w-xs h-9 rounded-lg" />
        </div>
    )
}

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

    // Abrir una conversación puntual si vienen con ?conv=<id> (p. ej. desde el
    // dashboard "Chats que requieren tu atención"). Se lee del location para no
    // depender de useSearchParams (evita el Suspense boundary en build).
    useEffect(() => {
        const convParam = new URLSearchParams(window.location.search).get('conv')
        if (convParam) setConversacionActivaId(convParam)
    }, [])
    const [mensajes, setMensajes] = useState<WhatsAppMensajeRow[]>([])
    const [adjuntandoId, setAdjuntandoId] = useState<string | null>(null)
    const [adjuntadosIds, setAdjuntadosIds] = useState<Set<string>>(new Set())
    const [isLoadingMensajes, setIsLoadingMensajes] = useState<boolean>(false)
    const [hayMasMensajes, setHayMasMensajes] = useState<boolean>(false)
    const [cargandoAnteriores, setCargandoAnteriores] = useState<boolean>(false)
    const reduce = useReducedMotion()
    const [filtro, setFiltro] = useState<'todos' | Carril | 'cerrados'>('todos')
    const [cerradas, setCerradas] = useState<WhatsAppConversacionRow[] | null>(null)
    const [cargandoCerradas, setCargandoCerradas] = useState(false)
    const [colapsados, setColapsados] = useState<Record<Carril, boolean>>({
        rojo: false, amarillo: false, azul: false, verde: true
    })
    // Paginación de la lista: cuántas filas se muestran por carril (y en cerrados).
    // "Ver más" suma de a PAGINA_LISTA, para no montar/animar cientos de golpe.
    const [visiblesCarril, setVisiblesCarril] = useState<Record<Carril, number>>({
        rojo: PAGINA_LISTA, amarillo: PAGINA_LISTA, azul: PAGINA_LISTA, verde: PAGINA_LISTA
    })
    const [visiblesCerradas, setVisiblesCerradas] = useState<number>(PAGINA_LISTA)
    const [filtroFecha, setFiltroFecha] = useState<'todas' | 'hoy' | '7dias' | 'mes'>('todas')
    const [searchQuery, setSearchQuery] = useState('')
    const [textoInput, setTextoInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [recordSegundos, setRecordSegundos] = useState(0)
    const [isPendingAction, startTransition] = useTransition()

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const feedRef = useRef<HTMLDivElement>(null)
    // Id de la conversación activa, para descartar respuestas de un fetch que llegó tarde
    // después de cambiar de chat (evita mezclar mensajes de otra conversación).
    const activaRef = useRef<string | null>(null)
    // Pedido de restaurar scroll tras anteponer mensajes (lo aplica un useLayoutEffect).
    const restaurarScrollRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const grabadorRef = useRef<GrabadorVoz | null>(null)
    const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const conversacionActiva = conversaciones.find(c => c.id === conversacionActivaId)
        || cerradas?.find(c => c.id === conversacionActivaId)
        || null

    // Cerrados: fetch perezoso al entrar al chip (se refresca cada vez que se entra)
    useEffect(() => {
        if (filtro !== 'cerrados') return
        let isMounted = true
        setCargandoCerradas(true)
        getConversaciones('cerrados')
            .then(res => {
                if (!isMounted) return
                if (res.error) toast.error('Error al cargar cerrados: ' + res.error)
                else setCerradas(res.conversaciones)
                setCargandoCerradas(false)
            })
            .catch(() => { if (isMounted) setCargandoCerradas(false) })
        return () => { isMounted = false }
    }, [filtro])

    // Scroll to bottom helper
    // Al desmontar: cortar micrófono y timer si quedó una grabación abierta.
    useEffect(() => {
        return () => {
            grabadorRef.current?.cancel()
            if (recordTimerRef.current) clearInterval(recordTimerRef.current)
        }
    }, [])

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior })
    }

    // Restaurar la posición de scroll tras anteponer mensajes, de forma determinística
    // (useLayoutEffect corre después del commit del DOM y antes de pintar: sin "salto").
    useLayoutEffect(() => {
        const pedido = restaurarScrollRef.current
        if (!pedido) return
        restaurarScrollRef.current = null
        const c = feedRef.current
        if (c) c.scrollTop = pedido.prevTop + (c.scrollHeight - pedido.prevHeight)
    }, [mensajes])

    // Cargar la página anterior de mensajes (scroll infinito hacia arriba).
    async function handleVerAnteriores() {
        const convId = conversacionActivaId
        if (!convId || cargandoAnteriores || mensajes.length === 0) return
        setCargandoAnteriores(true)
        const antesDe = mensajes[0].created_at
        const res = await getMensajes(convId, { limit: 30, antesDe })
        // Si el usuario cambió de chat mientras cargaba, descartar: no mezclar conversaciones.
        if (activaRef.current !== convId) return
        setCargandoAnteriores(false)
        if (res.error) {
            toast.error('Error al cargar mensajes anteriores: ' + res.error)
            return
        }
        setMensajes(prev => {
            const yaEstan = new Set(prev.map(m => m.id))
            const nuevos = res.mensajes.filter(m => !yaEstan.has(m.id))
            if (nuevos.length === 0) return prev
            // Guardar medidas ANTES del re-render para que el layout effect ancle la vista.
            const c = feedRef.current
            if (c) restaurarScrollRef.current = { prevHeight: c.scrollHeight, prevTop: c.scrollTop }
            return [...nuevos, ...prev]
        })
        setHayMasMensajes(res.hayMas)
    }

    // Cargar mensajes cuando cambia la conversación activa
    useEffect(() => {
        activaRef.current = conversacionActivaId
        // Reset de paginación al cambiar de conversación.
        setCargandoAnteriores(false)
        setHayMasMensajes(false)
        restaurarScrollRef.current = null
        if (!conversacionActivaId) {
            setMensajes([])
            return
        }

        let isMounted = true
        setIsLoadingMensajes(true)

        getMensajes(conversacionActivaId, { limit: 30 })
            .then(res => {
                if (isMounted) {
                    if (res.error) {
                        toast.error('Error al cargar mensajes: ' + res.error)
                    } else {
                        setMensajes(res.mensajes)
                        setHayMasMensajes(res.hayMas)
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
                        // payload.new es la fila cruda: no trae el join `asignado`, así que
                        // preservamos el que ya teníamos para no perder el nombre del operador.
                        setConversaciones(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated, asignado: c.asignado } : c))
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
                asignado_a: currentUsuario.id,
                asignado: { id: currentUsuario.id, nombre: currentUsuario.nombre, apellido: currentUsuario.apellido }
            } : c))
        }
    }

    // Subir y enviar un adjunto (foto o audio). Lo comparten el selector de archivo y la nota de voz.
    async function enviarArchivoAdjunto(file: File) {
        if (!conversacionActivaId || isUploading) return

        const esImagen = file.type.startsWith('image/')
        const esAudio = file.type.startsWith('audio/')
        if (!esImagen && !esAudio) {
            toast.error('Solo se pueden enviar imágenes o audios')
            return
        }
        if (file.size > 16 * 1024 * 1024) {
            toast.error('El archivo supera el límite de 16 MB')
            return
        }

        setIsUploading(true)

        // Burbuja optimista de "enviando"; se reemplaza por el mensaje real al confirmar.
        const tempId = 'temp-media-' + Date.now()
        const mensajeOptimista: WhatsAppMensajeRow = {
            id: tempId,
            tenant_id: conversacionActiva?.tenant_id || '',
            conversacion_id: conversacionActivaId,
            tipo: 'texto',
            remitente: 'agente',
            agente_id: currentUsuario.id,
            agente_nombre: `${currentUsuario.nombre} ${currentUsuario.apellido}`,
            contenido: esImagen ? '📷 Enviando foto…' : '🎤 Enviando audio…',
            wa_message_id: null,
            estado_envio: 'enviado',
            created_at: new Date().toISOString()
        }
        setMensajes(prev => [...prev, mensajeOptimista])
        setTimeout(() => scrollToBottom('smooth'), 50)

        const formData = new FormData()
        formData.append('file', file)

        const res = await enviarAdjuntoAgente(conversacionActivaId, formData)
        setIsUploading(false)
        setMensajes(prev => prev.filter(m => m.id !== tempId))

        if (!res.success) {
            toast.error(res.error || 'No se pudo enviar el archivo')
        } else {
            if (res.mensaje) setMensajes(prev => [...prev, res.mensaje!])
            setConversaciones(prev => prev.map(c => c.id === conversacionActivaId ? {
                ...c,
                estado: 'HUMANO_ATENDIENDO',
                asignado_a: currentUsuario.id,
                asignado: { id: currentUsuario.id, nombre: currentUsuario.nombre, apellido: currentUsuario.apellido }
            } : c))
            setTimeout(() => scrollToBottom('smooth'), 50)
        }
    }

    // Elegir foto o audio desde el disco
    function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = '' // permitir re-seleccionar el mismo archivo
        if (file) enviarArchivoAdjunto(file)
    }

    // Grabar nota de voz (ogg/opus -> waveform en WhatsApp)
    async function handleIniciarGrabacion() {
        if (isRecording || isUploading || !conversacionActivaId) return
        try {
            const { iniciarGrabacionVoz } = await import('@/lib/audio/grabador-voz')
            grabadorRef.current = await iniciarGrabacionVoz()
            setIsRecording(true)
            setRecordSegundos(0)
            recordTimerRef.current = setInterval(() => setRecordSegundos(s => s + 1), 1000)
        } catch (err: any) {
            console.error('[VOZ] Error al iniciar grabación:', err)
            toast.error(err?.message || 'No se pudo acceder al micrófono')
        }
    }

    function detenerTimerGrabacion() {
        if (recordTimerRef.current) {
            clearInterval(recordTimerRef.current)
            recordTimerRef.current = null
        }
        setIsRecording(false)
        setRecordSegundos(0)
    }

    async function handleEnviarGrabacion() {
        const grabador = grabadorRef.current
        if (!grabador) return
        detenerTimerGrabacion()
        try {
            const file = await grabador.stop()
            grabadorRef.current = null
            await enviarArchivoAdjunto(file)
        } catch (err: any) {
            console.error('[VOZ] Error al finalizar grabación:', err)
            toast.error('No se grabó audio')
        }
    }

    function handleCancelarGrabacion() {
        grabadorRef.current?.cancel()
        grabadorRef.current = null
        detenerTimerGrabacion()
    }

    // Adjuntar a la ficha del paciente un archivo recibido por WhatsApp.
    async function handleAdjuntarFicha(mensajeId: string) {
        const pacienteId = conversacionActiva?.paciente?.id
        if (!pacienteId) {
            toast.error('Esta conversación no está vinculada a un paciente registrado. Registrá o vinculá al paciente primero.')
            return
        }
        setAdjuntandoId(mensajeId)
        try {
            const res = await adjuntarMediaChatAFicha(mensajeId, pacienteId)
            if (res.success) {
                setAdjuntadosIds(prev => new Set(prev).add(mensajeId))
                toast.success('Archivo adjuntado a la ficha del paciente')
            } else {
                toast.error(res.error || 'No se pudo adjuntar a la ficha')
            }
        } finally {
            setAdjuntandoId(null)
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
                    asignado_a: nuevoEstado === 'BOT' ? null : c.asignado_a,
                    asignado: nuevoEstado === 'BOT' ? null : c.asignado
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
                    asignado_a: currentUsuario.id,
                    asignado: { id: currentUsuario.id, nombre: currentUsuario.nombre, apellido: currentUsuario.apellido }
                } : c))
            } else {
                toast.error('Error al tomar chat: ' + res.error)
            }
        })
    }

    // Filtros transversales (fecha del último mensaje + búsqueda)
    const pasaFiltros = (c: WhatsAppConversacionRow) => {
        if (filtroFecha !== 'todas') {
            const t = new Date(c.ultimo_mensaje_at).getTime()
            const ahora = Date.now()
            let desde = 0
            if (filtroFecha === 'hoy') desde = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
            else if (filtroFecha === '7dias') desde = ahora - 7 * 86400000
            else if (filtroFecha === 'mes') desde = ahora - 30 * 86400000
            if (t < desde) return false
        }

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
    }

    const triageDe = (c: WhatsAppConversacionRow) => carrilDe({
        estado: c.estado,
        prioridad: c.prioridad,
        motivo: c.motivo,
        asignadoNombre: c.asignado ? `${c.asignado.nombre} ${c.asignado.apellido ?? ''}`.trim() : null,
    })

    // Set activo (todo menos cerrados) con filtros transversales, agrupado por carril
    const activasFiltradas = conversaciones.filter(c => c.estado !== 'CERRADO' && pasaFiltros(c))
    const porCarril: Record<Carril, { conv: WhatsAppConversacionRow; etiqueta: string }[]> = {
        rojo: [], amarillo: [], azul: [], verde: []
    }
    for (const c of activasFiltradas) {
        const { carril, etiqueta } = triageDe(c)
        porCarril[carril].push({ conv: c, etiqueta })
    }
    const cerradasFiltradas = (cerradas ?? []).filter(pasaFiltros)
    const carrilesVisibles = filtro === 'todos' ? CARRILES : CARRILES.filter(k => k === filtro)
    const hayResultados = filtro === 'cerrados'
        ? cerradasFiltradas.length > 0
        : carrilesVisibles.some(k => porCarril[k].length > 0)

    const renderFila = (conv: WhatsAppConversacionRow, carril: Carril | null, etiqueta: string, index = 0) => {
                            const isSelected = conv.id === conversacionActivaId
                            const nombre = conv.paciente
                                ? `${conv.paciente.nombre} ${conv.paciente.apellido}`
                                : conv.nombre_contacto || `+${conv.telefono}`
                            const iniciales = nombre.slice(0, 2).toUpperCase()

                            return (
                                <motion.button
                                    key={conv.id}
                                    initial={reduce ? false : { opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22, delay: Math.min(index, 6) * 0.03, ease: [0.22, 1, 0.36, 1] }}
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
                                                carril ? CARRIL_UI[carril].punto : 'bg-zinc-400',
                                                carril === 'rojo' && 'animate-pulse'
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
                                            <span className="text-[11px] font-bold text-foreground/80 shrink-0 font-mono">
                                                {formatFechaChat(conv.ultimo_mensaje_at)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground truncate line-clamp-1">
                                            {conv.ultimo_mensaje_texto || 'Sin mensajes recientes'}
                                        </p>

                                        {/* Badges de estado & no leídos */}
                                        <div className="flex items-center justify-between mt-1.5 text-[10px]">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded truncate',
                                                carril ? CARRIL_UI[carril].badge : 'text-zinc-500 bg-zinc-500/10',
                                                carril === 'rojo' && 'font-bold'
                                            )}>
                                                {carril ? etiqueta : '✓ Cerrado'}
                                            </span>

                                            {conv.no_leidos_operador > 0 && (
                                                <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px]">
                                                    {conv.no_leidos_operador}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            )
    }

    // Render de las filas de un carril. Con FECHA=Todas, subdivide por día
    // intercalando un encabezado en negrita antes de la primera fila de cada día.
    // (La lista ya viene ordenada por ultimo_mensaje_at desc.)
    const renderFilas = (items: { conv: WhatsAppConversacionRow; etiqueta: string }[], k: Carril) => {
        if (filtroFecha !== 'todas') {
            return items.map(({ conv, etiqueta }, i) => renderFila(conv, k, etiqueta, i))
        }
        const out: ReactNode[] = []
        let diaActual: string | null = null
        items.forEach(({ conv, etiqueta }, i) => {
            const clave = claveDia(conv.ultimo_mensaje_at)
            if (clave !== diaActual) {
                diaActual = clave
                out.push(
                    <div
                        key={`dia-${k}-${clave}`}
                        className="px-3.5 py-1.5 bg-muted/50 text-xs font-extrabold text-foreground uppercase tracking-wide"
                    >
                        {formatDiaLargo(conv.ultimo_mensaje_at)}
                    </div>
                )
            }
            out.push(renderFila(conv, k, etiqueta, i))
        })
        return out
    }

    const pendientesCount = conversaciones.filter(c => c.estado === 'HUMANO_PENDIENTE').length

    return (
        <div className="flex h-[calc(100dvh-4.5rem)] lg:h-[calc(100dvh-5.5rem)] rounded-none border-0 shadow-none lg:rounded-2xl lg:border lg:border-border/80 lg:shadow-xl bg-card overflow-hidden backdrop-blur-md">
            {/* ── COLUMNA IZQUIERDA: LISTA DE CHATS ──
                En mobile es una sola columna por vez: la lista se oculta cuando hay
                una conversación abierta (se vuelve con la flecha del header). */}
            <div className={cn(
                'w-full md:w-96 border-r border-border flex-col bg-muted/20 shrink-0',
                conversacionActivaId ? 'hidden md:flex' : 'flex'
            )}>
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

                    {/* Chips de carril (triage) */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <button
                            onClick={() => setFiltro('todos')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'todos' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Todo <span className="opacity-70">{activasFiltradas.length}</span>
                        </button>
                        {CARRILES.map(k => (
                            <button
                                key={k}
                                onClick={() => setFiltro(k)}
                                className={cn(
                                    'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                    filtro === k ? CARRIL_UI[k].chipActivo : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {CARRIL_UI[k].chip} <span className="opacity-70">{porCarril[k].length}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => setFiltro('cerrados')}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                filtro === 'cerrados' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Cerrados{cerradas ? <> <span className="opacity-70">{cerradasFiltradas.length}</span></> : null}
                        </button>
                    </div>

                    {/* Filtro por fecha */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <span className="flex items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 pr-1 shrink-0">
                            Fecha:
                        </span>
                        {([
                            { id: 'todas', label: 'Todas' },
                            { id: 'hoy', label: 'Hoy' },
                            { id: '7dias', label: '7 días' },
                            { id: 'mes', label: 'Mes' }
                        ] as const).map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFiltroFecha(opt.id)}
                                className={cn(
                                    'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                                    filtroFecha === opt.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de Conversaciones (grupos colapsables por carril) */}
                <div className="flex-1 overflow-y-auto">
                    {/* Crossfade al cambiar de filtro: la lista entra en cascada, no de golpe. */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`${filtro}|${filtroFecha}`}
                            initial={reduce ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={reduce ? undefined : { opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                            {filtro === 'cerrados' && cargandoCerradas && cerradas === null ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">Cargando cerrados...</div>
                            ) : !hayResultados ? (
                                <div className="p-8 text-center space-y-2">
                                    <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
                                    <p className="text-sm font-semibold text-muted-foreground">No hay conversaciones</p>
                                    <p className="text-xs text-muted-foreground/70">
                                        Cuando los pacientes escriban a WhatsApp, sus mensajes aparecerán acá en tiempo real.
                                    </p>
                                </div>
                            ) : filtro === 'cerrados' ? (
                                <div className="divide-y divide-border/60">
                                    {cerradasFiltradas.slice(0, visiblesCerradas).map((conv, i) => renderFila(conv, null, '', i))}
                                    {cerradasFiltradas.length > visiblesCerradas && (
                                        <VerMas
                                            restantes={cerradasFiltradas.length - visiblesCerradas}
                                            onClick={() => setVisiblesCerradas(v => v + PAGINA_LISTA)}
                                        />
                                    )}
                                </div>
                            ) : (
                                carrilesVisibles.map(k => {
                                    const items = porCarril[k]
                                    if (items.length === 0) return null
                                    // Si el filtro activo ES este carril, lo mostramos siempre expandido
                                    // (no tiene sentido ver un único grupo colapsado al filtrar por él).
                                    // Al buscar, también expandimos: el resultado tiene que verse
                                    // directo, no colapsado dentro de su solapa.
                                    const hayBusqueda = searchQuery.trim().length > 0
                                    const abierto = filtro === k || hayBusqueda ? true : !colapsados[k]
                                    return (
                                        <div key={k}>
                                            <button
                                                type="button"
                                                onClick={() => setColapsados(prev => ({ ...prev, [k]: !prev[k] }))}
                                                aria-expanded={abierto}
                                                className={cn(
                                                    'w-full px-3.5 py-2 flex items-center gap-2 text-xs font-bold border-y sticky top-0 z-10 backdrop-blur-sm',
                                                    CARRIL_UI[k].header
                                                )}
                                            >
                                                <span className={cn('h-2 w-2 rounded-full shrink-0', CARRIL_UI[k].punto)} />
                                                <span className="flex-1 text-left truncate">{CARRIL_UI[k].titulo}</span>
                                                <span className="font-mono opacity-80">{items.length}</span>
                                                <motion.span
                                                    animate={{ rotate: abierto ? 0 : -90 }}
                                                    transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                                    className="shrink-0"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </motion.span>
                                            </button>
                                            {/* Colapso fluido: height + opacity en vez de corte seco. */}
                                            <AnimatePresence initial={false}>
                                                {abierto && (
                                                    <motion.div
                                                        key="body"
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="divide-y divide-border/60">
                                                            {renderFilas(items.slice(0, visiblesCarril[k]), k)}
                                                            {items.length > visiblesCarril[k] && (
                                                                <VerMas
                                                                    restantes={items.length - visiblesCarril[k]}
                                                                    onClick={() => setVisiblesCarril(prev => ({ ...prev, [k]: prev[k] + PAGINA_LISTA }))}
                                                                />
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── COLUMNA DERECHA: CHAT ACTIVO & MULTIATENCIÓN ── */}
            {conversacionActiva ? (
                <motion.div
                    key={conversacionActiva.id}
                    initial={reduce ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 min-w-0 flex flex-col bg-background/50 overflow-x-hidden"
                >
                    {/* Header del Chat */}
                    <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card/40 flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => setConversacionActivaId(null)}
                                className="md:hidden shrink-0 -ml-1 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:bg-muted transition-colors"
                                title="Volver a la lista"
                                aria-label="Volver a la lista de chats"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
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
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                    <span className="sm:hidden">Tomar</span>
                                    <span className="hidden sm:inline">Tomar conversación</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleCambiarEstado('BOT')}
                                        disabled={isPendingAction}
                                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium text-xs flex items-center gap-1.5 hover:bg-emerald-500/25 transition-all cursor-pointer"
                                        title="Reactivar respuesta automática del bot"
                                    >
                                        <Bot className="h-3.5 w-3.5 shrink-0" />
                                        <span className="hidden sm:inline">Reactivar Bot</span>
                                    </button>

                                    {conversacionActiva.estado !== 'CERRADO' && (
                                        <button
                                            onClick={() => handleCambiarEstado('CERRADO')}
                                            disabled={isPendingAction}
                                            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border font-medium text-xs hover:bg-muted/80 transition-all cursor-pointer whitespace-nowrap"
                                        >
                                            <span className="sm:hidden">Cerrar</span>
                                            <span className="hidden sm:inline">Finalizar Chat</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Avisos de estado — bajan/suben con el colapso en vez de aparecer de golpe. */}
                    <AnimatePresence initial={false}>
                        {conversacionActiva.estado === 'BOT' && (
                            <motion.div
                                key="banner-bot"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                            >
                                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                                    <span className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-emerald-600 animate-spin-slow shrink-0" />
                                        <span>El bot de guardia y notificaciones está activo para este número. Al escribir, tomarás el control manual.</span>
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {conversacionActiva.estado === 'HUMANO_PENDIENTE' && (
                            <motion.div
                                key="banner-pendiente"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                            >
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
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Feed de Mensajes */}
                    <div ref={feedRef} className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 space-y-3.5">
                        {/* Paginación hacia atrás: carga los mensajes anteriores de a 30. */}
                        {hayMasMensajes && !isLoadingMensajes && (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleVerAnteriores}
                                    disabled={cargandoAnteriores}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {cargandoAnteriores ? (
                                        <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Cargando…</>
                                    ) : (
                                        <>Ver mensajes anteriores</>
                                    )}
                                </button>
                            </div>
                        )}
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
                                    <motion.div
                                        key={msg.id}
                                        initial={reduce ? false : { opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
                                            <span className="font-mono text-[11px] font-bold text-foreground/90">
                                                {formatFechaHoraMensaje(msg.created_at)}
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
                                            {/* Foto, audio o documento adjunto si existe */}
                                            {(msg.tipo === 'imagen' || msg.tipo === 'audio' || msg.tipo === 'documento') && msg.metadata?.media_url && (
                                                <MediaMensaje tipo={msg.tipo} mediaUrl={msg.metadata.media_url} nombreArchivo={msg.metadata?.doc_filename} />
                                            )}

                                            <div>{msg.contenido}</div>
                                        </div>

                                        {/* Adjuntar a la ficha: solo para archivos entrantes del paciente */}
                                        {isPaciente && (msg.tipo === 'imagen' || msg.tipo === 'documento') && msg.metadata?.media_url && (
                                            <div className="mt-2">
                                                {adjuntadosIds.has(msg.id) || (msg.metadata as any)?.adjuntado_ficha ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                        Guardado en la ficha
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdjuntarFicha(msg.id)}
                                                        disabled={adjuntandoId === msg.id}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/30 hover:border-primary/50 rounded-lg px-3 py-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <Paperclip className="h-4 w-4 shrink-0" />
                                                        {adjuntandoId === msg.id ? 'Adjuntando…' : 'Adjuntar a la ficha'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,audio/*"
                            className="hidden"
                            onChange={handleSeleccionarArchivo}
                        />
                        <AnimatePresence mode="wait" initial={false}>
                        {isRecording ? (
                            <motion.div
                                key="rec"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduce ? undefined : { opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="flex-1 flex items-center gap-3 h-11 px-3 rounded-xl border border-red-500/40 bg-red-500/5"
                            >
                                <button
                                    type="button"
                                    onClick={handleCancelarGrabacion}
                                    disabled={isUploading}
                                    title="Cancelar grabación"
                                    className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <span className="flex items-center gap-2 text-sm font-mono text-red-600 dark:text-red-400 flex-1 min-w-0">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                    Grabando… {Math.floor(recordSegundos / 60)}:{String(recordSegundos % 60).padStart(2, '0')}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleEnviarGrabacion}
                                    disabled={isUploading}
                                    title="Enviar nota de voz"
                                    className={cn(
                                        'h-9 w-9 rounded-lg flex items-center justify-center text-white bg-primary transition-all shrink-0 cursor-pointer',
                                        isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                                    )}
                                >
                                    {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="input"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={reduce ? undefined : { opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="flex-1 flex items-end gap-2"
                            >
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isSending}
                                    title="Adjuntar foto o audio"
                                    className={cn(
                                        'h-11 w-11 rounded-xl flex items-center justify-center border border-border bg-background text-muted-foreground transition-all shrink-0 cursor-pointer',
                                        isUploading
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-accent hover:text-foreground hover:border-primary/40'
                                    )}
                                >
                                    {isUploading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleIniciarGrabacion}
                                    disabled={isUploading || isSending}
                                    title="Grabar nota de voz"
                                    className={cn(
                                        'h-11 w-11 rounded-xl flex items-center justify-center border border-border bg-background text-muted-foreground transition-all shrink-0 cursor-pointer',
                                        isUploading || isSending
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-accent hover:text-foreground hover:border-primary/40'
                                    )}
                                >
                                    <Mic className="h-4 w-4" />
                                </button>
                                <div className="flex-1 min-w-0 bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all p-2">
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
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                        <span className="flex items-center gap-1 font-mono min-w-0 truncate">
                                            Firma: <strong>[{currentUsuario.nombre} {currentUsuario.apellido}]</strong>
                                        </span>
                                        <span className="hidden sm:inline text-[10px] shrink-0">Shift+Enter para salto de línea</span>
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
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 bg-muted/10 space-y-3">
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

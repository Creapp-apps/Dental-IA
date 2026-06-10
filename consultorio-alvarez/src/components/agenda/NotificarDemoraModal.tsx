'use client'

import { useState, useEffect, useTransition } from 'react'
import { MessageSquare, ExternalLink, Clock, Send } from 'lucide-react'
import { format, parseISO, addMinutes } from 'date-fns'
import { GlassDialog, GlassDialogContent, GlassDialogHeader, GlassDialogTitle, GlassDialogDescription, GlassDialogFooter } from '../ui/glass-dialog'
import { GlassButton } from '../ui/glass-button'
import { glassAlert } from '../ui/glass-alert'
import { notificarDemoraTurno } from '@/lib/actions/reservas'

interface NotificarDemoraModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    turno: any // Objeto turno completo
}

export function NotificarDemoraModal({ open, onOpenChange, turno }: NotificarDemoraModalProps) {
    const [demora, setDemora] = useState<number>(20)
    const [mensaje, setMensaje] = useState<string>('')
    const [isPending, startTransition] = useTransition()

    const paciente = turno?.paciente
    const telefono = paciente?.telefono || ''
    const nombreCompleto = paciente ? `${paciente.nombre} ${paciente.apellido}` : 'Paciente'

    // Calcular la hora original y estimada
    const horaOriginalStr = turno?.fecha_inicio ? format(parseISO(turno.fecha_inicio), 'HH:mm') : ''
    const nuevaHoraStr = turno?.fecha_inicio 
        ? format(addMinutes(parseISO(turno.fecha_inicio), demora), 'HH:mm') 
        : ''

    useEffect(() => {
        if (!turno) return
        const nombre = paciente?.nombre || 'Paciente'
        const txt = `Hola ${nombre}! Te escribimos del Consultorio Álvarez. Queríamos avisarte que tenemos una pequeña demora de ${demora} minutos en la agenda. Tu turno programado para las ${horaOriginalStr} se estima para las ${nuevaHoraStr}. ¡Lamentamos los inconvenientes!`
        setMensaje(txt)
    }, [turno, demora, horaOriginalStr, nuevaHoraStr, paciente])

    if (!turno) return null

    function getCleanPhone(phone: string): string {
        let clean = phone.replace(/\D/g, '')
        // Si empieza con 0, le sacamos el 0
        if (clean.startsWith('0')) {
            clean = clean.substring(1)
        }
        // Si no empieza con 54, asumimos Argentina
        if (!clean.startsWith('54')) {
            clean = `549${clean}`
        } else if (clean.startsWith('54') && !clean.startsWith('549')) {
            // Meta API oficial usa 54, pero wa.me prefiere 549 para celulares de AR
            clean = `549${clean.substring(2)}`
        }
        return clean
    }

    const cleanPhone = getCleanPhone(telefono)
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`

    function handleSendManual() {
        window.open(waLink, '_blank')
        // Registrar la notificación en la DB
        startTransition(async () => {
            await notificarDemoraTurno(turno.id, demora, mensaje, 'MANUAL')
            glassAlert.success({ title: 'Enlace de WhatsApp abierto', description: 'Se registró el aviso en el historial del turno.' })
            onOpenChange(false)
        })
    }

    function handleSendOfficial() {
        startTransition(async () => {
            const res = await notificarDemoraTurno(turno.id, demora, mensaje, 'OFICIAL')
            if (res?.success) {
                glassAlert.success({ title: 'Notificación enviada', description: 'Mensaje despachado mediante la API oficial.' })
                onOpenChange(false)
            } else {
                glassAlert.error({ title: 'Error al enviar', description: res?.error || 'Asegúrese de tener configuradas las credenciales de WhatsApp.' })
            }
        })
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-lg">
                <GlassDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex shrink-0 items-center justify-center rounded-full bg-emerald-500/20 w-10 h-10">
                            <MessageSquare className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <GlassDialogTitle>Avisar Demora por WhatsApp</GlassDialogTitle>
                            <GlassDialogDescription className="mt-1.5">
                                Notifica al paciente sobre el retraso en el consultorio.
                            </GlassDialogDescription>
                        </div>
                    </div>
                </GlassDialogHeader>

                <div className="space-y-4 my-4">
                    {/* Paciente y Teléfono */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Paciente</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{nombreCompleto}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Teléfono: {telefono || 'No registrado'}</p>
                    </div>

                    {/* Tiempo de Demora */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                            Minutos de Demora
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[15, 20, 30, 45].map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setDemora(m)}
                                    className={`py-2 px-3 text-sm font-semibold rounded-xl border transition-all ${
                                        demora === m
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                    }`}
                                >
                                    {m} min
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comparación de Horario */}
                    <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-300">Ajuste de horario</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs line-through text-muted-foreground mr-2">{horaOriginalStr} hs</span>
                            <span className="text-sm font-bold text-amber-400">{nuevaHoraStr} hs</span>
                        </div>
                    </div>

                    {/* Mensaje a Enviar */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                            Mensaje Preview
                        </label>
                        <textarea
                            value={mensaje}
                            onChange={(e) => setMensaje(e.target.value)}
                            rows={4}
                            className="w-full text-sm rounded-xl bg-white/5 border border-white/10 p-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                        />
                    </div>
                </div>

                <GlassDialogFooter>
                    <GlassButton
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancelar
                    </GlassButton>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {/* Enviar Oficial si API está disponible, o simplemente ofrecer ambas opciones */}
                        <GlassButton
                            variant="glass"
                            onClick={handleSendOfficial}
                            disabled={isPending || !telefono}
                            className="flex-1 sm:flex-initial text-xs"
                            title="Enviar notificación automática vía Meta API"
                        >
                            <Send className="h-3.5 w-3.5 mr-1.5 text-primary" />
                            API Oficial
                        </GlassButton>

                        <GlassButton
                            variant="success"
                            onClick={handleSendManual}
                            disabled={isPending || !telefono}
                            className="flex-1 sm:flex-initial text-xs"
                            title="Abrir chat de WhatsApp Web/App pre-cargado"
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-white" />
                            WhatsApp Manual
                        </GlassButton>
                    </div>
                </GlassDialogFooter>
            </GlassDialogContent>
        </GlassDialog>
    )
}

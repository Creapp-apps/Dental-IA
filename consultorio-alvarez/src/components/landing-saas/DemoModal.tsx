'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck, PhoneCall } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DemoModalProps {
    isOpen: boolean
    onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
    const [nombre, setNombre] = useState('')
    const [clinica, setClinica] = useState('')
    const [telefono, setTelefono] = useState('')
    const [sillones, setSillones] = useState('1 a 3 sillones')
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        // Construir mensaje predeterminado para WhatsApp Comercial
        const mensaje = encodeURIComponent(
            `¡Hola Dental-IA! 👋 Me gustaría agendar una demostración en vivo de la plataforma.\n\n` +
            `👤 *Nombre:* ${nombre}\n` +
            `🏥 *Consultorio/Clínica:* ${clinica}\n` +
            `📱 *WhatsApp:* ${telefono}\n` +
            `🦷 *Tamaño:* ${sillones}\n\n` +
            `¿Qué disponibilidad tienen para coordinar una llamada de 15 minutos?`
        )

        // Redirigir a WhatsApp oficial de Dental-IA
        const whatsappUrl = `https://wa.me/5491130288564?text=${mensaje}`
        
        setIsSubmitted(true)
        setTimeout(() => {
            window.open(whatsappUrl, '_blank')
        }, 800)
    }

    const handleClose = () => {
        setIsSubmitted(false)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-lg rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 text-left text-slate-900 shadow-2xl">
                {!isSubmitted ? (
                    <div>
                        <DialogHeader className="gap-1 text-left">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                Agendar Demo en Vivo
                            </span>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                                Conocé Dental-IA en tiempo real
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                                Coordinemos una videollamada de 15 minutos para mostrarte la plataforma adaptada con el logo y el flujo de trabajo de tu consultorio.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="demo-nombre" className="text-xs font-semibold text-slate-700">
                                    Nombre y Apellido
                                </Label>
                                <Input
                                    id="demo-nombre"
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Dr. Santiago Álvarez"
                                    className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600/30"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="demo-clinica" className="text-xs font-semibold text-slate-700">
                                    Nombre de la Clínica o Consultorio
                                </Label>
                                <Input
                                    id="demo-clinica"
                                    type="text"
                                    required
                                    value={clinica}
                                    onChange={(e) => setClinica(e.target.value)}
                                    placeholder="Ej: Centro Odontológico Álvarez"
                                    className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600/30"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="demo-whatsapp" className="text-xs font-semibold text-slate-700">
                                        WhatsApp de Contacto
                                    </Label>
                                    <Input
                                        id="demo-whatsapp"
                                        type="tel"
                                        required
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="+54 9 11 ..."
                                        className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600/30"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="demo-sillones" className="text-xs font-semibold text-slate-700">
                                        Cantidad de Sillones
                                    </Label>
                                    <select
                                        id="demo-sillones"
                                        value={sillones}
                                        onChange={(e) => setSillones(e.target.value)}
                                        className="w-full h-11 px-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all cursor-pointer"
                                    >
                                        <option value="1 a 2 sillones">1 a 2 sillones</option>
                                        <option value="3 a 5 sillones">3 a 5 sillones</option>
                                        <option value="Más de 5 sillones">Más de 5 sillones (Clínica)</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <PhoneCall className="w-4 h-4" />
                                Coordinar Demo por WhatsApp
                                <ArrowRight className="w-4 h-4" />
                            </Button>

                            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-2">
                                <span className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    Datos protegidos
                                </span>
                                <span>•</span>
                                <span>Respuesta rápida en horario comercial</span>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="py-6 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">
                            ¡Solicitud Recibida!
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                            Te estamos redirigiendo a nuestro canal de WhatsApp para coordinar el día y horario que mejor te convenga.
                        </DialogDescription>
                        <div className="pt-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="rounded-xl border-slate-200 text-slate-700"
                            >
                                Cerrar ventana
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState } from 'react'
import { X, Bot, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, PhoneCall } from 'lucide-react'

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

    if (!isOpen) return null

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
        const whatsappUrl = `https://wa.me/5491123456789?text=${mensaje}` // número comercial
        
        setIsSubmitted(true)
        setTimeout(() => {
            window.open(whatsappUrl, '_blank')
        }, 800)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-500/20 text-left overflow-hidden">
                {/* Luz de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Botón Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {!isSubmitted ? (
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Demostración Personalizada en Vivo</span>
                        </div>

                        <h3 className="text-2xl font-black text-white tracking-tight">
                            Descubrí el potencial de Dental-IA para tu clínica
                        </h3>

                        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Coordinemos una llamada de 15 minutos donde te mostraremos la plataforma adaptada con el logo y colores de tu propio consultorio.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Nombre y Apellido
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Dr. Santiago Álvarez"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Nombre de la Clínica o Consultorio
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={clinica}
                                    onChange={(e) => setClinica(e.target.value)}
                                    placeholder="Ej: Centro Odontológico Norte"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        WhatsApp de Contacto
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="+54 9 11 ..."
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Cantidad de Sillones
                                    </label>
                                    <select
                                        value={sillones}
                                        onChange={(e) => setSillones(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer"
                                    >
                                        <option value="1 a 2 sillones">1 a 2 sillones</option>
                                        <option value="3 a 5 sillones">3 a 5 sillones</option>
                                        <option value="Más de 5 sillones">Más de 5 sillones (Clínica)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                            >
                                <PhoneCall className="w-4 h-4" />
                                Coordinar Demo por WhatsApp Inmediata
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-2">
                                <span className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                    Datos 100% protegidos
                                </span>
                                <span>•</span>
                                <span>Respuesta en menos de 10 min</span>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-white">
                            ¡Solicitud Recibida con Éxito!
                        </h3>
                        <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                            Te estamos redirigiendo a nuestro WhatsApp oficial para agendar la llamada en el horario que te quede más cómodo.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                Cerrar ventana
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

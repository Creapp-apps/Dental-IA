'use client'

import { useState } from 'react'
import { 
    Bot, 
    Check, 
    CheckCheck, 
    Send, 
    Sparkles, 
    Clock, 
    ShieldCheck, 
    CreditCard, 
    ChevronRight,
    ArrowRight
} from 'lucide-react'
import { TextType } from '@/components/ui/TextType'

interface Message {
    id: string
    sender: 'bot' | 'user'
    text: string
    time: string
    buttons?: string[]
}

export function InteractiveWhatsAppPhone() {
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: '👋 Hola Martín, te escribimos de *Centro Odontológico Dental-IA*.\n\nTe recordamos tu turno de consulta programado para mañana:\n\n🗓️ *Jueves 12 de Septiembre - 16:00 hs*\n👨‍⚕️ *Dr. Santiago Álvarez* (Sillón 1)\n🏥 Cobertura: *OSDE 310*\n\n¿Nos confirmás tu asistencia?',
            time: '14:20',
            buttons: ['✅ Confirmar Asistencia', '🗓️ Reprogramar Horario']
        }
    ])

    const handleAction = (userText: string, botReply: string, buttons?: string[]) => {
        if (isTyping) return

        const now = new Date()
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'user',
            text: userText,
            time: timeStr
        }])

        setIsTyping(true)

        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: botReply,
                time: timeStr,
                buttons
            }])
            setIsTyping(false)
        }, 750)
    }

    const reset = () => {
        setMessages([
            {
                id: '1',
                sender: 'bot',
                text: '👋 Hola Martín, te escribimos de *Centro Odontológico Dental-IA*.\n\nTe recordamos tu turno de consulta programado para mañana:\n\n🗓️ *Jueves 12 de Septiembre - 16:00 hs*\n👨‍⚕️ *Dr. Santiago Álvarez* (Sillón 1)\n🏥 Cobertura: *OSDE 310*\n\n¿Nos confirmás tu asistencia?',
                time: '14:20',
                buttons: ['✅ Confirmar Asistencia', '🗓️ Reprogramar Horario']
            }
        ])
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Panel de Controles y Explicación */}
            <div className="lg:col-span-7 space-y-5 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Integración Oficial con Meta
                </span>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Confirmaciones, cancelaciones y señas en piloto automático
                </h3>

                <div className="min-h-[44px]">
                    <TextType
                        text="El bot interactúa con el paciente con lenguaje natural y formal del consultorio. Cada respuesta impacta de inmediato en la agenda del doctor sin que la secretaria tenga que enviar mensajes manuales."
                        as="p"
                        className="text-sm text-slate-600 leading-relaxed inline"
                        typingSpeed={14}
                        initialDelay={350}
                        startOnVisible={true}
                        loop={false}
                        showCursor={true}
                        cursorCharacter="|"
                        cursorClassName="text-blue-600 font-bold ml-0.5"
                    />
                </div>

                {/* Acciones interactivas para el visitante */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Hacé clic en una acción real para probar el bot:
                        </span>
                        <button
                            onClick={reset}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                        >
                            Reiniciar
                        </button>
                    </div>

                    <button
                        onClick={() => handleAction(
                            '✅ Confirmo mi asistencia para las 16:00 hs',
                            '¡Excelente Martín! Tu turno quedó *CONFIRMADO* en el sistema. ✅\n\nTe esperamos 10 minutos antes en Av. Corrientes 1450, Piso 3.\n\nAl ingresar, presentá tu credencial digital de OSDE en recepción.'
                        )}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                            1. Confirmar asistencia con 1 toque
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                        onClick={() => handleAction(
                            '🗓️ Se me complicó con el trabajo, ¿puedo cambiar de día?',
                            'Entendido Martín. Para el *Dr. Álvarez* tenemos estos próximos huecos libres:\n\n1️⃣ Viernes 13 - 11:30 hs\n2️⃣ Lunes 16 - 15:00 hs\n3️⃣ Martes 17 - 17:30 hs\n\n¿Cuál preferís que te reservemos?',
                            ['Viernes 11:30 hs', 'Lunes 15:00 hs']
                        )}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                            2. Reprogramar turno sin intervención humana
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                        onClick={() => handleAction(
                            '💳 ¿Cómo abono la seña de reserva por Mercado Pago?',
                            '🔒 Para confirmar el sillón, podés abonar la seña de *$10.000* directamente mediante este enlace seguro:\n\n👉 *link.mercadopago.com.ar/dental-ia-reserva*\n\nUna vez realizado, la agenda se actualiza automáticamente.',
                            ['Abonar $10.000 con Mercado Pago']
                        )}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                            3. Cobro de seña preventiva (Mercado Pago)
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Smartphone Corporativo Limpio */}
            <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-[340px] rounded-[42px] p-3 bg-slate-800 shadow-2xl border-4 border-slate-700 relative">
                    <div className="w-full h-[540px] bg-[#efeae2] rounded-[32px] overflow-hidden flex flex-col relative font-sans">
                        {/* Barra WhatsApp Verde Oficial */}
                        <div className="bg-[#008069] text-white pt-6 pb-2.5 px-3 flex items-center gap-2.5 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                                🦷
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold truncate">Centro Odontológico</span>
                                    <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center shrink-0">
                                        <Check className="w-2 h-2 text-[#008069] stroke-[3]" />
                                    </div>
                                </div>
                                <span className="text-[10px] text-emerald-100 block">
                                    {isTyping ? 'escribiendo...' : 'Cuenta verificada • En línea'}
                                </span>
                            </div>
                        </div>

                        {/* Mensajes */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs text-slate-800">
                            {messages.map(m => (
                                <div
                                    key={m.id}
                                    className={`flex flex-col max-w-[85%] ${
                                        m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                                    }`}
                                >
                                    <div
                                        className={`p-2.5 rounded-xl shadow-xs whitespace-pre-line leading-relaxed ${
                                            m.sender === 'user'
                                                ? 'bg-[#d9fdd3] rounded-tr-none'
                                                : 'bg-white rounded-tl-none border border-slate-100'
                                        }`}
                                    >
                                        {m.text}

                                        {m.buttons && m.buttons.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                                {m.buttons.map((btn, i) => (
                                                    <div
                                                        key={i}
                                                        className="text-center py-1 px-2 rounded bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700"
                                                    >
                                                        {btn}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="text-[9px] text-slate-400 text-right mt-1 font-mono flex items-center justify-end gap-0.5">
                                            <span>{m.time}</span>
                                            {m.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-500 inline" />}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="mr-auto bg-white p-2.5 rounded-xl rounded-tl-none border border-slate-100 shadow-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                                </div>
                            )}
                        </div>

                        {/* Input bar */}
                        <div className="p-2 bg-[#f0f2f5] flex items-center gap-2 border-t border-slate-200">
                            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400">
                                Escribí un mensaje...
                            </div>
                            <div className="w-8 h-8 rounded-full bg-[#008069] flex items-center justify-center text-white">
                                <Send className="w-3.5 h-3.5 ml-0.5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { 
    Bot, 
    Check, 
    CheckCheck, 
    Send, 
    Sparkles, 
    Smartphone, 
    ShieldCheck, 
    Clock, 
    Zap, 
    Calendar, 
    CreditCard,
    ChevronRight,
    ArrowRight
} from 'lucide-react'

interface Message {
    id: string
    sender: 'bot' | 'user'
    text: string
    time: string
    buttons?: string[]
    badge?: string
}

export function WhatsAppSimulator({ onOpenDemo }: { onOpenDemo: () => void }) {
    const [isTyping, setIsTyping] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: '👋 ¡Hola Martín! Te escribo de *Dental-IA Clínica*. Notamos que tenés pendiente tu control semestral de ortodoncia. ¿Te gustaría que te reservemos un lugar esta semana?',
            time: '14:20'
        }
    ])

    const handlePromptClick = (userText: string, botReply: string, buttons?: string[]) => {
        if (isTyping) return

        const now = new Date()
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`

        // 1. Agregar mensaje del usuario
        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: userText,
            time: timeString
        }

        setMessages((prev) => [...prev, userMsg])
        setIsTyping(true)

        // 2. Simular respuesta del bot con indicador de tipeo
        setTimeout(() => {
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: botReply,
                time: timeString,
                buttons: buttons
            }
            setMessages((prev) => [...prev, botMsg])
            setIsTyping(false)
        }, 800)
    }

    const resetChat = () => {
        setMessages([
            {
                id: '1',
                sender: 'bot',
                text: '👋 ¡Hola Martín! Te escribo de *Dental-IA Clínica*. Notamos que tenés pendiente tu control semestral de ortodoncia. ¿Te gustaría que te reservemos un lugar esta semana?',
                time: '14:20'
            }
        ])
    }

    return (
        <section id="whatsapp-ia" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
            {/* Header de la Sección */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold mb-4">
                    <Bot className="w-4 h-4" />
                    <span>Asistente Autónomo Oficial de WhatsApp</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    Tu consultorio responde y confirma turnos <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">mientras vos atendés</span>
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300">
                    Probá el simulador interactivo. Hacé clic en cualquiera de las opciones para ver cómo nuestra Inteligencia Artificial atiende a tus pacientes en segundos.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* ── COLUMNA IZQUIERDA: CONTROLES INTERACTIVOS Y VALOR CLÍNICO ── */}
                <div className="lg:col-span-6 space-y-6 text-left">
                    <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Simulador de Conversación
                            </span>
                            <button
                                onClick={resetChat}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 cursor-pointer"
                            >
                                Reiniciar chat
                            </button>
                        </div>

                        <p className="text-sm text-slate-300 mb-4 font-medium">
                            Hacé clic en una acción real para ver la respuesta del bot:
                        </p>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => handlePromptClick(
                                    'Sí, dale. ¿Qué horarios tienen para el jueves?',
                                    '¡Perfecto! Para este *Jueves 12* con el *Dr. Santiago Álvarez* tengo disponibles:\n\n1️⃣ 11:30 hs\n2️⃣ 16:00 hs\n3️⃣ 18:30 hs\n\n¿Cuál te queda más cómodo?',
                                    ['11:30 hs', '16:00 hs', '18:30 hs']
                                )}
                                className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs sm:text-sm text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <span className="font-semibold text-white group-hover:text-emerald-300">
                                    🗓️ "¿Qué horarios tienen para el jueves?"
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                onClick={() => handlePromptClick(
                                    'Elijo a las 16:00 hs. ¿Tengo que abonar seña previa?',
                                    '¡Reservado para el *Jueves a las 16:00 hs*!\n\n🔒 Para confirmar el turno en el sillón, solicitamos una seña de *$10.000* que se descuenta del total de tu consulta.\n\nPodes abonarla directamente aquí en 1 clic:',
                                    ['💳 Pagar Seña Mercado Pago ($10.000)']
                                )}
                                className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs sm:text-sm text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <span className="font-semibold text-white group-hover:text-emerald-300">
                                    💳 "Elijo a las 16:00 hs. ¿Cómo pago la seña?"
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                onClick={() => handlePromptClick(
                                    '¿Atienden con Swiss Medical u OSDE?',
                                    '¡Sí, atendemos con ambas!\n\nTrabajamos con reintegro y planes directos de *OSDE, Swiss Medical, Galeno y Medifé*.\n\nAl llegar al consultorio sólo presentás tu credencial digital y DNI.',
                                    ['Ver todas las Obras Sociales']
                                )}
                                className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs sm:text-sm text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <span className="font-semibold text-white group-hover:text-emerald-300">
                                    🏥 "¿Atienden con OSDE o Swiss Medical?"
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </button>

                            <button
                                onClick={() => handlePromptClick(
                                    '¡Se me cayó un provisorio y me duele mucho!',
                                    '🚨 *URGENCIA ODONTOLÓGICA REGISTRADA*\n\nTe asignamos prioridad inmediata. Acercate hoy a las *18:15 hs* para alivio y cementado de urgencia.\n\n📍 Consultorio Álvarez: Av. Corrientes 1450, Piso 3.',
                                    ['Aceptar Urgencia 18:15 hs']
                                )}
                                className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs sm:text-sm text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <span className="font-semibold text-rose-300 group-hover:text-rose-200">
                                    🚨 "Tengo una urgencia de dolor agudo"
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                    </div>

                    {/* Ventajas Clínicas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Zap className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-white">Respuesta en 3 segundos</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Sin demoras ni mensajes perdidos. El paciente recibe atención inmediata aunque sea de noche o fin de semana.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-white">Blindaje contra Ausencias</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Recordatorios automatizados 48hs y 24hs antes. Si el paciente cancela, el bot ofrece el hueco al siguiente en lista de espera.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── COLUMNA DERECHA: MOCKUP SMARTPHONE WHATSAPP ── */}
                <div className="lg:col-span-6 flex justify-center">
                    <div className="w-full max-w-[340px] sm:max-w-[370px] rounded-[45px] p-3.5 bg-slate-900 border-[3px] border-slate-700 shadow-2xl shadow-emerald-500/10 relative">
                        {/* Dynamic Island / Parlante */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mr-3 border border-slate-700/50" />
                        </div>

                        {/* Pantalla Interna de WhatsApp */}
                        <div className="w-full h-[580px] bg-[#0b141a] rounded-[36px] overflow-hidden flex flex-col relative border border-white/5 font-sans">
                            
                            {/* Barra Superior WhatsApp */}
                            <div className="pt-8 pb-3 px-4 bg-[#1f2c34] border-b border-white/5 flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                        🦷
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1f2c34]" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-sm text-white">Dental-IA Asistente</span>
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-emerald-400 font-medium block">
                                        {isTyping ? 'escribiendo...' : 'en línea • Respuesta oficial'}
                                    </span>
                                </div>
                            </div>

                            {/* Área de Mensajes */}
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                                <div className="text-center my-1">
                                    <span className="px-2.5 py-1 rounded-md bg-[#182229] text-[10px] text-slate-400 font-medium">
                                        HOY
                                    </span>
                                </div>

                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`flex flex-col max-w-[85%] ${
                                            m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                                        }`}
                                    >
                                        <div
                                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-md whitespace-pre-line ${
                                                m.sender === 'user'
                                                    ? 'bg-[#005c4b] text-white rounded-tr-none'
                                                    : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-white/5'
                                            }`}
                                        >
                                            {m.text}

                                            {/* Botones simulados dentro del mensaje */}
                                            {m.buttons && m.buttons.length > 0 && (
                                                <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                                                    {m.buttons.map((btn, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="text-center py-1.5 px-3 rounded-lg bg-[#00a884] text-slate-950 font-bold text-[11px] shadow-sm flex items-center justify-center gap-1"
                                                        >
                                                            {btn}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                                                <span>{m.time}</span>
                                                {m.sender === 'user' && (
                                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400 inline" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Animación de Escribiendo */}
                                {isTyping && (
                                    <div className="mr-auto p-3 rounded-2xl rounded-tl-none bg-[#202c33] border border-white/5 flex items-center gap-1.5 shadow-md">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                )}
                            </div>

                            {/* Barra Inferior del Teclado */}
                            <div className="p-2.5 bg-[#1f2c34] border-t border-white/5 flex items-center gap-2">
                                <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
                                    <span>Escribe un mensaje...</span>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950 font-bold shadow-md">
                                    <Send className="w-4 h-4 ml-0.5" />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

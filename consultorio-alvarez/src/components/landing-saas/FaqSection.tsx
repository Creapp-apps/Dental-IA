'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const faqs = [
        {
            question: '¿Tengo que cambiar mi número de WhatsApp actual?',
            answer: 'Podrás seguir atendiendo tu consultorio desde tu número de WhatsApp original. Pero para realizar la automatización del chatbot, Meta requiere un número 100% nuevo y sin intervención humana.'
        },
        {
            question: '¿Puedo migrar mi base de pacientes desde Excel u otro sistema?',
            answer: 'Totalmente. Contamos con herramientas de importación masiva en formato Excel y CSV. Además, nuestro equipo de soporte técnico te asiste en la migración de tus pacientes y fichas anteriores sin costo adicional.'
        },
        {
            question: '¿Dental-IA cobra alguna comisión por los turnos o señas cobradas?',
            answer: 'Cero comisiones. A diferencia de otras plataformas que retienen porcentajes de cada turno, en Dental-IA tu cuenta de Mercado Pago se vincula de manera directa. El 100% del dinero de las señas ingresa a tu propia cuenta bancaria o billetera digital.'
        },
        {
            question: '¿Los odontólogos colaboradores pueden ver la recaudación total o pacientes de otros?',
            answer: 'No. El sistema cuenta con roles de seguridad estrictos. Cada profesional colaborador sólo tiene acceso a su propia agenda, a sus pacientes asignados y al porcentaje de sus liquidaciones. Sólo el Administrador o Director Médico tiene visibilidad de las finanzas generales del consultorio.'
        },
        {
            question: '¿Qué equipamiento necesito en el consultorio?',
            answer: 'Cualquier dispositivo con conexión a internet: computadora de escritorio, notebook, iPad, tablet Android o smartphone. No requiere instalaciones pesadas ni servidores físicos en el consultorio; todo funciona de forma ágil y segura en la nube.'
        },
        {
            question: '¿Cómo funciona la prueba gratis de 15 días?',
            answer: 'Accedés a todas las funciones premium del sistema sin necesidad de ingresar tarjeta de crédito. Si durante los 15 días comprobás que el sistema llena tu agenda y te ahorra horas de trabajo, elegís el plan que mejor se adapte a tu consultorio.'
        }
    ]

    return (
        <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-semibold mb-4">
                    <HelpCircle className="w-4 h-4" />
                    <span>Resolución de Dudas</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    Preguntas Frecuentes
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300">
                    Todo lo que necesitás saber antes de comenzar a usar Dental-IA en tu consultorio.
                </p>
            </div>

            {/* Acordeón */}
            <div className="space-y-4 text-left">
                {faqs.map((faq, idx) => {
                    const isOpen = openIndex === idx
                    return (
                        <div
                            key={idx}
                            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                                isOpen
                                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                                    : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                            }`}
                        >
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : idx)}
                                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                            >
                                <span className="font-bold text-base sm:text-lg text-white">
                                    {faq.question}
                                </span>
                                <div className={`w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-cyan-500/20' : ''}`}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            {isOpen && (
                                <div className="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

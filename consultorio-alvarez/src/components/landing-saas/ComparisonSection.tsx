'use client'

import { X, Check, ArrowRight, Sparkles, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'

export function ComparisonSection({ onOpenDemo }: { onOpenDemo: () => void }) {
    const comparisonData = [
        {
            feature: 'Gestión de Turnos y Mensajes',
            traditional: 'WhatsApp desbordado, mensajes sin responder a deshoras y turnos anotados en cuaderno o Excel.',
            dentalIa: 'Asistente de WhatsApp con Inteligencia Artificial que responde y agenda turnos 24/7 automáticamente.'
        },
        {
            feature: 'Tasa de Ausentismo de Pacientes',
            traditional: 'Entre 25% y 40% de ausencias. Huecos imprevistos que dejan el sillón vacío y generan pérdidas.',
            dentalIa: 'Reducción de hasta un 78% con recordatorios inteligentes y cobro preventivo de seña con Mercado Pago.'
        },
        {
            feature: 'Ficha Odontológica y Diagnóstico',
            traditional: 'Papeles guardados en carpetas físicas propensas a extravío y fichas clínicas ilegibles.',
            dentalIa: 'Odontograma digital 3D interactivo con registro por caras, fotos radiográficas e historial en la nube.'
        },
        {
            feature: 'Liquidación a Odontólogos',
            traditional: 'Cálculos manuales a fin de mes con calculadora y discusiones por porcentajes no registrados.',
            dentalIa: 'Liquidación automática en 1 clic calculando porcentajes exactos por cada tratamiento realizado.'
        },
        {
            feature: 'Presencia e Imagen Profesional',
            traditional: 'Dependencia de redes sociales sin página web propia ni sistema de reservas formal para pacientes.',
            dentalIa: 'Web institucional con dominio propio del consultorio (ej: tuconsultorio.ar) y logo corporativo.'
        },
        {
            feature: 'Seguridad y Respaldo de Datos',
            traditional: 'Riesgo total de pérdida si la computadora de recepción se rompe o es robada.',
            dentalIa: 'Infraestructura cloud con copias de seguridad automáticas diarias y encriptación de grado médico.'
        }
    ]

    return (
        <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-semibold mb-4">
                    <Sparkles className="w-4 h-4" />
                    <span>Transformación Digital Real</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    ¿Por qué las mejores clínicas eligen <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">Dental-IA</span>?
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300">
                    Descubrí la diferencia entre gestionar tu consultorio a la antigua vs. operar con tecnología clínica de clase mundial.
                </p>
            </div>

            {/* Tarjeta Comparativa Doble */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                
                {/* ── COLUMNA: CONSULTORIO TRADICIONAL ── */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/40 border border-rose-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                                    El Método Antiguo
                                </span>
                                <h3 className="text-2xl font-black text-white mt-1">
                                    Consultorio Tradicional
                                </h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-6 text-left">
                            {comparisonData.map((item, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <span className="text-xs font-semibold text-slate-400 block">
                                        {item.feature}
                                    </span>
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                                            <X className="w-3 h-3 stroke-[3]" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                            {item.traditional}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <span className="text-xs text-rose-400/80 font-medium">
                            Consecuencia: Sillones vacíos, pérdida de ingresos y desgaste del equipo.
                        </span>
                    </div>
                </div>

                {/* ── COLUMNA: CON DENTAL-IA ── */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-950 border-2 border-cyan-500/40 relative overflow-hidden shadow-2xl shadow-cyan-500/10 flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between pb-6 border-b border-cyan-500/30 mb-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Nueva Generación
                                </span>
                                <h3 className="text-2xl font-black text-white mt-1">
                                    Con Dental-IA
                                </h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-6 text-left">
                            {comparisonData.map((item, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <span className="text-xs font-semibold text-cyan-400 block">
                                        {item.feature}
                                    </span>
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                            {item.dentalIa}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-cyan-500/20 relative z-10">
                        <button
                            onClick={onOpenDemo}
                            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Quiero transformar mi consultorio
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </section>
    )
}

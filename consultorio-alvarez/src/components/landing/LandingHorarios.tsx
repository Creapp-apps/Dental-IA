'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock } from 'lucide-react'
import type { HorarioAtencion } from '@/types'

interface Props {
    horarios: HorarioAtencion[]
    colorPrimario: string
}

const DIA_LABEL: Record<number, string> = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
    4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
}
const DIA_SHORT: Record<number, string> = {
    0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
}

export function LandingHorarios({ horarios, colorPrimario }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-60px' })

    const actuales = [...horarios].sort((a, b) => {
        const ord = (d: number) => d === 0 ? 7 : d
        return ord(a.dia) - ord(b.dia)
    })

    return (
        <section id="horarios" className="py-20 md:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                    {/* LEFT — Title */}
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.65 }}
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: colorPrimario }}>
                            Horarios
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                            Cuando<br />
                            nos necesités
                        </h2>
                        <p className="text-base text-gray-500 leading-relaxed max-w-sm">
                            Contamos con amplia disponibilidad durante la semana para adaptarnos a tu agenda.
                        </p>

                        {/* Visual day indicators */}
                        <div className="flex gap-1.5 mt-8">
                            {actuales.map((h) => (
                                <div
                                    key={h.dia}
                                    className="flex flex-col items-center gap-1"
                                    title={`${DIA_LABEL[h.dia]}: ${h.activo ? `${h.apertura} – ${h.cierre}` : 'Cerrado'}`}
                                >
                                    <div
                                        className="w-8 h-10 rounded-lg flex items-end justify-center pb-1.5 text-[9px] font-bold transition-all"
                                        style={h.activo
                                            ? { backgroundColor: colorPrimario, color: 'white' }
                                            : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                                        }
                                    >
                                        {DIA_SHORT[h.dia]}
                                    </div>
                                    <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: h.activo ? colorPrimario : '#e2e8f0' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* RIGHT — Schedule list */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.65, delay: 0.2 }}
                        className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
                    >
                        {actuales.map((h, i) => (
                            <motion.div
                                key={h.dia}
                                initial={{ opacity: 0, x: 20 }}
                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                                className={`flex items-center justify-between px-6 py-4 ${i < actuales.length - 1 ? 'border-b border-gray-50' : ''
                                    } ${h.activo ? 'bg-white' : 'bg-gray-50/60'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-2 w-2 rounded-full shrink-0"
                                        style={{ backgroundColor: h.activo ? colorPrimario : '#d1d5db' }}
                                    />
                                    <span className={`text-sm font-semibold ${h.activo ? 'text-gray-800' : 'text-gray-400'}`}>
                                        {DIA_LABEL[h.dia]}
                                    </span>
                                </div>
                                {h.activo ? (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                        {h.apertura} – {h.cierre}
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                        Cerrado
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

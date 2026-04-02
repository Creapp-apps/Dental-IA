'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Award, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Profesional } from '@/types'

interface Props {
    profesionales: Profesional[]
    colorPrimario: string
}

function Initials({ prof, color }: { prof: Profesional; color: string }) {
    return (
        <div
            className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg mx-auto mb-5"
            style={{ backgroundColor: color }}
        >
            {prof.nombre[0]}{prof.apellido[0]}
        </div>
    )
}

export function LandingProfesionales({ profesionales, colorPrimario }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-60px' })
    const [current, setCurrent] = useState(0)

    const prev = () => setCurrent(c => (c === 0 ? profesionales.length - 1 : c - 1))
    const next = () => setCurrent(c => (c === profesionales.length - 1 ? 0 : c + 1))

    return (
        <section id="profesionales" className="py-20 md:py-28 overflow-hidden" style={{ backgroundColor: '#f8faff' }}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT — Header content */}
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, x: -40 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        {/* Avatar stack */}
                        <div className="flex items-center gap-1 mb-6">
                            {profesionales.map((p, i) => (
                                <div
                                    key={p.id}
                                    className="h-9 w-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                    style={{
                                        backgroundColor: p.color_agenda,
                                        marginLeft: i > 0 ? '-10px' : '0',
                                        zIndex: profesionales.length - i,
                                        position: 'relative',
                                    }}
                                >
                                    {p.nombre[0]}{p.apellido[0]}
                                </div>
                            ))}
                            <span
                                className="ml-3 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: `${colorPrimario}12`, color: colorPrimario }}
                            >
                                +{profesionales.length} especialistas
                            </span>
                        </div>

                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
                            style={{ color: colorPrimario }}
                        >
                            Especialistas
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                            Los profesionales<br />
                            detrás de tu sonrisa
                        </h2>
                        <p className="text-base text-gray-500 leading-relaxed max-w-sm mb-8">
                            Un equipo de especialistas comprometidos con tu salud, combinando precisión, empatía y experiencia.
                        </p>

                        {/* Carousel controls */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={prev}
                                className="h-11 w-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center shadow-sm transition-all hover:shadow-md active:scale-95"
                            >
                                <ChevronLeft className="h-4 w-4 text-gray-600" />
                            </button>
                            <span className="text-sm font-bold text-gray-900">
                                {String(current + 1).padStart(2, '0')}
                                <span className="text-gray-300 mx-1">/</span>
                                <span className="text-gray-400">{String(profesionales.length).padStart(2, '0')}</span>
                            </span>
                            <button
                                onClick={next}
                                className="h-11 w-11 rounded-full border flex items-center justify-center transition-all hover:shadow-md active:scale-95 text-white shadow-md"
                                style={{ backgroundColor: colorPrimario, borderColor: colorPrimario }}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>

                    {/* RIGHT — Cards */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="relative flex gap-4 overflow-visible"
                    >
                        {profesionales.map((prof, i) => {
                            const distance = (i - current + profesionales.length) % profesionales.length
                            const isActive = distance === 0
                            const isNext = distance === 1
                            const props = {
                                scale: isActive ? 1 : isNext ? 0.9 : 0.82,
                                opacity: isActive ? 1 : isNext ? 0.55 : 0.25,
                                x: isActive ? 0 : isNext ? 60 : 100,
                                zIndex: isActive ? 10 : isNext ? 5 : 1,
                            }

                            return (
                                <motion.div
                                    key={prof.id}
                                    animate={props}
                                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="absolute top-0 left-0 w-64 rounded-3xl bg-white border border-gray-100 shadow-xl p-7 cursor-pointer shrink-0"
                                    onClick={() => setCurrent(i)}
                                    whileHover={isActive ? { y: -4 } : {}}
                                >
                                    {/* Specialty badge at top */}
                                    {prof.especialidad && (
                                        <div
                                            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-5"
                                            style={{ backgroundColor: `${prof.color_agenda}15`, color: prof.color_agenda }}
                                        >
                                            {prof.especialidad}
                                        </div>
                                    )}

                                    {/* Avatar */}
                                    <Initials prof={prof} color={prof.color_agenda} />

                                    {/* Name */}
                                    <h3 className="text-center font-bold text-gray-900 text-lg leading-tight mb-1">
                                        {prof.nombre} {prof.apellido}
                                    </h3>

                                    {/* Specialty */}
                                    {prof.especialidad && (
                                        <div className="flex items-center justify-center gap-1 mb-3">
                                            <Award className="h-3.5 w-3.5" style={{ color: colorPrimario }} />
                                            <span className="text-xs font-medium" style={{ color: colorPrimario }}>
                                                {prof.especialidad}
                                            </span>
                                        </div>
                                    )}

                                    {prof.matricula && (
                                        <p className="text-center text-xs text-gray-400 mb-3">{prof.matricula}</p>
                                    )}

                                    {prof.descripcion && (
                                        <p className="text-center text-xs text-gray-500 leading-relaxed line-clamp-3">
                                            {prof.descripcion}
                                        </p>
                                    )}
                                </motion.div>
                            )
                        })}

                        {/* Spacer to give height to the absolute container */}
                        <div className="h-[380px] w-[280px]" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

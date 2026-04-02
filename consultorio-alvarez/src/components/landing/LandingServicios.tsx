'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import type { TipoTratamiento } from '@/types'
import { PRIORIDAD_LABEL } from '@/types'

interface Props {
    tratamientos: TipoTratamiento[]
    colorPrimario: string
    slugTenant: string
}

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function LandingServicios({ tratamientos, colorPrimario, slugTenant }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-80px' })

    return (
        <section id="servicios" className="py-20 md:py-28 bg-white relative overflow-hidden">
            {/* Decorative blob */}
            <div
                className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${colorPrimario}, transparent)`, filter: 'blur(60px)' }}
            />

            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="mb-14"
                >
                    <p
                        className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
                        style={{ color: colorPrimario }}
                    >
                        Servicios
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight max-w-md">
                            ¿Qué tratamos?
                        </h2>
                        <Link
                            href={`/c/${slugTenant}/reservar`}
                            className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors self-start sm:self-auto"
                            style={{ color: colorPrimario }}
                        >
                            Reservar turno
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </motion.div>

                {/* Grid */}
                <motion.div
                    ref={ref}
                    variants={containerVariants}
                    initial="hidden"
                    animate={inView ? 'visible' : 'hidden'}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {tratamientos.map((t) => (
                        <motion.div
                            key={t.id}
                            variants={cardVariants}
                            whileHover={{
                                y: -6,
                                boxShadow: `0 20px 40px ${t.color}22, 0 4px 12px rgba(0,0,0,0.06)`,
                                transition: { duration: 0.25 },
                            }}
                            className="group relative bg-white rounded-2xl border border-gray-100 p-6 cursor-default overflow-hidden"
                        >
                            {/* Top accent bar */}
                            <div
                                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                                style={{ backgroundColor: t.color }}
                            />

                            {/* Color dot */}
                            <div className="flex items-center gap-2 mb-4">
                                <div
                                    className="h-8 w-8 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${t.color}18` }}
                                >
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                                </div>
                                <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${t.color}12`, color: t.color }}
                                >
                                    {PRIORIDAD_LABEL[t.prioridad]}
                                </span>
                            </div>

                            <h3 className="font-bold text-gray-900 text-base mb-2 leading-tight">
                                {t.nombre}
                            </h3>

                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-auto">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{t.duracion_minutos} minutos</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

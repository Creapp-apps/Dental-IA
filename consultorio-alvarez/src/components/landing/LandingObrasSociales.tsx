'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import type { ObraSocial } from '@/types'

interface Props {
    obrasSociales: ObraSocial[]
    colorPrimario: string
}

export function LandingObrasSociales({ obrasSociales, colorPrimario }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-60px' })

    return (
        <section id="obras-sociales" className="py-20 md:py-24" style={{ backgroundColor: '#f8faff' }}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: colorPrimario }}>
                        Cobertura
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                        Obras sociales aceptadas
                    </h2>
                    <p className="mt-4 text-gray-500 max-w-sm mx-auto">
                        Trabajamos con las principales obras sociales y prepagas del país.
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                    {obrasSociales.map((os, i) => (
                        <motion.div
                            key={os.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={inView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
                            whileHover={{ y: -3, boxShadow: `0 8px 24px ${colorPrimario}18` }}
                            className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-5 py-3 cursor-default shadow-sm"
                        >
                            <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: colorPrimario }} />
                            <span className="text-sm font-semibold text-gray-700">{os.nombre}</span>
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.5 }}
                    className="text-center text-sm text-gray-400 mt-8"
                >
                    ¿Tu obra social no está en la lista?{' '}
                    <a href="#contacto" className="underline underline-offset-2 font-medium" style={{ color: colorPrimario }}>
                        Consultanos sin cargo
                    </a>
                </motion.p>
            </div>
        </section>
    )
}

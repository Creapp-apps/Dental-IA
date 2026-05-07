'use client'

import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import type { LandingConfig } from '@/lib/types/landing'

interface ObrasSocialesSectionProps {
    config: LandingConfig
    obrasSociales: any[]
}

export function ObrasSocialesSection({ config, obrasSociales }: ObrasSocialesSectionProps) {
    return (
        <section className="relative py-24 sm:py-32 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-6"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Coberturas Médicas
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                    >
                        Obras Sociales y Prepagas
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-lg leading-8 text-white/60"
                    >
                        Trabajamos con las principales coberturas del país para brindarte la mejor atención médica sin preocupaciones.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {obrasSociales.map((obra, index) => {
                        const planes = obra.planes ? obra.planes.split(',').map((p: string) => p.trim()).filter(Boolean) : []
                        
                        return (
                            <motion.div
                                key={obra.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: Math.min(index * 0.1, 0.5) }}
                                className="group relative rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white/10 hover:shadow-2xl flex flex-col h-full"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                        {obra.nombre}
                                    </h3>
                                </div>
                                
                                {planes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-white/10">
                                        {planes.map((plan: string, i: number) => (
                                            <span 
                                                key={i} 
                                                className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 border border-white/5 group-hover:border-primary/30 group-hover:text-white transition-colors"
                                            >
                                                {plan}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-auto pt-4 border-t border-white/10">
                                        <p className="text-sm text-white/40 italic">Todos los planes</p>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

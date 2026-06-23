'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Search, X } from 'lucide-react'
import type { LandingConfig } from '@/lib/types/landing'

interface ObrasSocialesSectionProps {
    config: LandingConfig
    obrasSociales: any[]
}

export function ObrasSocialesSection({ config, obrasSociales }: ObrasSocialesSectionProps) {
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')

    const visibleObras = obrasSociales.slice(0, 6)
    const hasMore = obrasSociales.length > 6

    const filteredObras = obrasSociales.filter(o => 
        o.nombre.toLowerCase().includes(search.toLowerCase())
    )

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
                        className="mt-4 text-lg leading-8 text-slate-300"
                    >
                        {config.coberturas_subtitulo || 'Trabajamos con las principales coberturas del país para brindarte la mejor atención médica sin preocupaciones.'}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleObras.map((obra, index) => {
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
                                        <p className="text-sm text-slate-400 italic">Todos los planes</p>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>

                {hasMore && (
                    <div className="mt-12 text-center">
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md"
                        >
                            Ver todas las obras sociales ({obrasSociales.length})
                        </motion.button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        Obras Sociales y Prepagas
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-1">Listado completo de coberturas con las que trabajamos</p>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="relative mt-4 mb-4">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Buscar cobertura..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {filteredObras.length > 0 ? (
                                    filteredObras.map((obra) => {
                                        const planes = obra.planes ? obra.planes.split(',').map((p: string) => p.trim()).filter(Boolean) : []
                                        return (
                                            <div key={obra.id} className="p-3.5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <span className="font-semibold text-white text-sm">{obra.nombre}</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {planes.length > 0 ? (
                                                        planes.map((plan: string, i: number) => (
                                                            <span key={i} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/70 border border-white/5">
                                                                {plan}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Todos los planes</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-slate-300 text-sm">
                                        No se encontraron obras sociales.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}


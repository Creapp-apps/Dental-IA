'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showModal])

    const visibleObras = obrasSociales.slice(0, 6)
    const hasMore = obrasSociales.length > 6

    const filteredObras = obrasSociales.filter(o => 
        o.nombre.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <section id="coberturas" className="relative py-24 sm:py-32 overflow-hidden z-10">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-semibold uppercase tracking-wider mb-6"
                    >
                        <ShieldCheck className="h-4 w-4 text-teal-400" />
                        Coberturas Médicas
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
                    >
                        Obras Sociales y Prepagas
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300 font-medium max-w-lg mx-auto"
                    >
                        {config?.coberturas_subtitulo || 'Trabajamos con las principales coberturas del país para brindarte la mejor atención médica sin preocupaciones.'}
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
                                className="group relative rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-400/50 hover:bg-white/15 shadow-2xl flex flex-col h-full"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-teal-300 group-hover:scale-105 group-hover:bg-teal-500/20 group-hover:text-teal-200 transition-all duration-300">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white group-hover:text-teal-300 transition-colors">
                                        {obra.nombre}
                                    </h3>
                                </div>
                                
                                {planes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-white/10">
                                        {planes.map((plan: string, i: number) => (
                                            <span 
                                                key={i} 
                                                className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10"
                                            >
                                                {plan}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-auto pt-4 border-t border-white/10">
                                        <p className="text-xs text-slate-400 font-medium italic">Todos los planes</p>
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
                            className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-8 py-3.5 text-sm font-bold text-white hover:bg-white/25 hover:scale-105 active:scale-95 cursor-pointer shadow-xl backdrop-blur-md transition-all"
                        >
                            Ver todas las obras sociales ({obrasSociales.length})
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Render modal with createPortal directly into document.body with z-[99999] */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-white"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-teal-400" />
                                            Obras Sociales y Prepagas
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Listado completo de coberturas con las que trabajamos</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                
                                <div className="relative mt-4 mb-4">
                                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cobertura..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {filteredObras.length > 0 ? (
                                        filteredObras.map((obra) => {
                                            const planes = obra.planes ? obra.planes.split(',').map((p: string) => p.trim()).filter(Boolean) : []
                                            return (
                                                <div key={obra.id} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-800/60 hover:bg-slate-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <span className="font-bold text-white text-sm">{obra.nombre}</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {planes.length > 0 ? (
                                                            planes.map((plan: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-200 border border-slate-600">
                                                                    {plan}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic font-medium">Todos los planes</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-slate-400 text-sm font-medium">
                                            No se encontraron obras sociales.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </section>
    )
}

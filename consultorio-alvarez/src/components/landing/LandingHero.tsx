'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, ChevronDown, MapPin, Phone, Star } from 'lucide-react'
import { ToothSVG } from './ToothSVG'
import { ReservarForm } from './ReservarForm'
import { TopSheet, TopSheetTrigger, TopSheetContent, TopSheetHeader, TopSheetTitle, TopSheetDescription } from '@/components/ui/top-sheet'
import type { Tenant, Profesional, TipoTratamiento } from '@/types'

interface Props {
    tenant: Tenant
    profesionales: Profesional[]
    tratamientos: TipoTratamiento[]
}

export function LandingHero({ tenant, profesionales, tratamientos }: Props) {
    const heroRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
    const toothY = useTransform(scrollYProgress, [0, 1], [0, -80])
    const toothOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
    const textY = useTransform(scrollYProgress, [0, 1], [0, 40])

    const fadeIn = (delay: number) => ({
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay },
    })

    return (
        <section
            ref={heroRef}
            className="relative min-h-screen flex items-center overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #e8f4fd 35%, #ffffff 70%, #f8faff 100%)' }}
        >
            {/* Background decorative blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full opacity-20"
                    style={{ background: `radial-gradient(circle, ${tenant.color_primario}40 0%, transparent 70%)`, filter: 'blur(40px)' }}
                />
                <div
                    className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full opacity-15"
                    style={{ background: `radial-gradient(circle, ${tenant.color_secundario}30 0%, transparent 70%)`, filter: 'blur(60px)' }}
                />
                {/* Subtle grid pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2563eb" strokeWidth="0.8" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Main grid */}
            <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">

                {/* LEFT COLUMN */}
                <motion.div style={{ y: textY }} className="flex flex-col justify-center order-2 lg:order-1">



                    {/* H1 — 3 lines with stagger */}
                    <div className="overflow-hidden mb-2">
                        <motion.h1
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.75, delay: 0.18, ease: 'easeOut' }}
                            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-gray-900"
                        >
                            El cuidado que
                        </motion.h1>
                    </div>
                    <div className="overflow-hidden mb-2">
                        <motion.h1
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.75, delay: 0.36, ease: 'easeOut' }}
                            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight"
                            style={{ color: tenant.color_primario }}
                        >
                            tu sonrisa
                        </motion.h1>
                    </div>
                    <div className="overflow-hidden mb-7">
                        <motion.h1
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.75, delay: 0.54, ease: 'easeOut' }}
                            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-gray-900"
                        >
                            merece.
                        </motion.h1>
                    </div>

                    {/* Subtitle */}
                    <motion.p {...fadeIn(0.66)} className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-md mb-8">
                        {tenant.descripcion}
                    </motion.p>



                    {/* CTA Buttons */}
                    <motion.div {...fadeIn(0.9)} className="flex flex-wrap gap-3 mb-8">
                        {tenant.turnos_online_activos && (
                            <TopSheet>
                                <TopSheetTrigger asChild>
                                    <button
                                        className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
                                        style={{ background: `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})` }}
                                    >
                                        <Calendar className="h-4 w-4 transition-transform group-hover:scale-110" />
                                        Reservar turno online
                                    </button>
                                </TopSheetTrigger>
                                <TopSheetContent height="92vh">
                                    <TopSheetHeader>
                                        <TopSheetTitle>Reservar un turno</TopSheetTitle>
                                        <TopSheetDescription>
                                            Completá los datos a continuación y nos comunicaremos para confirmar tu turno.
                                        </TopSheetDescription>
                                    </TopSheetHeader>
                                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                                        <ReservarForm tenant={tenant} profesionales={profesionales} tratamientos={tratamientos} />
                                    </div>
                                </TopSheetContent>
                            </TopSheet>
                        )}
                        <a
                            href="#profesionales"
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:shadow-md transition-all hover:-translate-y-0.5"
                        >
                            Ver profesionales
                        </a>
                    </motion.div>

                    {/* Location / phone chips */}
                    <motion.div {...fadeIn(1.02)} className="flex flex-wrap gap-2">
                        {tenant.direccion && (
                            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {tenant.direccion}{tenant.ciudad ? `, ${tenant.ciudad}` : ''}
                            </span>
                        )}
                        {tenant.telefono && (
                            <a
                                href={`tel:${tenant.telefono}`}
                                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <Phone className="h-3 w-3" />
                                {tenant.telefono}
                            </a>
                        )}
                    </motion.div>
                </motion.div>

                {/* RIGHT COLUMN — Tooth + badges */}
                <div className="relative flex items-center justify-center order-1 lg:order-2 min-h-[400px]">

                    {/* Rating badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 1.2, duration: 0.5, ease: 'backOut' }}
                        className="absolute top-8 right-4 lg:right-0 z-10 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl border border-gray-100"
                        style={{ animation: 'badgeFloat1 5s ease-in-out 0.5s infinite' }}
                    >
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900 leading-none">4.9</p>
                            <p className="text-[10px] text-gray-400 leading-none mt-0.5">valoración</p>
                        </div>
                    </motion.div>

                    {/* Online booking badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 1.5, duration: 0.5, ease: 'backOut' }}
                        className="absolute bottom-12 left-0 lg:-left-4 z-10 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl border border-gray-100"
                        style={{ animation: 'badgeFloat2 5.5s ease-in-out 1s infinite' }}
                    >
                        <div
                            className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                            style={{ backgroundColor: tenant.color_primario }}
                        >
                            ✓
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900 leading-none">Turnos online</p>
                            <p className="text-[10px] text-gray-400 leading-none mt-0.5">disponibles 24h</p>
                        </div>
                    </motion.div>

                    {/* Tooth with parallax */}
                    <motion.div
                        style={{ y: toothY, opacity: toothOpacity }}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        className="relative"
                    >
                        <ToothSVG size={380} />
                    </motion.div>

                    <style>{`
                        @keyframes badgeFloat1 {
                            0%, 100% { transform: translateY(0px); }
                            50%       { transform: translateY(-10px); }
                        }
                        @keyframes badgeFloat2 {
                            0%, 100% { transform: translateY(0px); }
                            50%       { transform: translateY(-12px) translateX(3px); }
                        }
                    `}</style>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Scroll</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                >
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
            </motion.div>

            {/* Marquee watermark */}
            <div className="absolute bottom-0 left-0 right-0 overflow-hidden h-12 pointer-events-none">
                <div
                    className="whitespace-nowrap text-5xl font-black uppercase select-none"
                    style={{
                        color: `${tenant.color_primario}08`,
                        animation: 'marquee 20s linear infinite',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {Array(6).fill(`${tenant.nombre} — Tu salud, nuestra prioridad — `).join('')}
                </div>
            </div>
            <style>{`
                @keyframes marquee {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    )
}

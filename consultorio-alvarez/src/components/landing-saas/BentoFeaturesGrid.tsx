'use client'

import { 
    Stethoscope, 
    Globe, 
    CreditCard, 
    Users, 
    Bell, 
    FileCheck2, 
    Sparkles, 
    ShieldCheck, 
    ArrowUpRight,
    CheckCircle2,
    Lock,
    Palette
} from 'lucide-react'

export function BentoFeaturesGrid({ onOpenDemo }: { onOpenDemo: () => void }) {
    return (
        <section id="caracteristicas" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs sm:text-sm font-semibold mb-4">
                    <Sparkles className="w-4 h-4" />
                    <span>Ecosistema Tecnológico de Nueva Generación</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    Todo lo que una clínica moderna necesita en <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">un solo lugar</span>
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300">
                    Diseñado en conjunto con cirujanos dentistas y directores médicos. Cada detalle resuelve un problema real de tu día a día.
                </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Odontograma 3D (Tarjeta Grande - 2 columnas en lg) */}
                <div className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950/80 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
                    
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                                <Stethoscope className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                                Diagnóstico Clínico de Precisión
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-3">
                                Odontograma Digital 3D con Mapa Dental por Caras
                            </h3>
                            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                                Marcá caries en caras oclusales, mesiales y distales, restauraciones estéticas, implantes y prótesis en segundos. Historial evolutivo del paciente con fotos radiográficas y odontograma pediátrico incluido.
                            </p>
                        </div>

                        {/* Preview visual estilizado */}
                        <div className="mt-8 p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                <span className="text-xs text-slate-300 font-medium">Caries Oclusal</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                                <span className="text-xs text-slate-300 font-medium">Endodoncia / Perno</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                <span className="text-xs text-slate-300 font-medium">Implante Titanio</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                                <span className="text-xs text-slate-300 font-medium">Pieza Sana</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Web Propia para cada Consultorio */}
                <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 transition-all duration-300 relative overflow-hidden group shadow-xl flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
                    
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                            <Globe className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                            Presencia Digital Exclusiva
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 mb-3">
                            Página Web Propia con tu Marca y Dominio
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Te creamos tu sitio institucional con tus colores corporativos, tu logo en alta calidad y tu propio dominio (ej. <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded">tuconsultorio.ar</code>).
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-indigo-400" /> Paleta de color personalizable</span>
                        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                </div>

                {/* 3. Cobro de Señas con Mercado Pago */}
                <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group shadow-xl flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
                    
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Cero Ausencias
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 mb-3">
                            Cobro de Señas en Mercado Pago
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Integrá tu cuenta oficial de Mercado Pago. El paciente paga la seña para reservar el turno y el dinero se acredita directamente en tu cuenta sin comisiones de Dental-IA.
                        </p>
                    </div>

                    <div className="mt-6 p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Comisión de Dental-IA:</span>
                        <span className="font-bold text-emerald-400 font-mono">0% (Gratis)</span>
                    </div>
                </div>

                {/* 4. Multi-profesional & Liquidaciones */}
                <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-violet-500/40 transition-all duration-300 relative overflow-hidden group shadow-xl flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />
                    
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                            Gestión de Equipos Médicos
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 mb-3">
                            Multi-odontólogo y Liquidación Automática
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Cada profesional accede solo a su agenda e historial de pacientes. A fin de mes, el sistema calcula automáticamente los porcentajes y honorarios correspondientes a cada odontólogo.
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span>Ahorrá 10+ horas de cálculo mensual</span>
                        <CheckCircle2 className="w-4 h-4 text-violet-400" />
                    </div>
                </div>

                {/* 5. Alertas Sonoras y Sala de Espera */}
                <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 transition-all duration-300 relative overflow-hidden group shadow-xl flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                    
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                            <Bell className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                            Recepción en Tiempo Real
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 mb-3">
                            Panel de Espera con Alertas Sonoras
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Avisá al odontólogo con un timbre digital cuando su paciente llegó a la sala de espera. Notificaciones push inmediatas en computadoras, celulares y tablets.
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span>Llamado de pacientes a sillón</span>
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                </div>

            </div>
        </section>
    )
}

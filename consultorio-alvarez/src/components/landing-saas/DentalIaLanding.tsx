'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
    Sparkles, 
    Bot, 
    CalendarCheck, 
    ShieldCheck, 
    Check, 
    ArrowRight, 
    Smartphone, 
    Play, 
    Zap, 
    Users, 
    Stethoscope, 
    Activity, 
    CreditCard,
    PhoneCall,
    CheckCircle2,
    Lock,
    Globe,
    HelpCircle
} from 'lucide-react'

import { HeroProductTour } from './HeroProductTour'
import { WhatsAppSimulator } from './WhatsAppSimulator'
import { BentoFeaturesGrid } from './BentoFeaturesGrid'
import { ComparisonSection } from './ComparisonSection'
import { FaqSection } from './FaqSection'
import { DemoModal } from './DemoModal'
import { SurgicalInstrumentalView } from './concepts/SurgicalInstrumentalView'
import { MedicalAtelierView } from './concepts/MedicalAtelierView'
import { DentalIaCorporatePure } from './DentalIaCorporatePure'

export function DentalIaLanding() {
    const [isDemoOpen, setIsDemoOpen] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

    const openWhatsApp = (mensaje: string) => {
        const url = `https://wa.me/5491130288564?text=${encodeURIComponent(mensaje)}`
        window.open(url, '_blank')
    }
    const [activeConcept, setActiveConcept] = useState<'corporate-pure' | 'current' | 'surgical' | 'atelier'>('corporate-pure')

    if (activeConcept === 'corporate-pure') {
        return <DentalIaCorporatePure />
    }

    if (activeConcept === 'surgical') {
        return (
            <>
                <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
                <SurgicalInstrumentalView onOpenDemo={() => setIsDemoOpen(true)} />
            </>
        )
    }

    if (activeConcept === 'atelier') {
        return (
            <>
                <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
                <MedicalAtelierView onOpenDemo={() => setIsDemoOpen(true)} />
            </>
        )
    }

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
            {/* Modal de Demostración en Vivo */}
            <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />

            {/* Efectos de Iluminación Ambiental de Fondo */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-cyan-600/15 via-indigo-600/10 to-transparent blur-[140px]" />
                <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full" />
                <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-cyan-600/10 blur-[150px] rounded-full" />
            </div>

            {/* ── BANNER SUPERIOR INFORMATIVO ────────────────────────────── */}
            <div className="relative z-50 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-b border-cyan-500/20 py-2.5 px-4 text-center text-xs text-slate-300">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] tracking-wide uppercase">
                        Novedad 2026
                    </span>
                    <span>¿Tenés un consultorio odontológico? Probá la plataforma gratis por 30 días y duplicá tu asistencia.</span>
                    <button
                        onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo de 15 minutos.')}
                        className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 ml-1 flex items-center gap-1 cursor-pointer"
                    >
                        Agendar Demo de 15 min
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* ── HEADER CORPORATIVO SAAS ─────────────────────────────────── */}
            <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#030712]/85 backdrop-blur-xl transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    {/* Logo Dental-IA Oficial */}
                    <Link href="/" className="flex items-center gap-3.5 group">
                        <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 shadow-xl shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2C8.5 2 7 5 7 7c0 4 3 6 3 13 0 1 .5 2 2 2s2-1 2-2c0-7 3-9 3-13 0-2-1.5-5-5-5z" />
                                <path d="M9 7h6" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-black text-xl tracking-tight text-white flex items-center">
                                Dental<span className="text-cyan-400">-IA</span>
                            </span>
                            <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold block -mt-1">
                                Plataforma Clínica Inteligente
                            </span>
                        </div>
                    </Link>

                    {/* Navegación Desktop */}
                    <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
                        <a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">
                            Características
                        </a>
                        <a href="#whatsapp-ia" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-emerald-400" />
                            Asistente WhatsApp
                        </a>
                        <a href="#comparador" className="hover:text-cyan-400 transition-colors">
                            ¿Por qué Dental-IA?
                        </a>
                        <a href="#planes" className="hover:text-cyan-400 transition-colors">
                            Planes y Precios
                        </a>
                        <a href="#faq" className="hover:text-cyan-400 transition-colors">
                            Preguntas Frecuentes
                        </a>
                    </nav>

                    {/* Acciones */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                        >
                            Acceso Consultorio
                        </Link>
                        <button
                            onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría solicitar una demo de la plataforma.')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Agendar Demo
                        </button>
                    </div>
                </div>
            </header>

            {/* ── 1. HERO SECTION CON PRODUCT TOUR INTERACTIVO ─────────────── */}
            <HeroProductTour onOpenDemo={() => setIsDemoOpen(true)} />

            {/* ── 2. SIMULADOR EN VIVO DE WHATSAPP CON IA ─────────────────── */}
            <WhatsAppSimulator onOpenDemo={() => setIsDemoOpen(true)} />

            {/* ── 3. BENTO GRID DE FUNCIONALIDADES MEDTECH ────────────────── */}
            <BentoFeaturesGrid onOpenDemo={() => setIsDemoOpen(true)} />

            {/* ── 4. COMPARADOR VISUAL (TRADICIONAL VS DENTAL-IA) ─────────── */}
            <div id="comparador">
                <ComparisonSection onOpenDemo={() => setIsDemoOpen(true)} />
            </div>

            {/* ── 5. SECCIÓN DE PLANES Y PRECIOS ──────────────────────────── */}
            <section id="planes" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center border-t border-white/10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold mb-4">
                    <span>Inversión Simple y Transparente</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    Planes diseñados para potenciar tu consultorio
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
                    Probá cualquier plan gratis durante 30 días. Sin comisiones por turno y cancelás cuando quieras.
                </p>

                {/* Toggle Mensual / Anual */}
                <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-white/10">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            billingCycle === 'monthly'
                                ? 'bg-cyan-500 text-slate-950 shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Facturación Mensual
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            billingCycle === 'annual'
                                ? 'bg-cyan-500 text-slate-950 shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Facturación Anual
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase">
                            20% OFF
                        </span>
                    </button>
                </div>

                <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto gap-8 text-left">
                    {/* Plan Profesional */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md flex flex-col justify-between hover:border-white/20 transition-all">
                        <div>
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Para 1 a 3 profesionales</span>
                            <h3 className="text-2xl font-black text-white mt-1">Consultorio Independiente</h3>
                            <p className="text-xs text-slate-400 mt-2">Para consultorios de 1 a 3 profesionales que buscan ordenar su agenda y no perder pacientes.</p>
                            
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">
                                    {billingCycle === 'monthly' ? '$125.000' : '$99.000'}
                                </span>
                                <span className="text-xs text-slate-400">ARS / mes</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-slate-300">
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Agenda completa con sobreturnos inteligentes</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Asistente de WhatsApp con confirmación automática</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Odontograma digital 3D y fichas médicas completas</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Web pública propia con reserva online de turnos</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Subdominio exclusivo (ej: tuclinica.dental-ia.com)</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Copias de seguridad automáticas diarias</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => {
                                const url = `https://wa.me/5491130288564?text=${encodeURIComponent('¡Hola Dental-IA! 👋 Quisiera solicitar los 15 días de prueba gratis del Plan Consultorio Independiente (1 a 3 profesionales).')}`
                                window.open(url, '_blank')
                            }}
                            className="mt-8 w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center border border-white/10 transition-colors cursor-pointer"
                        >
                            Probar 15 Días Gratis
                        </button>
                    </div>

                    {/* Plan Clínicas Pro */}
                    <div className="relative rounded-3xl border-2 border-cyan-500/60 bg-gradient-to-b from-cyan-950/20 via-slate-900 to-slate-950 p-8 shadow-2xl backdrop-blur-md flex flex-col justify-between hover:border-cyan-400 transition-all">
                        <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                            Más Elegido por Clínicas
                        </div>

                        <div>
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Para 5 a 10 profesionales</span>
                            <h3 className="text-2xl font-black text-white mt-1">Centro Odontológico</h3>
                            <p className="text-xs text-slate-400 mt-2">Para centros de 5 a 10 profesionales con alta demanda, secretarias y sillones rotativos.</p>
                            
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">
                                    {billingCycle === 'monthly' ? '$195.000' : '$156.000'}
                                </span>
                                <span className="text-xs text-slate-400">ARS / mes</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-slate-300">
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Todo lo del plan Consultorio sin límites</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> De 5 a 10 profesionales (secretarias y sillones ilimitados)</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Cobro de señas por Mercado Pago (0% comisión Dental-IA)</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Soporte para Dominio Propio (ej: dentalva.ar)</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Módulo de liquidación automática a profesionales</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Migración de datos desde Excel/sistema previo incluida</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => {
                                const url = `https://wa.me/5491130288564?text=${encodeURIComponent('¡Hola Dental-IA! 👋 Me interesa comenzar con el Plan Centro Odontológico (5 a 10 profesionales). ¿Podrían coordinar conmigo la activación?')}`
                                window.open(url, '_blank')
                            }}
                            className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs text-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                        >
                            Comenzar con Plan Centro Odontológico
                        </button>
                    </div>
                </div>
            </section>

            {/* ── 6. SECCIÓN FAQ ──────────────────────────────────────────── */}
            <div id="faq">
                <FaqSection />
            </div>

            {/* ── 7. BANNER CTA FINAL DE CONVERSIÓN ────────────────────────── */}
            <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-cyan-950 via-indigo-950 to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                        <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider inline-block">
                            Comenzá Hoy Mismo
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                            Llevá la gestión de tu consultorio a un nivel superior
                        </h2>
                        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                            Sumate a las clínicas y consultorios que ya optimizaron su tiempo, redujeron el ausentismo y modernizaron su atención al paciente con Dental-IA.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => setIsDemoOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-black text-base shadow-2xl shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                            >
                                <PhoneCall className="w-5 h-5" />
                                Solicitar Demostración en Vivo
                            </button>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base border border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                Probar 30 Días Gratis
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 8. FOOTER CORPORATIVO SAAS ──────────────────────────────── */}
            <footer className="border-t border-white/10 bg-[#02050c] py-16 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10 text-left">
                    {/* Columna 1: Info y Logo */}
                    <div className="space-y-4 md:col-span-1">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold">
                                🦷
                            </div>
                            <span className="font-black text-lg text-white">
                                Dental<span className="text-cyan-400">-IA</span>
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Plataforma integral de gestión clínica odontológica impulsada por Inteligencia Artificial oficial de WhatsApp.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Infraestructura Segura HIPAA & Cloud 99.9%</span>
                        </div>
                    </div>

                    {/* Columna 2: Producto */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Producto</h4>
                        <ul className="space-y-2 text-xs">
                            <li><a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">Odontograma Digital 3D</a></li>
                            <li><a href="#whatsapp-ia" className="hover:text-cyan-400 transition-colors">Asistente WhatsApp IA</a></li>
                            <li><a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">Cobro de Señas con Mercado Pago</a></li>
                            <li><a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">Web Propia y Dominio</a></li>
                            <li><a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">Liquidaciones a Profesionales</a></li>
                        </ul>
                    </div>

                    {/* Columna 3: Soporte y Ayuda */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Soporte y Migración</h4>
                        <ul className="space-y-2 text-xs">
                            <li><button onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo de la plataforma.')} className="hover:text-cyan-400 transition-colors cursor-pointer">Agendar Demo</button></li>
                            <li><a href="#faq" className="hover:text-cyan-400 transition-colors">Preguntas Frecuentes</a></li>
                            <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Ingreso a Consultorios</Link></li>
                            <li><span className="text-slate-500">Migración asistida de pacientes</span></li>
                        </ul>
                    </div>

                    {/* Columna 4: Empresa */}
                    <div className="space-y-2.5">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Dental-IA SaaS</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Desarrollado y operado por CreAPP Argentina. Diseñado específicamente para consultorios, clínicas y redes odontológicas de América Latina.
                        </p>
                        <div className="pt-2">
                            <button
                                onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría hablar con un asesor comercial.')}
                                className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-cyan-400 hover:text-white hover:bg-slate-800 transition-all font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                                Hablar con un asesor
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-slate-500 text-[11px]">
                    <p>© 2026 Dental-IA. Todos los derechos reservados.</p>
                    <p>Potenciando la odontología del futuro con tecnología e Inteligencia Artificial.</p>
                </div>
            </footer>
        </div>
    )
}



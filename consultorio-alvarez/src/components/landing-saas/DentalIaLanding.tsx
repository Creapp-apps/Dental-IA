'use client'

import Link from 'next/link'
import { 
    Sparkles, 
    Bot, 
    CalendarCheck, 
    ShieldCheck, 
    Check, 
    ArrowRight, 
    Star, 
    Smartphone, 
    ChevronRight,
    Play,
    Zap,
    Users,
    Stethoscope,
    Activity,
    CreditCard
} from 'lucide-react'

export function DentalIaLanding() {
    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
            {/* Efectos de Iluminación Ambiental */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-cyan-600/15 via-indigo-600/10 to-transparent blur-[120px]" />
                <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full" />
                <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-cyan-600/10 blur-[140px] rounded-full" />
            </div>

            {/* ── HEADER SAAS ───────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    {/* Logo Dental-IA */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 shadow-xl shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
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
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                        <a href="#caracteristicas" className="hover:text-cyan-400 transition-colors">Características</a>
                        <a href="#whatsapp-ia" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-emerald-400" />
                            Asistente WhatsApp
                        </a>
                        <a href="#odontograma" className="hover:text-cyan-400 transition-colors">Odontograma 3D</a>
                        <a href="#planes" className="hover:text-cyan-400 transition-colors">Planes</a>
                    </nav>

                    {/* Acciones */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                        >
                            Ingresar a mi consultorio
                        </Link>
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Solicitar Demo
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── HERO SECTION ─────────────────────────────────────────── */}
            <section className="relative z-10 pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold mb-8 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Software de Gestión Odontológica con Inteligencia Artificial</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
                    El sistema que <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">automatiza tu consultorio</span> y llena tu agenda
                </h1>

                <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
                    Gestioná turnos, fichas clínicas con odontograma digital 3D y dejá que nuestro <strong className="text-white font-semibold">asistente de IA por WhatsApp</strong> confirme, reprograme y recuerde citas las 24 horas sin intervención de tu secretaria.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/login"
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-base shadow-2xl shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        Comenzar 30 días de prueba gratis
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <a
                        href="#whatsapp-ia"
                        className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-base border border-white/10 transition-all flex items-center justify-center gap-2.5 backdrop-blur-sm"
                    >
                        <Play className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                        Ver WhatsApp en vivo
                    </a>
                </div>

                <div className="mt-8 flex items-center justify-center gap-8 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> Sin tarjeta de crédito requerida</span>
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> Puesta en marcha en 10 minutos</span>
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> Soporte humano prioritario</span>
                </div>

                {/* Vista previa / Mockup de la Plataforma */}
                <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-cyan-500/20 via-indigo-500/10 to-transparent border border-white/15 shadow-2xl backdrop-blur-xl">
                    <div className="rounded-2xl bg-slate-950/90 border border-white/10 overflow-hidden shadow-2xl">
                        {/* Barra de ventana simulada */}
                        <div className="h-11 bg-slate-900/90 border-b border-white/10 px-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <div className="px-4 py-1 rounded-lg bg-slate-950 border border-white/10 text-[11px] font-mono text-slate-400">
                                dental-ia.com/admin
                            </div>
                            <div className="w-12" />
                        </div>

                        {/* Mockup Interactivo del Backoffice */}
                        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                            <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-400">Turnos de Hoy</span>
                                    <CalendarCheck className="w-4 h-4 text-cyan-400" />
                                </div>
                                <p className="text-3xl font-black text-white">24</p>
                                <span className="text-xs text-emerald-400 font-medium">96% confirmados por WhatsApp</span>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-400">Tasa de Ausentismo</span>
                                    <Activity className="w-4 h-4 text-emerald-400" />
                                </div>
                                <p className="text-3xl font-black text-white">-78%</p>
                                <span className="text-xs text-slate-400 font-medium">Reducción gracias a confirmaciones automáticas</span>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-400">Cobros y Señas</span>
                                    <CreditCard className="w-4 h-4 text-indigo-400" />
                                </div>
                                <p className="text-3xl font-black text-white">$485.000</p>
                                <span className="text-xs text-cyan-400 font-medium">Señas recibidas online este mes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECCIÓN WHATSAPP CON IA ───────────────────────────────── */}
            <section id="whatsapp-ia" className="relative z-10 py-24 border-t border-white/10 bg-slate-950/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
                                <Bot className="w-4 h-4" />
                                <span>Asistente Inteligente Oficial de WhatsApp</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                                Tus pacientes confirman y reservan por WhatsApp en segundos.
                            </h2>
                            <p className="mt-4 text-base text-slate-300 leading-relaxed">
                                Olvidate de que tu secretaria pase horas llamando o mandando mensajes uno a uno. El sistema envía recordatorios automáticos con botones interactivos:
                            </p>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Confirmación con 1 solo toque</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">El paciente responde con un botón y el turno se actualiza a "Confirmado" en tu agenda en tiempo real.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Reprogramación desatendida</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Si el paciente no puede asistir, el bot le ofrece los próximos huecos libres para no perder la consulta.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Número de WhatsApp propio de cada consultorio</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Cada clínica conecta su propio número oficial de Meta para mantener su identidad y reputación.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Simulación del Chat WhatsApp */}
                        <div className="relative mx-auto w-full max-w-sm rounded-[38px] p-3 bg-gradient-to-b from-slate-700 to-slate-900 border-4 border-slate-700 shadow-2xl">
                            <div className="rounded-[30px] bg-[#0b141a] overflow-hidden text-xs text-slate-200">
                                {/* Header WhatsApp */}
                                <div className="bg-[#202c33] p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white text-xs">
                                        🦷
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-xs">Asistente Dental-IA</p>
                                        <p className="text-[10px] text-emerald-400">En línea (cuenta oficial)</p>
                                    </div>
                                </div>

                                {/* Mensajes */}
                                <div className="p-4 space-y-3 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px] min-h-[340px]">
                                    <div className="bg-[#202c33] p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-md">
                                        <p className="font-medium text-white">Hola María! 👋 Te recordamos tu turno de Consulta:</p>
                                        <p className="text-cyan-300 font-semibold mt-1">🗓️ Lunes 7 de Septiembre - 15:30 hs.</p>
                                        <p className="text-slate-400 text-[10px] mt-1">Dr. Álvarez (Consultorio 1)</p>
                                        <span className="text-[9px] text-slate-500 block text-right mt-1">10:15</span>
                                    </div>

                                    <div className="bg-[#005c4b] p-2.5 rounded-2xl rounded-tr-none max-w-[70%] ml-auto text-white shadow-md">
                                        <p className="font-medium">✅ Sí, confirmo mi asistencia</p>
                                        <span className="text-[9px] text-emerald-200/60 block text-right mt-0.5">10:16 ✓✓</span>
                                    </div>

                                    <div className="bg-[#202c33] p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-md">
                                        <p className="font-medium text-emerald-400 font-semibold">¡Excelente! Tu turno quedó confirmado.</p>
                                        <p className="text-slate-300 text-[11px] mt-1">Te esperamos 10 minutos antes en Av. Maipú 2841. ¡Hasta el lunes!</p>
                                        <span className="text-[9px] text-slate-500 block text-right mt-1">10:16</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── PLANES Y PRECIOS ─────────────────────────────────────── */}
            <section id="planes" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
                    <span>Inversión Clara y Transparente</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    Planes diseñados para cada tamaño de consultorio
                </h2>
                <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
                    Comenzá con 30 días de prueba gratuita sin compromiso. Cancelá cuando quieras.
                </p>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 text-left">
                    {/* Plan Pro */}
                    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Plan Consultorio Individual</span>
                            <h3 className="text-2xl font-black text-white mt-1">Profesional Independiente</h3>
                            <p className="text-xs text-slate-400 mt-2">Para consultorios de 1 a 3 profesionales que buscan digitalizar su agenda.</p>
                            
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">$125.000</span>
                                <span className="text-xs text-slate-400">ARS / mes</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-slate-300">
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Agenda completa con sobreturnos</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> WhatsApp bot de confirmación automática</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Odontograma digital 3D y ficha clínica</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Landing pública propia con turnero online</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400" /> Subdominio exclusivo (ej: tuclinica.dental-ia.com)</li>
                            </ul>
                        </div>

                        <Link
                            href="/login"
                            className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center border border-white/10 transition-colors"
                        >
                            Probar 30 días gratis
                        </Link>
                    </div>

                    {/* Plan Clínicas */}
                    <div className="relative rounded-3xl border-2 border-cyan-500/50 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                        <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                            Más Recomendado
                        </div>

                        <div>
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Plan Red & Centros Médicos</span>
                            <h3 className="text-2xl font-black text-white mt-1">Clínica Odontológica</h3>
                            <p className="text-xs text-slate-400 mt-2">Para centros con múltiples sillones, recepcionistas y alta rotación de pacientes.</p>
                            
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">$185.000</span>
                                <span className="text-xs text-slate-400">ARS / mes</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-slate-300">
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Todo lo del plan Profesional sin límites</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Profesionales y secretarias ilimitadas</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Cobro de señas con Mercado Pago integrado</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Soporte de Dominio Propio (ej: turnos.tuclinica.com)</li>
                                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 font-bold" /> Asistencia y migración de base de datos asistida</li>
                            </ul>
                        </div>

                        <Link
                            href="/login"
                            className="mt-8 w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs text-center shadow-lg shadow-cyan-500/25 transition-all"
                        >
                            Comenzar con Plan Clínicas
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FOOTER SAAS ──────────────────────────────────────────── */}
            <footer className="border-t border-white/10 bg-slate-950/80 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">Dental<span className="text-cyan-400">-IA</span></span>
                        <span>• Desarrollado por CreAPP Argentina</span>
                    </div>
                    <p>© 2026 Dental-IA SaaS. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

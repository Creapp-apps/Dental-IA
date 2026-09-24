'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ArrowLeft, FileText, Lock, Cookie, RefreshCw, Printer, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react'
import { SplitText } from '@/components/ui/SplitText'
import { TextType } from '@/components/ui/TextType'

interface LegalLayoutProps {
    title: string
    subtitle: string
    lastUpdated: string
    currentPath: '/terminos' | '/privacidad' | '/cookies' | '/reembolsos'
    children: React.ReactNode
}

const NAV_ITEMS = [
    { href: '/terminos', label: 'Términos y Condiciones', icon: FileText, badge: 'SaaS B2B' },
    { href: '/privacidad', label: 'Política de Privacidad', icon: Lock, badge: 'Salud & IA' },
    { href: '/cookies', label: 'Política de Cookies', icon: Cookie, badge: 'Cookieless' },
    { href: '/reembolsos', label: 'Cancelación y Reembolsos', icon: RefreshCw, badge: '14 Días' },
] as const

export function LegalLayout({
    title,
    subtitle,
    lastUpdated,
    currentPath,
    children,
}: LegalLayoutProps) {
    return (
        <div className="relative min-h-screen bg-[#f8faff] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            {/* Efectos de Iluminación Ambiental Suave (Idénticos al ecosistema Dental-IA) */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-blue-400/10 via-cyan-400/5 to-transparent blur-[120px]" />
                <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-blue-300/5 blur-[140px] rounded-full" />
            </div>

            {/* Header de Navegación Sticky con Glassmorphism */}
            <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-all">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-2 px-2.5 rounded-xl hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            aria-label="Volver a la página principal de Dental-IA"
                        >
                            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="hidden sm:inline">Volver a la web</span>
                        </Link>
                        
                        <div className="h-5 w-px bg-slate-200/90 hidden sm:block" />

                        {/* Logo Oficial de Dental-IA */}
                        <Link href="/" className="flex items-center gap-2.5 group shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-xl p-1">
                            <div className="flex items-center justify-center size-9 rounded-full bg-blue-50/90 border border-blue-100 shadow-xs group-hover:scale-105 group-hover:shadow-sm group-hover:border-blue-200 transition-all p-1">
                                <img
                                    src="/icon.png"
                                    alt="Dental-IA Logo"
                                    className="size-full object-contain"
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                                        Dental<span className="text-blue-600 font-black">-IA</span>
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/70 shadow-2xs">
                                        Legal
                                    </span>
                                </div>
                                <span className="text-[9px] tracking-wider text-slate-400 font-semibold uppercase hidden sm:block mt-0.5">
                                    Gestión Odontológica
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50/90 px-3 py-1.5 rounded-full border border-emerald-200/80 shadow-2xs">
                            <ShieldCheck className="size-3.5 text-emerald-600" />
                            <span>Certificación de Datos Médicos</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') window.print()
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-95"
                            aria-label="Imprimir o exportar documento legal a PDF"
                        >
                            <Printer className="size-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                    </div>
                </div>

                {/* Barra de Pestañas Flotante para Pantallas Móviles */}
                <div className="lg:hidden border-t border-slate-200/60 bg-white/70 backdrop-blur-md px-4 py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = currentPath === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-slate-600 hover:text-slate-900 bg-slate-100/80'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeLegalPillMobile"
                                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-sm"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <Icon className="size-3.5" />
                                    <span>{item.label}</span>
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </header>

            {/* Hero Informativo */}
            <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 bg-white/70 border-b border-slate-200/80 py-10 sm:py-14 backdrop-blur-xs"
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-bold mb-3 shadow-2xs">
                            <Sparkles className="size-3 text-blue-600" />
                            Marco Regulatorio & Compliance
                        </div>
                        <div className="mb-3">
                            <SplitText
                                key={`title-${currentPath}`}
                                text={title}
                                tag="h1"
                                className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight"
                                delay={25}
                                duration={0.65}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 25 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.05}
                                rootMargin="0px"
                                textAlign="left"
                            />
                        </div>
                        <div className="min-h-[44px] sm:min-h-[48px] mb-4">
                            <TextType
                                key={`subtitle-${currentPath}`}
                                text={subtitle}
                                as="p"
                                className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal inline"
                                typingSpeed={14}
                                initialDelay={250}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-1"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                            <span>Última actualización: <strong className="text-slate-700 font-semibold">{lastUpdated}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-600">
                                <CheckCircle2 className="size-3.5 text-blue-600" />
                                Vigente para Clínicas y Consultorios Dental-IA
                            </span>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Contenedor Principal con Navegación Fluida */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Sidebar de Navegación Legal Desktop con animaciones Spring */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <nav aria-label="Navegación legal" className="sticky top-26 space-y-1.5 p-2 bg-white/80 border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.03)] backdrop-blur-md">
                            <div className="px-3 py-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Documentos Oficiales
                                </span>
                            </div>

                            <div className="space-y-1">
                                {NAV_ITEMS.map((item) => {
                                    const Icon = item.icon
                                    const isActive = currentPath === item.href
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                                isActive
                                                    ? 'text-white'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                                            }`}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeLegalPillDesktop"
                                                    className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-600/25"
                                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center gap-2.5">
                                                <Icon className={`size-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                <span>{item.label}</span>
                                            </span>
                                            <span className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {item.badge}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>

                            {/* Tarjeta de Asistencia Legal y Oficial de Privacidad */}
                            <div className="mt-4 pt-4 border-t border-slate-100 p-3 bg-slate-50/70 rounded-xl text-xs space-y-2">
                                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                    <HelpCircle className="size-3.5 text-blue-600" />
                                    <span>Asistencia y Legales</span>
                                </div>
                                <p className="text-slate-500 text-[11px] leading-relaxed">
                                    ¿Tenés dudas sobre el tratamiento de historias clínicas o el DPA de tu consultorio?
                                </p>
                                <a
                                    href="mailto:legales@dental-ia.com"
                                    className="font-bold text-[11px] text-blue-600 hover:underline block break-all pt-1"
                                >
                                    legales@dental-ia.com
                                </a>
                            </div>
                        </nav>
                    </aside>

                    {/* Contenido Legal con Animación de Entrada Suave */}
                    <AnimatePresence mode="wait">
                        <motion.article
                            key={currentPath}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="lg:col-span-9 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-[0_8px_30px_rgba(15,23,42,0.04)] prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900 prose-a:text-blue-600 hover:prose-a:underline"
                        >
                            {children}
                        </motion.article>
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer Legal Corporativo */}
            <footer className="relative z-10 border-t border-slate-200 bg-white py-10 text-center text-xs text-slate-500">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-blue-50 border border-blue-100 p-0.5 flex items-center justify-center">
                            <img src="/icon.png" alt="Dental-IA" className="size-full object-contain" />
                        </div>
                        <span className="font-extrabold text-sm text-slate-900">Dental<span className="text-blue-600">-IA</span></span>
                        <span>• CreAPP Argentina</span>
                    </div>
                    <p className="text-slate-400">
                        © {new Date().getFullYear()} Dental-IA. Todos los derechos reservados. Plataforma médica con cifrado de grado clínico.
                    </p>
                </div>
            </footer>
        </div>
    )
}

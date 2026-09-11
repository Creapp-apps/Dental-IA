'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
    Check, 
    ArrowRight, 
    PhoneCall,
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    Menu,
    X
} from 'lucide-react'

import { DemoModal } from './DemoModal'
import { InteractiveWhatsAppPhone } from './interactive/InteractiveWhatsAppPhone'
import { InteractiveOdontograma } from './interactive/InteractiveOdontograma'
import { InteractiveBookingPortal } from './interactive/InteractiveBookingPortal'
import { InteractiveWaitingRoom } from './interactive/InteractiveWaitingRoom'
import { InteractiveSettlements } from './interactive/InteractiveSettlements'
import { IntegracionesLideresSection } from './IntegracionesLideresSection'

import { Button, buttonVariants } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { SplitText } from '@/components/ui/SplitText'
import { TextType } from '@/components/ui/TextType'
import { SpecularButton } from '@/components/ui/SpecularButton'
import { BlurText } from '@/components/ui/BlurText'
import { TiltedCard } from '@/components/ui/TiltedCard'
import { motion } from 'motion/react'

export function DentalIaCorporatePure() {
    const [isDemoOpen, setIsDemoOpen] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState<string>('')

    const openWhatsApp = (mensaje: string) => {
        const url = `https://wa.me/5491130288564?text=${encodeURIComponent(mensaje)}`
        window.open(url, '_blank')
    }

    const navItems = [
        { id: 'whatsapp', label: 'WhatsApp Asistido', shortLabel: 'WhatsApp' },
        { id: 'odontograma', label: 'Odontograma 3D', shortLabel: 'Odontograma' },
        { id: 'portal', label: 'Web & Señas MP', shortLabel: 'Web & Pagos' },
        { id: 'espera', label: 'Sala de Espera', shortLabel: 'Espera' },
        { id: 'integraciones', label: 'Integraciones', shortLabel: 'Integraciones' },
        { id: 'planes', label: 'Planes', shortLabel: 'Planes' },
    ]

    const scrollToSection = (id: string) => {
        setActiveSection(id)
        const target = document.getElementById(id)
        if (!target) return

        // Altura de la navbar flotante con margen estético de respiro
        const navOffset = window.innerWidth < 640 ? 80 : 96
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navOffset
        const startPosition = window.scrollY
        const distance = targetPosition - startPosition

        // Duración adaptativa y placentera (750ms a 1050ms)
        const duration = Math.min(Math.max(Math.abs(distance) * 0.55, 750), 1050)
        let startTimestamp: number | null = null

        // Curva suave easeInOutCubic para aceleración sutil y desaceleración sedosa
        const easeInOutCubic = (t: number) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp
            const timeElapsed = timestamp - startTimestamp
            const progress = Math.min(timeElapsed / duration, 1)
            const ease = easeInOutCubic(progress)

            window.scrollTo(0, startPosition + distance * ease)

            if (progress < 1) {
                window.requestAnimationFrame(step)
            }
        }

        window.requestAnimationFrame(step)
    }

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        const sectionIds = ['whatsapp', 'odontograma', 'portal', 'espera', 'integraciones', 'planes']
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id)
                    }
                })
            },
            {
                rootMargin: '-25% 0px -55% 0px',
                threshold: 0.1
            }
        )

        sectionIds.forEach((id) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => {
            window.removeEventListener('scroll', handleScroll)
            observer.disconnect()
        }
    }, [])

    const faqs = [
        {
            q: '¿Podemos conservar nuestro número de WhatsApp actual?',
            a: 'Sí, totalmente. Podrás seguir atendiendo tu consultorio desde tu numero de Whatsapp original. Pero para realizar la automatizacion del chatbot, Meta requiere un numero 100% nuevo y sin intervencion humana.'
        },
        {
            q: '¿Cómo migramos los datos de pacientes de nuestro sistema anterior o Excel?',
            a: 'Contamos con un protocolo guiado de importación de historias clínicas, fichas y agendas previas. Además, nuestro equipo de soporte técnico en Argentina te asiste en la migración de tus datos sin costo adicional.'
        },
        {
            q: '¿Dental-IA retiene comisiones de las señas o tratamientos cobrados?',
            a: 'Cero comisiones. La integración con Mercado Pago es directa entre tu consultorio y tu cuenta bancaria. Dental-IA no cobra ningún porcentaje sobre tus honorarios médicos ni sobre las señas que abonan tus pacientes.'
        },
        {
            q: '¿Cada odontólogo puede ver únicamente sus propios turnos y pacientes?',
            a: 'Exactamente. El sistema cuenta con roles de seguridad y permisos configurables. Los odontólogos colaboradores acceden únicamente a su agenda, a las historias clínicas de sus pacientes y al cálculo de sus honorarios, garantizando privacidad y confidencialidad clínica.'
        },
        {
            q: '¿Qué requerimientos técnicos de instalación tiene el software?',
            a: 'Ninguno. Dental-IA opera 100% en la nube a través de cualquier navegador web moderno (computadoras de escritorio, notebooks, iPads o tablets en el sillón). Las actualizaciones y copias de seguridad son automáticas y diarias.'
        }
    ]

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
            <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />

            {/* ── BARRA SUPERIOR INSTITUCIONAL ─────────────────────────────────── */}
            <div className="border-b border-slate-100 bg-slate-50/90 py-2 px-4 text-center text-xs text-slate-600">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">Dental-IA</span>
                    <span className="text-slate-300">•</span>
                    <span>Plataforma de gestión clínica y automatización para consultorios odontológicos en Argentina.</span>
                    <button
                        onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo en vivo de la plataforma para mi consultorio.')}
                        className="text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                    >
                        Agendar Demo
                    </button>
                </div>
            </div>

            {/* ── NAVBAR FLOTANTE ESTILO PILL ─────────────────────────────────── */}
            <header className="sticky top-3 sm:top-5 z-50 w-full px-3 sm:px-6 pointer-events-none transition-all duration-300">
                <div
                    className={`pointer-events-auto max-w-6xl mx-auto rounded-full transition-all duration-300 ${
                        scrolled
                            ? 'bg-white/90 backdrop-blur-xl shadow-[0_12px_36px_rgba(15,23,42,0.11),0_2px_6px_rgba(0,0,0,0.04)] border border-slate-200/90 ring-1 ring-slate-900/5'
                            : 'bg-white/80 backdrop-blur-lg shadow-[0_8px_30px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.02)] border border-white/90 ring-1 ring-slate-900/[0.04]'
                    }`}
                >
                    <div className="h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
                        {/* Logo Dental-IA Oficial (Icono oficial plataforma) */}
                        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                            <div className="flex items-center justify-center size-8 sm:size-9 rounded-full bg-blue-50/70 border border-blue-100/90 shadow-xs group-hover:scale-105 transition-all p-1">
                                <img
                                    src="/icon.png"
                                    alt="Dental-IA Logo"
                                    className="size-full object-contain"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                                    Dental<span className="text-blue-600 font-black">-IA</span>
                                </span>
                                <span className="text-[9px] tracking-wider text-slate-400 font-semibold uppercase hidden sm:block mt-0.5">
                                    Gestión Odontológica
                                </span>
                            </div>
                        </Link>

                        {/* Navegación Desktop Capsule (Pantallas amplias) */}
                        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/70 p-1 rounded-full border border-slate-200/50">
                            {navItems.map((item) => {
                                const isActive = activeSection === item.id
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToSection(item.id)}
                                        className={`relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 whitespace-nowrap cursor-pointer z-10 ${
                                            isActive
                                                ? 'text-blue-600 font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-nav-pill-xl"
                                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.03)] -z-10"
                                            />
                                        )}
                                        {item.label}
                                    </button>
                                )
                            })}
                        </nav>

                        {/* Navegación Desktop para pantallas medianas (lg a xl) */}
                        <nav className="hidden lg:flex xl:hidden items-center gap-1 bg-slate-100/70 p-1 rounded-full border border-slate-200/50">
                            {navItems.map((item) => {
                                const isActive = activeSection === item.id
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToSection(item.id)}
                                        className={`relative px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 whitespace-nowrap cursor-pointer z-10 ${
                                            isActive
                                                ? 'text-blue-600 font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-nav-pill-lg"
                                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                                className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.03)] -z-10"
                                            />
                                        )}
                                        {item.shortLabel}
                                    </button>
                                )
                            })}
                        </nav>

                        {/* Acciones */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                            >
                                Acceso Profesionales
                            </Link>
                            <SpecularButton 
                                size="sm"
                                radius={20}
                                tint="#2563eb"
                                tintOpacity={1}
                                textColor="#ffffff"
                                lineColor="#93c5fd"
                                baseColor="#1d4ed8"
                                intensity={1.3}
                                shineSize={18}
                                shineFade={40}
                                thickness={1.5}
                                speed={0.4}
                                followMouse
                                proximity={200}
                                onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo de la plataforma para mi consultorio.')}
                                className="h-9 sm:h-10 px-4 sm:px-4.5 rounded-full shadow-sm shadow-blue-600/20 cursor-pointer flex items-center justify-center shrink-0"
                            >
                                <span className="font-bold text-xs text-white whitespace-nowrap">
                                    Agendar Demo
                                </span>
                            </SpecularButton>
                            
                            {/* Botón menú móvil */}
                            <button
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                className="lg:hidden p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                            >
                                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dropdown flotante móvil */}
                {mobileMenuOpen && (
                    <div className="pointer-events-auto mt-2 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl ring-1 ring-slate-900/5 flex flex-col gap-1 lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {navItems.map((item) => {
                            const isActive = activeSection === item.id
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false)
                                        scrollToSection(item.id)
                                    }}
                                    className={`px-4 py-2.5 text-sm font-semibold rounded-2xl transition-colors flex items-center justify-between text-left cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-600 font-bold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                                            Actual
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                        <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between px-2">
                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-xs font-semibold text-slate-600 hover:text-blue-600 py-1"
                            >
                                Acceso Profesionales →
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* ── HERO SECTION: CORPORATIVO, MODERNO Y LUMINOSO ──────────────── */}
            <section className="pt-10 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.15]">
                    <SplitText
                        text="La plataforma que profesionaliza tu clínica y "
                        tag="span"
                        className="text-slate-900"
                        delay={30}
                        duration={0.7}
                        ease="power3.out"
                        splitType="chars"
                        from={{ opacity: 0, y: 35 }}
                        to={{ opacity: 1, y: 0 }}
                        threshold={0.05}
                        rootMargin="0px"
                        textAlign="center"
                    />
                    <SplitText
                        text="llena tu agenda médica"
                        tag="span"
                        className="text-blue-600 inline-block"
                        delay={30}
                        duration={0.7}
                        ease="power3.out"
                        splitType="chars"
                        from={{ opacity: 0, y: 35 }}
                        to={{ opacity: 1, y: 0 }}
                        threshold={0.05}
                        rootMargin="0px"
                        textAlign="center"
                    />
                </h1>

                <div className="mt-6 max-w-3xl mx-auto min-h-[56px] sm:min-h-[64px]">
                    <TextType
                        text="Descubrí en vivo cómo operan nuestras herramientas clínicas: confirmación de turnos por WhatsApp, odontograma interactivo, gestor de turnos web y chatbot IA del consultorio."
                        as="p"
                        className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal inline"
                        typingSpeed={18}
                        initialDelay={450}
                        loop={false}
                        showCursor={true}
                        cursorCharacter="|"
                        cursorClassName="text-blue-600 font-bold ml-1"
                    />
                </div>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <SpecularButton
                        size="lg"
                        radius={16}
                        tint="#2563eb"
                        tintOpacity={1}
                        textColor="#ffffff"
                        lineColor="#93c5fd"
                        baseColor="#1d4ed8"
                        intensity={1.4}
                        shineSize={20}
                        shineFade={45}
                        thickness={1.5}
                        speed={0.4}
                        followMouse
                        proximity={280}
                        onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo en vivo de Dental-IA para ver las funciones de turnos, WhatsApp y odontograma.')}
                        className="w-full sm:w-auto h-14 px-8 shadow-xl shadow-blue-600/25 cursor-pointer"
                    >
                        <span className="font-extrabold text-base flex items-center gap-2.5">
                            Agendar Demo
                            <ArrowRight className="size-5" />
                        </span>
                    </SpecularButton>

                    <SpecularButton
                        size="lg"
                        radius={16}
                        tint="#ffffff"
                        tintOpacity={0.96}
                        textColor="#0f172a"
                        lineColor="#2563eb"
                        baseColor="#cbd5e1"
                        intensity={1.3}
                        shineSize={20}
                        shineFade={45}
                        thickness={1.5}
                        speed={0.4}
                        followMouse
                        proximity={280}
                        onClick={() => scrollToSection('planes')}
                        className="w-full sm:w-auto h-14 px-8 border border-slate-200/90 shadow-sm cursor-pointer hover:border-blue-300"
                    >
                        <span className="font-bold text-base text-slate-800 flex items-center gap-2">
                            Ver planes
                            <Sparkles className="size-4 text-blue-600" />
                        </span>
                    </SpecularButton>
                </div>
            </section>

            {/* ── SECCIÓN 1 INTERACTIVA: SMARTPHONE WHATSAPP ───────────────────── */}
            <section id="whatsapp" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-24 sm:scroll-mt-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-1">
                            <SplitText
                                text="Integración oficial con Meta"
                                tag="span"
                                className="text-xs font-bold uppercase tracking-wider text-slate-400"
                                delay={50}
                                duration={0.6}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </div>
                        <BlurText
                            text="Asistente Oficial de WhatsApp"
                            as="h2"
                            delay={100}
                            animateBy="words"
                            direction="top"
                            threshold={0.15}
                            className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight justify-center"
                        />
                        <div className="mt-2 min-h-[40px] sm:min-h-[24px]">
                            <TextType
                                text="Gestioná las asistencias/reprogramaciones de los turnos de tus pacientes de forma automatica con nuestro chatbot de Whatsapp automatizado 24/7."
                                as="p"
                                className="text-sm text-slate-600 inline"
                                typingSpeed={18}
                                initialDelay={300}
                                startOnVisible={true}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-0.5"
                            />
                        </div>
                    </div>

                    <InteractiveWhatsAppPhone />
                </div>
            </section>

            {/* ── SECCIÓN 2 INTERACTIVA: ODONTOGRAMA DIGITAL 3D ────────────────── */}
            <section id="odontograma" className="py-20 bg-white border-t border-slate-200 scroll-mt-24 sm:scroll-mt-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-1">
                            <SplitText
                                text="Diagnóstico y Ficha Clínica"
                                tag="span"
                                className="text-xs font-bold uppercase tracking-wider text-slate-400"
                                delay={50}
                                duration={0.6}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </div>
                        <SplitText
                            text="Odontograma Digital Interactivo"
                            tag="h2"
                            className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight"
                            delay={35}
                            duration={0.6}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 35 }}
                            to={{ opacity: 1, y: 0 }}
                            threshold={0.1}
                            rootMargin="-50px"
                            textAlign="center"
                        />
                        <div className="mt-2 min-h-[40px] sm:min-h-[24px]">
                            <TextType
                                text="Probá el selector anatómico de 5 caras: marcá caries, resinas, endodoncias o coronas en tiempo real."
                                as="p"
                                className="text-sm text-slate-600 inline"
                                typingSpeed={16}
                                initialDelay={250}
                                startOnVisible={true}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-0.5"
                            />
                        </div>
                    </div>

                    <InteractiveOdontograma />
                </div>
            </section>

            {/* ── SECCIÓN 3 INTERACTIVA: PORTAL WEB DEL CONSULTORIO & SEÑAS MP ─── */}
            <section id="portal" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-24 sm:scroll-mt-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-1">
                            <SplitText
                                text="Presencia Digital y Cobranzas"
                                tag="span"
                                className="text-xs font-bold uppercase tracking-wider text-slate-400"
                                delay={50}
                                duration={0.6}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </div>
                        <BlurText
                            text="Página Web Propia y Gestión de Turnos"
                            as="h2"
                            delay={80}
                            animateBy="words"
                            direction="top"
                            threshold={0.15}
                            className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight justify-center"
                        />
                        <div className="mt-2 min-h-[40px] sm:min-h-[24px]">
                            <TextType
                                text="Experimentá cómo tus pacientes reservan desde el sitio web institucional de tu clínica (ej. tuconsultorio.ar)."
                                as="p"
                                className="text-sm text-slate-600 inline"
                                typingSpeed={16}
                                initialDelay={250}
                                startOnVisible={true}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-0.5"
                            />
                        </div>
                    </div>

                    <InteractiveBookingPortal />
                </div>
            </section>

            {/* ── SECCIÓN 4 INTERACTIVA: SALA DE ESPERA Y ALERTAS ──────────────── */}
            <section id="espera" className="py-20 bg-white border-t border-slate-200 scroll-mt-24 sm:scroll-mt-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-1">
                            <SplitText
                                text="Recepción en Vivo"
                                tag="span"
                                className="text-xs font-bold uppercase tracking-wider text-slate-400"
                                delay={50}
                                duration={0.6}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </div>
                        <SplitText
                            text="Gestión de asistencia, llegada y ausencias"
                            tag="h2"
                            className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight"
                            delay={35}
                            duration={0.6}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 35 }}
                            to={{ opacity: 1, y: 0 }}
                            threshold={0.1}
                            rootMargin="-50px"
                            textAlign="center"
                        />
                        <div className="mt-2 min-h-[40px] sm:min-h-[24px]">
                            <TextType
                                text="Simulá la llegada de un paciente al consultorio y el llamado discreto al doctor sin golpear puertas."
                                as="p"
                                className="text-sm text-slate-600 inline"
                                typingSpeed={16}
                                initialDelay={250}
                                startOnVisible={true}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-0.5"
                            />
                        </div>
                    </div>

                    <InteractiveWaitingRoom />
                </div>
            </section>

            {/* ── SECCIÓN 5 INTERACTIVA: LIQUIDACIONES DE HONORARIOS (Oculta por solicitud de diseño) ── */}
            {/* 
            <section id="liquidaciones" className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-1">
                            <SplitText
                                text="Finanzas y Horarios"
                                tag="span"
                                className="text-xs font-bold uppercase tracking-wider text-slate-400"
                                delay={50}
                                duration={0.6}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </div>
                        <BlurText
                            text="Liquidaciones Médicas Automáticas"
                            as="h2"
                            delay={80}
                            animateBy="words"
                            direction="top"
                            threshold={0.15}
                            className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight justify-center"
                        />
                        <div className="mt-2 min-h-[40px] sm:min-h-[24px]">
                            <TextType
                                text="Cálculo exacto de porcentajes y deducciones de laboratorio por odontólogo en un solo clic."
                                as="p"
                                className="text-sm text-slate-600 inline"
                                typingSpeed={16}
                                initialDelay={250}
                                startOnVisible={true}
                                loop={false}
                                showCursor={true}
                                cursorCharacter="|"
                                cursorClassName="text-blue-600 font-bold ml-0.5"
                            />
                        </div>
                    </div>

                    <InteractiveSettlements />
                </div>
            </section>
            */}

            {/* ── SECCIÓN DE INTEGRACIÓN CON SOFTWARES LÍDERES (MEDIT LINK / EXOCAD / DICOM) ── */}
            <IntegracionesLideresSection onOpenWhatsApp={openWhatsApp} />

            {/* ── PLANES Y PRECIOS TRANSPARENTES (SHADCN CARD & TABS) ─────────── */}
            <section id="planes" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center border-t border-slate-200 scroll-mt-24 sm:scroll-mt-28">
                <SplitText
                    text="Inversión clara sin contratos de permanencia"
                    tag="h2"
                    className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight"
                    delay={30}
                    duration={0.6}
                    ease="power3.out"
                    splitType="chars"
                    from={{ opacity: 0, y: 35 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-50px"
                    textAlign="center"
                />
                <p className="mt-2 text-base text-slate-600 max-w-2xl mx-auto">
                    15 días de prueba sin cargo. Cancelá o modificá tu plan cuando lo desees.
                </p>

                {/* Selector de Ciclo de Facturación Rediseñado */}
                <div className="mt-8 flex flex-col items-center gap-2.5">
                    <div className="inline-flex p-1 sm:p-1.5 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-inner relative">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 z-10 cursor-pointer ${
                                billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {billingCycle === 'monthly' && (
                                <motion.div
                                    layoutId="billing-pill-active"
                                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                    className="absolute inset-0 bg-white rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/70 -z-10"
                                />
                            )}
                            Facturación Mensual
                        </button>

                        <button
                            type="button"
                            onClick={() => setBillingCycle('annual')}
                            className={`relative px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 z-10 cursor-pointer flex items-center gap-2 ${
                                billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {billingCycle === 'annual' && (
                                <motion.div
                                    layoutId="billing-pill-active"
                                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                    className="absolute inset-0 bg-white rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/70 -z-10"
                                />
                            )}
                            <span>Facturación Anual</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                                billingCycle === 'annual'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                            }`}>
                                20% OFF
                            </span>
                        </button>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <Sparkles className="size-3 text-emerald-500" />
                        {billingCycle === 'annual' ? 'Ahorro de 2 meses bonificados por pago anual' : 'Flexibilidad total: cancelá o modificá cuando quieras'}
                    </span>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 text-left items-stretch">
                    {/* Plan Profesional con Shadcn Card + TiltedCard 3D */}
                    <TiltedCard
                        scaleOnHover={1.02}
                        rotateAmplitude={8}
                        showMobileWarning={false}
                        showTooltip={false}
                        className="h-full"
                    >
                        <Card className="h-full rounded-2xl border-slate-200 bg-white shadow-xs flex flex-col justify-between py-0">
                            <CardHeader className="p-8 pb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Para 1 a 3 profesionales
                                </span>
                                <CardTitle className="text-2xl font-black text-slate-900">
                                    Consultorio Independiente
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-1">
                                    Ideal para consultorios de 1 a 3 profesionales que buscan ordenar su agenda y digitalizar historias clínicas.
                                </CardDescription>
                                
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-slate-900">
                                        {billingCycle === 'monthly' ? '$125.000' : '$99.000'}
                                    </span>
                                    <span className="text-xs text-slate-500">ARS / mes</span>
                                </div>
                            </CardHeader>

                            <CardContent className="px-8 py-2">
                                <ul className="space-y-3 text-xs text-slate-700">
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 shrink-0" /> Agenda médica con sobreturnos inteligentes</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 shrink-0" /> Asistente de WhatsApp con confirmación automática</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 shrink-0" /> Odontograma digital 3D e historias clínicas</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 shrink-0" /> Web pública propia con turnero online</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 shrink-0" /> Subdominio exclusivo (tuclinica.dental-ia.com)</li>
                                </ul>
                            </CardContent>

                            <CardFooter className="p-8 pt-4 bg-transparent border-t-0">
                                <SpecularButton
                                    size="md"
                                    radius={14}
                                    tint="#ffffff"
                                    tintOpacity={0.96}
                                    textColor="#0f172a"
                                    lineColor="#2563eb"
                                    baseColor="#cbd5e1"
                                    intensity={1.3}
                                    shineSize={20}
                                    shineFade={45}
                                    thickness={1.5}
                                    speed={0.4}
                                    followMouse
                                    proximity={250}
                                    onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Quisiera solicitar los 15 días de prueba gratis del Plan Consultorio Independiente (1 a 3 profesionales).')}
                                    className="w-full h-12 border border-slate-300/80 shadow-xs cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-center"
                                >
                                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                                        Probar 15 Días Gratis
                                    </span>
                                </SpecularButton>
                            </CardFooter>
                        </Card>
                    </TiltedCard>

                    {/* Plan Centro Odontológico con Shadcn Card + TiltedCard 3D */}
                    <TiltedCard
                        scaleOnHover={1.03}
                        rotateAmplitude={8}
                        showMobileWarning={false}
                        showTooltip={false}
                        className="h-full"
                    >
                        <Card className="h-full rounded-2xl border-2 border-blue-600 bg-blue-50/20 shadow-md flex flex-col justify-between py-0">
                            <CardHeader className="p-8 pb-4">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                                    Para 5 a 10 profesionales • Más Elegido
                                </span>
                                <CardTitle className="text-2xl font-black text-slate-900">
                                    Centro Odontológico
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-1">
                                    Para centros de 5 a 10 profesionales con múltiples sillones, secretarias y rotación de turnos.
                                </CardDescription>
                                
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-blue-700">
                                        {billingCycle === 'monthly' ? '$195.000' : '$156.000'}
                                    </span>
                                    <span className="text-xs text-slate-500">ARS / mes</span>
                                </div>
                            </CardHeader>

                            <CardContent className="px-8 py-2">
                                <ul className="space-y-3 text-xs text-slate-700">
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> Todo lo del plan Consultorio sin límites</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> De 5 a 10 profesionales (secretarias y sillones ilimitados)</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> Cobro de señas por Mercado Pago (0% comisión)</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> Soporte para Dominio Propio (ej: dentalva.ar)</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> Módulo de liquidaciones automáticas a profesionales</li>
                                    <li className="flex items-center gap-2"><Check className="size-4 text-blue-600 font-bold shrink-0" /> Migración de historias clínicas previa incluida</li>
                                </ul>
                            </CardContent>

                            <CardFooter className="p-8 pt-4 bg-transparent border-t-0">
                                <SpecularButton
                                    size="md"
                                    radius={14}
                                    tint="#2563eb"
                                    tintOpacity={1}
                                    textColor="#ffffff"
                                    lineColor="#93c5fd"
                                    baseColor="#1d4ed8"
                                    intensity={1.4}
                                    shineSize={20}
                                    shineFade={45}
                                    thickness={1.5}
                                    speed={0.4}
                                    followMouse
                                    proximity={250}
                                    onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me interesa comenzar con el Plan Centro Odontológico (5 a 10 profesionales). ¿Podrían coordinar conmigo la activación?')}
                                    className="w-full h-12 shadow-lg shadow-blue-600/25 cursor-pointer flex items-center justify-center"
                                >
                                    <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                                        Comenzar con Plan Centro Odontológico
                                        <ArrowRight className="size-4" />
                                    </span>
                                </SpecularButton>
                            </CardFooter>
                        </Card>
                    </TiltedCard>
                </div>
            </section>

            {/* ── PREGUNTAS FRECUENTES CON SHADCN ACCORDION ─────────────────── */}
            <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
                    <div className="text-center mb-12">
                        <BlurText
                            text="Preguntas Frecuentes"
                            as="h2"
                            delay={90}
                            animateBy="words"
                            direction="top"
                            threshold={0.15}
                            className="text-3xl font-black text-slate-900 justify-center"
                        />
                    </div>

                    <Accordion type="single" collapsible defaultValue="faq-0" className="w-full space-y-3.5">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`faq-${index}`}
                                className="rounded-2xl border border-slate-200/90 bg-white px-6 transition-all duration-300 hover:border-slate-300 data-[state=open]:border-blue-200 data-[state=open]:shadow-sm overflow-hidden"
                            >
                                <AccordionTrigger className="text-left font-bold text-slate-900 text-sm sm:text-base hover:no-underline hover:text-blue-600 py-5">
                                    {faq.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pb-6 pt-0 text-left">
                                    {faq.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </section>

            {/* ── CTA FINAL Y FOOTER INSTITUCIONAL ───────────────────────────── */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
                <div className="p-10 sm:p-14 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 space-y-6">
                    <SplitText
                        text="Llevá la gestión de tu consultorio a un nivel superior"
                        tag="h2"
                        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
                        delay={30}
                        duration={0.6}
                        ease="power3.out"
                        splitType="chars"
                        from={{ opacity: 0, y: 35 }}
                        to={{ opacity: 1, y: 0 }}
                        threshold={0.1}
                        rootMargin="-50px"
                        textAlign="center"
                    />
                    <p className="text-blue-100 max-w-2xl mx-auto text-sm sm:text-base">
                        Sumate a las clínicas y consultorios que ya optimizaron su tiempo, redujeron el ausentismo y profesionalizaron su atención al paciente con Dental-IA.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        <SpecularButton
                            size="lg"
                            radius={16}
                            tint="#ffffff"
                            tintOpacity={1}
                            textColor="#1d4ed8"
                            lineColor="#60a5fa"
                            baseColor="#bfdbfe"
                            intensity={1.5}
                            shineSize={20}
                            shineFade={45}
                            thickness={1.5}
                            speed={0.4}
                            followMouse
                            proximity={280}
                            onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Me gustaría agendar una demo para conocer cómo implementar la plataforma en mi consultorio/clínica.')}
                            className="w-full sm:w-auto h-14 px-8 shadow-xl shadow-blue-950/25 cursor-pointer flex items-center justify-center"
                        >
                            <span className="font-extrabold text-sm text-blue-700 flex items-center gap-2.5">
                                <PhoneCall className="size-4 text-blue-600" />
                                Agendar Demo
                            </span>
                        </SpecularButton>

                        <SpecularButton
                            size="lg"
                            radius={16}
                            tint="#1e40af"
                            tintOpacity={0.85}
                            textColor="#ffffff"
                            lineColor="#ffffff"
                            baseColor="#1d4ed8"
                            intensity={1.4}
                            shineSize={20}
                            shineFade={45}
                            thickness={1.5}
                            speed={0.4}
                            followMouse
                            proximity={280}
                            onClick={() => openWhatsApp('¡Hola Dental-IA! 👋 Quisiera activar los 15 días de prueba gratis en mi consultorio.')}
                            className="w-full sm:w-auto h-14 px-8 border border-blue-400/50 shadow-sm cursor-pointer hover:border-white transition-colors flex items-center justify-center"
                        >
                            <span className="font-bold text-sm text-white flex items-center gap-2">
                                Probar 15 Días Gratis
                                <ArrowRight className="size-4 text-blue-200" />
                            </span>
                        </SpecularButton>
                    </div>
                </div>
            </section>

            <footer className="border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <img src="/icon.png" alt="Dental-IA" className="size-5 object-contain" />
                        <span className="font-extrabold text-sm text-slate-900">Dental<span className="text-blue-600">-IA</span></span>
                        <span>• Desarrollado por CreAPP Argentina</span>
                    </div>
                    <p>© 2026 Dental-IA. Todos los derechos reservados. Software médico seguro.</p>
                </div>
            </footer>
        </div>
    )
}

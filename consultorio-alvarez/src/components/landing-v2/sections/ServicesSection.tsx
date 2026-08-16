'use client'

import { useRef, useEffect, useState, useId } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SERVICES } from '@/lib/landing-constants'
import type { LandingConfig } from '@/lib/types/landing'
import { Shield, Clock, Star, Heart, ChevronLeft, ChevronRight, X, Info, Sparkles } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const ICON_MAP: Record<string, React.ReactNode> = {
    shield: <Shield className="h-5 w-5" />,
    clock: <Clock className="h-5 w-5" />,
    star: <Star className="h-5 w-5" />,
    heart: <Heart className="h-5 w-5" />,
}

interface ServiceTooltipData {
    title: string;
    expandedDescription: string;
    images: string[];
}

const TOOLTIP_DATA: Record<string, ServiceTooltipData> = {
    'estética dental': {
        title: 'Estética Dental Premium',
        expandedDescription: 'Tratamientos personalizados de diseño de sonrisa. Combinamos carillas ultrafinas de porcelana inyectada, blanqueamiento y coronas de zirconio de alta traslúcida para lograr una armonía natural y duradera.',
        images: ['/servicios/estetica_dental.webp']
    },
    'odontología digital': {
        title: 'Odontología Digital 3D',
        expandedDescription: 'Escaneo intraoral de alta precisión que reemplaza las pastas de impresión tradicionales. Diseñamos restauraciones mediante tecnología CAD/CAM y simulamos tu sonrisa antes de comenzar.',
        images: ['/servicios/odontologia_digital.webp']
    },
    'implantologia': {
        title: 'Implantes Guiados por Computadora',
        expandedDescription: 'Colocación precisa de implantes de titanio utilizando guías quirúrgicas impresas en 3D. Minimiza el tiempo de cirugía, el dolor postoperatorio y acelera el proceso de oseointegración.',
        images: ['/servicios/implantologia_guiada.webp']
    },
    'endodoncia mecanizada': {
        title: 'Endodoncia Rotatoria Automatizada',
        expandedDescription: 'Tratamiento de conducto eficiente y confortable en una sola sesión. Utilizamos motores inteligentes y localizadores de ápice digitales para asegurar la desinfección total de la pieza.',
        images: ['/servicios/endodoncia_mecanizada.webp']
    },
    'turnos puntuales': {
        title: 'Agenda de Turnos Optimizada',
        expandedDescription: 'Sistema inteligente de reservas que calcula el tiempo real necesario para cada procedimiento. Sin sobreturnos, garantizando puntualidad y una experiencia de espera relajada y exclusiva.',
        images: ['/servicios/turnos_puntuales.webp']
    }
};

const getTooltipData = (title: string): ServiceTooltipData | null => {
    const t = title.toLowerCase();
    if (t.includes('estética') || t.includes('estetica')) return TOOLTIP_DATA['estética dental'];
    if (t.includes('digital') || t.includes('tecnología') || t.includes('odontología digital') || t.includes('tecnologia')) return TOOLTIP_DATA['odontología digital'];
    if (t.includes('implante') || t.includes('implantología') || t.includes('implantologia')) return TOOLTIP_DATA['implantologia'];
    if (t.includes('endodoncia')) return TOOLTIP_DATA['endodoncia mecanizada'];
    if (t.includes('turno') || t.includes('agenda') || t.includes('puntuales')) return TOOLTIP_DATA['turnos puntuales'];
    return null;
};

function CardTooltip({ 
    tooltip, 
    isOpen, 
    onClose,
    onBookingClick,
    colorPrimary = '#0d9488'
}: { 
    tooltip: ServiceTooltipData; 
    isOpen: boolean; 
    onClose: () => void;
    onBookingClick?: () => void;
    colorPrimary?: string;
}) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (tooltip.images.length <= 1) return
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % tooltip.images.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [tooltip.images.length])

    const next = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIndex((prev) => (prev + 1) % tooltip.images.length)
    }

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIndex((prev) => (prev - 1 + tooltip.images.length) % tooltip.images.length)
    }

    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            className={`hidden sm:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[300px] sm:w-[340px] md:w-[380px] bg-white/95 border border-white/80 rounded-3xl p-4 shadow-2xl backdrop-blur-md z-50 transition-all duration-300 origin-bottom flex-col gap-3 ${
                isOpen 
                    ? 'opacity-100 pointer-events-auto scale-100' 
                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100'
            }`}
        >
            {/* Close button (always visible when pinned open or hovered) */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                }}
                className={`absolute top-3 right-3 h-7 w-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all z-20 backdrop-blur-sm shadow-md cursor-pointer ${
                    isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Cerrar detalle"
                aria-label="Cerrar detalle"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            {/* Carousel */}
            <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100 group/carousel">
                <img 
                    src={tooltip.images[index]} 
                    alt={tooltip.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                
                {tooltip.images.length > 1 && (
                    <>
                        <button 
                            onClick={prev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-opacity opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={next}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-opacity opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        
                        {/* Dots */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                            {tooltip.images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIndex(i)
                                    }}
                                    className={`h-1.5 rounded-full transition-all ${
                                        index === i ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="text-left pr-4">
                <h4 className="text-sm font-bold text-slate-900 mb-1">{tooltip.title}</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">{tooltip.expandedDescription}</p>
                {onBookingClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                            onBookingClick()
                        }}
                        className="w-full py-2 px-3 rounded-xl text-white font-semibold text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-center block cursor-pointer"
                        style={{ backgroundColor: colorPrimary }}
                    >
                        Agendar este tratamiento
                    </button>
                )}
            </div>
            
            {/* Small triangle arrow at the bottom */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 bg-white/95 border-r border-b border-white/80 rotate-45" />
        </div>
    )
}

interface ServicesSectionProps {
    config?: Pick<LandingConfig, 'servicios' | 'servicios_titulo' | 'servicios_subtitulo' | 'color_primary' | 'color_accent'>;
    onBookingClick?: () => void;
}

export function ServicesSection({ config, onBookingClick }: ServicesSectionProps) {
    const sectionRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    
    // State to manage pinned/active tooltip on iPad/mobile/tap
    const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null)
    const [mobileImgIndex, setMobileImgIndex] = useState<number>(0)

    // Handle click outside or Escape key to close active tooltips
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveTooltipKey(null)
            }
        }
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (cardsRef.current && !cardsRef.current.contains(e.target as Node)) {
                setActiveTooltipKey(null)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handleClickOutside)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (!sectionRef.current || !cardsRef.current || !titleRef.current) return

        // Use a scoped context so cleanup ONLY kills THIS component's triggers
        const ctx = gsap.context(() => {
            let mm = gsap.matchMedia()

            mm.add("(min-width: 768px)", () => {
                // Title reveal (no scrub, fluid entry)
                gsap.fromTo(
                    titleRef.current,
                    { opacity: 0, y: 40 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                    }
                )

                // Cards stagger (perfect vertical entry, strictly aligned grid)
                const cards = cardsRef.current!.querySelectorAll('.service-card')
                gsap.fromTo(
                    cards,
                    {
                        opacity: 0,
                        y: 40,
                        scale: 0.98,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.7,
                        stagger: 0.1,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: cardsRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                    }
                )
            })

            mm.add("(max-width: 767px)", () => {
                // Mobile: fluid vertical entrance (no horizontal offset)
                gsap.fromTo(
                    titleRef.current,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 85%',
                        },
                    }
                )

                const cards = cardsRef.current!.querySelectorAll('.service-card')
                gsap.fromTo(
                    cards,
                    { opacity: 0, y: 30, scale: 0.98 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.5,
                        stagger: 0.08,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: cardsRef.current,
                            start: 'top 85%',
                        },
                    }
                )
            })
        }, sectionRef)

        return () => ctx.revert() // Only kills triggers scoped to this component
    }, [])

    const toggleCard = (key: string) => {
        setMobileImgIndex(0)
        setActiveTooltipKey((prev) => (prev === key ? null : key))
    }

    const activeTooltipData = activeTooltipKey ? getTooltipData(activeTooltipKey) : null

    return (
        <section
            ref={sectionRef}
            id="servicios"
            className="relative min-h-screen flex flex-col justify-center z-10 py-20"
        >
            <div className="max-w-6xl mx-auto px-6 sm:px-10 w-full">
                <div ref={titleRef} className="mb-16 text-center" style={{ opacity: 0 }}>
                    <span
                        className="text-xs font-semibold tracking-[0.25em] uppercase mb-3 block"
                        style={{ color: config?.color_primary ?? '#0d9488' }}
                    >
                        {config?.servicios_titulo ?? 'Nuestros servicios'}
                    </span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
                        Tecnología de
                        <span className="text-gradient-landing"> vanguardia</span>
                    </h2>
                    <p className="mt-4 text-slate-600 font-medium max-w-lg mx-auto text-base">
                        {config?.servicios_subtitulo || 'Cada tratamiento combina precisión clínica con la más alta estética dental.'}
                    </p>
                </div>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {config?.servicios ? (
                        config.servicios.map((service, idx) => {
                            const tooltipData = getTooltipData(service.titulo);
                            const isPinned = activeTooltipKey === service.titulo;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => tooltipData && toggleCard(service.titulo)}
                                    className={`service-card relative glass-light rounded-3xl p-7 hover:bg-white/95 hover:shadow-xl hover:shadow-slate-200/40 transition-premium group cursor-pointer select-none active:scale-[0.99] ${
                                        isPinned ? 'ring-2 ring-teal-500/50 bg-white/95 shadow-xl' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300"
                                            style={{
                                                backgroundColor: `${config?.color_primary ?? '#0d9488'}26`,
                                                color: config?.color_primary ?? '#0d9488',
                                            }}
                                        >
                                            {ICON_MAP[service.icono] ?? <Star className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-slate-800 leading-snug">{service.titulo}</h3>
                                                {tooltipData && (
                                                    <span className="inline-flex sm:hidden shrink-0 items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50/90 px-2.5 py-0.5 rounded-full border border-teal-100/80 mt-0.5">
                                                        <Info className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Ver más</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{service.descripcion}</p>
                                        </div>
                                    </div>
                                    {tooltipData && (
                                        <CardTooltip 
                                            tooltip={tooltipData} 
                                            isOpen={isPinned}
                                            onClose={() => setActiveTooltipKey(null)}
                                            onBookingClick={onBookingClick}
                                            colorPrimary={config?.color_primary}
                                        />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        SERVICES.map((service) => {
                            const tooltipData = getTooltipData(service.title);
                            const isPinned = activeTooltipKey === service.title;
                            return (
                                <div 
                                    key={service.id} 
                                    onClick={() => tooltipData && toggleCard(service.title)}
                                    className={`service-card relative glass-light rounded-3xl p-7 hover:bg-white/95 hover:shadow-xl hover:shadow-slate-200/40 transition-premium group cursor-pointer select-none active:scale-[0.99] ${
                                        isPinned ? 'ring-2 ring-teal-500/50 bg-white/95 shadow-xl' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div 
                                            className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl shrink-0 group-hover:bg-teal-500/20 transition-colors duration-300"
                                            style={{
                                                backgroundColor: `${config?.color_primary ?? '#0d9488'}15`,
                                                color: config?.color_primary ?? '#0d9488',
                                            }}
                                        >
                                            {service.icon}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-slate-800 leading-snug">{service.title}</h3>
                                                {tooltipData && (
                                                    <span className="inline-flex sm:hidden shrink-0 items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50/90 px-2.5 py-0.5 rounded-full border border-teal-100/80 mt-0.5">
                                                        <Info className="h-3 w-3 shrink-0" />
                                                        <span className="whitespace-nowrap">Ver más</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p 
                                                className="text-xs font-semibold mb-3"
                                                style={{ color: config?.color_primary ?? '#0d9488' }}
                                            >
                                                {service.subtitle}
                                            </p>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{service.description}</p>
                                        </div>
                                    </div>
                                    {tooltipData && (
                                        <CardTooltip 
                                            tooltip={tooltipData} 
                                            isOpen={isPinned}
                                            onClose={() => setActiveTooltipKey(null)}
                                            onBookingClick={onBookingClick}
                                            colorPrimary={config?.color_primary}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile Bottom Sheet Modal (< 640px) */}
            {activeTooltipData && (
                <div 
                    className="fixed inset-0 z-[100] flex items-end sm:hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setActiveTooltipKey(null)}
                >
                    <div 
                        className="w-full bg-white rounded-t-[2.5rem] p-6 shadow-2xl border-t border-white/60 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 max-h-[88vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 shrink-0" />
                        
                        {/* Header with category badge & close */}
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                                <Sparkles className="h-3 w-3" />
                                Detalle del Tratamiento
                            </span>
                            <button 
                                onClick={() => setActiveTooltipKey(null)}
                                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Image Showcase */}
                        <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-100 shadow-inner">
                            <img 
                                src={activeTooltipData.images[mobileImgIndex]} 
                                alt={activeTooltipData.title}
                                className="h-full w-full object-cover"
                            />
                            {activeTooltipData.images.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMobileImgIndex((prev) => (prev - 1 + activeTooltipData.images.length) % activeTooltipData.images.length);
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMobileImgIndex((prev) => (prev + 1) % activeTooltipData.images.length);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>

                                    {/* Dots */}
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                        {activeTooltipData.images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMobileImgIndex(i);
                                                }}
                                                className={`h-1.5 rounded-full transition-all ${
                                                    mobileImgIndex === i ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Text description */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{activeTooltipData.title}</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{activeTooltipData.expandedDescription}</p>
                        </div>

                        {/* Action CTA */}
                        <div className="pt-2 pb-1 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setActiveTooltipKey(null)
                                    if (onBookingClick) {
                                        onBookingClick()
                                    } else {
                                        document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' })
                                    }
                                }}
                                className="w-full py-3.5 px-4 rounded-2xl text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all active:scale-[0.98] text-center block cursor-pointer"
                                style={{ backgroundColor: config?.color_primary ?? '#0d9488' }}
                            >
                                Agendar turno para este tratamiento
                            </button>
                            <button
                                onClick={() => setActiveTooltipKey(null)}
                                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors text-center cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}


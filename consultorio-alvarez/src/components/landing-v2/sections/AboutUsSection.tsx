'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Play, Pause, Maximize2, ShieldCheck, Sparkles, MapPin, ChevronRight, Award, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    ABOUT_DEFAULT_SCENES,
    ABOUT_DEFAULT_FEATURES,
    ABOUT_DEFAULT_TITULO,
    ABOUT_DEFAULT_SUBTITULO,
} from '@/lib/landing-about'

interface VideoScene {
    id: string
    title: string
    subtitle: string
    badge: string
    src: string
}

const SCENES: VideoScene[] = [
    {
        id: 'instalaciones',
        title: 'Instalaciones Premium & Sillones 3D',
        subtitle: 'Consultorio climatizado y equipado con tecnología médica de alta precisión.',
        badge: 'Equipamiento de Avanzada',
        src: '/videos/Consultorio%20VIDEO%201.mp4'
    },
    {
        id: 'recepcion',
        title: 'Confort & Bioseguridad Grado Quirúrgico',
        subtitle: 'Ambientes diseñados para tu tranquilidad y máximo estándar de esterilización.',
        badge: 'Higiene & Confort',
        src: '/videos/Consultorio%20VIDEO%202.mp4'
    },
    {
        id: 'tecnologia',
        title: 'Atención Odontológica Personalizada',
        subtitle: 'Instrumental digitalizado e innovación constante para cuidar tu sonrisa.',
        badge: 'Innovación Odontológica',
        src: '/videos/Consultorio%20VIDEO%203.mp4'
    }
]

interface AboutVideoInput {
    src: string
    title: string
    subtitle: string
    badge: string
}

interface AboutFeatureInput {
    title: string
    description: string
}

interface Props {
    onBookingClick: () => void
    colorPrimary?: string
    bgHero?: string
    videos?: AboutVideoInput[] | null
    features?: AboutFeatureInput[] | null
    titulo?: string | null
    subtitulo?: string | null
}

// Íconos fijos de las tarjetas de la derecha (por posición).
const FEATURE_ICONS = [ShieldCheck, Award, Clock]

export function AboutUsSection({ onBookingClick, colorPrimary = '#0d9488', bgHero, videos, features, titulo, subtitulo }: Props) {
    const [currentSceneIdx, setCurrentSceneIdx] = useState(0)
    const [isMuted, setIsMuted] = useState(true)
    const [isPlaying, setIsPlaying] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Escenas: cada campo cae al default por posición. Así un tenant puede editar
    // solo los textos sin subir video (usa el video de la plantilla), o subir el
    // suyo manteniendo los textos.
    const base = (videos && videos.length > 0) ? videos : ABOUT_DEFAULT_SCENES
    const scenes: VideoScene[] = base.map((v, i) => ({
        id: `scene-${i}`,
        src: v.src || ABOUT_DEFAULT_SCENES[i]?.src || ABOUT_DEFAULT_SCENES[0].src,
        title: v.title || ABOUT_DEFAULT_SCENES[i]?.title || '',
        subtitle: v.subtitle || ABOUT_DEFAULT_SCENES[i]?.subtitle || '',
        badge: v.badge || ABOUT_DEFAULT_SCENES[i]?.badge || `Escena ${i + 1}`,
    }))

    const pillars = (features && features.length > 0) ? features : ABOUT_DEFAULT_FEATURES
    const headerTitulo = titulo || ABOUT_DEFAULT_TITULO
    const headerSubtitulo = subtitulo || ABOUT_DEFAULT_SUBTITULO
    // Resalta la última palabra del título (como la plantilla con "bienestar").
    const tituloWords = headerTitulo.trim().split(' ')
    const tituloUltima = tituloWords.length > 1 ? tituloWords.pop() : ''
    const tituloBase = tituloWords.join(' ')

    const activeScene = scenes[currentSceneIdx] ?? scenes[0]

    // Handle scene change
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.src = activeScene.src
            videoRef.current.muted = isMuted
            videoRef.current.play().then(() => {
                setIsPlaying(true)
            }).catch(() => {
                setIsPlaying(false)
            })
        }
    }, [currentSceneIdx])

    // Toggle mute
    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    // Toggle play/pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
                setIsPlaying(false)
            } else {
                videoRef.current.play()
                setIsPlaying(true)
            }
        }
    }

    // Handle full screen
    const handleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (containerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {})
            } else {
                containerRef.current.requestFullscreen().catch(() => {})
            }
        }
    }

    // Automatically transition to next scene when video ends
    const handleVideoEnd = () => {
        setCurrentSceneIdx((prev) => (prev + 1) % scenes.length)
    }

    return (
        <section
            id="conocenos"
            className="w-full py-20 relative overflow-hidden select-none"
        >
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-12">
                {/* SECTION HEADER */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-xs">
                        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary">
                            CONOCÉ NUESTRO CONSULTORIO
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        {tituloBase}{tituloUltima ? <> <span className="text-primary">{tituloUltima}</span></> : null}
                    </h2>

                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                        {headerSubtitulo}
                    </p>
                </div>

                {/* MAIN CONTENT GRID: VIDEO PLAYER + FEATURE PILLARS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* LEFT COLUMN: INTERACTIVE VIDEO TOUR PLAYER (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        <div 
                            ref={containerRef}
                            onClick={togglePlay}
                            className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/60 bg-slate-900 group cursor-pointer"
                        >
                            {/* HTML5 VIDEO PLAYER */}
                            <video
                                ref={videoRef}
                                src={activeScene.src}
                                autoPlay
                                muted={isMuted}
                                playsInline
                                onEnded={handleVideoEnd}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                            />

                            {/* DARK GRADIENT OVERLAY (for readability) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                            {/* TOP BAR OVERLAY: SCENE BADGE + CONTROLS */}
                            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
                                <div className="flex items-center gap-2">
                                    <span 
                                        className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full text-white shadow-lg backdrop-blur-md border border-white/20"
                                        style={{ backgroundColor: colorPrimary }}
                                    >
                                        {activeScene.badge}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Mute/Unmute Toggle */}
                                    <button
                                        onClick={toggleMute}
                                        className="h-9 px-3 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
                                        title={isMuted ? "Activar sonido" : "Silenciar"}
                                    >
                                        {isMuted ? (
                                            <>
                                                <VolumeX className="h-4 w-4 text-amber-400" />
                                                <span className="hidden sm:inline">Activar Sonido</span>
                                            </>
                                        ) : (
                                            <>
                                                <Volume2 className="h-4 w-4 text-emerald-400" />
                                                <span className="hidden sm:inline">Sonido ON</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Fullscreen button */}
                                    <button
                                        onClick={handleFullscreen}
                                        className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md transition-all flex items-center justify-center shadow-md cursor-pointer"
                                        title="Pantalla Completa"
                                    >
                                        <Maximize2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* CENTER PLAY/PAUSE OVERLAY (shown on hover or when paused) */}
                            <AnimatePresence>
                                {!isPlaying && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                                    >
                                        <div className="h-16 w-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl border border-white/40 backdrop-blur-md">
                                            <Play className="h-7 w-7 ml-1 fill-white" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* BOTTOM OVERLAY: CORPORATE LOWER THIRDS */}
                            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none space-y-2">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeScene.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        transition={{ duration: 0.4 }}
                                        className="bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 max-w-xl text-left shadow-2xl"
                                    >
                                        <h3 className="text-base sm:text-lg font-black text-white leading-tight tracking-tight mb-1">
                                            {activeScene.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                                            {activeScene.subtitle}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* SCENE NAVIGATOR TABS BELOW VIDEO */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                            {scenes.map((scene, idx) => (
                                <button
                                    key={scene.id}
                                    onClick={() => setCurrentSceneIdx(idx)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 shadow-xs",
                                        currentSceneIdx === idx
                                            ? "bg-white text-slate-900 border-primary/40 shadow-md scale-[1.02]"
                                            : "bg-white/60 hover:bg-white text-slate-600 border-slate-200/80"
                                    )}
                                >
                                    <span 
                                        className={cn(
                                            "h-2 w-2 rounded-full transition-all",
                                            currentSceneIdx === idx ? "bg-primary animate-ping" : "bg-slate-400"
                                        )} 
                                    />
                                    <span>Escena {idx + 1}: {scene.badge}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CLINIC PILLARS & CTA CARD (4 cols) */}
                    <div className="lg:col-span-4 space-y-6 text-left">
                        {pillars.map((pillar, i) => {
                            const Icon = FEATURE_ICONS[i] ?? ShieldCheck
                            return (
                                <div key={i} className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-sm flex items-start gap-3.5 hover:shadow-md transition-shadow">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 mb-0.5">{pillar.title}</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {pillar.description}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Action CTA Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-3.5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                                <Sparkles className="h-4 w-4" />
                                <span>Atención Odontológica Exclusiva</span>
                            </div>
                            <h4 className="text-base font-black text-white leading-snug">
                                ¿Querés realizar tu consulta en nuestro consultorio?
                            </h4>
                            <button
                                onClick={onBookingClick}
                                className="w-full rounded-xl py-3.5 px-4 text-xs font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wider"
                                style={{ backgroundColor: colorPrimary }}
                            >
                                <span>RESERVA TU TURNO ONLINE</span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}

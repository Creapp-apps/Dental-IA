'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Sun, 
    Coffee, 
    Moon, 
    CheckCircle2, 
    Calendar, 
    MessageSquare, 
    Users, 
    ShieldCheck, 
    Sparkles 
} from 'lucide-react'
import { hexToHsl } from '@/lib/theme'

interface LoginCinematicLoaderProps {
    colorPrimary?: string
    logoUrl?: string | null
    tenantNombre?: string
    isAlvarez?: boolean
}

export function LoginCinematicLoader({
    colorPrimary = '#2563eb',
    logoUrl,
    tenantNombre,
    isAlvarez = true
}: LoginCinematicLoaderProps) {
    const { h, r, g, b } = hexToHsl(colorPrimary)
    const [stepIndex, setStepIndex] = useState(0)
    const [progress, setProgress] = useState(15)
    const [imgError, setImgError] = useState(false)

    // Contexto de hora del día
    const currentHour = new Date().getHours()
    const isMorning = currentHour >= 5 && currentHour < 13
    const isAfternoon = currentHour >= 13 && currentHour < 20

    const timeGreeting = isMorning
        ? '¡Buenos días!'
        : isAfternoon
        ? '¡Buenas tardes!'
        : '¡Buenas noches!'

    const timeSubtitle = isMorning
        ? 'Preparando tu consultorio para la jornada'
        : isAfternoon
        ? 'Retomando la agenda del turno tarde'
        : 'Accediendo al panel de gestión'

    const steps = isAfternoon
        ? [
            {
                icon: ShieldCheck,
                title: 'Credenciales validadas con éxito',
                detail: 'Conexión cifrada de alta seguridad'
            },
            {
                icon: Calendar,
                title: 'Sincronizando agenda del turno tarde...',
                detail: 'Actualizando turnos y profesionales de la tarde'
            },
            {
                icon: MessageSquare,
                title: 'Verificando confirmaciones de WhatsApp...',
                detail: 'Procesando cancelaciones y reprogramaciones'
            },
            {
                icon: Users,
                title: 'Optimizando fichas y pacientes...',
                detail: 'Cargando historiales clínicos'
            },
            {
                icon: Sparkles,
                title: '¡Todo listo! Ingresando al panel...',
                detail: 'Que tengas una excelente tarde de atención'
            }
        ]
        : [
            {
                icon: ShieldCheck,
                title: 'Credenciales validadas con éxito',
                detail: 'Conexión cifrada de alta seguridad'
            },
            {
                icon: Calendar,
                title: 'Preparando la agenda del día...',
                detail: 'Cargando turnos y salas odontológicas'
            },
            {
                icon: MessageSquare,
                title: 'Conectando asistente de WhatsApp...',
                detail: 'Verificando respuestas y recordatorios matutinos'
            },
            {
                icon: Users,
                title: 'Sincronizando base de pacientes...',
                detail: 'Preparando fichas clínicas e historiales'
            },
            {
                icon: Sparkles,
                title: '¡Todo listo! Ingresando al panel...',
                detail: 'Que tengas un excelente día de trabajo'
            }
        ]

    // Avance de la secuencia y la barra de progreso
    useEffect(() => {
        const intervals = [750, 850, 900, 850]
        let current = 0

        const runNext = () => {
            if (current < steps.length - 1) {
                const nextStep = current + 1
                current = nextStep
                setStepIndex(nextStep)
                setProgress(Math.min(95, 25 + nextStep * 18))
                timeoutId = setTimeout(runNext, intervals[nextStep - 1] || 850)
            }
        }

        let timeoutId = setTimeout(runNext, intervals[0])
        return () => clearTimeout(timeoutId)
    }, [steps.length])

    const currentStep = steps[stepIndex]
    const StepIcon = currentStep.icon

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4"
            style={{
                backgroundColor: `hsl(${h}, 32%, 5%)`,
            }}
        >
            {/* Halo de luz de fondo con color de marca */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle 600px at 50% 45%, rgba(${r}, ${g}, ${b}, 0.18), transparent 70%)`
                }}
            />

            {/* Partículas / destellos difusos */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-30 bg-primary/20" />
            <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-30 bg-primary/20" />

            <div className="relative z-10 w-full max-w-md mx-auto text-center">
                {/* Contenedor Glassmorphism */}
                <div 
                    className="p-8 sm:p-10 rounded-3xl backdrop-blur-2xl border shadow-2xl relative overflow-hidden"
                    style={{
                        backgroundColor: `hsl(${h}, 25%, 9%, 0.85)`,
                        borderColor: `hsl(${h}, 30%, 25%, 0.4)`,
                        boxShadow: `0 25px 60px -15px rgba(0,0,0,0.7), 0 0 30px -5px rgba(${r}, ${g}, ${b}, 0.2)`
                    }}
                >
                    {/* Resplandor superior en la tarjeta */}
                    <div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full blur-sm"
                        style={{ backgroundColor: colorPrimary }}
                    />

                    {/* Logo con animación de respiración / pulso */}
                    <div className="flex justify-center mb-6">
                        <div className="relative flex items-center justify-center min-h-[72px]">
                            <motion.div
                                animate={{
                                    scale: [1, 1.08, 1],
                                    opacity: [0.35, 0.65, 0.35]
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                                className="absolute -inset-4 rounded-full blur-xl pointer-events-none"
                                style={{
                                    background: `radial-gradient(circle, ${colorPrimary}99 0%, transparent 70%)`
                                }}
                            />
                            {logoUrl && !imgError ? (
                                <img
                                    src={logoUrl}
                                    alt={tenantNombre || "Logo"}
                                    onError={() => setImgError(true)}
                                    className="relative max-h-16 max-w-[220px] w-auto object-contain drop-shadow-xl"
                                />
                            ) : isAlvarez ? (
                                <img
                                    src="/LOGO-ALVAREZ.png"
                                    alt="Consultorio Álvarez"
                                    onError={(e) => {
                                        e.currentTarget.src = "/LOGO-DENTAL.png"
                                    }}
                                    className="relative max-h-16 max-w-[220px] w-auto object-contain drop-shadow-xl"
                                />
                            ) : (
                                <div 
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-lg relative border border-white/20"
                                    style={{
                                        background: `linear-gradient(135deg, ${colorPrimary} 0%, hsl(${h}, 60%, 25%) 100%)`
                                    }}
                                >
                                    {(tenantNombre || 'D')[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Saludo dinámico según horario */}
                    <div className="space-y-1 mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2 bg-white/5 border border-white/10 text-white/90">
                            {isMorning ? (
                                <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            ) : isAfternoon ? (
                                <Coffee className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                            ) : (
                                <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            )}
                            <span>{timeGreeting}</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                            {timeSubtitle}
                        </h3>
                        <p className="text-xs text-white/50">
                            {isAlvarez ? 'Consultorio Álvarez • Dental-IA' : (tenantNombre || 'Plataforma Dental-IA')}
                        </p>
                    </div>

                    {/* Secuencia de mensajes animados */}
                    <div className="min-h-[76px] flex flex-col items-center justify-center py-2">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={stepIndex}
                                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <div className="flex items-center gap-2 text-white font-medium text-sm sm:text-base">
                                    <StepIcon 
                                        className="w-4 h-4 shrink-0 transition-colors duration-300"
                                        style={{ color: colorPrimary }}
                                    />
                                    <span>{currentStep.title}</span>
                                </div>
                                <span className="text-xs text-white/50 tracking-wide font-normal">
                                    {currentStep.detail}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Barra de progreso cinematográfica */}
                    <div className="mt-6 space-y-2">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-[1px] relative">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{
                                    backgroundColor: colorPrimary,
                                    boxShadow: `0 0 12px ${colorPrimary}`
                                }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.7, ease: 'easeInOut' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                            </motion.div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
                            <span>Sincronización en curso</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                    </div>
                </div>

                {/* Subtexto sutil de pie */}
                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
                    <span>Conexión cifrada y respaldo seguro activo</span>
                </div>
            </div>
        </motion.div>
    )
}

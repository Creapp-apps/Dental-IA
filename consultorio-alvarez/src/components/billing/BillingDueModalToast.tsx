'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Calendar, CreditCard, ArrowRight, X, AlertTriangle, ShieldCheck } from 'lucide-react'

interface BillingDueModalToastProps {
    tenantId: string
    clinicName: string
    fechaVencimiento: string
    montoAbono: number
    isSuperadmin: boolean
    diffDays: number
    themeColor?: string
}

function formatExpiryDate(dateStr: string): string {
    if (!dateStr) return 'Fecha no definida'
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const [year, month, day] = parts.map(Number)
    if (!year || !month || !day) return dateStr
    const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    return `${String(day).padStart(2, '0')} de ${months[month - 1]}, ${year}`
}

export function BillingDueModalToast({
    tenantId,
    clinicName,
    fechaVencimiento,
    montoAbono,
    isSuperadmin,
    diffDays,
    themeColor = '#2563eb'
}: BillingDueModalToastProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    const sessionKey = `billing_due_modal_dismissed_${tenantId}_${fechaVencimiento}_${diffDays}`

    useEffect(() => {
        setMounted(true)
        if (isSuperadmin) return
        if (!fechaVencimiento) return
        
        // Disparar solo si faltan 3 días o menos (<= 72 horas)
        if (diffDays <= 3) {
            try {
                const isDismissed = sessionStorage.getItem(sessionKey)
                if (!isDismissed) {
                    // Pequeño retardo de 600ms para entrada cinematográfica al cargar la app
                    const timer = setTimeout(() => {
                        setIsOpen(true)
                    }, 600)
                    return () => clearTimeout(timer)
                }
            } catch (e) {
                setIsOpen(true)
            }
        }
    }, [isSuperadmin, fechaVencimiento, diffDays, sessionKey])

    if (!mounted || !isOpen) return null

    const handleDismiss = () => {
        try {
            sessionStorage.setItem(sessionKey, 'true')
        } catch (e) {
            // ignore
        }
        setIsOpen(false)
    }

    const handleGoToPayments = () => {
        handleDismiss()
        router.push('/mis-pagos')
    }

    const formattedDate = formatExpiryDate(fechaVencimiento)
    const formattedMonto = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(montoAbono || 0)

    // Configuración dinámica según los días restantes
    let badgeText = 'Aviso de Vencimiento • Próximas 72hs'
    let titleText = 'Tu abono mensual está a 72hs de vencer'
    let urgencyBadgeBg = 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
    let ringColor = 'rgba(245, 158, 11, 0.25)'

    if (diffDays === 3) {
        badgeText = 'Aviso de Vencimiento • 72hs Restantes'
        titleText = 'Tu abono mensual está a 72hs de vencer'
    } else if (diffDays === 2) {
        badgeText = 'Aviso de Vencimiento • 48hs Restantes'
        titleText = 'Tu abono mensual está a 48hs de vencer'
    } else if (diffDays === 1) {
        badgeText = 'Aviso Urgente • 24hs Restantes'
        titleText = 'Tu abono mensual vence mañana'
        urgencyBadgeBg = 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/30'
        ringColor = 'rgba(249, 115, 22, 0.3)'
    } else if (diffDays === 0) {
        badgeText = 'Aviso Crítico • Vence Hoy'
        titleText = 'Tu abono mensual vence hoy'
        urgencyBadgeBg = 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30'
        ringColor = 'rgba(244, 63, 94, 0.35)'
    } else if (diffDays < 0) {
        badgeText = `Abono Vencido • Regularización Requerida`
        titleText = 'Tu abono mensual se encuentra vencido'
        urgencyBadgeBg = 'bg-destructive/10 text-destructive border-destructive/30'
        ringColor = 'rgba(239, 68, 68, 0.4)'
    }

    const waMessage = `Hola Soporte CreAPP / Dental-IA 👋 Me comunico desde ${clinicName} para regularizar el abono mensual (${formattedMonto}) con vencimiento el ${formattedDate}. ¿Me podrían indicar los pasos a seguir? ¡Muchas gracias!`
    const waUrl = `https://wa.me/5491130288564?text=${encodeURIComponent(waMessage)}`

    const handleWhatsApp = () => {
        window.open(waUrl, '_blank')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md">
                    {/* Backdrop click to dismiss */}
                    <div 
                        className="absolute inset-0 cursor-pointer" 
                        onClick={handleDismiss} 
                        aria-hidden="true" 
                    />

                    {/* Centered Modal Toast Card */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="billing-modal-title"
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 15 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-amber-500/35 dark:border-amber-500/40 shadow-2xl text-foreground overflow-hidden z-10"
                        style={{
                            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px -10px ${ringColor}`
                        }}
                    >
                        {/* Ambient decorative lighting */}
                        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Cerrar aviso"
                            aria-label="Cerrar aviso"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Icon Header */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-inner">
                                    <Clock className="w-8 h-8 animate-pulse text-amber-500" />
                                </div>
                                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
                                </span>
                            </div>

                            {/* Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${urgencyBadgeBg}`}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {badgeText}
                            </span>

                            {/* Title & Description */}
                            <div className="space-y-2">
                                <h3 id="billing-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    {titleText}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                                    Estimado administrador de <span className="font-semibold text-foreground">{clinicName}</span>, te recordamos que el abono mensual del servicio de la plataforma está próximo a vencer. Por favor, regularízalo para mantener la agenda, WhatsApp y sistema activos sin interrupciones.
                                </p>
                            </div>
                        </div>

                        {/* Details Pills Box */}
                        <div className="my-6 grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/60">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vencimiento</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{formattedDate}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Abono Mensual</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{formattedMonto}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2.5">
                            {/* WhatsApp Button */}
                            <button
                                onClick={handleWhatsApp}
                                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-[#25D366]/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.969.54 1.776.814 2.796.814 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.965 5.765c0 5.517-4.483 10-10 10-1.745 0-3.376-.449-4.808-1.233l-5.188 1.36 1.385-5.056c-.886-1.493-1.389-3.237-1.389-5.071 0-5.517 4.483-10 10-10 5.517 0 10 4.483 10 10z"/>
                                </svg>
                                <span>Contactar a Soporte por WhatsApp</span>
                            </button>

                            {/* View Payments Button */}
                            <button
                                onClick={handleGoToPayments}
                                className="w-full py-3 px-4 rounded-2xl border border-border/80 hover:bg-black/5 dark:hover:bg-white/5 text-foreground text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span>Ver Medios de Pago y Datos Bancarios</span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                            </button>

                            {/* Dismiss later */}
                            <div className="pt-2 text-center">
                                <button
                                    onClick={handleDismiss}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline underline-offset-4"
                                >
                                    Entendido, recordármelo más tarde
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Menu, X, Stethoscope } from 'lucide-react'
import type { Tenant } from '@/types'

interface Props { tenant: Tenant }

const navLinks = [
    { label: 'Servicios', href: '#servicios' },
    { label: 'Profesionales', href: '#profesionales' },
    { label: 'Horarios', href: '#horarios' },
    { label: 'Contacto', href: '#contacto' },
]

export function LandingNavbar({ tenant }: Props) {
    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            style={{
                backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
                backdropFilter: scrolled ? 'blur(16px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(37,99,235,0.08)' : '1px solid transparent',
                boxShadow: scrolled ? '0 2px 20px rgba(37,99,235,0.06)' : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href={`/c/${tenant.slug}`} className="flex items-center gap-2.5 group">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                        style={{ backgroundColor: tenant.color_primario }}
                    >
                        <Stethoscope className="h-4 w-4 text-white" strokeWidth={2} />
                    </div>
                    <span
                        className="text-sm font-bold tracking-tight transition-colors"
                        style={{ color: scrolled ? '#0f172a' : tenant.color_primario }}
                    >
                        {tenant.nombre}
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-7">
                    {navLinks.map(link => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="relative text-sm font-medium transition-colors group"
                            style={{ color: scrolled ? '#374151' : '#374151' }}
                        >
                            {link.label}
                            <span
                                className="absolute -bottom-0.5 left-0 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full"
                                style={{ backgroundColor: tenant.color_primario }}
                            />
                        </a>
                    ))}
                </nav>

                {/* Right actions */}
                <div className="hidden md:flex items-center gap-4">
                    {tenant.telefono && (
                        <a
                            href={`tel:${tenant.telefono}`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <Phone className="h-3.5 w-3.5" />
                            {tenant.telefono}
                        </a>
                    )}
                    {tenant.turnos_online_activos && (
                        <Link
                            href={`/c/${tenant.slug}/reservar`}
                            className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            style={{
                                background: `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})`,
                            }}
                        >
                            Reservar turno
                        </Link>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden p-2 rounded-lg"
                    onClick={() => setOpen(!open)}
                    style={{ color: tenant.color_primario }}
                    aria-label="Menú"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="md:hidden overflow-hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg"
                    >
                        <div className="px-5 py-4 flex flex-col gap-1">
                            {navLinks.map(link => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="py-2.5 text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0"
                                    onClick={() => setOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                            {tenant.turnos_online_activos && (
                                <Link
                                    href={`/c/${tenant.slug}/reservar`}
                                    className="mt-3 rounded-full py-3 text-sm font-semibold text-white text-center"
                                    style={{ background: `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})` }}
                                >
                                    Reservar turno
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    )
}

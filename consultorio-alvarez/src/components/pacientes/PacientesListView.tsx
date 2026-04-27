'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Phone, Mail, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'

// ── Apple-style staggered spring animation ─────────────────────
const sectionVariants = {
    hidden: { opacity: 0, x: -40, filter: 'blur(6px)' },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
            delay: i * 0.08,
            type: 'spring' as const,
            stiffness: 260,
            damping: 24,
        },
    }),
}

interface PacientesListViewProps {
    pacientes: any[]
    initialQuery: string
}

export function PacientesListView({ pacientes, initialQuery }: PacientesListViewProps) {
    const [query, setQuery] = useState(initialQuery)
    const router = useRouter()
    const [isNavigating, startNavigation] = useTransition()

    function handleNuevoPaciente() {
        startNavigation(() => {
            router.push('/pacientes/nuevo')
        })
    }

    function handleSearch(q: string) {
        setQuery(q)
        const url = q ? `/pacientes?q=${encodeURIComponent(q)}` : '/pacientes'
        router.replace(url, { scroll: false })
    }

    return (
        <div className="space-y-4">
            {/* Search + Add */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, DNI o N° HC..."
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 w-full"
                    />
                </div>
                <GlassButton onClick={handleNuevoPaciente} loading={isNavigating} className="w-full sm:w-auto">
                    {!isNavigating && <Plus className="h-4 w-4 mr-2" />}
                    {isNavigating ? 'Cargando…' : 'Nuevo paciente'}
                </GlassButton>
            </motion.div>

            {/* List */}
            {pacientes.length === 0 ? (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="glass rounded-2xl shadow-glass p-12 text-center">
                    <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">
                        {query ? 'No se encontraron pacientes' : 'Sin pacientes registrados'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {query ? 'Intentá con otro término de búsqueda' : 'Agregá el primer paciente para comenzar'}
                    </p>
                </motion.div>
            ) : (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="grid gap-2">
                    <AnimatePresence mode="popLayout">
                        {pacientes.map((p: any, i: number) => {
                            const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`
                            return (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ delay: i * 0.02, duration: 0.2 }}
                                >
                                    <Link
                                        href={`/pacientes/${p.id}`}
                                        className="flex items-center gap-4 glass rounded-xl px-4 py-3.5 shadow-glass hover:shadow-glass-lg transition-all group"
                                    >
                                        {/* Avatar */}
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                            <span className="text-sm font-bold text-primary">{iniciales}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {p.apellido}, {p.nombre}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                                {p.dni && <span>DNI {p.dni}</span>}
                                                <span className="opacity-60">HC {p.nro_historia_clinica}</span>
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        <div className="hidden md:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                            {p.telefono && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {p.telefono}
                                                </span>
                                            )}
                                            {p.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" /> {p.email}
                                                </span>
                                            )}
                                        </div>

                                        {/* Obra social */}
                                        {p.obra_social && (
                                            <span className="hidden lg:inline text-xs glass px-2 py-1 rounded-lg shrink-0">
                                                {p.obra_social.nombre}
                                            </span>
                                        )}
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    )
}

'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Phone, Mail, User, Pencil, Trash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'
import { eliminarPaciente } from '@/lib/actions/pacientes'
import { glassAlert } from '@/components/ui/glass-alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'

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
    const [inputQuery, setInputQuery] = useState(initialQuery)
    const [activeQuery, setActiveQuery] = useState(initialQuery)
    const router = useRouter()
    const [isNavigating, startNavigation] = useTransition()
    const [isDeleting, startDeleting] = useTransition()
    const [deleteCandidate, setDeleteCandidate] = useState<{ id: string, nombre: string } | null>(null)

    const filteredPacientes = useMemo(() => {
        const q = activeQuery.trim().toLowerCase()
        if (!q) return pacientes
        return pacientes.filter((p: any) =>
            p.nombre.toLowerCase().includes(q) ||
            p.apellido.toLowerCase().includes(q) ||
            (p.dni ?? '').includes(q) ||
            p.nro_historia_clinica.toLowerCase().includes(q)
        )
    }, [pacientes, activeQuery])

    function handleNuevoPaciente() {
        startNavigation(() => {
            router.push('/pacientes/nuevo')
        })
    }

    function triggerSearch(q: string) {
        setActiveQuery(q)
        const url = q ? `/pacientes?q=${encodeURIComponent(q)}` : '/pacientes'
        router.replace(url, { scroll: false })
    }

    async function handleEliminar(e: React.MouseEvent, id: string, nombre: string) {
        e.preventDefault()
        e.stopPropagation()
        setDeleteCandidate({ id, nombre })
    }

    function onConfirmDelete() {
        if (!deleteCandidate) return
        startDeleting(async () => {
            const res = await eliminarPaciente(deleteCandidate.id)
            setDeleteCandidate(null)
            if (res.error) {
                glassAlert.error({ title: 'Error', description: res.error })
            } else {
                glassAlert.success({ title: 'Paciente eliminado' })
            }
        })
    }

    function handleEditar(e: React.MouseEvent, id: string) {
        e.preventDefault()
        e.stopPropagation()
        startNavigation(() => {
            router.push(`/pacientes/${id}/editar`)
        })
    }

    return (
        <div className="space-y-6">
            {/* Title and stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {filteredPacientes.length} paciente{filteredPacientes.length !== 1 ? 's' : ''} {activeQuery ? 'encontrados' : 'registrados'}
                    </p>
                </div>
                <GlassButton onClick={handleNuevoPaciente} loading={isNavigating} className="w-full sm:w-auto shrink-0">
                    {!isNavigating && <Plus className="h-4 w-4 mr-2" />}
                    {isNavigating ? 'Cargando…' : 'Nuevo paciente'}
                </GlassButton>
            </div>

            {/* Search */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex items-center gap-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, DNI o N° HC..."
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                triggerSearch(inputQuery)
                            }
                        }}
                        className="pl-9 w-full"
                    />
                </div>
                <GlassButton
                    onClick={() => triggerSearch(inputQuery)}
                    variant="glass"
                    className="border-primary/20 hover:border-primary/50 text-primary shrink-0"
                >
                    Buscar
                </GlassButton>
            </motion.div>

            {/* List */}
            {filteredPacientes.length === 0 ? (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="glass rounded-2xl shadow-glass p-12 text-center">
                    <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">
                        {activeQuery ? 'No se encontraron pacientes' : 'Sin pacientes registrados'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {activeQuery ? 'Intentá con otro término de búsqueda' : 'Agregá el primer paciente para comenzar'}
                    </p>
                </motion.div>
            ) : (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="grid gap-2">
                    {filteredPacientes.map((p: any, i: number) => {
                        const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`
                        return (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
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
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {p.apellido}, {p.nombre}
                                            </p>
                                            {p.registro_completo === false && (
                                                <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse shrink-0">
                                                    ⚠️ Incompleto
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            {/* DNI oculto a pedido del cliente */}
                                            <span className="text-sm font-bold text-foreground tracking-wide">HC {p.nro_historia_clinica}</span>
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

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        <button
                                            onClick={(e) => handleEditar(e, p.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleEliminar(e, p.id, `${p.nombre} ${p.apellido}`)}
                                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                                            title="Eliminar"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </button>
                                    </div>
                                </Link>
                            </motion.div>
                        )
                    })}
                </motion.div>
            )}

            <ConfirmModal
                open={!!deleteCandidate}
                onOpenChange={(open) => !open && setDeleteCandidate(null)}
                title="Eliminar paciente"
                description={`¿Estás seguro que querés eliminar a ${deleteCandidate?.nombre}? Esta acción no se puede deshacer y borrará todo su historial y turnos.`}
                onConfirm={onConfirmDelete}
                isPending={isDeleting}
                confirmText="Eliminar paciente"
            />
        </div>
    )
}

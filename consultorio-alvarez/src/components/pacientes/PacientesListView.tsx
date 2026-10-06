'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Phone, Mail, User, Pencil, Trash, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'
import { eliminarPaciente, searchPacientesAction, getPacientesAction } from '@/lib/actions/pacientes'
import { glassAlert } from '@/components/ui/glass-alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'

import { searchPacientesLocal } from '@/lib/offline/local-queries'

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
    totalCount?: number
}

export function PacientesListView({ pacientes, initialQuery, totalCount }: PacientesListViewProps) {
    const [allLoadedPacientes, setAllLoadedPacientes] = useState<any[]>(pacientes)
    const [localDbResults, setLocalDbResults] = useState<any[]>([])
    const [inputQuery, setInputQuery] = useState(initialQuery)
    const [activeQuery, setActiveQuery] = useState(initialQuery)
    const router = useRouter()
    const [isDeleting, startDeleting] = useTransition()
    const [deleteCandidate, setDeleteCandidate] = useState<{ id: string, nombre: string } | null>(null)
    const [serverResults, setServerResults] = useState<any[]>([])
    const [isSearchingServer, setIsSearchingServer] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Sincronizar si cambian los pacientes iniciales
    useEffect(() => {
        setAllLoadedPacientes(pacientes)
    }, [pacientes])

    // Búsqueda instantánea en 0ms contra la base local IndexedDB (1903 pacientes)
    useEffect(() => {
        const term = activeQuery.trim()
        if (!term) {
            setLocalDbResults([])
            return
        }

        let isCurrent = true
        searchPacientesLocal(term, 60)
            .then(res => {
                if (isCurrent) {
                    setLocalDbResults(res)
                }
            })
            .catch(console.warn)

        return () => {
            isCurrent = false
        }
    }, [activeQuery])

    const filteredLocal = useMemo(() => {
        const q = activeQuery.trim()
        if (!q) return allLoadedPacientes
        
        const normalizeStr = (str: string) => 
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        const normQuery = normalizeStr(q)
        const tokens = normQuery.split(/\s+/).filter(Boolean)

        return allLoadedPacientes.filter((p: any) => {
            const nombre = normalizeStr(p.nombre || '')
            const apellido = normalizeStr(p.apellido || '')
            const dni = normalizeStr(p.dni || '')
            const dniWithoutDots = dni.replace(/\./g, '')
            const nroHistoria = normalizeStr(p.nro_historia_clinica || '')
            const nroHistoriaWithoutDots = nroHistoria.replace(/\./g, '')
            
            const fullText = `${apellido} ${nombre} ${apellido}, ${nombre} ${nombre} ${apellido} ${dni} ${dniWithoutDots} ${nroHistoria} ${nroHistoriaWithoutDots}`

            return tokens.every(token => {
                const tokenWithoutDots = token.replace(/\./g, '')
                return fullText.includes(token) || (tokenWithoutDots !== '' && fullText.includes(tokenWithoutDots))
            })
        })
    }, [allLoadedPacientes, activeQuery])

    // Búsqueda server-side en segundo plano como respaldo si el término es largo
    useEffect(() => {
        const term = activeQuery.trim()
        if (term.length >= 2) {
            let isCancelled = false
            // Solo activar spinner server si todavía no hay resultados locales
            if (localDbResults.length === 0) {
                setIsSearchingServer(true)
            }
            const timeout = setTimeout(() => {
                searchPacientesAction(term, 50)
                    .then((res) => {
                        if (!isCancelled) {
                            setServerResults(res || [])
                            setIsSearchingServer(false)
                        }
                    })
                    .catch(() => {
                        if (!isCancelled) setIsSearchingServer(false)
                    })
            }, 300)

            return () => {
                isCancelled = true
                clearTimeout(timeout)
            }
        } else {
            setServerResults([])
            setIsSearchingServer(false)
        }
    }, [activeQuery, localDbResults.length])

    // Si hay búsqueda activa:
    // 1. Prioridad: resultados locales en memoria a 0ms
    // 2. Si no hay locales aún, unir con serverResults
    const displayedPacientes = useMemo(() => {
        const term = activeQuery.trim()
        if (!term) return allLoadedPacientes
        if (localDbResults.length > 0) return localDbResults
        if (serverResults.length === 0 && !isSearchingServer) return filteredLocal
        
        const map = new Map<string, any>()
        filteredLocal.forEach(p => map.set(p.id, p))
        serverResults.forEach(p => map.set(p.id, p))
        return Array.from(map.values())
    }, [activeQuery, allLoadedPacientes, localDbResults, filteredLocal, serverResults, isSearchingServer])

    async function handleCargarMas() {
        if (isLoadingMore) return
        setIsLoadingMore(true)
        try {
            const nuevos = await getPacientesAction(50, allLoadedPacientes.length)
            if (nuevos && nuevos.length > 0) {
                setAllLoadedPacientes(prev => {
                    const existingIds = new Set(prev.map(p => p.id))
                    const toAdd = nuevos.filter(p => !existingIds.has(p.id))
                    return [...prev, ...toAdd]
                })
            }
        } catch (error) {
            console.error('Error cargando más pacientes:', error)
        } finally {
            setIsLoadingMore(false)
        }
    }

    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    function handleSearchChange(val: string) {
        setInputQuery(val)
        setActiveQuery(val) // Filtra en 0ms in-memory instantáneamente

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
            syncUrl(val)
        }, 300)
    }

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [])

    function syncUrl(val: string) {
        const url = val ? `/pacientes?q=${encodeURIComponent(val)}` : '/pacientes'
        window.history.replaceState(null, '', url)
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

    return (
        <div className="space-y-6">
            {/* Title and stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>
                            {activeQuery.trim() ? (
                                `${displayedPacientes.length} paciente${displayedPacientes.length !== 1 ? 's' : ''} encontrado${displayedPacientes.length !== 1 ? 's' : ''}`
                            ) : (
                                totalCount 
                                    ? `Mostrando ${allLoadedPacientes.length} de ${totalCount} pacientes registrados`
                                    : `${allLoadedPacientes.length} pacientes registrados`
                            )}
                        </span>
                        {isSearchingServer && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                            </span>
                        )}
                    </p>
                </div>
                <Link href="/pacientes/nuevo" prefetch={true} className="w-full sm:w-auto shrink-0">
                    <GlassButton className="w-full sm:w-auto shrink-0 font-semibold cursor-pointer">
                        <Plus className="h-4 w-4 mr-1.5" />
                        Nuevo paciente
                    </GlassButton>
                </Link>
            </div>

            {/* Search */}
            <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="flex items-center gap-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, DNI o N° HC..."
                        value={inputQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                syncUrl(inputQuery)
                            }
                        }}
                        onBlur={() => syncUrl(inputQuery)}
                        className="pl-9 w-full"
                    />
                </div>
            </motion.div>

            {/* List */}
            {displayedPacientes.length === 0 ? (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="glass rounded-2xl shadow-glass p-12 text-center">
                    {isSearchingServer ? (
                        <>
                            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">Buscando paciente...</h3>
                            <p className="text-sm text-muted-foreground mt-1">Consultando base de datos completa...</p>
                        </>
                    ) : (
                        <>
                            <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">
                                {activeQuery ? 'No se encontraron pacientes' : 'Sin pacientes registrados'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {activeQuery ? 'Intentá con otro término de búsqueda' : 'Agregá el primer paciente para comenzar'}
                            </p>
                        </>
                    )}
                </motion.div>
            ) : (
                <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="grid gap-2">
                    {displayedPacientes.map((p: any) => {
                        const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`

                        return (
                            <div
                                key={p.id}
                                className="flex items-center gap-4 glass rounded-xl px-4 py-3.5 shadow-glass transition-all duration-200 group relative overflow-hidden hover:shadow-glass-lg hover:-translate-y-0.5 hover:border-primary/40 active:scale-[0.99]"
                            >
                                {/* Link directo de apertura instantánea 0ms */}
                                <Link
                                    href={`/pacientes/${p.id}`}
                                    prefetch={true}
                                    className="flex items-center gap-4 flex-1 min-w-0"
                                >
                                    {/* Avatar */}
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors bg-primary/10 group-hover:bg-primary/20">
                                        <span className="text-sm font-bold text-primary">{iniciales}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
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
                                </Link>

                                {/* Acciones fuera del enlace */}
                                <div className="flex items-center gap-1 opacity-90 sm:opacity-70 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                    <Link
                                        href={`/pacientes/${p.id}/editar`}
                                        prefetch={true}
                                        className="p-2.5 rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 active:scale-90"
                                        title="Editar paciente"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={(e) => handleEliminar(e, p.id, `${p.nombre} ${p.apellido}`)}
                                        className="p-2.5 rounded-xl transition-all text-muted-foreground hover:text-red-500 hover:bg-red-500/15 active:scale-90 cursor-pointer"
                                        title="Eliminar paciente"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </motion.div>
            )}

            {/* Paginación progresiva para no sobrecargar el navegador */}
            {!activeQuery.trim() && totalCount && allLoadedPacientes.length < totalCount && (
                <div className="pt-4 flex flex-col items-center justify-center gap-2">
                    <GlassButton
                        onClick={handleCargarMas}
                        loading={isLoadingMore}
                        className="px-6 py-2.5 text-sm font-semibold shadow-glass hover:shadow-glass-lg transition-all"
                    >
                        {isLoadingMore ? 'Cargando más pacientes...' : `Cargar más pacientes (${allLoadedPacientes.length} de ${totalCount})`}
                    </GlassButton>
                    <p className="text-xs text-muted-foreground">
                        Mostrando en bloques de 50 para garantizar máxima fluidez y rapidez
                    </p>
                </div>
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

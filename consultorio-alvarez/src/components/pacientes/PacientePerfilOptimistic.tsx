'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Phone, Mail, MapPin, CreditCard, AlertCircle, Cloud, CheckCircle2, Clock } from 'lucide-react'
import { EditarPacienteBtn } from '@/components/pacientes/EditarPacienteBtn'
import { localDb, LocalPaciente } from '@/lib/offline/db'
import { syncManager } from '@/lib/offline/sync-manager'
import { useUrlFirmada } from '@/lib/storage/url-firmada'

const GENERO_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', X: 'No binario' }

interface PacientePerfilOptimisticProps {
    initialPaciente: any
    /**
     * El profesional no recibe del servidor el teléfono, el email, el DNI ni la
     * dirección del paciente, así que la ficha no dibuja ese bloque.
     * Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §8 y §12
     */
    esProfesional?: boolean
}

export function PacientePerfilOptimistic({ initialPaciente, esProfesional = false }: PacientePerfilOptimisticProps) {
    const [paciente, setPaciente] = useState<any>(initialPaciente)
    const [hasPendingSync, setHasPendingSync] = useState(false)
    const [isSyncingNow, setIsSyncingNow] = useState(false)

    // 1. Hidratación reactiva con datos de la base local IndexedDB
    useEffect(() => {
        let isMounted = true

        async function loadOptimisticLocalData() {
            try {
                if (!initialPaciente?.id) return

                // Leer versión guardada en la base local
                const local = await localDb.pacientes.get(initialPaciente.id)
                const pendingCount = await localDb.sync_outbox
                    .where('entity_id')
                    .equals(initialPaciente.id)
                    .and(item => item.status === 'PENDIENTE')
                    .count()

                if (isMounted) {
                    setHasPendingSync(pendingCount > 0)

                    if (local) {
                        // Si la versión local es más reciente o hay mutaciones pendientes en el outbox,
                        // fusionamos con prioridad los datos locales guardados en esta PC
                        setPaciente((prev: any) => {
                            const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0
                            const serverTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0

                            if (localTime >= serverTime || pendingCount > 0) {
                                return {
                                    ...prev,
                                    ...local,
                                    // Mantener objeto de obra social expandido si existe
                                    obra_social: local.obra_social_id && prev.obra_social?.id === local.obra_social_id
                                        ? prev.obra_social
                                        : (local.obra_social_id ? prev.obra_social : null),
                                    plan_obra_social: local.plan_obra_social ?? prev.plan_obra_social,
                                    registro_completo: local.registro_completo !== undefined
                                        ? local.registro_completo
                                        : prev.registro_completo
                                }
                            }
                            return prev
                        })
                    }
                }
            } catch (err) {
                console.warn('[PACIENTE PERFIL] Error cargando datos locales optimistas:', err)
            }
        }

        loadOptimisticLocalData()

        // 2. Suscribirse al SyncManager para actualizar el badge cuando suba a la nube
        const unsubscribe = syncManager.subscribe(status => {
            if (!isMounted) return
            setIsSyncingNow(status.isSyncing)

            // Rechequear si ya se subió la mutación pendiente
            localDb.sync_outbox
                .where('entity_id')
                .equals(initialPaciente.id)
                .and(item => item.status === 'PENDIENTE')
                .count()
                .then(count => {
                    if (isMounted) {
                        setHasPendingSync(count > 0)
                    }
                })
                .catch(() => {})
        })

        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [initialPaciente])

    const p = paciente
    // foto_url guarda una ruta (o una URL vieja hasta migrar): se firma para mostrarla.
    const { url: fotoUrl } = useUrlFirmada('avatars', p.foto_url)
    const iniciales = `${p.nombre?.charAt(0) || ''}${p.apellido?.charAt(0) || ''}`
    const edad = p.fecha_nacimiento
        ? Math.floor((Date.now() - new Date(p.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    return (
        <div className="space-y-4">
            {/* Registro Incompleto Alert */}
            {p.registro_completo === false && (
                <div className="glass rounded-xl p-4 border-l-4 border-red-500 shadow-glass bg-red-500/5 dark:bg-red-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Falta completar información del paciente</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Este paciente fue registrado mediante reserva rápida de turno. Completá sus datos de contacto y cobertura para habilitar su ficha completa.
                            </p>
                        </div>
                    </div>
                    <EditarPacienteBtn pacienteId={p.id} label="Completar información" size="sm" className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25 shrink-0" />
                </div>
            )}

            {/* Clinical alerts */}
            {(p.alergias || p.medicacion_actual || p.antecedentes) && (
                <div className="glass rounded-xl p-3.5 border-l-4 border-amber-500 shadow-glass">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            {p.alergias && <span><strong className="text-amber-700 dark:text-amber-300">Alergias:</strong> {p.alergias}</span>}
                            {p.medicacion_actual && <span><strong className="text-amber-700 dark:text-amber-300">Medicación:</strong> {p.medicacion_actual}</span>}
                            {p.antecedentes && <span><strong className="text-amber-700 dark:text-amber-300">Antecedentes:</strong> {p.antecedentes}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Left: Profile card */}
            <div className="glass rounded-2xl shadow-glass p-5">
                <div className="flex flex-col items-center text-center mb-4">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-4 ring-primary/20 overflow-hidden relative">
                        {fotoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={fotoUrl} alt={`${p.nombre} ${p.apellido}`} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-2xl font-bold text-primary">{iniciales}</span>
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{p.nombre} {p.apellido}</h2>
                    {edad !== null && (
                        <span className="text-xs glass px-2 py-0.5 rounded-lg mt-1">{edad} años</span>
                    )}

                    {/* Sincronización State Indicator */}
                    <div className="mt-2">
                        {hasPendingSync ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Los cambios se guardaron de inmediato en esta máquina y se están sincronizando con la nube">
                                <Clock className="w-3 h-3 animate-spin text-amber-500" />
                                {isSyncingNow ? 'Sincronizando con la nube...' : 'Guardado local (en cola)'}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Al día con la nube
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2.5 text-sm">
                    {!esProfesional && (
                        <>
                            <DatoFila label="DNI" valor={p.dni || '—'} />
                            <DatoFila label="CUIT" valor={p.cuit || '—'} />
                        </>
                    )}
                    <DatoFila label="Nac." valor={p.fecha_nacimiento ? format(new Date(p.fecha_nacimiento), "dd/MM/yyyy") : null} />
                    <DatoFila label="Género" valor={p.genero ? GENERO_LABEL[p.genero] : null} />
                    {!esProfesional && (
                        <>
                            <div className="h-px bg-border my-1" />
                            <DatoFila label="Teléfono" valor={p.telefono} icon={<Phone className="h-3 w-3" />} />
                            <DatoFila label="Email" valor={p.email} icon={<Mail className="h-3 w-3" />} />
                            <DatoFila label="Dirección" valor={p.direccion} icon={<MapPin className="h-3 w-3" />} />
                        </>
                    )}
                    <div className="h-px bg-border my-1" />
                    <DatoFila label="Obra Social" valor={p.obra_social?.nombre ?? 'Particular'} icon={<CreditCard className="h-3 w-3" />} />
                    <DatoFila label="Plan" valor={p.plan_obra_social} />
                    {!esProfesional && p.n_afiliado && <DatoFila label="N° Afiliado" valor={p.n_afiliado} />}
                </div>

                {!esProfesional && (
                    <div className="mt-4 pt-3 border-t border-border">
                        <EditarPacienteBtn pacienteId={p.id} label="Editar Información" className="w-full text-xs justify-center h-8" />
                    </div>
                )}
            </div>

            {p.notas_internas && (
                <div className="glass rounded-xl p-4 border-l-4 border-blue-500 shadow-glass">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📝 Notas internas</p>
                    <p className="text-sm text-foreground leading-relaxed">{p.notas_internas}</p>
                </div>
            )}
        </div>
    )
}

function DatoFila({ label, valor, icon }: { label: string; valor: string | null | undefined; icon?: React.ReactNode }) {
    if (!valor) return null
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground shrink-0 flex items-center gap-1">{icon}{label}</span>
            <span className="font-medium text-foreground text-right">{valor}</span>
        </div>
    )
}

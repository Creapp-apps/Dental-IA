'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Edit2, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { GlassButton } from '@/components/ui/glass-button'
import { glassAlert } from '@/components/ui/glass-alert'
import { eliminarTurno } from '@/lib/actions/turnos'
import { PRIORIDAD_COLOR, PRIORIDAD_LABEL, type EstadoTurno, type PrioridadTratamiento } from '@/types'

interface TurnoCardGlassProps {
    turno: {
        id: string
        fecha_inicio: string
        estado: string
        prioridad_override: string | null
        notas: string | null
        paciente?: { nombre: string; apellido: string } | null
        tipo_tratamiento?: {
            nombre: string
            duracion_minutos: number
            prioridad: string
        } | null
    }
    colorProf: string
    index: number
}

export function TurnoCardGlass({ turno, colorProf, index }: TurnoCardGlassProps) {
    const prioridad = (turno.prioridad_override ?? turno.tipo_tratamiento?.prioridad ?? 'NORMAL') as PrioridadTratamiento
    const estado = turno.estado as EstadoTurno
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleDelete() {
        if (window.confirm('¿Estás seguro de que querés eliminar este turno? Esta acción no se puede deshacer.')) {
            startTransition(async () => {
                const res = await eliminarTurno(turno.id)
                if (res.error) glassAlert.error({ title: 'Error al eliminar', description: res.error })
                else glassAlert.success({ title: 'Turno eliminado correctamente' })
            })
        }
    }

    return (
        <motion.div
            className="group flex items-start gap-3 glass rounded-xl p-3.5 shadow-glass hover:shadow-glass-lg transition-shadow cursor-default"
            style={{ borderLeft: `3px solid ${colorProf}` }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
        >
            {/* Hora */}
            <div className="shrink-0 text-center min-w-[48px]">
                <p className="text-sm font-bold text-foreground tabular-nums">
                    {format(new Date(turno.fecha_inicio), 'HH:mm')}
                </p>
                <p className="text-xs text-muted-foreground">
                    {turno.tipo_tratamiento?.duracion_minutos ?? 30}m
                </p>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {turno.paciente?.nombre} {turno.paciente?.apellido}
                    </p>
                    {prioridad === 'URGENTE' && (
                        <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                                backgroundColor: PRIORIDAD_COLOR[prioridad] + '20',
                                color: PRIORIDAD_COLOR[prioridad],
                            }}
                        >
                            ⚡ {PRIORIDAD_LABEL[prioridad]}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {turno.tipo_tratamiento?.nombre ?? '—'}
                </p>
            </div>

            {/* Badge & Actions */}
            <div className="shrink-0 flex flex-col items-end gap-2">
                <StatusBadge status={estado} />
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GlassButton size="sm" variant="glass" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/agenda?edit=${turno.id}`)} disabled={isPending} title="Editar">
                        <Edit2 className="h-3 w-3" />
                    </GlassButton>
                    <GlassButton size="sm" variant="glass" className="h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        onClick={handleDelete} disabled={isPending} title="Eliminar">
                        <Trash2 className="h-3 w-3" />
                    </GlassButton>
                </div>
            </div>
        </motion.div>
    )
}

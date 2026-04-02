'use client'

import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { StatusBadge } from '@/components/ui/status-badge'
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

    return (
        <motion.div
            className="flex items-start gap-3 glass rounded-xl p-3.5 shadow-glass hover:shadow-glass-lg transition-shadow cursor-default"
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

            {/* Badge */}
            <StatusBadge status={estado} className="shrink-0" />
        </motion.div>
    )
}

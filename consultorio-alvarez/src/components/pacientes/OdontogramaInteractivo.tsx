'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { guardarOdontograma } from '@/lib/actions/pacientes'
import { glassAlert } from '@/components/ui/glass-alert'

// ============================================================
// ODONTOGRAMA INTERACTIVO — 32 piezas FDI notation
// ============================================================

const ESTADOS = [
    { value: 'SANO', label: 'Sano', color: '#22c55e', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { value: 'CARIES', label: 'Caries', color: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/30' },
    { value: 'OBTURADO', label: 'Obturado', color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { value: 'CORONA', label: 'Corona', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { value: 'AUSENTE', label: 'Ausente', color: '#6b7280', bg: 'bg-gray-50 dark:bg-gray-950/30' },
    { value: 'IMPLANTE', label: 'Implante', color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { value: 'ENDODONCIA', label: 'Endodoncia', color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-950/30' },
    { value: 'FRACTURADO', label: 'Fracturado', color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { value: 'EN_TRATAMIENTO', label: 'En tratamiento', color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
] as const

// FDI notation - adult teeth
const CUADRANTE_SUPERIOR_DERECHO = ['18', '17', '16', '15', '14', '13', '12', '11']
const CUADRANTE_SUPERIOR_IZQUIERDO = ['21', '22', '23', '24', '25', '26', '27', '28']
const CUADRANTE_INFERIOR_IZQUIERDO = ['31', '32', '33', '34', '35', '36', '37', '38']
const CUADRANTE_INFERIOR_DERECHO = ['48', '47', '46', '45', '44', '43', '42', '41']

interface OdontogramaInteractivoProps {
    pacienteId: string
    piezasData: Array<{ pieza: string; estado: string; notas?: string | null }>
}

export function OdontogramaInteractivo({ pacienteId, piezasData }: OdontogramaInteractivoProps) {
    const [piezas, setPiezas] = useState<Record<string, { estado: string; notas?: string }>>(
        () => {
            const map: Record<string, { estado: string; notas?: string }> = {}
            piezasData.forEach(p => {
                map[p.pieza] = { estado: p.estado, notas: p.notas ?? undefined }
            })
            return map
        }
    )
    const [selected, setSelected] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function getEstadoPieza(pieza: string) {
        return piezas[pieza]?.estado ?? 'SANO'
    }

    function getColor(pieza: string) {
        const estado = getEstadoPieza(pieza)
        return ESTADOS.find(e => e.value === estado)?.color ?? '#22c55e'
    }

    function handleClickPieza(pieza: string) {
        setSelected(pieza === selected ? null : pieza)
    }

    function handleSetEstado(pieza: string, estado: string) {
        setPiezas(prev => ({ ...prev, [pieza]: { ...prev[pieza], estado } }))

        startTransition(async () => {
            const result = await guardarOdontograma(pacienteId, pieza, estado)
            if (result.error) {
                glassAlert.error({ title: 'Error', description: result.error })
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Dental chart */}
            <div className="glass rounded-2xl shadow-glass p-6">
                {/* Arcada superior */}
                <div className="text-center text-xs text-muted-foreground mb-2 font-medium">SUPERIOR</div>
                <div className="flex justify-center gap-0.5 mb-1">
                    {CUADRANTE_SUPERIOR_DERECHO.map(pieza => (
                        <Tooth key={pieza} pieza={pieza} color={getColor(pieza)} estado={getEstadoPieza(pieza)}
                            isSelected={selected === pieza} onClick={() => handleClickPieza(pieza)} />
                    ))}
                    <div className="w-px bg-border mx-1" />
                    {CUADRANTE_SUPERIOR_IZQUIERDO.map(pieza => (
                        <Tooth key={pieza} pieza={pieza} color={getColor(pieza)} estado={getEstadoPieza(pieza)}
                            isSelected={selected === pieza} onClick={() => handleClickPieza(pieza)} />
                    ))}
                </div>

                {/* Línea media */}
                <div className="h-px bg-border my-3" />

                {/* Arcada inferior */}
                <div className="flex justify-center gap-0.5 mb-1">
                    {CUADRANTE_INFERIOR_DERECHO.map(pieza => (
                        <Tooth key={pieza} pieza={pieza} color={getColor(pieza)} estado={getEstadoPieza(pieza)}
                            isSelected={selected === pieza} onClick={() => handleClickPieza(pieza)} />
                    ))}
                    <div className="w-px bg-border mx-1" />
                    {CUADRANTE_INFERIOR_IZQUIERDO.map(pieza => (
                        <Tooth key={pieza} pieza={pieza} color={getColor(pieza)} estado={getEstadoPieza(pieza)}
                            isSelected={selected === pieza} onClick={() => handleClickPieza(pieza)} />
                    ))}
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2 font-medium">INFERIOR</div>
            </div>

            {/* Detail panel for selected tooth */}
            {selected && (
                <motion.div
                    className="glass rounded-2xl shadow-glass p-5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={selected}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: getColor(selected) }}
                        >
                            {selected}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Pieza {selected}</p>
                            <p className="text-xs text-muted-foreground">
                                Estado: {ESTADOS.find(e => e.value === getEstadoPieza(selected))?.label}
                            </p>
                        </div>
                        {isPending && (
                            <span className="ml-auto text-xs text-muted-foreground animate-pulse">Guardando...</span>
                        )}
                    </div>

                    {/* Estado selector */}
                    <div className="grid grid-cols-3 gap-2">
                        {ESTADOS.map(e => (
                            <button
                                key={e.value}
                                onClick={() => handleSetEstado(selected, e.value)}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer',
                                    getEstadoPieza(selected) === e.value
                                        ? 'ring-2 shadow-sm'
                                        : 'hover:shadow-sm',
                                    e.bg
                                )}
                                style={{
                                    borderColor: getEstadoPieza(selected) === e.value ? e.color : 'transparent',
                                    ...(getEstadoPieza(selected) === e.value ? { ringColor: e.color } : {}),
                                }}
                            >
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                                {e.label}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center">
                {ESTADOS.map(e => (
                    <div key={e.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.label}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ──────────── Individual Tooth ──────────── */

function Tooth({
    pieza,
    color,
    estado,
    isSelected,
    onClick,
}: {
    pieza: string
    color: string
    estado: string
    isSelected: boolean
    onClick: () => void
}) {
    const isAusente = estado === 'AUSENTE'

    return (
        <motion.button
            className={cn(
                'flex flex-col items-center gap-0.5 cursor-pointer group',
                isSelected && 'z-10',
            )}
            onClick={onClick}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Tooth shape */}
            <svg width="28" height="32" viewBox="0 0 28 32" className="drop-shadow-sm">
                {/* Root */}
                <path
                    d="M10 20 L12 30 Q14 32 16 30 L18 20"
                    fill={isAusente ? 'none' : color}
                    opacity={isAusente ? 0 : 0.4}
                    stroke={isAusente ? '#d1d5db' : 'none'}
                    strokeWidth={isAusente ? 1 : 0}
                    strokeDasharray={isAusente ? '2 2' : '0'}
                />
                {/* Crown */}
                <rect
                    x="2" y="2" width="24" height="18" rx="5"
                    fill={isAusente ? 'none' : color}
                    stroke={isSelected ? color : isAusente ? '#d1d5db' : 'transparent'}
                    strokeWidth={isSelected ? 2.5 : isAusente ? 1.5 : 0}
                    strokeDasharray={isAusente ? '3 2' : '0'}
                    opacity={isAusente ? 0.3 : 1}
                    className="transition-all"
                />
                {/* Ausente X */}
                {isAusente && (
                    <>
                        <line x1="6" y1="6" x2="22" y2="16" stroke="#9ca3af" strokeWidth="1.5" />
                        <line x1="22" y1="6" x2="6" y2="16" stroke="#9ca3af" strokeWidth="1.5" />
                    </>
                )}
            </svg>
            {/* Number */}
            <span className={cn(
                'text-[9px] font-bold tabular-nums leading-none transition-colors',
                isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            )}>
                {pieza}
            </span>
        </motion.button>
    )
}

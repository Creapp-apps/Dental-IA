'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { guardarOdontograma } from '@/lib/actions/pacientes'
import { glassAlert } from '@/components/ui/glass-alert'

// ============================================================
// ODONTOGRAMA INTERACTIVO — 32 piezas FDI notation con 5 caras
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

const CARAS_NOMBRES: Record<string, string> = {
    top: 'Frente',
    bottom: 'Dorso',
    right: 'Lateral Derecho',
    left: 'Lateral Izquierdo',
}

const CUADRANTE_SUPERIOR_DERECHO = ['18', '17', '16', '15', '14', '13', '12', '11']
const CUADRANTE_SUPERIOR_IZQUIERDO = ['21', '22', '23', '24', '25', '26', '27', '28']
const CUADRANTE_INFERIOR_IZQUIERDO = ['31', '32', '33', '34', '35', '36', '37', '38']
const CUADRANTE_INFERIOR_DERECHO = ['48', '47', '46', '45', '44', '43', '42', '41']

interface OdontogramaInteractivoProps {
    pacienteId: string
    piezasData: Array<{ pieza: string; estado: string; cara?: string | null; notas?: string | null }>
}

type PiezaState = {
    global: string
    caras: Record<string, string>
}

export function OdontogramaInteractivo({ pacienteId, piezasData }: OdontogramaInteractivoProps) {
    const [piezas, setPiezas] = useState<Record<string, PiezaState>>(() => {
        const map: Record<string, PiezaState> = {}
        piezasData.forEach(p => {
            if (!map[p.pieza]) map[p.pieza] = { global: 'SANO', caras: {} }
            
            if (p.cara && p.cara !== 'GLOBAL') {
                map[p.pieza].caras[p.cara] = p.estado
            } else {
                map[p.pieza].global = p.estado
            }
        })
        return map
    })
    
    // { pieza: '17', cara: 'top' | null } -> null significa toda la pieza
    const [selected, setSelected] = useState<{ pieza: string; cara: string | null } | null>(null)
    const [isPending, startTransition] = useTransition()

    function getEstadoColor(estado: string | undefined) {
        if (!estado || estado === 'SANO') return 'transparent' // We show default borders for SANO
        return ESTADOS.find(e => e.value === estado)?.color ?? 'transparent'
    }

    function getEstadoLabel(estado: string | null | undefined) {
        if (!estado) return 'Sano'
        return ESTADOS.find(e => e.value === estado)?.label ?? 'Sano'
    }

    function handleSelect(pieza: string, cara: string | null) {
        if (selected?.pieza === pieza && selected?.cara === cara) {
            setSelected(null)
        } else {
            setSelected({ pieza, cara })
        }
    }

    function handleSetEstado(estado: string) {
        if (!selected) return

        const { pieza, cara } = selected
        
        setPiezas(prev => {
            const current = prev[pieza] || { global: 'SANO', caras: {} }
            const next = { ...current, caras: { ...current.caras } }
            
            if (cara === null) {
                // Apply to entire tooth
                next.global = estado
                // Si marcamos Ausente, Corona, etc., solemos resetear las caras
                if (['AUSENTE', 'CORONA', 'IMPLANTE'].includes(estado)) {
                    next.caras = {}
                }
            } else {
                next.caras[cara] = estado
                // If the tooth was absent, setting a face should probably clear the absent status
                if (['AUSENTE', 'IMPLANTE'].includes(next.global)) {
                    next.global = 'SANO'
                }
            }
            return { ...prev, [pieza]: next }
        })

        startTransition(async () => {
            const caraToSave = cara === null ? 'GLOBAL' : cara
            const result = await guardarOdontograma(pacienteId, pieza, estado, caraToSave)
            if (result.error) {
                glassAlert.error({ title: 'Error', description: result.error })
            }
        })
    }

    const currentSelectionState = selected
        ? (selected.cara === null ? (piezas[selected.pieza]?.global ?? 'SANO') : (piezas[selected.pieza]?.caras?.[selected.cara] ?? 'SANO'))
        : null

    return (
        <div className="space-y-4">
            {/* Dental chart */}
            <div className="glass rounded-2xl shadow-glass p-6 overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Arcada superior */}
                    <div className="text-center text-xs text-muted-foreground mb-4 font-medium">SUPERIOR</div>
                    <div className="flex justify-center gap-1.5 mb-2">
                        {CUADRANTE_SUPERIOR_DERECHO.map(pieza => (
                            <Tooth key={pieza} pieza={pieza} state={piezas[pieza]} selected={selected} onSelect={handleSelect} />
                        ))}
                        <div className="w-px bg-border mx-3" />
                        {CUADRANTE_SUPERIOR_IZQUIERDO.map(pieza => (
                            <Tooth key={pieza} pieza={pieza} state={piezas[pieza]} selected={selected} onSelect={handleSelect} />
                        ))}
                    </div>

                    {/* Línea media */}
                    <div className="h-px bg-border my-6" />

                    {/* Arcada inferior */}
                    <div className="flex justify-center gap-1.5 mb-2">
                        {CUADRANTE_INFERIOR_DERECHO.map(pieza => (
                            <Tooth key={pieza} pieza={pieza} state={piezas[pieza]} selected={selected} onSelect={handleSelect} />
                        ))}
                        <div className="w-px bg-border mx-3" />
                        {CUADRANTE_INFERIOR_IZQUIERDO.map(pieza => (
                            <Tooth key={pieza} pieza={pieza} state={piezas[pieza]} selected={selected} onSelect={handleSelect} />
                        ))}
                    </div>
                    <div className="text-center text-xs text-muted-foreground mt-4 font-medium">INFERIOR</div>
                </div>
            </div>

            {/* Detail panel for selected face/tooth */}
            {selected && (
                <motion.div
                    className="glass rounded-2xl shadow-glass p-5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`${selected.pieza}-${selected.cara}`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-lg font-bold text-foreground">
                                Pieza {selected.pieza} 
                                <span className="text-muted-foreground font-medium ml-2">
                                    {selected.cara ? `— Cara ${CARAS_NOMBRES[selected.cara]}` : '— Toda la pieza'}
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Estado actual: <strong className="text-foreground">{getEstadoLabel(currentSelectionState)}</strong>
                            </p>
                        </div>
                        {isPending && (
                            <span className="text-xs text-muted-foreground animate-pulse glass px-3 py-1 rounded-full">Guardando...</span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        {/* Selector para cambiar el alcance de la selección */}
                        <div className="w-full sm:w-[200px] flex flex-col gap-1.5 bg-background/30 p-2 rounded-xl">
                            <button
                                onClick={() => handleSelect(selected.pieza, null)}
                                className={cn('text-xs py-2 px-3 rounded-lg text-left transition-colors', selected.cara === null ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-muted-foreground')}
                            >
                                Toda la pieza
                            </button>
                            {Object.keys(CARAS_NOMBRES).map(cara => (
                                <button
                                    key={cara}
                                    onClick={() => handleSelect(selected.pieza, cara)}
                                    className={cn('text-xs py-2 px-3 rounded-lg text-left transition-colors', selected.cara === cara ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-muted-foreground')}
                                >
                                    {CARAS_NOMBRES[cara]}
                                </button>
                            ))}
                        </div>

                        {/* Opciones de estado */}
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {ESTADOS.map(e => (
                                <button
                                    key={e.value}
                                    onClick={() => handleSetEstado(e.value)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer',
                                        currentSelectionState === e.value ? 'ring-2 shadow-sm' : 'hover:shadow-sm opacity-80 hover:opacity-100',
                                        e.bg
                                    )}
                                    style={{
                                        borderColor: currentSelectionState === e.value ? e.color : 'transparent',
                                        ...(currentSelectionState === e.value ? { ringColor: e.color } : {}),
                                    }}
                                >
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: e.color }} />
                                    {e.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center glass px-4 py-3 rounded-xl mt-4">
                {ESTADOS.map(e => (
                    <div key={e.value} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: e.color }} />
                        {e.label}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ──────────── Individual Tooth (5 Faces) ──────────── */

function Tooth({
    pieza,
    state,
    selected,
    onSelect,
}: {
    pieza: string
    state?: PiezaState
    selected: { pieza: string; cara: string | null } | null
    onSelect: (pieza: string, cara: string | null) => void
}) {
    const globalState = state?.global ?? 'SANO'
    const isAusente = globalState === 'AUSENTE'
    const globalColor = ESTADOS.find(e => e.value === globalState)?.color ?? 'transparent'
    
    // Si la pieza entera está seleccionada
    const isPiezaSelected = selected?.pieza === pieza && selected?.cara === null

    // Determine colors for each face
    function getFaceColor(cara: string) {
        if (isAusente) return 'transparent'
        const caraState = state?.caras?.[cara]
        if (caraState && caraState !== 'SANO') {
            return ESTADOS.find(e => e.value === caraState)?.color ?? 'transparent'
        }
        // Fallback to global color if the whole tooth is colored but not ausente (e.g. Corona)
        if (globalState !== 'SANO') return globalColor
        return 'transparent'
    }

    function isFaceSelected(cara: string) {
        return selected?.pieza === pieza && selected?.cara === cara
    }

    return (
        <div className="flex flex-col items-center gap-1.5 group relative">
            <svg width="34" height="42" viewBox="0 0 34 42" className="drop-shadow-sm overflow-visible">
                
                {/* 1. Root (Raíz) - Click = Toda la pieza */}
                <path
                    d="M 12,28 L 14,40 Q 17,44 20,40 L 22,28"
                    fill={isAusente ? 'none' : (globalState !== 'SANO' ? globalColor : '#e5e7eb')} // e5e7eb = gray-200
                    stroke={isPiezaSelected ? '#8b5cf6' : isAusente ? '#9ca3af' : '#9ca3af'}
                    strokeWidth={isPiezaSelected ? 2 : 1}
                    strokeDasharray={isAusente ? '2 2' : '0'}
                    opacity={isAusente ? 0 : 0.6}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => onSelect(pieza, null)}
                />

                {/* 2. Crown Base (Background/Border) */}
                <rect
                    x="2" y="2" width="30" height="26" rx="4"
                    fill={isAusente ? 'none' : 'white'}
                    stroke={isPiezaSelected ? '#8b5cf6' : '#d1d5db'}
                    strokeWidth={isPiezaSelected ? 2 : 1}
                    strokeDasharray={isAusente ? '4 2' : '0'}
                    className="transition-all"
                />

                {/* 3. Faces (Sólo si no está ausente) */}
                {!isAusente && (
                    <g className="opacity-90">
                        {/* Top / Frente */}
                        <path 
                            d="M 2,2 L 32,2 L 17,15 Z" 
                            fill={getFaceColor('top')}
                            stroke={isFaceSelected('top') ? '#8b5cf6' : '#d1d5db'}
                            strokeWidth={isFaceSelected('top') ? 2 : 1}
                            className="cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-125"
                            onClick={(e) => { e.stopPropagation(); onSelect(pieza, 'top'); }}
                        />
                        {/* Bottom / Dorso */}
                        <path 
                            d="M 2,28 L 32,28 L 17,15 Z" 
                            fill={getFaceColor('bottom')}
                            stroke={isFaceSelected('bottom') ? '#8b5cf6' : '#d1d5db'}
                            strokeWidth={isFaceSelected('bottom') ? 2 : 1}
                            className="cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-125"
                            onClick={(e) => { e.stopPropagation(); onSelect(pieza, 'bottom'); }}
                        />
                        {/* Left / Lateral Izquierdo */}
                        <path 
                            d="M 2,2 L 17,15 L 2,28 Z" 
                            fill={getFaceColor('left')}
                            stroke={isFaceSelected('left') ? '#8b5cf6' : '#d1d5db'}
                            strokeWidth={isFaceSelected('left') ? 2 : 1}
                            className="cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-125"
                            onClick={(e) => { e.stopPropagation(); onSelect(pieza, 'left'); }}
                        />
                        {/* Right / Lateral Derecho */}
                        <path 
                            d="M 32,2 L 17,15 L 32,28 Z" 
                            fill={getFaceColor('right')}
                            stroke={isFaceSelected('right') ? '#8b5cf6' : '#d1d5db'}
                            strokeWidth={isFaceSelected('right') ? 2 : 1}
                            className="cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-125"
                            onClick={(e) => { e.stopPropagation(); onSelect(pieza, 'right'); }}
                        />
                    </g>
                )}

                {/* Ausente X Cross */}
                {isAusente && (
                    <g className="opacity-60">
                        <line x1="2" y1="2" x2="32" y2="28" stroke="#ef4444" strokeWidth="3" />
                        <line x1="32" y1="2" x2="2" y2="28" stroke="#ef4444" strokeWidth="3" />
                    </g>
                )}
            </svg>
            
            {/* Number */}
            <span 
                className={cn(
                    'text-[10px] font-bold tabular-nums leading-none transition-colors px-1.5 py-0.5 rounded cursor-pointer',
                    (selected?.pieza === pieza) ? 'bg-primary text-white' : 'text-muted-foreground group-hover:text-foreground'
                )}
                onClick={() => onSelect(pieza, null)}
            >
                {pieza}
            </span>
        </div>
    )
}


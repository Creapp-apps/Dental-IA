'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TurnoCardGlass } from './TurnoCardGlass'

type TurnoCardTurno = React.ComponentProps<typeof TurnoCardGlass>['turno']

const LIMITE = 5

/**
 * Lista de turnos de un profesional en el dashboard.
 * Muestra los primeros LIMITE y colapsa el resto tras "Ver todos" para
 * evitar un scroll largo en mobile. Despliegue con animación sutil.
 */
export function TurnosProfesionalList({
    turnos,
    colorProf,
}: {
    turnos: TurnoCardTurno[]
    colorProf: string
}) {
    const [verTodos, setVerTodos] = useState(false)

    const visibles = verTodos ? turnos : turnos.slice(0, LIMITE)
    const restantes = turnos.length - LIMITE

    return (
        <div className="space-y-2">
            {visibles.map((turno, i) => (
                <TurnoCardGlass key={turno.id} turno={turno} colorProf={colorProf} index={i} />
            ))}

            {restantes > 0 && (
                <button
                    type="button"
                    onClick={() => setVerTodos((v) => !v)}
                    aria-expanded={verTodos}
                    className="w-full py-2 px-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                    {verTodos ? (
                        <>
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Ver menos</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Ver todos los turnos ({restantes} más)</span>
                        </>
                    )}
                </button>
            )}
        </div>
    )
}

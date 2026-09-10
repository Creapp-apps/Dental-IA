'use client'

import { useState } from 'react'
import { Bell, BellRing, Clock, CheckCircle2, User, ChevronRight, Volume2 } from 'lucide-react'
import { TextType } from '@/components/ui/TextType'

export function InteractiveWaitingRoom() {
    const [patientStatus, setPatientStatus] = useState<'programado' | 'espera' | 'sillon'>('programado')
    const [waitTime, setWaitTime] = useState<number>(3)

    const handlePatientArrived = () => {
        setPatientStatus('espera')
        setWaitTime(0)
    }

    const handleCallToChair = () => {
        setPatientStatus('sillon')
    }

    const handleReset = () => {
        setPatientStatus('programado')
        setWaitTime(3)
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                        </span>
                        <h3 className="text-xl font-bold text-slate-900">
                            Recepción Inteligente y Sala de Espera en Tiempo Real
                        </h3>
                    </div>
                    <div className="mt-1 min-h-[20px]">
                        <TextType
                            text="Alertas instantáneas entre la recepcionista y el odontólogo en el sillón sin necesidad de levantarse ni golpear la puerta."
                            as="p"
                            className="text-xs text-slate-500 inline"
                            typingSpeed={14}
                            initialDelay={350}
                            startOnVisible={true}
                            loop={false}
                            showCursor={true}
                            cursorCharacter="|"
                            cursorClassName="text-blue-600 font-bold ml-0.5"
                        />
                    </div>
                </div>

                <button
                    onClick={handleReset}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer self-start sm:self-auto"
                >
                    Reiniciar simulación
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-center">
                {/* Ficha del Paciente en Vivo */}
                <div className="md:col-span-7 space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                CM
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Carolina Méndez</h4>
                                <span className="text-xs text-slate-500">Turno 10:30 hs • Swiss Medical</span>
                            </div>
                        </div>

                        <div>
                            {patientStatus === 'programado' && (
                                <span className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                                    En Camino
                                </span>
                            )}
                            {patientStatus === 'espera' && (
                                <span className="text-xs px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200 animate-pulse flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    En Espera ({waitTime} min)
                                </span>
                            )}
                            {patientStatus === 'sillon' && (
                                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    En Atención (Sillón 1)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción interactiva */}
                    <div className="space-y-2">
                        {patientStatus === 'programado' && (
                            <button
                                onClick={handlePatientArrived}
                                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <BellRing className="w-4 h-4" />
                                1. Simular: Paciente ingresó al consultorio
                            </button>
                        )}

                        {patientStatus === 'espera' && (
                            <button
                                onClick={handleCallToChair}
                                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Volume2 className="w-4 h-4" />
                                2. Hacer sonar timbre y llamar a Sillón 1
                            </button>
                        )}

                        {patientStatus === 'sillon' && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-medium">
                                ✅ El Dr. Álvarez ya está atendiendo al paciente. El tiempo de espera fue de solo {waitTime} minutos.
                            </div>
                        )}
                    </div>
                </div>

                {/* Explicación del beneficio */}
                <div className="md:col-span-5 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Beneficio en la Clínica
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                        Cero gritos y discreción médica total
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Cuando el paciente se anuncia en recepción, el sistema notifica en la pantalla o tablet del consultorio. El doctor sabe exactamente quién espera afuera y cuánto tiempo lleva aguardando.
                    </p>
                </div>
            </div>
        </div>
    )
}

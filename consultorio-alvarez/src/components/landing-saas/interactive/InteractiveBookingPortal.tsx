'use client'

import { useState } from 'react'
import { Calendar, Clock, User, Check, CreditCard, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export function InteractiveBookingPortal() {
    const [step, setStep] = useState<number>(1)
    const [selectedDoc, setSelectedDoc] = useState<string>('alvarez')
    const [selectedOS, setSelectedOS] = useState<string>('osde')
    const [selectedTime, setSelectedTime] = useState<string>('15:30')
    const [isConfirmed, setIsConfirmed] = useState<boolean>(false)

    const resetBooking = () => {
        setStep(1)
        setIsConfirmed(false)
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden text-left">
            {/* Barra de navegador simulada */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="px-3 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono text-slate-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">🔒</span>
                    <span>consultorioalvarez.com.ar/reservar</span>
                </div>
                <div className="text-[11px] text-blue-600 font-semibold hidden sm:inline">
                    Web Propia del Consultorio
                </div>
            </div>

            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">
                            Turnero Online con Cobro de Seña Automático
                        </h3>
                    </div>
                    {isConfirmed && (
                        <button
                            onClick={resetBooking}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                        >
                            Probar de nuevo
                        </button>
                    )}
                </div>

                {!isConfirmed ? (
                    <div className="space-y-6">
                        {/* Selector de Profesional */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-2">
                                1. Seleccioná el Odontólogo / Especialidad:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedDoc('alvarez')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        selectedDoc === 'alvarez'
                                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-slate-900">Dr. Santiago Álvarez</span>
                                        {selectedDoc === 'alvarez' && <Check className="w-4 h-4 text-blue-600" />}
                                    </div>
                                    <span className="text-xs text-slate-500 block mt-0.5">Implantología y Prótesis Fija</span>
                                </button>

                                <button
                                    onClick={() => setSelectedDoc('gomez')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        selectedDoc === 'gomez'
                                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-slate-900">Dra. Mariana Gómez</span>
                                        {selectedDoc === 'gomez' && <Check className="w-4 h-4 text-blue-600" />}
                                    </div>
                                    <span className="text-xs text-slate-500 block mt-0.5">Ortodoncia e Invisalign</span>
                                </button>
                            </div>
                        </div>

                        {/* Cobertura Médica */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-2">
                                2. Cobertura Médica:
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['OSDE', 'Swiss Medical', 'Galeno', 'Particular'].map(os => (
                                    <button
                                        key={os}
                                        onClick={() => setSelectedOS(os.toLowerCase())}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                            selectedOS === os.toLowerCase()
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {os}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Horarios Disponibles */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-2">
                                3. Horarios Disponibles para Mañana (Jueves 12):
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {['09:30', '11:00', '15:30', '17:00'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTime(t)}
                                        className={`py-2 px-3 rounded-lg border text-center text-xs font-bold font-mono transition-all cursor-pointer ${
                                            selectedTime === t
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        {t} hs
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Botón de Confirmación con Seña */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500">
                                Seña requerida para confirmar el sillón: <strong className="text-slate-900 font-bold">$10.000 (Vía Mercado Pago)</strong>
                            </div>
                            <button
                                onClick={() => setIsConfirmed(true)}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <CreditCard className="w-4 h-4" />
                                Reservar y Abonar Seña
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                            <Check className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <h4 className="text-lg font-bold text-emerald-950">
                            ¡Turno Reservado con Éxito!
                        </h4>
                        <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                            La seña de $10.000 se acreditó de inmediato en la cuenta de Mercado Pago del consultorio. El paciente recibió su confirmación por WhatsApp y el turno ya figura en la agenda del doctor.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

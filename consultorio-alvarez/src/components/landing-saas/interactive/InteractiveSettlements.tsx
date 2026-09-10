'use client'

import { useState } from 'react'
import { DollarSign, FileSpreadsheet, Check, Download, TrendingUp, Users } from 'lucide-react'
import { TextType } from '@/components/ui/TextType'

export function InteractiveSettlements() {
    const [selectedDoctor, setSelectedDoctor] = useState<'alvarez' | 'gomez'>('alvarez')

    const doctorsData = {
        alvarez: {
            name: 'Dr. Santiago Álvarez',
            spec: 'Implantología y Prótesis',
            rate: '50% sobre honorarios netos',
            patients: 28,
            gross: '$2.900.000',
            labCosts: '-$450.000 (Laboratorio Zirconio)',
            netPayable: '$1.450.000'
        },
        gomez: {
            name: 'Dra. Mariana Gómez',
            spec: 'Ortodoncia e Invisalign',
            rate: '45% sobre honorarios netos',
            patients: 34,
            gross: '$2.160.000',
            labCosts: '-$210.000 (Alineadores)',
            netPayable: '$972.000'
        }
    }

    const doc = doctorsData[selectedDoctor]

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <DollarSign className="w-4 h-4" />
                        </span>
                        <h3 className="text-xl font-bold text-slate-900">
                            Liquidaciones Médicas y Finanzas en 1 Clic
                        </h3>
                    </div>
                    <div className="mt-1 min-h-[20px]">
                        <TextType
                            text="Olvidate de pasar un fin de semana entero calculando porcentajes a mano con una calculadora."
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

                {/* Selector de doctor */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                        onClick={() => setSelectedDoctor('alvarez')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedDoctor === 'alvarez'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Dr. Álvarez (50%)
                    </button>
                    <button
                        onClick={() => setSelectedDoctor('gomez')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedDoctor === 'gomez'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Dra. Gómez (45%)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Facturación del Profesional</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{doc.gross}</div>
                    <span className="text-xs text-slate-500 mt-1 block">
                        {doc.patients} tratamientos concluidos
                    </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Gastos de Laboratorio Deducidos</span>
                    <div className="text-2xl font-black text-rose-600 mt-1">{doc.labCosts}</div>
                    <span className="text-xs text-slate-500 mt-1 block">
                        Cálculo automático de insumos
                    </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                    <span className="text-xs text-blue-800 font-bold">Honorario Neto a Transferir</span>
                    <div className="text-2xl font-black text-blue-700 mt-1">{doc.netPayable}</div>
                    <span className="text-xs text-blue-600 font-medium mt-1 block">
                        Liquidación lista para abonar
                    </span>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                    Acuerdo registrado: <strong className="text-slate-900">{doc.name}</strong> • {doc.rate}
                </div>
                <button
                    onClick={() => alert(`Liquidación generada con éxito para ${doc.name}. Total: ${doc.netPayable}`)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Resumen Contable (PDF / Excel)
                </button>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { Stethoscope, Check, AlertCircle, Sparkles, FileText, Info } from 'lucide-react'
import { TextType } from '@/components/ui/TextType'

const ESTADOS = [
    { value: 'SANO', label: 'Sano', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { value: 'CARIES', label: 'Caries', color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-300' },
    { value: 'OBTURADO', label: 'Obturado / Resina', color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-300' },
    { value: 'CORONA', label: 'Corona Cerámica', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-300' },
    { value: 'ENDODONCIA', label: 'Endodoncia', color: '#ec4899', bg: 'bg-pink-50 text-pink-700 border-pink-300' },
    { value: 'IMPLANTE', label: 'Implante Titanio', color: '#8b5cf6', bg: 'bg-violet-50 text-violet-700 border-violet-300' },
]

export function InteractiveOdontograma() {
    const [selectedPiece, setSelectedPiece] = useState<string>('16')
    const [selectedFace, setSelectedFace] = useState<string>('center')
    const [toothFaces, setToothFaces] = useState<Record<string, Record<string, string>>>({
        '16': { center: 'CARIES', top: 'SANO', bottom: 'SANO', left: 'OBTURADO', right: 'SANO' },
        '21': { center: 'OBTURADO', top: 'CORONA', bottom: 'SANO', left: 'SANO', right: 'SANO' },
        '26': { center: 'SANO', top: 'SANO', bottom: 'SANO', left: 'SANO', right: 'SANO' },
        '36': { center: 'IMPLANTE', top: 'IMPLANTE', bottom: 'IMPLANTE', left: 'IMPLANTE', right: 'IMPLANTE' },
        '48': { center: 'CARIES', top: 'SANO', bottom: 'SANO', left: 'SANO', right: 'SANO' }
    })

    const handleApplyStatus = (statusValue: string) => {
        setToothFaces(prev => ({
            ...prev,
            [selectedPiece]: {
                ...(prev[selectedPiece] || {}),
                [selectedFace]: statusValue
            }
        }))
    }

    const currentFaceState = toothFaces[selectedPiece]?.[selectedFace] || 'SANO'
    const currentStatusObj = ESTADOS.find(e => e.value === currentFaceState) || ESTADOS[0]

    const getFaceFill = (face: string) => {
        const val = toothFaces[selectedPiece]?.[face] || 'SANO'
        const st = ESTADOS.find(e => e.value === val)
        return st ? st.color : '#e2e8f0'
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xs text-left max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Stethoscope className="w-4 h-4" />
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                            Odontograma Digital Multicapa FDI (32 Piezas)
                        </h3>
                    </div>
                    <div className="mt-1 min-h-[20px]">
                        <TextType
                            text="Hacé clic en una pieza y en cualquiera de sus 5 caras para registrar el estado clínico en tiempo real."
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

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto">
                    <span>Paciente:</span>
                    <strong className="text-slate-900">Luciana Ferrari (32 años)</strong>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-6 items-start">
                
                {/* Selector de Piezas Clave */}
                <div className="lg:col-span-5 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Seleccionar Pieza Dental (FDI)
                    </span>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {['16', '21', '26', '36', '48'].map((piece) => {
                            const isSelected = selectedPiece === piece
                            return (
                                <button
                                    key={piece}
                                    onClick={() => setSelectedPiece(piece)}
                                    className={`p-1.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer min-w-0 ${
                                        isSelected
                                            ? 'bg-blue-600 text-white font-black border-blue-600 shadow-md scale-102 sm:scale-105'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="text-base sm:text-lg font-bold font-mono">{piece}</div>
                                    <div className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {piece === '16' && 'Molar D'}
                                        {piece === '21' && 'Incisivo'}
                                        {piece === '26' && 'Molar I'}
                                        {piece === '36' && 'Molar Inf'}
                                        {piece === '48' && 'Juicio'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Paleta de Estados Clínicos */}
                    <div className="pt-4 border-t border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                            Aplicar Diagnóstico a la Cara Seleccionada:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {ESTADOS.map((st) => (
                                <button
                                    key={st.value}
                                    onClick={() => handleApplyStatus(st.value)}
                                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                        currentFaceState === st.value
                                            ? `${st.bg} ring-2 ring-blue-500 shadow-xs`
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                                        <span>{st.label}</span>
                                    </div>
                                    {currentFaceState === st.value && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Visualizador Anatómico de 5 Caras */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col justify-between max-w-full overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-700">
                                Pieza #{selectedPiece} • Diagrama de Caras Anatómicas
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white border border-slate-200 text-slate-800">
                                Cara activa: <strong className="text-blue-600 uppercase">{selectedFace}</strong>
                            </span>
                        </div>

                        {/* Diagrama SVG interactivo de 5 caras */}
                        <div className="flex justify-center my-4">
                            <div className="relative w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-2xl border border-slate-300 p-2 shadow-xs flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-32 h-32 sm:w-40 sm:h-40">
                                    {/* Cara Superior (Vestibular / Top) */}
                                    <polygon
                                        points="0,0 100,0 75,25 25,25"
                                        fill={getFaceFill('top')}
                                        stroke="#94a3b8"
                                        strokeWidth="1.5"
                                        onClick={() => setSelectedFace('top')}
                                        className={`cursor-pointer transition-opacity ${selectedFace === 'top' ? 'opacity-100 stroke-blue-600 stroke-2' : 'opacity-85 hover:opacity-100'}`}
                                    />
                                    {/* Cara Derecha (Distal / Right) */}
                                    <polygon
                                        points="100,0 100,100 75,75 75,25"
                                        fill={getFaceFill('right')}
                                        stroke="#94a3b8"
                                        strokeWidth="1.5"
                                        onClick={() => setSelectedFace('right')}
                                        className={`cursor-pointer transition-opacity ${selectedFace === 'right' ? 'opacity-100 stroke-blue-600 stroke-2' : 'opacity-85 hover:opacity-100'}`}
                                    />
                                    {/* Cara Inferior (Lingual / Bottom) */}
                                    <polygon
                                        points="100,100 0,100 25,75 75,75"
                                        fill={getFaceFill('bottom')}
                                        stroke="#94a3b8"
                                        strokeWidth="1.5"
                                        onClick={() => setSelectedFace('bottom')}
                                        className={`cursor-pointer transition-opacity ${selectedFace === 'bottom' ? 'opacity-100 stroke-blue-600 stroke-2' : 'opacity-85 hover:opacity-100'}`}
                                    />
                                    {/* Cara Izquierda (Mesial / Left) */}
                                    <polygon
                                        points="0,100 0,0 25,25 25,75"
                                        fill={getFaceFill('left')}
                                        stroke="#94a3b8"
                                        strokeWidth="1.5"
                                        onClick={() => setSelectedFace('left')}
                                        className={`cursor-pointer transition-opacity ${selectedFace === 'left' ? 'opacity-100 stroke-blue-600 stroke-2' : 'opacity-85 hover:opacity-100'}`}
                                    />
                                    {/* Centro (Oclusal / Center) */}
                                    <polygon
                                        points="25,25 75,25 75,75 25,75"
                                        fill={getFaceFill('center')}
                                        stroke="#94a3b8"
                                        strokeWidth="1.5"
                                        onClick={() => setSelectedFace('center')}
                                        className={`cursor-pointer transition-opacity ${selectedFace === 'center' ? 'opacity-100 stroke-blue-600 stroke-2' : 'opacity-85 hover:opacity-100'}`}
                                    />
                                </svg>
                            </div>
                        </div>

                        <div className="text-center text-[11px] text-slate-500 mb-2">
                            Tocá el centro o los bordes del diente para seleccionar la cara a tratar
                        </div>
                    </div>

                    {/* Registro de Historia Clínica Generado */}
                    <div className="mt-4 p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                                Diagnóstico registrado para Pieza #{selectedPiece}:
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentStatusObj.bg}`}>
                                {currentStatusObj.label}
                            </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            {selectedPiece === '16' && 'Restauración estética compuesta con fotocurado y protección pulpar indirecta.'}
                            {selectedPiece === '21' && 'Tratamiento de conducto completado. Listo para toma de impresión y corona.'}
                            {selectedPiece === '26' && 'Pieza sana. Control preventivo y profilaxis.'}
                            {selectedPiece === '36' && 'Implante oseointegrado. Control radiográfico semestral.'}
                            {selectedPiece === '48' && 'Tercer molar en posición horizontal con retención ósea. Indicación quirúrgica.'}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}

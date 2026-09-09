'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
    Calendar, 
    Sparkles, 
    ArrowRight, 
    Check, 
    Play, 
    Clock, 
    User, 
    DollarSign, 
    Activity, 
    ShieldCheck, 
    ChevronRight,
    Search,
    Plus,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    FileText,
    CalendarCheck,
    Stethoscope
} from 'lucide-react'

export function HeroProductTour({ onOpenDemo }: { onOpenDemo: () => void }) {
    const [activeTab, setActiveTab] = useState<'agenda' | 'odontograma' | 'caja'>('agenda')
    const [selectedTooth, setSelectedTooth] = useState<number>(16)

    // Datos simulados de dientes
    const toothData: Record<number, { name: string; status: string; diagnosis: string; color: string; treatment: string; price: string }> = {
        16: { name: 'Primer Molar Superior Derecho', status: 'Caries Oclusal Profunda', diagnosis: 'Requiere obturación con resina fotocurable y protección pulpar.', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', treatment: 'Restauración Estética Compuesta', price: '$45.000' },
        21: { name: 'Incisivo Central Superior Izquierdo', status: 'Tratamiento de Conducto Finalizado', diagnosis: 'Endodoncia completada con éxito. Listo para corona de porcelana.', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', treatment: 'Perno y Corona Zirconio', price: '$120.000' },
        26: { name: 'Primer Molar Superior Izquierdo', status: 'Pieza Sana', diagnosis: 'Esmalte intacto, sin presencia de placa ni caries interproximal.', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', treatment: 'Limpieza con Ultrasonido y Fluoración', price: '$22.000' },
        36: { name: 'Primer Molar Inferior Izquierdo', status: 'Implante Oseointegrado', diagnosis: 'Control semestral satisfactorio. Oseointegración del 100%.', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', treatment: 'Mantenimiento Periimplantario', price: '$35.000' },
        48: { name: 'Tercer Molar Inferior Derecho (Muela de Juicio)', status: 'Impactada Horizontal', diagnosis: 'Retención ósea profunda con presión sobre raíz del 47. Indicación quirúrgica.', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', treatment: 'Extracción Quirúrgica Compleja', price: '$65.000' }
    }

    const currentTooth = toothData[selectedTooth] || toothData[16]

    return (
        <section className="relative z-10 pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            {/* Pill Superior con Novedades */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold mb-8 shadow-lg shadow-cyan-500/10 backdrop-blur-md animate-pulse">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400"></span>
                <span>Dental-IA 2.0 • El Ecosistema Integral para Clínicas y Consultorios</span>
            </div>

            {/* Titular Principal */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
                El sistema que <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">automatiza tu consultorio</span> y blinda tu agenda
            </h1>

            {/* Bajada Comercial */}
            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
                Olvidate del ausentismo y las planillas manuales. Gestioná turnos en tiempo real, odontograma 3D, liquidaciones y dejá que nuestro <strong className="text-white font-semibold underline decoration-cyan-400 underline-offset-4">asistente de WhatsApp con IA</strong> atienda, confirme y cobre señas las 24 horas.
            </p>

            {/* Acciones Principales */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={onOpenDemo}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-base shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group cursor-pointer"
                >
                    Solicitar Demostración en Vivo
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                    href="/login"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-base border border-white/10 transition-all flex items-center justify-center gap-2.5 backdrop-blur-sm"
                >
                    <User className="w-4 h-4 text-cyan-400" />
                    Acceso para Consultorios
                </Link>
            </div>

            {/* Badges de Confianza */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> Sin contratos de permanencia</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> Configuración guiada en 10 min</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cyan-400" /> WhatsApp Oficial con Inteligencia Artificial</span>
            </div>

            {/* ── MOCKUP INTERACTIVO DEL PRODUCTO (LIVE TOUR) ─────────────────────────── */}
            <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-cyan-500/25 via-indigo-500/10 to-transparent border border-white/15 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
                <div className="rounded-2xl bg-slate-950/95 border border-white/10 overflow-hidden shadow-2xl">
                    
                    {/* Barra Superior del Sistema */}
                    <div className="h-14 bg-slate-900/90 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4">
                        {/* Botones de ventana */}
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-slate-400">
                                Dental-IA OS • Panel Central de Control
                            </span>
                        </div>

                        {/* Switcher de Pestañas Interactivas */}
                        <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('agenda')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'agenda' 
                                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Agenda &</span> Turnos
                            </button>
                            <button
                                onClick={() => setActiveTab('odontograma')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'odontograma' 
                                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Odontograma 3D
                            </button>
                            <button
                                onClick={() => setActiveTab('caja')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'caja' 
                                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <DollarSign className="w-3.5 h-3.5" />
                                Finanzas
                            </button>
                        </div>

                        {/* Estado En Vivo */}
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                            <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline">Sincronizado</span>
                        </div>
                    </div>

                    {/* ── CONTENIDO DE LA PESTAÑA: AGENDA Y SOBRETURNOS ── */}
                    {activeTab === 'agenda' && (
                        <div className="p-4 sm:p-7 text-left space-y-6">
                            {/* Cabecera de la agenda */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white">Agenda del Día • Dr. Santiago Álvarez</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                            8 turnos confirmados
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Sillón 1 • Especialidad: Prótesis e Implantes</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-cyan-300 font-semibold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        IA: 100% asistido por WhatsApp
                                    </span>
                                </div>
                            </div>

                            {/* Lista de Turnos Simulada */}
                            <div className="space-y-3">
                                {/* Turno 1 */}
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center font-mono">
                                            <span className="text-xs font-bold text-cyan-400">09:00</span>
                                            <span className="text-[9px] text-slate-400">AM</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-white">Martín Benítez</h4>
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">OSDE 310</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">Implante Titanio Pieza 36 • Control y corona</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Confirmado por WhatsApp
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-300">$35.000 (Señado)</span>
                                    </div>
                                </div>

                                {/* Turno 2 */}
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center font-mono">
                                            <span className="text-xs font-bold text-cyan-400">10:30</span>
                                            <span className="text-[9px] text-slate-400">AM</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-white">Carolina Méndez</h4>
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Swiss Medical</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">Endodoncia Unirradicular Pieza 21</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                        <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                                            <Activity className="w-3.5 h-3.5" />
                                            En Sala de Espera
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-300">$48.000</span>
                                    </div>
                                </div>

                                {/* Turno 3 - Sobreturno Inteligente */}
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center font-mono">
                                            <span className="text-xs font-bold text-amber-400">11:45</span>
                                            <span className="text-[9px] text-amber-400/80">URG</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-white">Luciano Rossi</h4>
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                    Sobreturno de Urgencia
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-300/80 mt-0.5">Dolor agudo tercer molar 48 • Asignado automáticamente por vacante</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                        <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Hueco reasignado por IA
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-300">$65.000</span>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen inferior */}
                            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs text-slate-300">
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-cyan-400" />
                                    El bot envió recordatorios hace 24hs. Tasa de respuesta del paciente: <strong className="text-cyan-300">98.4%</strong>
                                </span>
                                <span className="hidden sm:inline font-mono text-cyan-400 font-bold">0 ausencias hoy</span>
                            </div>
                        </div>
                    )}

                    {/* ── CONTENIDO DE LA PESTAÑA: ODONTOGRAMA DIGITAL 3D ── */}
                    {activeTab === 'odontograma' && (
                        <div className="p-4 sm:p-7 text-left space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Odontograma Interactivo Multicapa</h3>
                                    <p className="text-xs text-slate-400">Hacé clic en cualquier pieza dental para visualizar su diagnóstico y plan clínico</p>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300">
                                    Paciente: <strong className="text-white">Luciana Ferrari (32 años)</strong>
                                </span>
                            </div>

                            {/* Selector Interactivo de Piezas Dentales */}
                            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Arcada Superior e Inferior (Piezas Clave)
                                </div>
                                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                                    {[16, 21, 26, 36, 48].map((tooth) => {
                                        const isSelected = selectedTooth === tooth
                                        return (
                                            <button
                                                key={tooth}
                                                onClick={() => setSelectedTooth(tooth)}
                                                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105'
                                                        : 'bg-slate-950 border-white/10 hover:border-white/30 text-slate-400'
                                                }`}
                                            >
                                                <div className="text-base sm:text-xl font-black font-mono text-white">
                                                    {tooth}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate mt-1">
                                                    {tooth === 16 && 'Molar Sup D'}
                                                    {tooth === 21 && 'Incisivo Sup'}
                                                    {tooth === 26 && 'Molar Sup I'}
                                                    {tooth === 36 && 'Molar Inf I'}
                                                    {tooth === 48 && 'Muela Juicio'}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Detalle Clínico de la Pieza Seleccionada */}
                            <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-cyan-400 font-mono">Pieza #{selectedTooth}</span>
                                            <span className="text-sm font-semibold text-white">• {currentTooth.name}</span>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${currentTooth.color}`}>
                                        {currentTooth.status}
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-300 leading-relaxed">
                                    <strong className="text-white block mb-1">Diagnóstico Clínico:</strong>
                                    {currentTooth.diagnosis}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <FileText className="w-4 h-4 text-cyan-400" />
                                        Tratamiento Recomendado: <span className="text-white font-semibold">{currentTooth.treatment}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">Arancel Sugerido:</span>
                                        <span className="text-base font-black text-emerald-400 font-mono">{currentTooth.price}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CONTENIDO DE LA PESTAÑA: FINANZAS Y LIQUIDACIONES ── */}
                    {activeTab === 'caja' && (
                        <div className="p-4 sm:p-7 text-left space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Métricas Financieras y Liquidación Médica</h3>
                                    <p className="text-xs text-slate-400">Control de ingresos, cobro de señas automatizado y honorarios por profesional</p>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                                    Mes en Curso • Octubre
                                </span>
                            </div>

                            {/* Tarjetas de Métricas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                                    <span className="text-xs text-slate-400 font-medium">Facturación Total</span>
                                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">$4.850.000</div>
                                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5" /> +24% vs. mes anterior
                                    </span>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                                    <span className="text-xs text-slate-400 font-medium">Señas Mercado Pago</span>
                                    <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">$920.000</div>
                                    <span className="text-[11px] text-slate-400">100% cobrado previo al turno</span>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                                    <span className="text-xs text-slate-400 font-medium">Liquidaciones a Odontólogos</span>
                                    <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">$2.425.000</div>
                                    <span className="text-[11px] text-slate-400">Cálculo exacto por % de sillón</span>
                                </div>
                            </div>

                            {/* Tabla de Profesionales Liquidada */}
                            <div className="rounded-xl border border-white/10 overflow-hidden">
                                <div className="bg-slate-900 px-4 py-2.5 border-b border-white/10 text-xs font-semibold text-slate-300">
                                    Detalle de Honorarios por Profesional
                                </div>
                                <div className="divide-y divide-white/5 bg-slate-950 text-xs">
                                    <div className="p-3.5 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">Dr. Santiago Álvarez</div>
                                            <div className="text-[11px] text-slate-400">Implantología (50% Honorario) • 28 pacientes</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-emerald-400">$1.450.000</div>
                                            <span className="text-[10px] text-slate-500">Liquidación al día</span>
                                        </div>
                                    </div>
                                    <div className="p-3.5 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">Dra. Mariana Gómez</div>
                                            <div className="text-[11px] text-slate-400">Ortodoncia e Invisalign (45% Honorario) • 34 pacientes</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-emerald-400">$975.000</div>
                                            <span className="text-[10px] text-slate-500">Liquidación al día</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </section>
    )
}

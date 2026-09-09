'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
    Calendar, 
    Check, 
    ArrowRight, 
    Clock, 
    Activity, 
    Shield, 
    Database, 
    FileText, 
    Terminal, 
    Cpu,
    Radio,
    Maximize2
} from 'lucide-react'

export function SurgicalInstrumentalView({ onOpenDemo }: { onOpenDemo: () => void }) {
    const [selectedSlot, setSelectedSlot] = useState<number>(0)

    const schedule = [
        { time: '09:00 - 09:45', patient: 'Valenzuela, Roberto', id: 'HC-4821', treatment: 'Apertura e instrumentación endodóntica (Pieza 26)', status: 'EN SILLÓN', statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', prepayment: '$15.000 (Confirmado)', cover: 'OSDE 410' },
        { time: '10:00 - 10:30', patient: 'Arismendi, Clara', id: 'HC-5102', treatment: 'Control periimplantario y destartraje ultrasónico', status: 'SALA DE ESPERA', statusColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40', prepayment: '$10.000 (Confirmado)', cover: 'Swiss Medical' },
        { time: '10:45 - 11:30', patient: 'Rossi, Luciano', id: 'HC-6389', treatment: 'Exodoncia quirúrgica retenida (Pieza 48)', status: 'SOBRETURNO IA', statusColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40', prepayment: '$25.000 (Confirmado)', cover: 'Particular' },
        { time: '11:45 - 12:15', patient: 'Morales, Sofía', id: 'HC-5920', treatment: 'Toma de impresión para coronas sobre zirconio', status: 'CONFIRMADO WHATSAPP', statusColor: 'bg-slate-700 text-slate-300 border-slate-600', prepayment: '$20.000 (Confirmado)', cover: 'Galeno 330' },
    ]

    return (
        <div className="w-full bg-[#0b0c0e] text-[#d4d4d8] font-sans antialiased selection:bg-white selection:text-black">
            
            {/* Header Técnico / Instrumental */}
            <header className="border-b border-[#222328] bg-[#0e1013] sticky top-0 z-30 px-4 sm:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded border border-[#33353c] bg-[#16181d] flex items-center justify-center font-mono font-bold text-xs text-white">
                            D·IA
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                                    Dental-IA Clinical OS
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    v2.4 INSTRUMENTAL
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#71717a] block">
                                SISTEMA DE GESTIÓN QUIRÚRGICA Y AUDITORÍA DE SILLÓN
                            </span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6 font-mono text-xs text-[#a1a1aa]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            NODE: BUENOS AIRES (14ms)
                        </span>
                        <span>FDI COMPLIANT</span>
                        <span>WHATSAPP API v21.0</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-3.5 py-1.5 rounded border border-[#27272a] text-xs font-mono text-[#e4e4e7] hover:bg-[#18181b] transition-colors"
                        >
                            ACCESO MÉDICO
                        </Link>
                        <button
                            onClick={onOpenDemo}
                            className="px-4 py-1.5 rounded bg-white text-black font-mono font-bold text-xs hover:bg-[#e4e4e7] transition-colors cursor-pointer"
                        >
                            SOLICITAR AUDITORÍA
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO INSTRUMENTAL: DATOS DUROS Y CONTROL CLÍNICO ── */}
            <section className="border-b border-[#222328] py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
                <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#16181d] border border-[#27272a] text-[11px] font-mono text-[#a1a1aa] mb-6">
                        <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        INFRAESTRUCTURA DE SILLÓN ODONTOLÓGICO DE ALTA EFICIENCIA
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
                        Un sillón que queda vacío a las 16:00 hs no se recupera.
                    </h1>

                    <p className="mt-6 text-base sm:text-lg text-[#a1a1aa] leading-relaxed max-w-3xl">
                        En Argentina, un consultorio dental promedio pierde entre el 25% y el 40% de sus ingresos mensuales por ausentismo no avisado y turnos cancelados a último momento. Dental-IA opera las 24 horas sincronizando WhatsApp oficial, señas con acreditación instantánea y odontograma digital FDI para garantizar el 100% de ocupación.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button
                            onClick={onOpenDemo}
                            className="px-6 py-3 rounded bg-white text-black font-mono font-bold text-xs tracking-wide hover:bg-[#e4e4e7] transition-all flex items-center gap-2 cursor-pointer"
                        >
                            INICIAR AUDITORÍA DE TU CLÍNICA
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <Link
                            href="/login"
                            className="px-6 py-3 rounded border border-[#27272a] text-xs font-mono text-[#d4d4d8] hover:bg-[#18181b] transition-all flex items-center gap-2"
                        >
                            VER FICHA DE DEMOSTRACIÓN
                        </Link>
                    </div>
                </div>

                {/* Métricas de Precisión */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#222328] border border-[#222328] rounded-lg overflow-hidden">
                    <div className="bg-[#0e1013] p-5">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                            TASA DE OCUPACIÓN EFECTIVA
                        </span>
                        <div className="text-3xl font-mono font-black text-white">98.2%</div>
                        <span className="text-[11px] font-mono text-emerald-400 mt-1 block">
                            +32% sobre media del sector
                        </span>
                    </div>

                    <div className="bg-[#0e1013] p-5">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                            TIEMPO DE RESPUESTA WHATSAPP
                        </span>
                        <div className="text-3xl font-mono font-black text-white">1.8s</div>
                        <span className="text-[11px] font-mono text-[#a1a1aa] mt-1 block">
                            Atención técnica desatendida
                        </span>
                    </div>

                    <div className="bg-[#0e1013] p-5">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                            REASIGNACIÓN DE VACANTES
                        </span>
                        <div className="text-3xl font-mono font-black text-white">&lt; 14m</div>
                        <span className="text-[11px] font-mono text-emerald-400 mt-1 block">
                            Detección automática de sobreturno
                        </span>
                    </div>

                    <div className="bg-[#0e1013] p-5">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                            COMISIÓN INTERMEDIARIA
                        </span>
                        <div className="text-3xl font-mono font-black text-white">0.0%</div>
                        <span className="text-[11px] font-mono text-[#a1a1aa] mt-1 block">
                            Acreditación directa en tu cuenta
                        </span>
                    </div>
                </div>
            </section>

            {/* ── SECCIÓN DE CONTROL: LA CONSOLA CLÍNICA REAL ── */}
            <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-b border-[#222328]">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a] block mb-1">
                            SUBSISTEMA DE AUDITORÍA
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Consola de Registro Diario en Sillón
                        </h2>
                    </div>
                    <div className="text-xs font-mono text-[#71717a]">
                        SILLÓN #1 • DR. SANTIAGO ÁLVAREZ (MN 48.912)
                    </div>
                </div>

                <div className="border border-[#222328] rounded-xl overflow-hidden bg-[#0e1013]">
                    {/* Header de la Tabla */}
                    <div className="grid grid-cols-12 bg-[#14161b] border-b border-[#222328] px-4 py-3 text-[11px] font-mono text-[#71717a] uppercase">
                        <div className="col-span-2">HORARIO / INTERVALO</div>
                        <div className="col-span-3">PACIENTE / HISTORIA</div>
                        <div className="col-span-4">PROCEDIMIENTO & PIEZA (FDI)</div>
                        <div className="col-span-2">ESTADO DE ASISTENCIA</div>
                        <div className="col-span-1 text-right">SEÑA MP</div>
                    </div>

                    {/* Filas */}
                    <div className="divide-y divide-[#1e2026] font-mono text-xs">
                        {schedule.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSelectedSlot(index)}
                                className={`grid grid-cols-12 px-4 py-4 items-center cursor-pointer transition-colors ${
                                    selectedSlot === index ? 'bg-[#181a20]' : 'hover:bg-[#121418]'
                                }`}
                            >
                                <div className="col-span-2 text-white font-bold">
                                    {item.time}
                                </div>
                                <div className="col-span-3">
                                    <div className="text-white font-medium">{item.patient}</div>
                                    <div className="text-[10px] text-[#71717a]">{item.id} • {item.cover}</div>
                                </div>
                                <div className="col-span-4 text-[#a1a1aa] pr-4">
                                    {item.treatment}
                                </div>
                                <div className="col-span-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${item.statusColor}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="col-span-1 text-right text-emerald-400 font-bold">
                                    {item.prepayment}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Registro Técnico del Turno Seleccionado */}
                <div className="mt-4 p-4 rounded-lg bg-[#121418] border border-[#222328] font-mono text-xs text-[#a1a1aa] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span>AUDIT_LOG: Paciente validó recordatorio automático vía WhatsApp Cloud API hace 18hs.</span>
                    </div>
                    <div className="text-[11px] text-[#71717a]">
                        TRANSACCIÓN MERCADO PAGO #849102840 • DEPOSITADO EN CUENTA TITULAR
                    </div>
                </div>
            </section>

            {/* ── ARQUITECTURA TÉCNICA DE CONSULTORIO ── */}
            <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-xl border border-[#222328] bg-[#0e1013] space-y-3">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase">01 / HISTORIA CLÍNICA FDI</span>
                        <h3 className="text-lg font-bold text-white">Nomenclatura Dental de 2 Dígitos</h3>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">
                            Mapeo estandarizado de superficies: vestibular, oclusal, palatina/lingual, mesial y distal. Cada intervención queda registrada con código de procedimiento, arancel estipulado y fecha de ejecución médica.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-[#222328] bg-[#0e1013] space-y-3">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase">02 / SEGURIDAD Y AISLAMIENTO</span>
                        <h3 className="text-lg font-bold text-white">Multi-tenant Estricto a Nivel Base</h3>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">
                            Aislamiento criptográfico con Row Level Security (RLS). Los odontólogos colaboradores únicamente visualizan los pacientes asignados a su sillón, garantizando confidencialidad médica absoluta.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-[#222328] bg-[#0e1013] space-y-3">
                        <span className="text-[10px] font-mono text-[#71717a] uppercase">03 / FINANZAS QUIRÚRGICAS</span>
                        <h3 className="text-lg font-bold text-white">Liquidaciones Transparentes</h3>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">
                            Reportes en tiempo real del porcentaje de honorarios liquidado por profesional según tratamiento ejecutado. Descuento exacto de insumos de laboratorio e implantes sin discusiones contables.
                        </p>
                    </div>
                </div>
            </section>

        </div>
    )
}

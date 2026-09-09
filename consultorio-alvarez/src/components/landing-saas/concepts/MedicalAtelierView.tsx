'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Shield, Clock, HeartHandshake, PhoneCall } from 'lucide-react'

export function MedicalAtelierView({ onOpenDemo }: { onOpenDemo: () => void }) {
    return (
        <div className="w-full bg-[#fbfbfa] text-[#1a1a1a] font-sans antialiased selection:bg-[#1a1a1a] selection:text-white">
            
            {/* Header Editorial */}
            <header className="border-b border-[#e8e8e6] bg-[#fbfbfa]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white text-xs font-serif font-bold">
                            D
                        </div>
                        <div>
                            <span className="font-serif text-lg tracking-tight text-[#1a1a1a] font-bold block leading-none">
                                Dental—IA
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-[#737373] font-sans font-medium">
                                Atelier Clínico
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-xs tracking-wide text-[#525252] font-medium">
                        <a href="#filosofia" className="hover:text-[#1a1a1a] transition-colors">Filosofía</a>
                        <a href="#experiencia" className="hover:text-[#1a1a1a] transition-colors">La Experiencia del Paciente</a>
                        <a href="#practica" className="hover:text-[#1a1a1a] transition-colors">Gestión Silenciosa</a>
                        <a href="#aranceles" className="hover:text-[#1a1a1a] transition-colors">Membresías</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-xs font-medium text-[#525252] hover:text-[#1a1a1a] transition-colors"
                        >
                            Ingreso
                        </Link>
                        <button
                            onClick={onOpenDemo}
                            className="px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white text-xs font-medium tracking-wide hover:bg-[#333] transition-colors cursor-pointer"
                        >
                            Solicitar Encuentro
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO EDITORIAL: SERENIDAD Y CALMA EN LA PRÁCTICA DENTAL ── */}
            <section className="py-20 sm:py-32 px-6 sm:px-12 max-w-5xl mx-auto text-center">
                <div className="inline-block border-b border-[#1a1a1a] pb-1 mb-8 text-[11px] uppercase tracking-[0.2em] text-[#737373] font-medium">
                    Software de Atención Odontológica Humana
                </div>

                <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[#1a1a1a] leading-[1.1] max-w-4xl mx-auto">
                    El tiempo que pasás llenando planillas es tiempo que no pasás con tus pacientes.
                </h1>

                <p className="mt-8 text-base sm:text-xl text-[#525252] max-w-2xl mx-auto font-light leading-relaxed">
                    Dental-IA es la infraestructura invisible que cuida la agenda, los recordatorios y las finanzas de tu clínica, permitiéndote concentrarte en lo único irreemplazable: el acto médico.
                </p>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={onOpenDemo}
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white font-medium text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
                    >
                        Conocer la Plataforma
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <Link
                        href="/login"
                        className="w-full sm:w-auto px-8 py-4 rounded-full border border-[#d4d4d2] hover:border-[#1a1a1a] text-[#1a1a1a] font-medium text-xs tracking-wider uppercase transition-all"
                    >
                        Acceso para Profesionales
                    </Link>
                </div>
            </section>

            {/* ── EL CONTRASTE EDITORIAL: LA CALMA DEL CONSULTORIO ── */}
            <section className="py-20 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#e8e8e6]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#737373] block mb-3 font-medium">
                            UNA CONVERSACIÓN HONESTA
                        </span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] font-normal leading-tight">
                            Una sala de espera en calma habla de la calidad de tus manos.
                        </h2>
                        <p className="mt-6 text-sm text-[#525252] leading-relaxed font-light">
                            Las demoras de 40 minutos y los mensajes de WhatsApp que quedan sin responder a las 10 de la noche no son una consecuencia inevitable del trabajo; son el síntoma de un sistema obsoleto.
                        </p>
                        <p className="mt-4 text-sm text-[#525252] leading-relaxed font-light">
                            Diseñamos Dental-IA para que la confirmación de la cita, la recepción del pago de la seña y el recordatorio previo sucedan de forma armónica y respetuosa con el tiempo de cada persona.
                        </p>
                    </div>

                    {/* Ficha Tipo Dossier */}
                    <div className="bg-[#f2f2ee] p-8 sm:p-10 rounded-2xl border border-[#e4e4e0] space-y-6">
                        <div className="border-b border-[#d8d8d4] pb-4 flex items-center justify-between">
                            <span className="font-serif text-lg text-[#1a1a1a] font-medium">Dossier de Paciente</span>
                            <span className="text-[10px] tracking-widest uppercase text-[#737373]">HISTORIA CLÍNICA #104</span>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between py-1 border-b border-[#e4e4e0]">
                                <span className="text-[#737373]">Paciente:</span>
                                <span className="font-medium text-[#1a1a1a]">Mercedes Villalba (41 años)</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#e4e4e0]">
                                <span className="text-[#737373]">Tratamiento en curso:</span>
                                <span className="font-medium text-[#1a1a1a]">Rehabilitación Estética Cerámica</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#e4e4e0]">
                                <span className="text-[#737373]">Confirmación de Turno:</span>
                                <span className="font-medium text-[#1a1a1a]">WhatsApp Asistido (Confirmó 24hs antes)</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#e4e4e0]">
                                <span className="text-[#737373]">Seña abonada:</span>
                                <span className="font-medium text-[#1a1a1a]">$20.000 (Acreditado vía Mercado Pago)</span>
                            </div>
                        </div>

                        <div className="pt-2 text-[11px] text-[#737373] italic">
                            "Sin interrupciones durante el acto quirúrgico. La comunicación con el paciente fluye con naturalidad."
                        </div>
                    </div>
                </div>
            </section>

            {/* ── LOS TRES PILARES CLÍNICOS ── */}
            <section className="py-20 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#e8e8e6]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                    <div className="space-y-3">
                        <span className="font-serif text-2xl text-[#1a1a1a] block">01.</span>
                        <h3 className="font-serif text-xl text-[#1a1a1a]">El Odontograma Limpio</h3>
                        <p className="text-xs text-[#525252] leading-relaxed font-light">
                            Una representación anatómica vectorial de alta precisión. Sin gráficos infantiles: dibujo médico sobrio que podés mostrarle al paciente en pantalla con total claridad.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <span className="font-serif text-2xl text-[#1a1a1a] block">02.</span>
                        <h3 className="font-serif text-xl text-[#1a1a1a]">Atención Cálida por WhatsApp</h3>
                        <p className="text-xs text-[#525252] leading-relaxed font-light">
                            El asistente responde con tono educado y preciso. No simula ser un robot torpe ni satura al paciente: resuelve dudas puntuales y confirma su lugar en la agenda.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <span className="font-serif text-2xl text-[#1a1a1a] block">03.</span>
                        <h3 className="font-serif text-xl text-[#1a1a1a]">Claridad en los Honorarios</h3>
                        <p className="text-xs text-[#525252] leading-relaxed font-light">
                            Cada profesional de la clínica sabe con exactitud qué pacientes atendió y cuál es su liquidación mensual neta, preservando la armonía del equipo médico.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── INVITACIÓN FINAL ── */}
            <section className="py-24 px-6 sm:px-12 max-w-4xl mx-auto text-center border-t border-[#e8e8e6]">
                <h2 className="font-serif text-3xl sm:text-5xl text-[#1a1a1a] font-normal leading-tight">
                    Hacé de tu consultorio un espacio donde dé gusto trabajar.
                </h2>
                <p className="mt-6 text-sm text-[#525252] max-w-xl mx-auto font-light leading-relaxed">
                    Te invitamos a coordinar una conversación privada de 15 minutos para mostrarte cómo Dental-IA se adapta a los tiempos y la identidad de tu consultorio.
                </p>
                <div className="mt-8">
                    <button
                        onClick={onOpenDemo}
                        className="px-8 py-4 rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white font-medium text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                    >
                        Conversar con un Asesor Médico
                    </button>
                </div>
            </section>

        </div>
    )
}

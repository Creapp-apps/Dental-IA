'use client'

import { 
    Cpu, 
    Layers, 
    Scan, 
    Check, 
    ArrowRight, 
    CheckCircle2, 
    FileCode2, 
    Activity
} from 'lucide-react'
import { SplitText } from '@/components/ui/SplitText'

interface IntegracionesLideresSectionProps {
    onOpenWhatsApp?: (mensaje: string) => void
}

export function IntegracionesLideresSection({ onOpenWhatsApp }: IntegracionesLideresSectionProps) {
    const handleContact = (msg: string) => {
        if (onOpenWhatsApp) {
            onOpenWhatsApp(msg)
        } else {
            const url = `https://wa.me/5491130288564?text=${encodeURIComponent(msg)}`
            window.open(url, '_blank')
        }
    }

    return (
        <section id="integraciones" className="py-24 bg-white border-t border-slate-200/80 scroll-mt-24 sm:scroll-mt-28 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Cabecera de la Sección limpia sin badges */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <SplitText
                        text="Integración con softwares líderes en la industria"
                        tag="h2"
                        className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]"
                        delay={30}
                        duration={0.6}
                        ease="power3.out"
                        splitType="words"
                        from={{ opacity: 0, y: 30 }}
                        to={{ opacity: 1, y: 0 }}
                        threshold={0.1}
                        textAlign="center"
                    />

                    <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                        Dental-IA se conecta de forma nativa con los estándares mundiales de escaneo 3D intraoral, diseño CAD/CAM y diagnóstico radiológico. Tu clínica 100% sincronizada, sin pen drives ni pasos intermedios.
                    </p>
                </div>

                {/* ── CARD PRINCIPAL: MEDIT LINK ─────────────────────────────── */}
                <div className="mb-10 rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm p-6 sm:p-10 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        {/* Información MeditLink */}
                        <div className="lg:col-span-7 space-y-5 text-left">
                            <div className="flex items-center gap-3.5">
                                <div className="size-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 font-black text-xl shrink-0">
                                    M
                                </div>
                                <div>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                        Medit Link™
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                        Escáneres intraorales Medit i500, i700 y i900 • Mallas 3D en tiempo real
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                                Al escanear al paciente en el sillón con tu escáner <strong>Medit</strong>, los modelos 3D (<code className="text-blue-700 font-mono text-xs bg-blue-50 px-1 py-0.5 rounded">.STL</code>, <code className="text-blue-700 font-mono text-xs bg-blue-50 px-1 py-0.5 rounded">.PLY</code>, <code className="text-blue-700 font-mono text-xs bg-blue-50 px-1 py-0.5 rounded">.OBJ</code>) se vinculan de manera inmediata a la ficha clínica y al <strong>odontograma interactivo de Dental-IA</strong>.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                    <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                    <span><strong>Cero descargas manuales:</strong> el escaneo sube a la nube y aparece en el perfil del paciente.</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                    <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                    <span><strong>Visualización 3D en el sillón:</strong> rotá, inspeccioná oclusión y mostrale el plan al paciente.</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                    <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                    <span><strong>Historial evolutivo:</strong> comparativa temporal de desgastes, recesiones y alineación.</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                    <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                    <span><strong>Despacho a laboratorios:</strong> compartí el caso con el protésico con un solo clic.</span>
                                </div>
                            </div>

                            <div className="pt-3">
                                <button
                                    onClick={() => handleContact('¡Hola Dental-IA! 👋 Me gustaría conocer cómo funciona la integración con Medit Link en mi consultorio.')}
                                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-xs"
                                >
                                    <span>Conectar mi scanner Medit con Dental-IA</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mockup Visualizador Medit */}
                        <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-800 text-left">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 rounded-full bg-emerald-400" />
                                    <span className="text-slate-300 font-semibold font-mono text-[11px]">Medit Link • Sync Hub</span>
                                </div>
                                <span className="text-[11px] font-mono text-emerald-400">
                                    ● Conectado
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-400">Paciente en Sillón:</span>
                                        <span className="font-bold text-white">María Florencia Gómez</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Dispositivo:</span>
                                        <span className="text-blue-400 font-semibold font-mono">Medit i700 Wireless</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mallas 3D recibidas en tiempo real:</span>
                                    
                                    <div className="space-y-1.5 text-xs font-mono">
                                        <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                                            <div className="flex items-center gap-2 text-slate-200">
                                                <FileCode2 className="size-3.5 text-cyan-400" />
                                                <span>Arcada_Maxilar.ply</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-400 font-bold">✓ En Ficha</span>
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                                            <div className="flex items-center gap-2 text-slate-200">
                                                <FileCode2 className="size-3.5 text-cyan-400" />
                                                <span>Arcada_Mandibular.ply</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-400 font-bold">✓ En Ficha</span>
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                                            <div className="flex items-center gap-2 text-slate-200">
                                                <Layers className="size-3.5 text-indigo-400" />
                                                <span>Registro_Oclusion.stl</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-400 font-bold">✓ 3D Activo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Latencia de sincronización: <strong>&lt; 3 seg</strong></span>
                                    <span className="text-cyan-400 font-semibold">Odontograma 3D sincronizado</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── LAS OTRAS 2 INTEGRACIONES CLAVE (CAD/CAM Y DICOM) ─────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    
                    {/* Card 2: Exocad & 3Shape Unite */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            <div className="size-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mb-4">
                                <Layers className="size-6" />
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                Exocad & 3Shape Unite
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5 mb-3">
                                Flujo de Diseño Digital y Conexión con Laboratorios Protésicos
                            </p>

                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Conectá las prescripciones y órdenes de trabajo de tu consultorio directamente con laboratorios que operan con <strong>Exocad DentalCAD</strong> o <strong>3Shape</strong>. Seguimiento integral del estado de confección de coronas, carillas, prótesis y alineadores sin llamadas constantes.
                            </p>

                            <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-indigo-600 shrink-0 font-bold" />
                                    <span>Despacho de órdenes de trabajo digitalizadas en 1 clic.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-indigo-600 shrink-0 font-bold" />
                                    <span>Exportación de márgenes de preparación y mordida.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-indigo-600 shrink-0 font-bold" />
                                    <span>Trazabilidad del trabajo de laboratorio desde la historia clínica.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 block font-medium">
                                Estándar abierto universal para todo laboratorio dental.
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Visores DICOM 3D (Romexis, Carestream, Sidexis) */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            <div className="size-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 mb-4">
                                <Scan className="size-6" />
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                Tomografía CBCT & Rayos X
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5 mb-3">
                                Estándar DICOM 3.0 • Planmeca Romexis • Carestream • Sidexis
                            </p>

                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Integrá panorámicas digitales, series periapicales y estudios de tomografía computada Cone-Beam (CBCT). Visualizá radiografías directamente junto al odontograma digital del paciente en el sillón sin tener que abrir programas externos pesados.
                            </p>

                            <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-cyan-600 shrink-0 font-bold" />
                                    <span>Compatibilidad universal con archivos médicos DICOM.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-cyan-600 shrink-0 font-bold" />
                                    <span>Visor radiológico ligero accesible desde cualquier navegador.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="size-4 text-cyan-600 shrink-0 font-bold" />
                                    <span>Almacenamiento seguro en la nube organizado por paciente.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 block font-medium">
                                Compatible con radiovisiógrafos, ortopantomógrafos y tomógrafos.
                            </span>
                        </div>
                    </div>

                </div>

                {/* ── BANNER DE SOPORTE TÉCNICO Y COMPATIBILIDAD ────────────── */}
                <div className="mt-10 rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl text-left">
                    <div className="space-y-1">
                        <h4 className="font-extrabold text-base sm:text-lg text-white">
                            ¿Tenés un escáner intraoral o tomógrafo en tu clínica?
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Nuestro equipo de soporte técnico te asiste en la vinculación de tu equipamiento actual con Dental-IA sin costo extra.
                        </p>
                    </div>

                    <button
                        onClick={() => handleContact('¡Hola Dental-IA! 👋 Me gustaría consultar sobre la compatibilidad de mi escáner / equipo odontológico con la plataforma.')}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm whitespace-nowrap shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    >
                        <span>Consultar compatibilidad de mi equipo</span>
                        <ArrowRight className="size-4" />
                    </button>
                </div>

            </div>
        </section>
    )
}

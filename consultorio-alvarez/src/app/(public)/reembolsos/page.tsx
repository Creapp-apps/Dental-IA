import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { RefreshCw, CheckCircle2, Clock, Download } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Política de Cancelación y Reembolsos | Dental-IA',
    description: 'Condiciones de prueba gratuita, cancelación de suscripciones y política de reembolsos para consultorios odontológicos en Dental-IA.',
    robots: 'index, follow',
}

export default function ReembolsosPage() {
    return (
        <LegalLayout
            title="Política de Suscripción, Cancelación y Reembolsos"
            subtitle="Condiciones transparentes sobre pruebas gratuitas, renovación de planes, cancelación voluntaria y garantías de reembolso."
            lastUpdated="23 de Septiembre de 2026"
            currentPath="/reembolsos"
        >
            <div className="space-y-8">
                {/* Garantía Comercial */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0">
                        <RefreshCw className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-blue-950 m-0">
                            15 Días de Prueba Gratuita + Garantía de Satisfacción
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-900 mt-1 leading-relaxed">
                            Creemos en el impacto real de Dental-IA en tu consultorio. Ofrecemos 15 días completos de prueba sin cargo para que configures tu agenda, profesionales y asistentes de WhatsApp. Además, contás con 14 días de garantía de satisfacción en tu primer ciclo de suscripción paga.
                        </p>
                    </div>
                </div>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        1. Período de Prueba Gratuito (Free Trial)
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Toda nueva clínica u odontólogo tiene derecho a un período de prueba de <strong>15 días corridos</strong> con acceso completo a las funciones operativas de la plataforma. Durante este lapso, no se efectúa ningún cobro y el usuario puede solicitar asesoramiento o capacitación para la puesta en marcha de su equipo de trabajo.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        2. Facturación y Renovación de Planes
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Las suscripciones se abonan de manera anticipada por períodos mensuales o anuales, según la modalidad elegida:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mt-2">
                        <li><strong>Planes Mensuales:</strong> Se renuevan automáticamente cada 30 días calendario a partir de la fecha de activación de la suscripción paga.</li>
                        <li><strong>Planes Anuales:</strong> Se abonan en un único pago anual bonificado y se renuevan al cumplirse los 12 meses de servicio.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        3. Cancelación de la Suscripción
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        El Cliente puede cancelar su suscripción en <strong>cualquier momento y sin penalidades contractuales</strong> mediante:
                    </p>
                    <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-1 mt-2">
                        <li>El panel de configuración y suscripción dentro de Dental-IA.</li>
                        <li>Una solicitud por correo electrónico a <a href="mailto:soporte@dental-ia.com" className="font-semibold text-blue-600 hover:underline">soporte@dental-ia.com</a> desde la casilla registrada como administrador de la clínica.</li>
                    </ol>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Tras la cancelación, el consultorio mantendrá acceso operativo hasta el último día del período mensual o anual ya abonado. No se generarán renovaciones futuras.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        4. Condiciones de Reembolso
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Emitiremos el reembolso del 100% del importe cobrado en los siguientes casos:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2 mt-2">
                        <li>
                            <strong>Garantía de Satisfacción Inicial (Primeros 14 días):</strong> Si durante los primeros 14 días de tu primera suscripción paga Dental-IA no se adapta a las necesidades de tu clínica, te reintegramos el total abonado, sin preguntas complejas.
                        </li>
                        <li>
                            <strong>Errores de Facturación o Duplicación de Cobro:</strong> Si la pasarela de pagos realiza un cobro duplicado o erróneo, el reintegro se procesa de forma inmediata al detectarse o notificarse.
                        </li>
                        <li>
                            <strong>Interrupción Crítica Prolongada del Servicio:</strong> En caso de una indisponibilidad imputable a la plataforma superior al 5% mensual no programada, el cliente podrá solicitar una nota de crédito o reembolso proporcional.
                        </li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-3">
                        * No se otorgan reembolsos retroactivos o parciales por meses pasados ya transcurridos ni por desuso de la plataforma si la suscripción se mantuvo activa sin aviso previo de baja.
                    </p>
                </section>

                <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 m-0 pb-1">
                        <Download className="size-5 text-blue-600" />
                        5. Portabilidad y Descarga de Datos ante la Baja
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-2">
                        Los datos de los pacientes y los registros de la clínica son propiedad exclusiva del profesional. Antes o al momento de cancelar tu cuenta, Dental-IA garantiza los medios técnicos para que puedas exportar:
                    </p>
                    <ul className="text-xs sm:text-sm text-slate-600 space-y-1 list-disc pl-5 mt-2">
                        <li>Nómina completa de pacientes en formato CSV / Excel.</li>
                        <li>Historial cronológico de turnos y agendas.</li>
                        <li>Resumen de historias clínicas y cobros efectuados.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        6. Cómo Solicitar un Reembolso
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Para tramitar una solicitud de reembolso, envianos un correo a <a href="mailto:soporte@dental-ia.com" className="font-semibold text-blue-600 hover:underline">soporte@dental-ia.com</a> indicando el nombre de la clínica, email del titular y motivo de la solicitud. Nuestro equipo de administración procesará el reintegro en un plazo de 3 a 5 días hábiles a través del mismo método de pago original (MercadoPago o tarjeta).
                    </p>
                </section>
            </div>
        </LegalLayout>
    )
}

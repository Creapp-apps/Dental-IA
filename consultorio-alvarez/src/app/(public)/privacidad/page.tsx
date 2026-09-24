import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Política de Privacidad y Protección de Datos | Dental-IA',
    description: 'Conocé cómo protegemos los datos personales y la información de salud sensible en Dental-IA. Cumplimiento estricto con normativas de privacidad médica.',
    robots: 'index, follow',
}

export default function PrivacidadPage() {
    return (
        <LegalLayout
            title="Política de Privacidad y Protección de Datos"
            subtitle="Nuestro compromiso inquebrantable con la confidencialidad, el secreto médico y la seguridad de los datos de clínicas, odontólogos y pacientes."
            lastUpdated="23 de Septiembre de 2026"
            currentPath="/privacidad"
        >
            <div className="space-y-8">
                {/* Banner de Compromiso de Seguridad */}
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-5 flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0">
                        <Lock className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-blue-950 m-0">
                            Privacidad por Diseño en Salud (Privacy by Design)
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-900 mt-1 leading-relaxed">
                            Dental-IA opera bajo los estándares más exigentes de la industria médica. Los registros de salud de los pacientes pertenecen exclusivamente a ellos y a su clínica tratante. No vendemos, no comercializamos ni cedemos información médica a anunciantes o terceros bajo ninguna circunstancia.
                        </p>
                    </div>
                </div>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        1. Responsable del Tratamiento e Identificación
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Esta Política de Privacidad describe cómo <strong>Dental-IA</strong> (plataforma desarrollada y gestionada por CreAPP Argentina, en adelante «Dental-IA» o «nosotros») recopila, utiliza y protege la información en su ecosistema de aplicaciones web, portales de turnos y servicios asociados.
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 mt-2">
                        Para la gestión de los consultorios, Dental-IA actúa como <strong>Encargado del Tratamiento</strong> (Data Processor) respecto a las bases de datos de pacientes cargadas por cada clínica u odontólogo (quienes ostentan el carácter de <strong>Responsables del Tratamiento</strong> según la Ley 25.326 de Protección de Datos Personales).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        2. Información que Recopilamos
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Dependiendo de cómo interactúes con Dental-IA, recopilamos las siguientes categorías de datos:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                A. Profesionales y Clínicas
                            </h4>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                                <li>Nombre, apellido, matrícula profesional y especialidad.</li>
                                <li>Email corporativo y teléfono de contacto.</li>
                                <li>Datos de facturación fiscal y suscripción SaaS.</li>
                                <li>Credenciales de acceso encriptadas.</li>
                            </ul>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                B. Pacientes (Datos de Salud Sensibles)
                            </h4>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                                <li>Datos identificatorios: Nombre, DNI/CUIT, fecha de nacimiento.</li>
                                <li>Contacto: Teléfono WhatsApp y correo para recordatorios.</li>
                                <li>Cobertura de salud: Obra social o prepaga y N° afiliado.</li>
                                <li><strong>Datos clínicos:</strong> Odontograma digital, antecedentes, alergias, medicación habitual y procedimientos practicados.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
                    <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 m-0 pb-1">
                        <ShieldCheck className="size-5 text-emerald-600" />
                        3. Compromiso «Zero AI Training» (No Entrenamiento de IA con Datos Médicos)
                    </h2>
                    <p className="text-sm leading-relaxed text-emerald-900 mt-2">
                        En Dental-IA consideramos que los datos de salud son inviolables. Por contrato con nuestros proveedores de infraestructura y modelos de Inteligencia Artificial (OpenAI Enterprise, Google Cloud):
                    </p>
                    <ul className="text-xs sm:text-sm text-emerald-900 space-y-2 mt-2 list-none pl-0">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>No entrenamiento:</strong> Ninguna conversación de pacientes, ficha médica ni nota clínica es utilizada para re-entrenar, alimentar o calibrar modelos públicos de IA.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Zero Data Retention en APIs de IA:</strong> Las consultas enviadas a los motores de procesamiento son efímeras y no se almacenan en servidores de terceros para minería de datos.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Aislamiento Multi-Tenant:</strong> Cada clínica cuenta con aislamiento a nivel de base de datos mediante Row Level Security (RLS). Una clínica jamás puede acceder a registros de otra.</span>
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        4. Finalidad del Tratamiento de Datos
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Los datos personales y de salud son tratados exclusivamente para:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mt-2">
                        <li>Facilitar el agendamiento, modificación y cancelación de citas médicas y odontológicas.</li>
                        <li>Envío de confirmaciones, recordatorios de turnos e instrucciones prequirúrgicas por WhatsApp, SMS o correo electrónico.</li>
                        <li>Permitir al profesional el seguimiento evolutivo de la historia clínica y el odontograma del paciente.</li>
                        <li>Gestión administrativa interna, emisión de presupuestos y comprobantes de pago.</li>
                        <li>Mantenimiento técnico, seguridad, prevención de fraudes y soporte a usuarios.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        5. Medidas de Seguridad Técnicas y Organizativas
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Dental-IA aplica protocolos de ciberseguridad acordes a la sensibilidad de la información:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mt-2">
                        <li><strong>Cifrado en tránsito:</strong> Toda comunicación entre el usuario y la plataforma viaja cifrada mediante HTTPS / TLS 1.3.</li>
                        <li><strong>Cifrado en reposo:</strong> Los datos alojados en la base de datos se almacenan con cifrado AES-256.</li>
                        <li><strong>Control de acceso por roles (RBAC):</strong> Secretarias, odontólogos y administradores acceden únicamente a los módulos autorizados por su perfil.</li>
                        <li><strong>Copias de respaldo redundantes:</strong> Respaldos diarios automáticos con redundancia geográfica para recuperación ante desastres.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        6. Derechos de los Titulares (Derechos ARCO)
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Tanto los profesionales como los pacientes tienen derecho a acceder, rectificar, actualizar o solicitar la supresión de sus datos personales, conforme a la Ley N° 25.326 y estándares internacionales:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mt-2">
                        <li><strong>Pacientes:</strong> Pueden solicitar a su consultorio tratante el acceso a su historia clínica o la rectificación de sus datos de contacto. Si la consulta es dirigida a Dental-IA, la derivaremos de inmediato a la clínica responsable.</li>
                        <li><strong>Clínicas / Profesionales:</strong> Pueden solicitar en cualquier momento la exportación total de su base de datos o el borrado definitivo de su cuenta una vez concluida la suscripción.</li>
                    </ul>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Para ejercer cualquiera de estos derechos, podés escribir a nuestro Oficial de Privacidad a <a href="mailto:privacidad@dental-ia.com" className="font-semibold text-blue-600 hover:underline">privacidad@dental-ia.com</a> acompañando copia de tu documento de identidad para acreditar titularidad.
                    </p>
                </section>
            </div>
        </LegalLayout>
    )
}

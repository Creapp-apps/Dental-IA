import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
    title: 'Términos y Condiciones de Servicio | Dental-IA',
    description: 'Condiciones generales de contratación y uso de la plataforma SaaS Dental-IA para consultorios y profesionales odontológicos.',
    robots: 'index, follow',
}

export default function TerminosPage() {
    return (
        <LegalLayout
            title="Términos y Condiciones de Servicio"
            subtitle="Condiciones generales que regulan el acceso, suscripción y uso de la plataforma Dental-IA para consultorios, clínicas y profesionales odontológicos."
            lastUpdated="23 de Septiembre de 2026"
            currentPath="/terminos"
        >
            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        1. Aceptación de los Términos
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        El presente contrato regula la relación entre <strong>Dental-IA</strong> (propiedad y operación de CreAPP, en adelante «Dental-IA» o «la Plataforma») y la persona física o jurídica que contrate o utilice nuestros servicios de software en la nube (en adelante, «el Cliente» o «la Clínica»). Al crear una cuenta, iniciar un período de prueba o acceder a la plataforma, el Cliente declara haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        2. Descripción del Servicio y Modelo SaaS
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Dental-IA es una solución de Software como Servicio (SaaS) multi-tenant especializada en la administración y optimización de consultorios y clínicas odontológicas. Entre sus funcionalidades se incluyen:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5 mt-2">
                        <li>Gestión integral de agendas, turnos y profesionales.</li>
                        <li>Fichas clínicas de pacientes, antecedentes, alergias y odontograma digital.</li>
                        <li>Automatización de recordatorios y confirmación de citas mediante WhatsApp, correo electrónico y SMS.</li>
                        <li>Módulos de presupuestos, cobros, obras sociales y liquidaciones.</li>
                        <li>Herramientas de asistencia operativa potenciadas por Inteligencia Artificial (IA).</li>
                    </ul>
                </section>

                <section className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 my-6">
                    <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2 m-0 pb-1">
                        ⚠️ 3. Descargo de Responsabilidad Médica y de Inteligencia Artificial (AI Disclaimer)
                    </h2>
                    <p className="text-sm leading-relaxed text-amber-950 mt-2">
                        <strong>DENTAL-IA NO ES UN DISPOSITIVO MÉDICO NI PROPORCIONA DIAGNÓSTICOS CLÍNICOS VINCULANTES.</strong>
                    </p>
                    <p className="text-sm leading-relaxed text-amber-900 mt-2">
                        Las herramientas de Inteligencia Artificial, análisis de texto, transcripción o asistencia que incorpora la plataforma tienen fines <strong>exclusivamente administrativos, organizativos y de soporte documental</strong>. En ningún caso sustituyen el juicio clínico, examen presencial, diagnóstico ni tratamiento emitido por un odontólogo o profesional de la salud debidamente matriculado.
                    </p>
                    <p className="text-sm leading-relaxed text-amber-900 mt-2">
                        El profesional tratante mantiene la <strong>responsabilidad absoluta, exclusiva y final</strong> sobre cualquier decisión terapéutica, plan de tratamiento, prescripción farmacológica o procedimiento practicado sobre el paciente. Dental-IA declina expresamente toda responsabilidad por errores de diagnóstico, mala praxis médica o interpretaciones erróneas derivadas del uso de la plataforma.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        4. Tratamiento de Datos Personales y Roles Contractuales (DPA)
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        De conformidad con las leyes de protección de datos personales aplicables (incluida la Ley 25.326 de la República Argentina, RGPD y normativas internacionales de protección de datos de salud):
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2 mt-2">
                        <li>
                            <strong>La Clínica o Profesional es el «Responsable del Tratamiento» (Data Controller):</strong> Es quien recolecta la información médica de los pacientes y cuenta con la base legal o consentimiento informado para su custodia.
                        </li>
                        <li>
                            <strong>Dental-IA es el «Encargado del Tratamiento» (Data Processor):</strong> Procesa y almacena los datos únicamente por instrucción y cuenta del Cliente para la provisión del servicio SaaS, garantizando que no comercializa ni explota los datos de los pacientes para fines propios.
                        </li>
                        <li>
                            <strong>Garantía de Cero Entrenamiento (Zero AI Training):</strong> Dental-IA garantiza formalmente que las historias clínicas, fichas de pacientes, notas odontológicas y mensajes de turnos <strong>jamás son utilizados para entrenar modelos fundacionales públicos de Inteligencia Artificial</strong> de terceros (OpenAI, Google u otros).
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        5. Disponibilidad del Servicio (SLA) y Copias de Seguridad
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Dental-IA implementa infraestructura en la nube de alta resiliencia y monitoreo continuo, con un compromiso de disponibilidad objetivo del <strong>99.5% de tiempo operativo (Uptime)</strong>, excluyendo ventanas de mantenimiento preventivo notificadas previamente o interrupciones atribuibles a proveedores troncales de telecomunicaciones y servicios de terceros (ej. red de WhatsApp de Meta).
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 mt-2">
                        Se ejecutan respaldos automatizados diarios de las bases de datos. No obstante, se recomienda al Cliente mantener copias locales y exportaciones periódicas de sus registros contables y nómina de pacientes.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        6. Suscripción, Pagos y Facturación
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        El acceso al servicio se comercializa bajo suscripción recurrente (mensual o anual) según el plan contratado. Todo nuevo cliente puede acceder a un período de prueba gratuito de 15 días sin compromiso. La falta de pago tras sucesivos avisos facultará a Dental-IA a suspender temporalmente el acceso hasta regularizar la situación, garantizando en todo momento el derecho del Cliente a solicitar la descarga de sus registros clínicos.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        7. Propiedad Intelectual
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        El software, código fuente, diseños visuales, algoritmos, logotipos, marcas comerciales y documentación asociada a Dental-IA son propiedad exclusiva de CreAPP y están protegidos por las leyes de propiedad intelectual e industrial. La suscripción otorga una licencia de uso no exclusiva, revocable e intransferible para la gestión del consultorio contratante.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        8. Legislación Aplicable y Jurisdicción
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Los presentes Términos se rigen por las leyes de la República Argentina. Cualquier controversia, disputa o reclamación que surja en relación con la validez, interpretación o cumplimiento de este acuerdo será sometida a la jurisdicción de los Tribunales Ordinarios en lo Comercial de la Ciudad Autónoma de Buenos Aires, con renuncia a cualquier otro fuero que pudiera corresponder.
                    </p>
                </section>
            </div>
        </LegalLayout>
    )
}

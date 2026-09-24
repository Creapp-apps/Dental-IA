import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { CheckCircle2, Shield } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Política de Cookies | Dental-IA',
    description: 'Conocé qué cookies y tecnologías de almacenamiento utiliza Dental-IA. Plataforma médica basada en la privacidad y sin rastreadores publicitarios invasivos.',
    robots: 'index, follow',
}

export default function CookiesPage() {
    return (
        <LegalLayout
            title="Política de Cookies y Almacenamiento Local"
            subtitle="Transparencia total sobre las tecnologías que utilizamos para el funcionamiento técnico y la seguridad de la plataforma."
            lastUpdated="23 de Septiembre de 2026"
            currentPath="/cookies"
        >
            <div className="space-y-8">
                {/* Resumen de Privacidad */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex items-start gap-3.5">
                    <Shield className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-emerald-950 m-0">
                            Enfoque Libre de Rastreo Publicitario (Cookieless Privacy)
                        </h3>
                        <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
                            Dental-IA <strong>no utiliza píxeles de seguimiento publicitario (como Meta Pixel o Google Ads)</strong> ni vende historiales de navegación a redes publicitarias. Únicamente empleamos cookies y almacenamiento técnico estrictamente indispensable para que puedas iniciar sesión, operar la agenda y mantener segura la aplicación.
                        </p>
                    </div>
                </div>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        1. ¿Qué son las Cookies y el Almacenamiento Local?
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Una cookie es un pequeño archivo de texto que un sitio web guarda en tu navegador al visitarlo. El almacenamiento local (LocalStorage y SessionStorage) permite a las aplicaciones modernas conservar configuraciones técnicas de forma segura directamente en tu dispositivo sin necesidad de transmitir información a servidores en cada interacción.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        2. ¿Qué Cookies y Almacenamiento usamos en Dental-IA?
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Clasificamos nuestros elementos de almacenamiento en dos categorías transparentes:
                    </p>

                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Nombre / Origen</th>
                                    <th className="py-3 px-4">Tipo</th>
                                    <th className="py-3 px-4">Duración</th>
                                    <th className="py-3 px-4">Finalidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                <tr className="bg-white">
                                    <td className="py-3 px-4 font-mono font-medium text-slate-900">sb-*-auth-token</td>
                                    <td className="py-3 px-4">Técnica (Esencial)</td>
                                    <td className="py-3 px-4">Sesión activa</td>
                                    <td className="py-3 px-4">Token seguro de autenticación cifrada en Supabase para mantener la sesión de odontólogos y secretarias abierta.</td>
                                </tr>
                                <tr className="bg-slate-50/40">
                                    <td className="py-3 px-4 font-mono font-medium text-slate-900">theme-preference</td>
                                    <td className="py-3 px-4">Preferencia UI</td>
                                    <td className="py-3 px-4">1 año</td>
                                    <td className="py-3 px-4">Recuerda si seleccionaste tema claro o tema oscuro para proteger tu visión en la clínica.</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="py-3 px-4 font-mono font-medium text-slate-900">agenda-view-mode</td>
                                    <td className="py-3 px-4">Funcional</td>
                                    <td className="py-3 px-4">Persistente</td>
                                    <td className="py-3 px-4">Conserva la última vista de calendario seleccionada (diaria, semanal, mensual o por profesional).</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        3. Ausencia de Cookies de Publicidad Comportamental
                    </h2>
                    <div className="space-y-2 mt-3 text-sm text-slate-600 leading-relaxed">
                        <p>
                            Al no emplear cookies de marketing ni perfiles de comportamiento para publicidad de terceros:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-600">
                            <li>No rastreamos tu actividad fuera de los dominios de Dental-IA.</li>
                            <li>Tus búsquedas o consultas de pacientes jamás son compartidas con intermediarios publicitarios.</li>
                            <li>Nuestras métricas de rendimiento web son agregadas, anónimas y no identifican al paciente ni al profesional.</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                        4. Cómo Controlar o Desactivar Cookies
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600 mt-3">
                        Podés configurar tu navegador web para que bloquee o te alerte sobre la instalación de cookies. Tené en cuenta que al tratarse exclusivamente de cookies técnicas esenciales para la autenticación en Dental-IA, bloquearlas por completo impedirá el inicio de sesión y la visualización de la agenda médica.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        Para más información sobre la gestión de cookies en tu navegador habitual, consultá las guías oficiales de Google Chrome, Mozilla Firefox, Apple Safari o Microsoft Edge.
                    </p>
                </section>
            </div>
        </LegalLayout>
    )
}

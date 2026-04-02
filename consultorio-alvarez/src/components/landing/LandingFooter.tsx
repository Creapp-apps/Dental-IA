import { MapPin, Phone, Mail, Stethoscope } from 'lucide-react'
import type { Tenant } from '@/types'

interface Props { tenant: Tenant }

export function LandingFooter({ tenant }: Props) {
    const year = new Date().getFullYear()

    return (
        <footer id="contacto" className="bg-gray-950 text-white">
            {/* Top divider with gradient */}
            <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, transparent, ${tenant.color_primario}, transparent)` }}
            />

            <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

                    {/* Brand column */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-5">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl"
                                style={{ backgroundColor: tenant.color_primario }}
                            >
                                <Stethoscope className="h-5 w-5 text-white" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="font-extrabold text-white text-base">{tenant.nombre}</p>
                                {tenant.ciudad && (
                                    <p className="text-xs text-gray-500">{tenant.ciudad}</p>
                                )}
                            </div>
                        </div>
                        {tenant.descripcion && (
                            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-6">
                                {tenant.descripcion}
                            </p>
                        )}
                        {/* Contact links */}
                        <div className="flex flex-col gap-3">
                            {tenant.direccion && (
                                <div className="flex items-start gap-2.5 text-sm text-gray-400">
                                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-600" />
                                    <span>{tenant.direccion}{tenant.ciudad ? `, ${tenant.ciudad}` : ''}</span>
                                </div>
                            )}
                            {tenant.telefono && (
                                <a href={`tel:${tenant.telefono}`} className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                                    <Phone className="h-4 w-4 text-gray-600 shrink-0" />
                                    {tenant.telefono}
                                </a>
                            )}
                            {tenant.email_contacto && (
                                <a href={`mailto:${tenant.email_contacto}`} className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                                    <Mail className="h-4 w-4 text-gray-600 shrink-0" />
                                    {tenant.email_contacto}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Nav column */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Navegación</p>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: 'Servicios', href: '#servicios' },
                                { label: 'Profesionales', href: '#profesionales' },
                                { label: 'Horarios', href: '#horarios' },
                                { label: 'Obras Sociales', href: '#obras-sociales' },
                            ].map(link => (
                                <a key={link.href} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* CTA column */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Turnos</p>
                        {tenant.turnos_online_activos && (
                            <a
                                href={`/c/${tenant.slug}/reservar`}
                                className="inline-block rounded-2xl px-5 py-3 text-sm font-semibold text-white text-center transition-all hover:opacity-90 hover:-translate-y-0.5 mb-4"
                                style={{ background: `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})` }}
                            >
                                Reservar online →
                            </a>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed">
                            También podés llamarnos o escribirnos por WhatsApp.
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-14 pt-6 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-gray-600">
                        © {year} {tenant.nombre}. Todos los derechos reservados.
                    </p>
                    <p className="text-xs text-gray-700">
                        Powered by{' '}
                        <span className="font-semibold" style={{ color: tenant.color_primario }}>
                            ConsultorioPro
                        </span>
                    </p>
                </div>
            </div>
        </footer>
    )
}

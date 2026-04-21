import { CLINIC } from '@/lib/landing-constants'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import type { LandingConfig } from '@/lib/types/landing'
import { TenantLogo } from '@/components/ui/tenant-logo'

export function FooterSection({ config }: { config?: Partial<LandingConfig> }) {
    const address = config?.footer_address ?? `${CLINIC.address}, ${CLINIC.city}`
    const phone = config?.footer_phone ?? CLINIC.phone
    const email = config?.footer_email ?? CLINIC.email
    const hours = config?.footer_hours ?? CLINIC.hours

    return (
        <footer className="relative z-10 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-6 sm:px-10 py-14">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Brand */}
                    <div>
                        <div className="mb-3">
                            <TenantLogo
                                config={(config as any)?.logo_config}
                                colorPrimary={config?.color_primary}
                                fallbackName={CLINIC.name}
                            />
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                            Atención odontológica de alta gama con tecnología de vanguardia.
                        </p>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-400 mb-4">Contacto</h4>
                        <div className="space-y-3">
                            {phone.split(/\||,/).map((p, idx) => {
                                const trimmed = p.trim()
                                if (!trimmed) return null
                                return (
                                    <a key={idx} href={`tel:${trimmed.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-sm text-gray-600 transition-colors" style={{ '--tw-text-opacity': 1, ':hover': { color: 'var(--landing-primary, #0d9488)' } } as any}>
                                        <Phone className="h-3.5 w-3.5" />
                                        {trimmed}
                                    </a>
                                )
                            })}
                            <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-gray-600 transition-colors" style={{ '--tw-text-opacity': 1, ':hover': { color: 'var(--landing-primary, #0d9488)' } } as any}>
                                <Mail className="h-3.5 w-3.5" />
                                {email}
                            </a>
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {address}
                            </span>
                        </div>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-400 mb-4">Horarios</h4>
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {hours}
                        </span>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} {((config as any)?.logo_config?.type === 'text' && (config as any)?.logo_config?.text) ? (config as any).logo_config.text : CLINIC.name}. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    )
}

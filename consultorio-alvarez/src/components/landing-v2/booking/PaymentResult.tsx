import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

type Status = 'approved' | 'pending' | 'failure'

// Normaliza el status que llega de Mercado Pago a nuestros 3 casos.
export function normalizePaymentStatus(raw?: string | null): Status {
    if (raw === 'approved') return 'approved'
    if (raw === 'pending' || raw === 'in_process') return 'pending'
    return 'failure'
}

const COPY: Record<Status, { titulo: string; detalle: string }> = {
    approved: {
        titulo: '¡Listo! Tu turno quedó confirmado',
        detalle: 'Recibimos tu seña y reservamos tu turno. Te enviamos los detalles por WhatsApp.',
    },
    pending: {
        titulo: 'Estamos procesando tu pago',
        detalle: 'Apenas se acredite, confirmamos tu turno y te avisamos por WhatsApp. Puede tardar unos minutos.',
    },
    failure: {
        titulo: 'No pudimos procesar el pago',
        detalle: 'El pago no se completó, así que tu turno todavía no está confirmado. Probá reservar de nuevo.',
    },
}

/**
 * Pantalla de resultado del pago de la seña. Se muestra cuando el paciente
 * vuelve del checkout de Mercado Pago (?status=...). Es presentacional.
 */
export function PaymentResult({ status, slug }: { status: Status; slug: string }) {
    const copy = COPY[status]
    const inicioHref = `/${slug}`
    const reservarHref = `/reservar?slug=${encodeURIComponent(slug)}`

    const Icon = status === 'approved' ? CheckCircle2 : status === 'pending' ? Clock : XCircle
    const iconColor =
        status === 'approved' ? '#16a34a' : status === 'pending' ? '#d97706' : '#dc2626'

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 text-center">
                <div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${iconColor}1a` }}
                >
                    <Icon className="h-9 w-9" style={{ color: iconColor }} />
                </div>

                <h1 className="text-2xl font-bold text-white">{copy.titulo}</h1>
                <p className="mt-3 text-sm leading-relaxed text-white/80">{copy.detalle}</p>

                <div className="mt-8 flex flex-col gap-3">
                    {status === 'failure' ? (
                        <>
                            <Link
                                href={reservarHref}
                                className="w-full rounded-xl py-3 px-4 font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                                style={{ backgroundColor: 'var(--primary)' }}
                            >
                                Reservar de nuevo
                            </Link>
                            <Link
                                href={inicioHref}
                                className="w-full rounded-xl py-3 px-4 font-medium text-white/80 border border-white/20 transition-all hover:bg-white/10"
                            >
                                Volver al inicio
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={inicioHref}
                            className="w-full rounded-xl py-3 px-4 font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: 'var(--primary)' }}
                        >
                            Volver al inicio
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

import { MOCK_TENANT, MOCK_PROFESIONALES, MOCK_TRATAMIENTOS } from '@/lib/mock/tenant'
import { notFound } from 'next/navigation'
import { ReservarForm } from '@/components/landing/ReservarForm'
import Link from 'next/link'
import { ArrowLeft, Stethoscope } from 'lucide-react'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function ReservarPage({ params }: Props) {
    const { slug } = await params

    if (slug !== MOCK_TENANT.slug) notFound()

    const tenant = MOCK_TENANT
    const profesionales = MOCK_PROFESIONALES.filter(p => p.activo)
    const tratamientos = MOCK_TRATAMIENTOS.filter(t => t.activo)

    if (!tenant.turnos_online_activos) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-500">Los turnos online no están disponibles en este momento.</p>
                    <Link href={`/c/${slug}`} className="mt-4 inline-block text-sm underline text-blue-600">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header
                className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: tenant.color_primario }}
                        >
                            <Stethoscope className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{tenant.nombre}</span>
                    </div>
                    <Link
                        href={`/c/${slug}`}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                </div>
            </header>

            {/* Contenido principal */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Reservar un turno</h1>
                    <p className="mt-2 text-gray-500 text-sm">
                        Completá los datos a continuación y nos comunicaremos para confirmar tu turno.
                    </p>
                </div>

                <ReservarForm
                    tenant={tenant}
                    profesionales={profesionales}
                    tratamientos={tratamientos}
                />
            </div>
        </div>
    )
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    if (slug !== MOCK_TENANT.slug) return {}
    return {
        title: `Reservar turno — ${MOCK_TENANT.nombre}`,
        description: `Solicitá tu turno online en ${MOCK_TENANT.nombre}`,
    }
}

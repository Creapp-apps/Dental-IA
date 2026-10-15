'use client'

import { fechaVencimiento, estadoEfectivo } from '@/lib/presupuestos/vigencia'

interface Props {
    presupuesto: any
    paciente: any
    tenant: any
}

const ESTADO_LABEL: Record<string, string> = {
    BORRADOR: 'Borrador',
    PRESENTADO: 'Presentado',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
    VENCIDO: 'Vencido',
}

/**
 * Vista imprimible de un presupuesto. El botón dispara window.print(); el CSS de
 * impresión oculta todo menos el documento, así "Guardar como PDF" sale limpio.
 */
export function PresupuestoImprimible({ presupuesto: p, paciente, tenant }: Props) {
    const venc = fechaVencimiento(p.fecha_presentacion, p.vigencia_dias)
    const estado = estadoEfectivo(p)
    const items: any[] = p.items ?? []

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #presupuesto-print, #presupuesto-print * { visibility: visible !important; }
                    #presupuesto-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 24px; box-shadow: none; }
                    .no-print { display: none !important; }
                    @page { margin: 16mm; }
                }
            `}</style>

            <div className="no-print mx-auto max-w-2xl px-4 pt-4 flex justify-end">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            <div id="presupuesto-print" className="mx-auto max-w-2xl bg-white text-black p-8 my-4 shadow-sm rounded-lg">
                {/* Encabezado */}
                <div className="flex items-start justify-between border-b border-gray-300 pb-4 mb-4">
                    <div>
                        <h1 className="text-xl font-bold">{tenant?.nombre ?? 'Consultorio'}</h1>
                        {tenant?.direccion && (
                            <p className="text-sm text-gray-600">{tenant.direccion}{tenant.ciudad ? `, ${tenant.ciudad}` : ''}</p>
                        )}
                        {tenant?.telefono && <p className="text-sm text-gray-600">Tel: {tenant.telefono}</p>}
                        {tenant?.email_contacto && <p className="text-sm text-gray-600">{tenant.email_contacto}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Presupuesto</p>
                        <p className="text-sm text-gray-600">Fecha: {p.fecha_presentacion ?? '—'}</p>
                        {venc && <p className="text-sm text-gray-600">Válido hasta: {venc}</p>}
                        <p className="text-sm text-gray-600">Estado: {ESTADO_LABEL[estado] ?? estado}</p>
                    </div>
                </div>

                {/* Paciente */}
                <div className="mb-4 text-sm space-y-0.5">
                    <p><span className="font-semibold">Paciente:</span> {paciente?.nombre} {paciente?.apellido}</p>
                    {paciente?.nro_historia_clinica && (
                        <p><span className="font-semibold">H.C.:</span> {paciente.nro_historia_clinica}</p>
                    )}
                    {p.profesional && (
                        <p><span className="font-semibold">Profesional:</span> Dr. {p.profesional.nombre} {p.profesional.apellido}</p>
                    )}
                </div>

                {/* Ítems */}
                <table className="w-full text-sm border-collapse mb-4">
                    <thead>
                        <tr className="border-b-2 border-gray-300 text-left">
                            <th className="py-1.5">Tratamiento</th>
                            <th className="py-1.5">Pieza</th>
                            <th className="py-1.5 text-center">Cant.</th>
                            <th className="py-1.5 text-right">P. unit.</th>
                            <th className="py-1.5 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it: any) => (
                            <tr key={it.id} className="border-b border-gray-200">
                                <td className="py-1.5">{it.tipo_tratamiento?.nombre ?? it.descripcion ?? '—'}</td>
                                <td className="py-1.5">{it.pieza_dental ?? '—'}</td>
                                <td className="py-1.5 text-center">{it.cantidad}</td>
                                <td className="py-1.5 text-right tabular-nums">${Number(it.precio_unitario).toLocaleString('es-AR')}</td>
                                <td className="py-1.5 text-right tabular-nums">${Number(it.subtotal).toLocaleString('es-AR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Total */}
                <div className="flex justify-end border-t-2 border-gray-300 pt-2 mb-4">
                    <p className="text-base font-bold">Total: ${Number(p.monto_total).toLocaleString('es-AR')}</p>
                </div>

                {/* Notas */}
                {p.notas && (
                    <div className="text-sm text-gray-700 mb-4">
                        <p className="font-semibold">Notas:</p>
                        <p className="whitespace-pre-wrap">{p.notas}</p>
                    </div>
                )}

                <p className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                    Presupuesto válido por {p.vigencia_dias ?? 7} días desde su emisión. Los precios pueden variar una vez vencido.
                </p>
            </div>
        </>
    )
}

import { getCobros } from '@/lib/actions/finanzas'
import { CobrosView } from '@/components/cobros/CobrosView'

export default async function CobrosPage({
    searchParams,
}: {
    searchParams?: Promise<{ filtro?: string }>
}) {
    const params = await searchParams
    const filtro = (params?.filtro as any) ?? 'todos'
    const cobros = await getCobros(filtro)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Cobros</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Gestión de pagos y cuentas corrientes
                </p>
            </div>
            <CobrosView cobros={cobros} filtroActual={filtro} />
        </div>
    )
}

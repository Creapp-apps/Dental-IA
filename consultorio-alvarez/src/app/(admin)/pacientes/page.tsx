import { getPacientes } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
    const resolvedParams = await searchParams
    const query = resolvedParams?.q?.toLowerCase() ?? ''
    const allPacientes = await getPacientes()

    const pacientes = query
        ? allPacientes.filter(
            (p: any) =>
                p.nombre.toLowerCase().includes(query) ||
                p.apellido.toLowerCase().includes(query) ||
                (p.dni ?? '').includes(query) ||
                p.nro_historia_clinica.toLowerCase().includes(query)
        )
        : allPacientes

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} {query ? 'encontrados' : 'registrados'}
                </p>
            </div>
            <PacientesListView pacientes={pacientes} initialQuery={query} />
        </div>
    )
}

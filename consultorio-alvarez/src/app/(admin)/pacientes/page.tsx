import { getPacientes, searchPacientes, getTotalPacientesCount, origenPacientes } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
    // El profesional también accede al listado, pero acotado a sus pacientes y
    // sin datos de contacto; las queries ya aplican ese alcance por rol (§9).
    const { esProfesional } = await origenPacientes()

    const resolvedParams = await searchParams
    const query = resolvedParams?.q?.trim() ?? ''

    const [initialPacientes, totalCount] = await Promise.all([
        query.length >= 2 ? searchPacientes(query, 50) : getPacientes(50, 0),
        getTotalPacientesCount()
    ])

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PacientesListView
                pacientes={initialPacientes}
                initialQuery={query}
                totalCount={totalCount}
                esProfesional={esProfesional}
            />
        </div>
    )
}

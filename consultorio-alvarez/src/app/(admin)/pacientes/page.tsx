import { getPacientes, searchPacientes, getTotalPacientesCount } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
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
            />
        </div>
    )
}

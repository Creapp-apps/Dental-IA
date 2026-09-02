import { getPacientes, searchPacientes } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
    const resolvedParams = await searchParams
    const query = resolvedParams?.q ?? ''
    const initialPacientes = query.trim()
        ? await searchPacientes(query.trim(), 50)
        : await getPacientes(50, 0)

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PacientesListView pacientes={initialPacientes} initialQuery={query} />
        </div>
    )
}

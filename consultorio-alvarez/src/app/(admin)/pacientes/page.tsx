import { getPacientes } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
    const resolvedParams = await searchParams
    const query = resolvedParams?.q ?? ''
    const allPacientes = await getPacientes()

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PacientesListView pacientes={allPacientes} initialQuery={query} />
        </div>
    )
}

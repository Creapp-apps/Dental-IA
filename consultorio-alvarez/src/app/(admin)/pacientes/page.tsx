import { redirect } from 'next/navigation'
import { getPacientes, searchPacientes, getTotalPacientesCount, getCurrentUsuario } from '@/lib/supabase/queries'
import { PacientesListView } from '@/components/pacientes/PacientesListView'

export default async function PacientesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string }>
}) {
    // El listado completo de pacientes es de admin (§9). El profesional entra a
    // la ficha desde su agenda.
    const usuario = await getCurrentUsuario()
    if (usuario?.rol === 'profesional') {
        redirect('/agenda')
    }

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

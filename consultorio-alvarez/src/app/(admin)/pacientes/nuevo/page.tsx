import { getObrasSociales } from '@/lib/supabase/queries'
import { FormPacienteReal } from '@/components/pacientes/FormPacienteReal'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NuevoPacientePage() {
    const obrasSociales = await getObrasSociales()

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <Link href="/pacientes" className="inline-flex h-9 w-9 items-center justify-center rounded-xl glass hover:shadow-glass transition-all">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold text-foreground">Nuevo paciente</h1>
            </div>
            <FormPacienteReal obrasSociales={obrasSociales} />
        </div>
    )
}

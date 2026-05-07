import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getObrasSociales } from '@/lib/supabase/queries'
import { FormPacienteReal } from '@/components/pacientes/FormPacienteReal'

export default async function EditarPacientePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const [pacienteRes, obrasSociales] = await Promise.all([
        supabase.from('pacientes').select('*').eq('id', id).single(),
        getObrasSociales()
    ])

    if (!pacienteRes.data) {
        notFound()
    }

    const paciente = pacienteRes.data

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <Link href={`/pacientes/${id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl glass hover:shadow-glass transition-all">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold text-foreground">Editar paciente</h1>
            </div>
            <FormPacienteReal obrasSociales={obrasSociales} paciente={paciente} />
        </div>
    )
}

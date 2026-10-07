import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getProfesionales, getTiposTratamiento } from '@/lib/supabase/queries'
import { getEscaneosPacienteAction } from '@/lib/actions/escaneos-3d'
import { ArrowLeft } from 'lucide-react'
import { EditarPacienteBtn } from '@/components/pacientes/EditarPacienteBtn'
import { FichaPacienteTabs } from '@/components/pacientes/FichaPacienteTabs'
import { PacientePerfilOptimistic } from '@/components/pacientes/PacientePerfilOptimistic'

async function getPacienteCompleto(id: string) {
    const supabase = await createClient()

    const [pacienteRes, turnosRes, historialRes, odontogramaRes, presupuestosRes, adjuntosRes, escaneosRes] = await Promise.all([
        supabase.from('pacientes').select('*, obra_social:obras_sociales(*)').eq('id', id).single(),
        supabase.from('turnos').select(`
            *, profesional:profesionales(nombre, apellido),
            tipo_tratamiento:tipos_tratamiento(nombre, color)
        `).eq('paciente_id', id).order('fecha_inicio', { ascending: false }).limit(20),
        supabase.from('historial_clinico').select(`
            *, profesional:profesionales(nombre, apellido)
        `).eq('paciente_id', id).order('fecha', { ascending: false }),
        supabase.from('odontograma_piezas').select('*').eq('paciente_id', id),
        supabase.from('presupuestos').select(`
            *, profesional:profesionales(nombre, apellido),
            items:presupuesto_items(*, tipo_tratamiento:tipos_tratamiento(nombre))
        `).eq('paciente_id', id).order('created_at', { ascending: false }),
        supabase.from('paciente_adjuntos').select('*').eq('paciente_id', id).order('created_at', { ascending: false }),
        getEscaneosPacienteAction(id),
    ])

    return {
        paciente: pacienteRes.data,
        turnos: turnosRes.data ?? [],
        historial: historialRes.data ?? [],
        odontograma: odontogramaRes.data ?? [],
        presupuestos: presupuestosRes.data ?? [],
        adjuntos: adjuntosRes.data ?? [],
        escaneos3d: escaneosRes.escaneos ?? [],
    }
}

export default async function FichaPacientePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { paciente: p, turnos, historial, odontograma, presupuestos, adjuntos, escaneos3d } = await getPacienteCompleto(id)
    if (!p) notFound()

    // Cargar catálogos filtrados estrictamente por el tenant_id del consultorio
    const [profesionales, tiposTratamiento] = await Promise.all([
        getProfesionales(true),
        getTiposTratamiento(true)
    ])

    const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`
    const edad = p.fecha_nacimiento
        ? Math.floor((Date.now() - new Date(p.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link href="/pacientes" className="inline-flex h-9 w-9 items-center justify-center rounded-xl glass hover:shadow-glass transition-all">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                            Historia Clínica — N° {p.nro_historia_clinica}
                        </h1>
                    </div>
                </div>

                <EditarPacienteBtn pacienteId={p.id} label="Editar Paciente" size="sm" />
            </div>

            {/* Layout: Profile sidebar + Tabbed content */}
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* ── Left: Profile card con soporte reactivo Local-First / Optimistic ── */}
                <PacientePerfilOptimistic initialPaciente={p} />

                {/* ── Right: Tabbed content ── */}
                <FichaPacienteTabs
                    pacienteId={p.id}
                    turnos={turnos}
                    historial={historial}
                    odontograma={odontograma}
                    presupuestos={presupuestos}
                    adjuntos={adjuntos}
                    escaneos3d={escaneos3d}
                    motivoConsulta={p.motivo_consulta}
                    profesionales={profesionales}
                    tiposTratamiento={tiposTratamiento}
                />
            </div>
        </div>
    )
}

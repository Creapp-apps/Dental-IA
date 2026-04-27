import { startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { getProfesionales, getTiposTratamiento, getTurnosSemana, getPacientes } from '@/lib/supabase/queries'
import { AgendaView } from '@/components/agenda/AgendaView'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AgendaPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    let focusDate = new Date()

    // Auto-Target Notification
    const urlTurnoId = searchParams?.turno as string | undefined
    if (urlTurnoId) {
        const supabase = createAdminClient()
        const { data: turno } = await supabase
            .from('turnos')
            .select('fecha_inicio')
            .eq('id', urlTurnoId)
            .single()

        if (turno?.fecha_inicio) {
            focusDate = parseISO(turno.fecha_inicio)
        }
    }

    const inicio = startOfWeek(focusDate, { weekStartsOn: 1 })
    const fin = endOfWeek(focusDate, { weekStartsOn: 1 })

    const [profesionales, tiposTratamiento, turnos, pacientes] = await Promise.all([
        getProfesionales(),
        getTiposTratamiento(),
        getTurnosSemana(inicio, fin),
        getPacientes(),
    ])

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Vista semanal — todos los profesionales</p>
            </div>
            <AgendaView
                profesionales={profesionales}
                tiposTratamiento={tiposTratamiento}
                turnosIniciales={turnos}
                pacientes={pacientes}
            />
        </div>
    )
}

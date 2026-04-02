import { startOfWeek, endOfWeek } from 'date-fns'
import { getProfesionales, getTiposTratamiento, getTurnosSemana, getPacientes } from '@/lib/supabase/queries'
import { AgendaView } from '@/components/agenda/AgendaView'

export default async function AgendaPage() {
    const hoy = new Date()
    const inicio = startOfWeek(hoy, { weekStartsOn: 1 })
    const fin = endOfWeek(hoy, { weekStartsOn: 1 })

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

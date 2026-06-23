import { startOfWeek, endOfWeek, parseISO, format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { getProfesionales, getTiposTratamiento, getTurnosSemana, getPacientes } from '@/lib/supabase/queries'
import { AgendaView } from '@/components/agenda/AgendaView'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams
    let focusDate = new Date()

    const fechaParam = resolvedSearchParams?.fecha as string | undefined
    const urlTurnoId = resolvedSearchParams?.turno as string | undefined

    if (fechaParam) {
        focusDate = parseISO(fechaParam)
    } else if (urlTurnoId) {
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

    const vistaParam = (resolvedSearchParams?.vista as string) || 'semana'

    let inicio = startOfWeek(focusDate, { weekStartsOn: 1 })
    let fin = endOfWeek(focusDate, { weekStartsOn: 1 })

    if (vistaParam === 'hoy') {
        inicio = new Date(focusDate)
        inicio.setHours(0, 0, 0, 0)
        fin = new Date(focusDate)
        fin.setHours(23, 59, 59, 999)
    } else if (vistaParam === '15dias') {
        inicio = new Date(focusDate)
        inicio.setHours(0, 0, 0, 0)
        fin = addDays(focusDate, 14)
        fin.setHours(23, 59, 59, 999)
    } else if (vistaParam === 'mes') {
        inicio = startOfMonth(focusDate)
        fin = endOfMonth(focusDate)
    }

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
                fechaInicial={format(focusDate, 'yyyy-MM-dd')}
            />
        </div>
    )
}

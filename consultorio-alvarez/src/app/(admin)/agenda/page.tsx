import { startOfWeek, endOfWeek, parseISO, format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { getProfesionales, getTiposTratamiento, getTurnosSemana, getCurrentUsuario } from '@/lib/supabase/queries'
import { getLandingConfigAdmin } from '@/lib/actions/landing'
import { getTenantConfig } from '@/lib/actions/config'
import { AgendaView } from '@/components/agenda/AgendaView'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
    const usuario = await getCurrentUsuario()
    const isProfesional = usuario?.rol === 'profesional' && !!usuario?.profesional_id
    const profIdFiltro = isProfesional ? usuario.profesional_id : undefined

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

    const [profesionales, tiposTratamiento, turnos, landingConfig, tenantConfig] = await Promise.all([
        getProfesionales(),
        getTiposTratamiento(),
        getTurnosSemana(inicio, fin, profIdFiltro),
        getLandingConfigAdmin(),
        getTenantConfig(),
    ])

    return (
        <AgendaView
            profesionales={profesionales}
            tiposTratamiento={tiposTratamiento}
            turnosIniciales={turnos}
            fechaInicial={format(focusDate, 'yyyy-MM-dd')}
            landingConfig={landingConfig}
            horarios={tenantConfig?.horarios || []}
            currentUsuario={usuario}
        />
    )
}

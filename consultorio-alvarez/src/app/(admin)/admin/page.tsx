import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, Users, AlertCircle, DollarSign, Stethoscope } from 'lucide-react'
import { getDashboardStats, getTurnosDelDia, getProfesionales } from '@/lib/supabase/queries'
import { DashboardKPI } from '@/components/dashboard/DashboardKPI'
import { TurnoCardGlass } from '@/components/dashboard/TurnoCardGlass'

export default async function DashboardPage() {
    const hoy = new Date()
    const [stats, turnos, profesionales] = await Promise.all([
        getDashboardStats(),
        getTurnosDelDia(hoy),
        getProfesionales(),
    ])

    const turnosPendientes = turnos.filter((t: any) => t.estado === 'PENDIENTE')
    const turnosUrgentes = turnos.filter(
        (t: any) =>
            (t.prioridad_override === 'URGENTE' ||
                t.tipo_tratamiento?.prioridad === 'URGENTE') &&
            !['ATENDIDO', 'CANCELADO'].includes(t.estado)
    )

    const formattedDate = format(hoy, "EEEE d 'de' MMMM", { locale: es })
        .replace(/^\w/, (c) => c.toUpperCase())

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {formattedDate}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Vista del día — panel principal
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DashboardKPI
                    icon={<Calendar className="h-4 w-4" />}
                    label="Turnos hoy"
                    value={stats.turnosHoy ?? 0}
                    sub={`${stats.turnosConfirmados ?? 0} confirmados`}
                    color="blue"
                    delay={0}
                />
                <DashboardKPI
                    icon={<Clock className="h-4 w-4" />}
                    label="Pendientes"
                    value={stats.turnosPendientes ?? 0}
                    sub="sin confirmar"
                    color={(stats.turnosPendientes ?? 0) > 0 ? 'amber' : 'emerald'}
                    delay={0.1}
                />
                <DashboardKPI
                    icon={<AlertCircle className="h-4 w-4" />}
                    label="Urgencias"
                    value={turnosUrgentes.length}
                    sub="prioridad alta"
                    color={turnosUrgentes.length > 0 ? 'red' : 'emerald'}
                    delay={0.2}
                />
                <DashboardKPI
                    icon={<Users className="h-4 w-4" />}
                    label="Pacientes"
                    value={stats.pacientes}
                    sub="registrados"
                    color="blue"
                    delay={0.3}
                />
            </div>

            {/* Turnos por profesional */}
            <div className="grid gap-6 lg:grid-cols-2">
                {profesionales.map((prof: any) => {
                    const turnosProf = turnos.filter((t: any) => t.profesional_id === prof.id)
                    return (
                        <div key={prof.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: prof.color_agenda }}
                                />
                                <h2 className="font-semibold text-foreground">
                                    Dr. {prof.nombre} {prof.apellido}
                                </h2>
                                <span className="text-xs text-muted-foreground">
                                    ({turnosProf.length} turno{turnosProf.length !== 1 ? 's' : ''})
                                </span>
                            </div>
                            {turnosProf.length === 0 ? (
                                <div className="glass rounded-xl p-6 text-center text-sm text-muted-foreground border border-dashed border-border">
                                    Sin turnos para hoy
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {turnosProf.map((turno: any, i: number) => (
                                        <TurnoCardGlass
                                            key={turno.id}
                                            turno={turno}
                                            colorProf={prof.color_agenda}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Empty state si no hay turnos */}
            {turnos.length === 0 && (
                <div className="glass rounded-2xl shadow-glass p-12 text-center">
                    <Stethoscope className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No hay turnos para hoy</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Los turnos aparecerán aquí cuando se agenden desde la agenda
                    </p>
                </div>
            )}
        </div>
    )
}

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, Users, AlertCircle, DollarSign, Stethoscope } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getDashboardStats, getTurnosDelDia, getProfesionales, getCurrentUsuario, getTurnosSinConfirmar } from '@/lib/supabase/queries'
import { DashboardKPI } from '@/components/dashboard/DashboardKPI'
import { TurnoCardGlass } from '@/components/dashboard/TurnoCardGlass'
import { TurnosSinConfirmarSection } from '@/components/dashboard/TurnosSinConfirmarSection'
import { DashboardLiveAlerts } from '@/components/dashboard/DashboardLiveAlerts'
import { getBillingConfig } from '@/lib/actions/billing'

export default async function DashboardPage(props: {
    searchParams?: Promise<{ slug?: string; impersonate?: string }>
}) {
    const params = await props.searchParams
    const hoy = new Date()
    const [stats, turnos, profesionales, usuario, turnosSinConfirmar] = await Promise.all([
        getDashboardStats(),
        getTurnosDelDia(hoy),
        getProfesionales(),
        getCurrentUsuario(),
        getTurnosSinConfirmar(),
    ])

    const isSuperadmin = 
        usuario?.rol === 'superadmin' || 
        usuario?.email === 'creapp.ar@gmail.com' ||
        usuario?.email === 'mazasebastian@hotmail.com' ||
        usuario?.email?.endsWith('@creapp.com') ||
        usuario?.email?.endsWith('@dental-ia.com')

    // Si el usuario es Superadmin y no está impersonando un consultorio puntual, su panel natural es /superadmin
    if (isSuperadmin && !params?.slug && !params?.impersonate) {
        redirect('/superadmin')
    }

    // Obtener configuración de cobros para banners de vencimiento
    const billing = usuario ? await getBillingConfig(usuario.tenant_id) : null
    const settings = billing?.settings

    const turnosPendientes = turnos.filter((t: any) => t.estado === 'PENDIENTE')
    const turnosUrgentes = turnos.filter(
        (t: any) =>
            (t.prioridad_override === 'URGENTE' ||
                t.tipo_tratamiento?.prioridad === 'URGENTE') &&
            !['ATENDIDO', 'CANCELADO'].includes(t.estado)
    )

    const formattedDate = format(hoy, "EEEE d 'de' MMMM", { locale: es })
        .replace(/^\w/, (c) => c.toUpperCase())

    const nombreUsuario = usuario
        ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email
        : 'Usuario'

    const rolTexto = usuario?.rol === 'admin' ? 'Administración' : 'Profesional'

    // Calcular banner de alerta de vencimiento
    let alertBanner = null

    if (settings?.fecha_vencimiento && !isSuperadmin) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const [year, month, day] = settings.fecha_vencimiento.split('-').map(Number)
        const expiry = new Date(year, month - 1, day)
        expiry.setHours(0, 0, 0, 0)

        const diffTime = expiry.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const hasActivePayment = settings.estado === 'ACTIVO'

        if (!hasActivePayment && diffDays >= 0) {
            if (diffDays === 5 || diffDays === 4) {
                alertBanner = (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-3 text-sm">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        <span className="font-medium flex-1">
                            En {diffDays} días deberá renovar su abono mensual, por favor dirigirse a <a href="/mis-pagos" className="underline font-bold hover:opacity-80">Mis Pagos</a>.
                        </span>
                    </div>
                )
            } else if (diffDays <= 3) {
                alertBanner = (
                    <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm animate-red-banner-pulse">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 animate-[bounce_2s_infinite]" />
                        <span className="font-medium flex-1">
                            Por favor, renovar el abono en la sección <a href="/mis-pagos" className="underline font-bold hover:opacity-80">Mis Pagos</a> para evitar la suspensión del servicio.
                        </span>
                    </div>
                )
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center justify-center text-center md:flex-row md:items-start md:justify-between md:text-left">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        ¡Bienvenido, {nombreUsuario}!
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {formattedDate} — panel de {rolTexto.toLowerCase()}
                    </p>
                </div>
            </div>

            {/* Banner de Cobro */}
            {alertBanner}

            {/* Centro de Alertas y Novedades en Tiempo Real */}
            <DashboardLiveAlerts />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Turnos sin confirmar */}
            <TurnosSinConfirmarSection initialTurnos={turnosSinConfirmar} />

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

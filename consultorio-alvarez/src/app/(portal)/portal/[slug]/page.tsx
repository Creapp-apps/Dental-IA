import { createClient } from '@/lib/supabase/server'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { getPortalDashboardData } from '@/lib/actions/portal'
import { redirect } from 'next/navigation'
import { Calendar, Clock, Activity, ArrowRight, Stethoscope } from 'lucide-react'
import Link from 'next/link'

export default async function PortalDashboardPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) redirect(`/portal/${slug}/login`)

    const config = await getLandingConfigPublica(slug)
    if (!config) redirect(`/portal/${slug}/login`)

    const { data: paciente } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido')
        .eq('tenant_id', config.tenant_id)
        .eq('email', user.email.toLowerCase())
        .single()

    if (!paciente) redirect(`/portal/${slug}/login`)

    const dashboard = await getPortalDashboardData(paciente.id, config.tenant_id)

    const formatFecha = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
    }

    const formatHora = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Hola, {paciente.nombre} 👋
                </h1>
                <p className="text-slate-400 mt-1">
                    Bienvenido a tu portal. Aquí podés ver toda tu información clínica.
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total visitas */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{dashboard.totalVisitas}</p>
                            <p className="text-xs text-slate-400">Visitas realizadas</p>
                        </div>
                    </div>
                </div>

                {/* Próximo turno */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:col-span-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400">Próximo turno</p>
                            {dashboard.proximoTurno ? (
                                <p className="text-sm font-medium text-white truncate">
                                    {formatFecha(dashboard.proximoTurno.fecha_inicio)} — {formatHora(dashboard.proximoTurno.fecha_inicio)}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500">Sin turnos pendientes</p>
                            )}
                        </div>
                        {!dashboard.proximoTurno && (
                            <Link
                                href={`/c/${slug}`}
                                className="text-xs text-primary hover:text-primary/80 transition flex items-center gap-1"
                            >
                                Reservar <ArrowRight className="h-3 w-3" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Última consulta */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-white">Última consulta</h2>
                </div>

                {dashboard.ultimoTurno ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <p className="text-xs text-slate-400">Fecha</p>
                                <p className="text-sm text-white font-medium">
                                    {formatFecha(dashboard.ultimoTurno.fecha_inicio)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Profesional</p>
                                <p className="text-sm text-white font-medium">
                                    {(dashboard.ultimoTurno as any).profesionales?.nombre}{' '}
                                    {(dashboard.ultimoTurno as any).profesionales?.apellido}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Tratamiento</p>
                                <p className="text-sm text-white font-medium">
                                    {(dashboard.ultimoTurno as any).tipos_tratamiento?.nombre || 'Consulta general'}
                                </p>
                            </div>
                        </div>
                        {dashboard.ultimoTurno.notas && (
                            <div>
                                <p className="text-xs text-slate-400">Notas</p>
                                <p className="text-sm text-slate-300 mt-0.5">{dashboard.ultimoTurno.notas}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Aún no tenés consultas registradas.</p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    href={`/portal/${slug}/turnos`}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/10 transition group"
                >
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium text-white group-hover:text-primary transition">
                                Ver todos mis turnos
                            </p>
                            <p className="text-xs text-slate-400">Historial completo de citas</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 ml-auto group-hover:text-primary transition" />
                    </div>
                </Link>
                <Link
                    href={`/c/${slug}`}
                    target="_blank"
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/10 transition group"
                >
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition">
                                Reservar un nuevo turno
                            </p>
                            <p className="text-xs text-slate-400">Agendá tu próxima consulta</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500 ml-auto group-hover:text-emerald-400 transition" />
                    </div>
                </Link>
            </div>
        </div>
    )
}

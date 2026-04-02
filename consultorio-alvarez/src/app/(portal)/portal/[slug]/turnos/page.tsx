import { createClient } from '@/lib/supabase/server'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { getPatientTurnos } from '@/lib/actions/portal'
import { redirect } from 'next/navigation'
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ESTADO_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    PENDIENTE: { label: 'Pendiente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
    CONFIRMADO: { label: 'Confirmado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Calendar },
    COMPLETADO: { label: 'Completado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    ATENDIDO: { label: 'Atendido', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
    NO_ASISTIO: { label: 'No asistió', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: AlertCircle },
}

export default async function PortalTurnosPage({
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
        .select('id')
        .eq('tenant_id', config.tenant_id)
        .eq('email', user.email.toLowerCase())
        .single()

    if (!paciente) redirect(`/portal/${slug}/login`)

    const turnos = await getPatientTurnos(paciente.id, config.tenant_id)

    const now = new Date()
    const turnosFuturos = turnos.filter(t => new Date(t.fecha_inicio) > now)
    const turnosPasados = turnos.filter(t => new Date(t.fecha_inicio) <= now)

    const formatFecha = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleDateString('es-AR', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        })
    }

    const formatHora = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    }

    function TurnoCard({ turno }: { turno: any }) {
        const est = ESTADO_MAP[turno.estado] || ESTADO_MAP.PENDIENTE
        const Icon = est.icon

        return (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/[0.07] transition">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                            {formatFecha(turno.fecha_inicio)} — {formatHora(turno.fecha_inicio)}
                        </p>
                        <p className="text-xs text-slate-400">
                            {turno.profesionales?.nombre} {turno.profesionales?.apellido}
                            {turno.profesionales?.especialidad && ` · ${turno.profesionales.especialidad}`}
                        </p>
                        <p className="text-xs text-slate-300">
                            {turno.tipos_tratamiento?.nombre || 'Consulta general'}
                        </p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border', est.color)}>
                        <Icon className="h-3 w-3" />
                        {est.label}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Mis Turnos</h1>
                <p className="text-slate-400 mt-1">Historial completo de tus citas</p>
            </div>

            {/* Futuros */}
            {turnosFuturos.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                        Próximos turnos
                    </h2>
                    <div className="space-y-2">
                        {turnosFuturos.map(t => <TurnoCard key={t.id} turno={t} />)}
                    </div>
                </div>
            )}

            {/* Pasados */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Historial
                </h2>
                {turnosPasados.length > 0 ? (
                    <div className="space-y-2">
                        {turnosPasados.map(t => <TurnoCard key={t.id} turno={t} />)}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">No hay turnos anteriores.</p>
                )}
            </div>
        </div>
    )
}

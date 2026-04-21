import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, AlertCircle, Stethoscope } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { FichaPacienteTabs } from '@/components/pacientes/FichaPacienteTabs'

const GENERO_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', X: 'No binario' }

async function getPacienteCompleto(id: string) {
    const supabase = await createClient()

    const [pacienteRes, turnosRes, historialRes, odontogramaRes, presupuestosRes] = await Promise.all([
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
    ])

    return {
        paciente: pacienteRes.data,
        turnos: turnosRes.data ?? [],
        historial: historialRes.data ?? [],
        odontograma: odontogramaRes.data ?? [],
        presupuestos: presupuestosRes.data ?? [],
    }
}

export default async function FichaPacientePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { paciente: p, turnos, historial, odontograma, presupuestos } = await getPacienteCompleto(id)
    if (!p) notFound()

    const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`
    const edad = p.fecha_nacimiento
        ? Math.floor((Date.now() - new Date(p.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/pacientes" className="inline-flex h-9 w-9 items-center justify-center rounded-xl glass hover:shadow-glass transition-all">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            Historia Clínica — N° {p.nro_historia_clinica}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Clinical alerts */}
            {(p.alergias || p.medicacion_actual || p.antecedentes) && (
                <div className="glass rounded-xl p-3.5 border-l-4 border-amber-500 shadow-glass">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            {p.alergias && <span><strong className="text-amber-700 dark:text-amber-300">Alergias:</strong> {p.alergias}</span>}
                            {p.medicacion_actual && <span><strong className="text-amber-700 dark:text-amber-300">Medicación:</strong> {p.medicacion_actual}</span>}
                            {p.antecedentes && <span><strong className="text-amber-700 dark:text-amber-300">Antecedentes:</strong> {p.antecedentes}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Layout: Profile sidebar + Tabbed content */}
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* ── Left: Profile card ── */}
                <div className="space-y-4">
                    <div className="glass rounded-2xl shadow-glass p-5">
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-4 ring-primary/20 overflow-hidden relative">
                                {p.foto_url ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={p.foto_url} alt={`${p.nombre} ${p.apellido}`} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-primary">{iniciales}</span>
                                )}
                            </div>
                            <h2 className="text-lg font-bold text-foreground">{p.nombre} {p.apellido}</h2>
                            {edad !== null && (
                                <span className="text-xs glass px-2 py-0.5 rounded-lg mt-1">{edad} años</span>
                            )}
                        </div>

                        <div className="space-y-2.5 text-sm">
                            <DatoFila label="DNI" valor={p.dni} />
                            <DatoFila label="CUIT" valor={p.cuit} />
                            <DatoFila label="Nac." valor={p.fecha_nacimiento ? format(new Date(p.fecha_nacimiento), "dd/MM/yyyy") : null} />
                            <DatoFila label="Género" valor={p.genero ? GENERO_LABEL[p.genero] : null} />
                            <div className="h-px bg-border my-1" />
                            <DatoFila label="Teléfono" valor={p.telefono} icon={<Phone className="h-3 w-3" />} />
                            <DatoFila label="Email" valor={p.email} icon={<Mail className="h-3 w-3" />} />
                            <DatoFila label="Dirección" valor={p.direccion} icon={<MapPin className="h-3 w-3" />} />
                            <div className="h-px bg-border my-1" />
                            <DatoFila label="Obra Social" valor={p.obra_social?.nombre ?? 'Particular'} icon={<CreditCard className="h-3 w-3" />} />
                            {p.n_afiliado && <DatoFila label="N° Afiliado" valor={p.n_afiliado} />}
                        </div>
                    </div>

                    {p.notas_internas && (
                        <div className="glass rounded-xl p-4 border-l-4 border-blue-500 shadow-glass">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📝 Notas internas</p>
                            <p className="text-sm text-foreground leading-relaxed">{p.notas_internas}</p>
                        </div>
                    )}
                </div>

                {/* ── Right: Tabbed content ── */}
                <FichaPacienteTabs
                    pacienteId={p.id}
                    turnos={turnos}
                    historial={historial}
                    odontograma={odontograma}
                    presupuestos={presupuestos}
                    motivoConsulta={p.motivo_consulta}
                />
            </div>
        </div>
    )
}

function DatoFila({ label, valor, icon }: { label: string; valor: string | null | undefined; icon?: React.ReactNode }) {
    if (!valor) return null
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground shrink-0 flex items-center gap-1">{icon}{label}</span>
            <span className="font-medium text-foreground text-right">{valor}</span>
        </div>
    )
}

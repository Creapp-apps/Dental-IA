'use client'

import { useState, useEffect } from 'react'
import { User, Phone, MapPin, Building, Shield, Pill, AlertTriangle, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { updatePatientContact } from '@/lib/actions/portal'
import { createClient } from '@/lib/supabase/client'

interface PatientData {
    id: string
    nombre: string
    apellido: string
    dni: string | null
    fecha_nacimiento: string | null
    genero: string | null
    telefono: string | null
    email: string | null
    direccion: string | null
    ciudad: string | null
    alergias: string | null
    medicacion_actual: string | null
    antecedentes: string | null
    nro_historia_clinica: string | null
}

export default function PortalPerfilPage({ params }: { params: Promise<{ slug: string }> }) {
    const [patient, setPatient] = useState<PatientData | null>(null)
    const [telefono, setTelefono] = useState('')
    const [direccion, setDireccion] = useState('')
    const [ciudad, setCiudad] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [slug, setSlug] = useState('')

    useEffect(() => {
        params.then(p => setSlug(p.slug))
    }, [params])

    useEffect(() => {
        if (!slug) return
        async function loadPatient() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) return

            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', slug)
                .single()

            if (!tenant) return

            const { data } = await supabase
                .from('pacientes')
                .select('*')
                .eq('tenant_id', tenant.id)
                .eq('email', user.email.toLowerCase())
                .single()

            if (data) {
                setPatient(data)
                setTelefono(data.telefono || '')
                setDireccion(data.direccion || '')
                setCiudad(data.ciudad || '')
            }
        }
        loadPatient()
    }, [slug])

    async function handleSave() {
        if (!patient) return
        setSaving(true)
        setSaved(false)
        const result = await updatePatientContact(patient.id, { telefono, direccion, ciudad })
        setSaving(false)
        if (result.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        }
    }

    if (!patient) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
        <div className="flex items-start gap-3 py-2.5">
            <Icon className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-white">{value || '—'}</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
                <p className="text-slate-400 mt-1">Tu información registrada en el consultorio</p>
            </div>

            {/* Datos personales */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-1">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                    Datos personales
                </h2>
                <InfoRow icon={User} label="Nombre completo" value={`${patient.nombre} ${patient.apellido}`} />
                <InfoRow icon={Shield} label="DNI" value={patient.dni} />
                <InfoRow icon={User} label="Fecha de nacimiento" value={
                    patient.fecha_nacimiento
                        ? new Date(patient.fecha_nacimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : null
                } />
                <InfoRow icon={User} label="Género" value={patient.genero} />
                <InfoRow icon={User} label="Historia clínica Nº" value={patient.nro_historia_clinica} />
            </div>

            {/* Datos editables */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Datos de contacto
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> Teléfono
                        </label>
                        <Input
                            value={telefono}
                            onChange={e => setTelefono(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> Dirección
                        </label>
                        <Input
                            value={direccion}
                            onChange={e => setDireccion(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5" /> Ciudad
                        </label>
                        <Input
                            value={ciudad}
                            onChange={e => setCiudad(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <GlassButton onClick={handleSave} disabled={saving} variant="glass">
                        {saving ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                        ) : saved ? (
                            <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" /> ¡Guardado!</>
                        ) : (
                            <><Save className="h-4 w-4 mr-2" /> Guardar cambios</>
                        )}
                    </GlassButton>
                </div>
            </div>

            {/* Info médica (solo lectura) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-1">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                    Información médica
                </h2>
                <InfoRow icon={AlertTriangle} label="Alergias" value={patient.alergias} />
                <InfoRow icon={Pill} label="Medicación actual" value={patient.medicacion_actual} />
                <InfoRow icon={Shield} label="Antecedentes" value={patient.antecedentes} />
            </div>
        </div>
    )
}

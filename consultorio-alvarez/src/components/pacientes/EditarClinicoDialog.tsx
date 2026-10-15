'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Textarea } from '@/components/ui/textarea'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
    GlassDialogDescription,
    GlassDialogFooter,
} from '@/components/ui/glass-dialog'
import { actualizarDatosClinicosPaciente } from '@/lib/actions/pacientes'

export interface DatosClinicos {
    motivo_consulta?: string | null
    notas_internas?: string | null
}

interface EditarClinicoDialogProps {
    pacienteId: string
    valores: DatosClinicos
    /**
     * Sólo cuando el consultorio comparte la info clínica entre profesionales se
     * ofrece editar la nota interna; si no, queda fuera del formulario.
     */
    comparteClinica?: boolean
    /** Update optimista en la ficha tras guardar. */
    onSaved?: (cambios: DatosClinicos) => void
}

/**
 * Edición clínica acotada del profesional: motivo, alergias, medicación y
 * antecedentes (y notas internas si el consultorio las comparte). El contacto
 * del paciente lo edita la administración, no acá.
 * Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §8
 */
export function EditarClinicoDialog({ pacienteId, valores, comparteClinica = false, onSaved }: EditarClinicoDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<DatosClinicos>({
        motivo_consulta: valores.motivo_consulta ?? '',
        notas_internas: valores.notas_internas ?? '',
    })

    function set(campo: keyof DatosClinicos, v: string) {
        setForm(prev => ({ ...prev, [campo]: v }))
    }

    async function guardar() {
        setSaving(true)
        setError(null)

        const datos: DatosClinicos = {
            motivo_consulta: form.motivo_consulta,
        }
        if (comparteClinica) datos.notas_internas = form.notas_internas

        const res = await actualizarDatosClinicosPaciente(pacienteId, datos)
        setSaving(false)

        if (res?.error) {
            setError(res.error)
            return
        }

        onSaved?.(datos)
        setOpen(false)
        router.refresh()
    }

    return (
        <>
            <GlassButton
                size="sm"
                variant="glass"
                onClick={() => setOpen(true)}
                className="w-full text-xs justify-center h-8"
            >
                <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                Editar datos clínicos
            </GlassButton>

            <GlassDialog open={open} onOpenChange={setOpen}>
                <GlassDialogContent>
                    <GlassDialogHeader>
                        <GlassDialogTitle>Datos clínicos</GlassDialogTitle>
                        <GlassDialogDescription>
                            Motivo de consulta{comparteClinica ? ' y notas internas' : ''}. Las alergias, medicación
                            y antecedentes se editan desde "Antecedentes de Salud".
                        </GlassDialogDescription>
                    </GlassDialogHeader>

                    <div className="space-y-3 mt-2">
                        <Campo label="Motivo de consulta" value={form.motivo_consulta ?? ''} onChange={v => set('motivo_consulta', v)} />
                        {comparteClinica && (
                            <Campo
                                label="Notas internas (visible para el equipo)"
                                value={form.notas_internas ?? ''}
                                onChange={v => set('notas_internas', v)}
                            />
                        )}
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>

                    <GlassDialogFooter>
                        <GlassButton variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                            Cancelar
                        </GlassButton>
                        <GlassButton size="sm" onClick={guardar} loading={saving}>
                            Guardar
                        </GlassButton>
                    </GlassDialogFooter>
                </GlassDialogContent>
            </GlassDialog>
        </>
    )
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <Textarea value={value} onChange={e => onChange(e.target.value)} rows={2} />
        </div>
    )
}

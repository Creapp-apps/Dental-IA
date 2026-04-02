'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { type ObraSocial } from '@/types'

const schema = z.object({
    nombre: z.string().min(2, 'Nombre requerido'),
    apellido: z.string().min(2, 'Apellido requerido'),
    dni: z.string().optional(),
    fecha_nacimiento: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    obra_social_id: z.string().optional(),
    n_afiliado: z.string().optional(),
    alergias: z.string().optional(),
    medicacion_actual: z.string().optional(),
    antecedentes: z.string().optional(),
    notas_internas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function FormPaciente({
    obrasSociales,
    pacienteInicial,
}: {
    obrasSociales: ObraSocial[]
    pacienteInicial?: Partial<FormData> & { id?: string }
}) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const isEdit = !!pacienteInicial?.id

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: pacienteInicial ?? {},
    })

    const obraId = watch('obra_social_id')

    async function onSubmit(data: FormData) {
        setLoading(true)
        const payload = {
            ...data,
            obra_social_id: data.obra_social_id || null,
            email: data.email || null,
            dni: data.dni || null,
            fecha_nacimiento: data.fecha_nacimiento || null,
        }

        const { error } = isEdit
            ? await supabase.from('pacientes').update(payload).eq('id', pacienteInicial!.id!)
            : await supabase.from('pacientes').insert(payload).select().single()

        if (error) {
            toast.error('Error al guardar el paciente')
            setLoading(false)
            return
        }

        toast.success(isEdit ? 'Paciente actualizado' : 'Paciente registrado correctamente')
        router.push('/pacientes')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
            {/* Datos personales */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Datos personales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nombre *" error={errors.nombre?.message}>
                        <Input {...register('nombre')} placeholder="Ej: María" />
                    </Field>
                    <Field label="Apellido *" error={errors.apellido?.message}>
                        <Input {...register('apellido')} placeholder="Ej: González" />
                    </Field>
                    <Field label="DNI" error={errors.dni?.message}>
                        <Input {...register('dni')} placeholder="Sin puntos" type="text" />
                    </Field>
                    <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
                        <Input {...register('fecha_nacimiento')} type="date" />
                    </Field>
                    <Field label="Teléfono" error={errors.telefono?.message}>
                        <Input {...register('telefono')} placeholder="Ej: 11 2345-6789" type="tel" />
                    </Field>
                    <Field label="Email" error={errors.email?.message}>
                        <Input {...register('email')} placeholder="opcional@email.com" type="email" />
                    </Field>
                </CardContent>
            </Card>

            {/* Obra social */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Cobertura médica</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Obra social">
                        <Select
                            value={obraId ?? ''}
                            onValueChange={(v) => setValue('obra_social_id', v === 'ninguna' ? undefined : (v || undefined))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ninguna">Particular / Sin OS</SelectItem>
                                {obrasSociales.map((os) => (
                                    <SelectItem key={os.id} value={os.id}>
                                        {os.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="N° de afiliado" error={errors.n_afiliado?.message}>
                        <Input {...register('n_afiliado')} placeholder="Opcional" />
                    </Field>
                </CardContent>
            </Card>

            {/* Historia clínica */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Historia clínica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Field label="Alergias" error={errors.alergias?.message}>
                        <Textarea
                            {...register('alergias')}
                            placeholder="Ej: Penicilina, Látex..."
                            rows={2}
                        />
                    </Field>
                    <Field label="Medicación actual" error={errors.medicacion_actual?.message}>
                        <Textarea
                            {...register('medicacion_actual')}
                            placeholder="Ej: Ibuprofeno 400mg, Enalapril..."
                            rows={2}
                        />
                    </Field>
                    <Field label="Antecedentes médicos" error={errors.antecedentes?.message}>
                        <Textarea
                            {...register('antecedentes')}
                            placeholder="Ej: Diabetes tipo 2, Hipertensión..."
                            rows={2}
                        />
                    </Field>
                    <Field label="Notas internas (solo staff)" error={errors.notas_internas?.message}>
                        <Textarea
                            {...register('notas_internas')}
                            placeholder="Observaciones del profesional..."
                            rows={2}
                        />
                    </Field>
                </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar paciente'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                >
                    Cancelar
                </Button>
            </div>
        </form>
    )
}

function Field({
    label,
    children,
    error,
}: {
    label: string
    children: React.ReactNode
    error?: string
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}

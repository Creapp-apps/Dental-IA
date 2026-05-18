'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassSelect } from '@/components/ui/glass-select'
import { GlassPhotoCapture } from '@/components/ui/glass-photo-capture'
import { crearPaciente, actualizarPaciente } from '@/lib/actions/pacientes'
import { glassAlert } from '@/components/ui/glass-alert'

const schema = z.object({
    nro_historia_clinica: z.string().optional(),
    nombre: z.string().min(2, 'Mínimo 2 caracteres'),
    apellido: z.string().min(2, 'Mínimo 2 caracteres'),
    foto_url: z.string().optional(),
    dni: z.string().optional(),
    cuit: z.string().optional(),
    fecha_nacimiento: z.string().optional().refine(val => {
        if (!val) return true;
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(val)) return false;
        const [day, month, year] = val.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }, {
        message: 'Formato inválido (DD/MM/AAAA)'
    }),
    genero: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    direccion: z.string().optional(),
    ciudad: z.string().optional(),
    obra_social_id: z.string().optional(),
    plan_obra_social: z.string().optional(),
    n_afiliado: z.string().optional(),
    motivo_consulta: z.string().optional(),
    alergias: z.string().optional(),
    medicacion_actual: z.string().optional(),
    antecedentes: z.string().optional(),
    notas_internas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Apple-style staggered spring animation ─────────────────────
const sectionVariants = {
    hidden: { opacity: 0, x: -40, filter: 'blur(6px)', zIndex: 0 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        zIndex: 50 - i,
        transition: {
            delay: i * 0.08,
            type: 'spring' as const,
            stiffness: 260,
            damping: 24,
        },
    }),
}

export function FormPacienteReal({ obrasSociales, paciente }: { obrasSociales: any[], paciente?: any }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: paciente ? {
            nro_historia_clinica: paciente.nro_historia_clinica || '',
            nombre: paciente.nombre || '',
            apellido: paciente.apellido || '',
            foto_url: paciente.foto_url || '',
            dni: paciente.dni || '',
            cuit: paciente.cuit || '',
            fecha_nacimiento: paciente.fecha_nacimiento ? paciente.fecha_nacimiento.split('-').reverse().join('/') : '',
            genero: paciente.genero || '',
            telefono: paciente.telefono || '',
            email: paciente.email || '',
            direccion: paciente.direccion || '',
            ciudad: paciente.ciudad || '',
            obra_social_id: paciente.obra_social_id || '',
            plan_obra_social: paciente.plan_obra_social || '',
            n_afiliado: paciente.n_afiliado || '',
            motivo_consulta: paciente.motivo_consulta || '',
            alergias: paciente.alergias || '',
            medicacion_actual: paciente.medicacion_actual || '',
            antecedentes: paciente.antecedentes || '',
            notas_internas: paciente.notas_internas || '',
        } : { genero: '', obra_social_id: '' },
    })

    function onSubmit(data: FormData) {
        startTransition(async () => {
            // Convert date to YYYY-MM-DD for storage
            let fechaIso = null
            if (data.fecha_nacimiento) {
                const parts = data.fecha_nacimiento.split('/')
                if (parts.length === 3) {
                    fechaIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                }
            }

            const payload = {
                ...data,
                fecha_nacimiento: fechaIso || null,
            }

            if (paciente) {
                const result = await actualizarPaciente(paciente.id, payload)
                if (result.error) {
                    glassAlert.error({ title: 'Error al actualizar paciente', description: result.error })
                } else {
                    glassAlert.success({ title: 'Paciente actualizado' })
                    router.push(`/pacientes/${paciente.id}`)
                }
            } else {
                const result = await crearPaciente(payload)
                if (result.error) {
                    glassAlert.error({ title: 'Error al crear paciente', description: result.error })
                } else {
                    glassAlert.success({ title: 'Paciente creado', description: `HC: ${result.data?.nro_historia_clinica}` })
                    router.push(`/pacientes/${result.data?.id}`)
                }
            }
        })
    }

    const selectedObraId = watch('obra_social_id')
    const selectedObra = obrasSociales.find(os => os.id === selectedObraId)
    
    // Parse the comma-separated string into an array
    const rawPlanes = selectedObra?.planes || ''
    const planesDisponibles: string[] = typeof rawPlanes === 'string' && rawPlanes.trim() !== '' 
        ? rawPlanes.split(',').map(p => p.trim()).filter(Boolean) 
        : (Array.isArray(rawPlanes) ? rawPlanes : [])

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Cabecera / Foto */}
            <motion.div
                custom={0}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass rounded-2xl shadow-glass p-5 flex items-center gap-6"
            >
                <GlassPhotoCapture
                    value={watch('foto_url')}
                    onChange={(url) => setValue('foto_url', url)}
                />
                <div>
                    <h2 className="text-xl font-bold text-foreground">Perfil del Paciente</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Completá los datos personales y carga una foto identificatoria.
                    </p>
                </div>
            </motion.div>

            {/* Datos personales */}
            <motion.div
                custom={1}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass rounded-2xl shadow-glass p-5 space-y-4 relative z-40"
            >
                <h3 className="text-sm font-semibold text-foreground">Datos personales</h3>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Nº Hist. Clínica" error={errors.nro_historia_clinica?.message}>
                        <Input {...register('nro_historia_clinica')} placeholder="HC-123" />
                    </Field>
                    <Field label="Apellido *" error={errors.apellido?.message}>
                        <Input {...register('apellido')} placeholder="Pérez" />
                    </Field>
                    <Field label="Nombre *" error={errors.nombre?.message}>
                        <Input {...register('nombre')} placeholder="Juan" />
                    </Field>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <Field label="DNI">
                        <Input {...register('dni')} placeholder="12345678" />
                    </Field>
                    <Field label="CUIT / CUIL">
                        <Input {...register('cuit')} placeholder="20-12345678-9" />
                    </Field>
                    <Field label="Fecha Nac." error={errors.fecha_nacimiento?.message}>
                        <Input
                            placeholder="DD/MM/AAAA"
                            maxLength={10}
                            {...register('fecha_nacimiento')}
                            onChange={e => {
                                // Auto-insert slashes as user types
                                let raw = e.target.value.replace(/\D/g, '').slice(0, 8)
                                let formatted = raw
                                if (raw.length > 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4)
                                else if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2)
                                e.target.value = formatted
                                setValue('fecha_nacimiento', formatted, { shouldValidate: true })
                            }}
                        />
                    </Field>
                    <Field label="Género">
                        <GlassSelect
                            value={watch('genero') || ''}
                            onChange={v => setValue('genero', v)}
                            options={[
                                { value: 'M', label: 'Masculino' },
                                { value: 'F', label: 'Femenino' },
                                { value: 'X', label: 'No binario' }
                            ]}
                            placeholder="—"
                        />
                    </Field>
                </div>
            </motion.div>

            {/* Contacto */}
            <motion.div
                custom={2}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass rounded-2xl shadow-glass p-5 space-y-4 relative z-30"
            >
                <h3 className="text-sm font-semibold text-foreground">Contacto</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Teléfono">
                        <Input {...register('telefono')} placeholder="11 4523-7891" />
                    </Field>
                    <Field label="Email" error={errors.email?.message}>
                        <Input type="email" {...register('email')} placeholder="correo@mail.com" />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Dirección">
                        <Input {...register('direccion')} placeholder="Av. Rivadavia 1234" />
                    </Field>
                    <Field label="Ciudad">
                        <Input {...register('ciudad')} placeholder="CABA" />
                    </Field>
                </div>
            </motion.div>

            {/* Obra social */}
            <motion.div
                custom={3}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass rounded-2xl shadow-glass p-5 space-y-4 relative z-20"
            >
                <h3 className="text-sm font-semibold text-foreground">Obra Social</h3>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Obra Social">
                        <GlassSelect
                            value={watch('obra_social_id') || ''}
                            onChange={v => {
                                setValue('obra_social_id', v)
                                setValue('plan_obra_social', '')
                            }}
                            options={obrasSociales.map((os: any) => ({ value: os.id, label: os.nombre }))}
                            placeholder="Particular"
                        />
                    </Field>
                    <Field label="Plan">
                        <GlassSelect
                            value={watch('plan_obra_social') || ''}
                            onChange={v => setValue('plan_obra_social', v)}
                            options={planesDisponibles.map((plan: string) => ({ value: plan, label: plan }))}
                            placeholder={planesDisponibles.length > 0 ? "Seleccionar plan" : "—"}
                        />
                    </Field>
                    <Field label="N° Afiliado">
                        <Input {...register('n_afiliado')} placeholder="Número de afiliado" />
                    </Field>
                </div>
            </motion.div>

            {/* Clínico */}
            <motion.div
                custom={4}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass rounded-2xl shadow-glass p-5 space-y-4 relative z-10"
            >
                <h3 className="text-sm font-semibold text-foreground">Datos clínicos</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Alergias">
                        <Input {...register('alergias')} placeholder="Penicilina, Latex..." />
                    </Field>
                    <Field label="Medicación actual">
                        <Input {...register('medicacion_actual')} placeholder="Ibuprofeno 400mg..." />
                    </Field>
                </div>
                <Field label="Antecedentes">
                    <Textarea {...register('antecedentes')} rows={2} placeholder="Diabetes, hipertensión..." />
                </Field>
                <Field label="Notas internas">
                    <Textarea {...register('notas_internas')} rows={2} placeholder="Solo visible para el equipo..." />
                </Field>
            </motion.div>

            {/* Submit */}
            <motion.div
                custom={5}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="flex gap-3 justify-end"
            >
                <GlassButton type="button" variant="ghost" onClick={() => router.back()}>
                    Cancelar
                </GlassButton>
                <GlassButton type="submit" loading={isPending}>
                    {paciente ? 'Guardar cambios' : 'Crear paciente'}
                </GlassButton>
            </motion.div>
        </form>
    )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}

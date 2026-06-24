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
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { processPatientCardOcr } from '@/lib/actions/ocr'

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

// Client-side image compression to speed up upload times and respect payload limits
function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width)
                        width = maxWidth
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height)
                        height = maxHeight
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(event.target?.result as string)
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)
                const dataUrl = canvas.toDataURL('image/jpeg', quality)
                resolve(dataUrl)
            }
            img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
    })
}

export function FormPacienteReal({ obrasSociales, paciente }: { obrasSociales: any[], paciente?: any }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isOcrPending, setIsOcrPending] = useState(false)
    const [ocrData, setOcrData] = useState<any>(null)
    const [scannedImage, setScannedImage] = useState<string | null>(null)

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
            obra_social_id: paciente.obra_social?.nombre || paciente.obra_social_id || '',
            plan_obra_social: paciente.plan_obra_social || '',
            n_afiliado: paciente.n_afiliado || '',
            motivo_consulta: paciente.motivo_consulta || '',
            alergias: paciente.alergias || '',
            medicacion_actual: paciente.medicacion_actual || '',
            antecedentes: paciente.antecedentes || '',
            notas_internas: paciente.notas_internas || '',
        } : { genero: '', obra_social_id: '' },
    })

    async function handleOcrFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsOcrPending(true)
        try {
            const compressedBase64 = await compressImage(file)
            setScannedImage(compressedBase64)
            
            const res = await processPatientCardOcr(compressedBase64)
            if (res.success && res.data) {
                setOcrData(res.data)
                glassAlert.success({ 
                    title: 'Ficha digitalizada', 
                    description: 'Verificá los datos extraídos antes de confirmar.' 
                })
            } else {
                glassAlert.error({ 
                    title: 'Error al escanear', 
                    description: res.error || 'No se pudieron extraer datos de la imagen.' 
                })
            }
        } catch (err: any) {
            glassAlert.error({ 
                title: 'Error de conexión', 
                description: err.message || 'Error al procesar la imagen.' 
            })
        } finally {
            setIsOcrPending(false)
            e.target.value = ''
        }
    }

    function handleConfirmOcr(confirmedData: any) {
        if (!confirmedData) return
        
        // Populate react-hook-form values
        Object.entries(confirmedData).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                setValue(key as any, val as string, { shouldValidate: true })
            }
        })
        
        setOcrData(null)
        setScannedImage(null)
        glassAlert.success({ 
            title: 'Datos cargados', 
            description: 'Se autocompletó el formulario del paciente.' 
        })
    }

    function onSubmit(data: FormData) {
        startTransition(async () => {
            // Convert date to YYYY-MM-DD for storage
            let fechaIso = ''
            if (data.fecha_nacimiento) {
                const parts = data.fecha_nacimiento.split('/')
                if (parts.length === 3) {
                    fechaIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                }
            }

            const payload = {
                ...data,
                fecha_nacimiento: fechaIso,
                registro_completo: true,
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

    const selectedObraNameOrId = watch('obra_social_id')
    const selectedObra = obrasSociales.find(os => 
        os.id === selectedObraNameOrId || 
        os.nombre.toLowerCase() === selectedObraNameOrId?.toLowerCase()
    )
    
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
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Perfil del Paciente</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Completá los datos personales y cargá una foto o escaneá su ficha física.
                        </p>
                    </div>
                    {!paciente && (
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                id="ocr-file-upload"
                                className="hidden"
                                onChange={handleOcrFileChange}
                            />
                            <GlassButton
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('ocr-file-upload')?.click()}
                                disabled={isOcrPending}
                                className="border-primary/30 hover:border-primary/80 hover:bg-primary/5 transition-all duration-300 flex items-center gap-2 group shadow-sm"
                            >
                                {isOcrPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm font-medium">Digitalizando ficha...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
                                        <span className="text-sm font-medium">Escanear Ficha con IA</span>
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    )}
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
                        <Input
                            {...register('obra_social_id', {
                                onChange: () => {
                                    setValue('plan_obra_social', '')
                                }
                            })}
                            placeholder="Particular, OSDE, Swiss Medical..."
                            list="obras-sociales-list"
                        />
                        <datalist id="obras-sociales-list">
                            {obrasSociales.map((os: any) => (
                                <option key={os.id} value={os.nombre} />
                            ))}
                        </datalist>
                    </Field>
                    <Field label="Plan">
                        <Input
                            {...register('plan_obra_social')}
                            placeholder="Ej: 210, 310..."
                            list="planes-list"
                        />
                        <datalist id="planes-list">
                            {planesDisponibles.map((plan: string) => (
                                <option key={plan} value={plan} />
                            ))}
                        </datalist>
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

            {/* OCR Verification Modal */}
            {ocrData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md">
                    <style>{`
                        @keyframes scan-loop {
                            0% { top: 0%; }
                            50% { top: 100%; }
                            100% { top: 0%; }
                        }
                    `}</style>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="glass border border-white/10 dark:border-white/5 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    >
                        {/* Left Side: Scanned Card Preview */}
                        <div className="w-full md:w-1/2 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 flex flex-col relative overflow-hidden h-[250px] md:h-auto min-h-[250px]">
                            <div className="absolute top-4 left-4 z-10 glass px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider text-white flex items-center gap-1.5 shadow-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Ficha Escaneada
                            </div>
                            {scannedImage ? (
                                <div className="flex-1 relative flex items-center justify-center p-6 select-none group">
                                    <img 
                                        src={scannedImage} 
                                        alt="Ficha de Paciente" 
                                        className="max-w-full max-h-[450px] object-contain rounded-lg shadow-lg border border-white/10" 
                                    />
                                    {/* Laser scanning line effect */}
                                    <div 
                                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 pointer-events-none" 
                                        style={{ animation: 'scan-loop 2.5s ease-in-out infinite' }}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                    Sin vista previa de imagen
                                </div>
                            )}
                        </div>

                        {/* Right Side: Verified Fields List */}
                        <div className="w-full md:w-1/2 flex flex-col max-h-[85vh]">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                                        Datos Extraídos con IA
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Revisá y corregí la información antes de guardarla.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setOcrData(null); setScannedImage(null); }}
                                    className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Fields list */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[50vh] md:max-h-[55vh] scrollbar-thin">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Apellido</Label>
                                        <Input 
                                            value={ocrData.apellido || ''} 
                                            onChange={e => setOcrData({ ...ocrData, apellido: e.target.value })}
                                            placeholder="Apellido"
                                            className="bg-black/10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nombre</Label>
                                        <Input 
                                            value={ocrData.nombre || ''} 
                                            onChange={e => setOcrData({ ...ocrData, nombre: e.target.value })}
                                            placeholder="Nombre"
                                            className="bg-black/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">DNI</Label>
                                        <Input 
                                            value={ocrData.dni || ''} 
                                            onChange={e => setOcrData({ ...ocrData, dni: e.target.value })}
                                            placeholder="DNI"
                                            className="bg-black/10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fecha de Nacimiento</Label>
                                        <Input 
                                            value={ocrData.fecha_nacimiento || ''} 
                                            onChange={e => setOcrData({ ...ocrData, fecha_nacimiento: e.target.value })}
                                            placeholder="DD/MM/AAAA"
                                            className="bg-black/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Género</Label>
                                        <GlassSelect
                                            value={ocrData.genero || ''}
                                            onChange={v => setOcrData({ ...ocrData, genero: v })}
                                            options={[
                                                { value: 'M', label: 'Masculino' },
                                                { value: 'F', label: 'Femenino' },
                                                { value: 'X', label: 'No binario' },
                                                { value: '', label: 'No especificado' }
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Teléfono</Label>
                                        <Input 
                                            value={ocrData.telefono || ''} 
                                            onChange={e => setOcrData({ ...ocrData, telefono: e.target.value })}
                                            placeholder="Teléfono"
                                            className="bg-black/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Dirección</Label>
                                        <Input 
                                            value={ocrData.direccion || ''} 
                                            onChange={e => setOcrData({ ...ocrData, direccion: e.target.value })}
                                            placeholder="Calle y Nro"
                                            className="bg-black/10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad</Label>
                                        <Input 
                                            value={ocrData.ciudad || ''} 
                                            onChange={e => setOcrData({ ...ocrData, ciudad: e.target.value })}
                                            placeholder="Ciudad"
                                            className="bg-black/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Obra Social</Label>
                                        <Input 
                                            value={ocrData.obra_social_id || ''} 
                                            onChange={e => setOcrData({ ...ocrData, obra_social_id: e.target.value })}
                                            placeholder="Obra Social"
                                            className="bg-black/10"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Plan</Label>
                                        <Input 
                                            value={ocrData.plan_obra_social || ''} 
                                            onChange={e => setOcrData({ ...ocrData, plan_obra_social: e.target.value })}
                                            placeholder="Plan"
                                            className="bg-black/10"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nº Afiliado</Label>
                                        <Input 
                                            value={ocrData.n_afiliado || ''} 
                                            onChange={e => setOcrData({ ...ocrData, n_afiliado: e.target.value })}
                                            placeholder="Nº Afiliado"
                                            className="bg-black/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Alergias</Label>
                                    <Input 
                                        value={ocrData.alergias || ''} 
                                        onChange={e => setOcrData({ ...ocrData, alergias: e.target.value })}
                                        placeholder="Alergias encontradas..."
                                        className="bg-black/10"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Medicación Actual</Label>
                                    <Input 
                                        value={ocrData.medicacion_actual || ''} 
                                        onChange={e => setOcrData({ ...ocrData, medicacion_actual: e.target.value })}
                                        placeholder="Medicación actual..."
                                        className="bg-black/10"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Antecedentes</Label>
                                    <Textarea 
                                        value={ocrData.antecedentes || ''} 
                                        onChange={e => setOcrData({ ...ocrData, antecedentes: e.target.value })}
                                        placeholder="Antecedentes médicos..."
                                        rows={2}
                                        className="bg-black/10"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/10 flex gap-3 justify-end bg-black/10">
                                <GlassButton 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => { setOcrData(null); setScannedImage(null); }}
                                >
                                    Descartar
                                </GlassButton>
                                <GlassButton 
                                    type="button" 
                                    onClick={() => handleConfirmOcr(ocrData)}
                                    className="flex items-center gap-1.5"
                                >
                                    <Check className="h-4 w-4" />
                                    Confirmar e Importar
                                </GlassButton>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
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

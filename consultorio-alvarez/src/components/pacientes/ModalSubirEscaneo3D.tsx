'use client'

import { useState } from 'react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
} from '@/components/ui/glass-dialog'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass-button'
import { createClient } from '@/lib/supabase/client'
import { crearEscaneo3DAction, type Archivo3D } from '@/lib/actions/escaneos-3d'
import { UploadCloud, Box, X, Loader2, CheckCircle2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ModalSubirEscaneo3DProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pacienteId: string
    onEscaneoCreado?: () => void
}

interface ArchivoEnCola {
    file: File
    tipo: 'maxilar_superior' | 'maxilar_inferior' | 'oclusion' | 'otro'
    formato: 'stl' | 'obj' | 'ply'
}

export function ModalSubirEscaneo3D({
    open,
    onOpenChange,
    pacienteId,
    onEscaneoCreado,
}: ModalSubirEscaneo3DProps) {
    const [nombreCaso, setNombreCaso] = useState('')
    const [piezasStr, setPiezasStr] = useState('')
    const [material, setMaterial] = useState('Zirconia')
    const [notas, setNotas] = useState('')
    const [archivosCola, setArchivosCola] = useState<ArchivoEnCola[]>([])
    const [isSubiendo, setIsSubiendo] = useState(false)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const nuevos: ArchivoEnCola[] = []

        Array.from(e.target.files).forEach((file) => {
            const nombreLow = file.name.toLowerCase()
            const ext = nombreLow.split('.').pop() as 'stl' | 'obj' | 'ply'

            let tipo: ArchivoEnCola['tipo'] = 'otro'
            if (nombreLow.includes('maxil') || nombreLow.includes('upper')) {
                tipo = 'maxilar_superior'
            } else if (nombreLow.includes('mandib') || nombreLow.includes('lower')) {
                tipo = 'maxilar_inferior'
            } else if (nombreLow.includes('oclu') || nombreLow.includes('bite')) {
                tipo = 'oclusion'
            }

            nuevos.push({ file, tipo, formato: ext || 'stl' })
        })

        setArchivosCola((prev) => [...prev, ...nuevos])
        if (!nombreCaso && nuevos.length > 0) {
            setNombreCaso(`Escaneo 3D — ${nuevos[0].file.name.replace(/\.[^/.]+$/, '')}`)
        }
    }

    const handleEliminarArchivo = (index: number) => {
        setArchivosCola((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (archivosCola.length === 0) {
            toast.error('Por favor, seleccioná al menos un archivo .stl u .obj')
            return
        }

        setIsSubiendo(true)
        const toastId = toast.loading('Subiendo archivos 3D a la nube...')

        try {
            const supabase = createClient()
            const archivosSubidos: Archivo3D[] = []

            for (const item of archivosCola) {
                const cleanName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
                const path = `${pacienteId}/${Date.now()}_${cleanName}`

                const { data, error } = await supabase.storage
                    .from('escaneos_3d')
                    .upload(path, item.file, {
                        cacheControl: '3600',
                        upsert: true,
                    })

                if (error) {
                    // Fallback al bucket paciente_adjuntos si escaneos_3d tuviera restricción
                    const fallbackRes = await supabase.storage
                        .from('paciente_adjuntos')
                        .upload(`3d/${path}`, item.file, {
                            cacheControl: '3600',
                            upsert: true,
                        })

                    if (fallbackRes.error) {
                        throw new Error(`Error subiendo ${item.file.name}: ${fallbackRes.error.message}`)
                    }

                    const { data: publicUrlData } = supabase.storage
                        .from('paciente_adjuntos')
                        .getPublicUrl(`3d/${path}`)

                    archivosSubidos.push({
                        id: crypto.randomUUID(),
                        nombre: item.file.name,
                        url: publicUrlData.publicUrl,
                        tipo: item.tipo,
                        formato: item.formato,
                        size_bytes: item.file.size,
                    })
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('escaneos_3d')
                        .getPublicUrl(path)

                    archivosSubidos.push({
                        id: crypto.randomUUID(),
                        nombre: item.file.name,
                        url: publicUrlData.publicUrl,
                        tipo: item.tipo,
                        formato: item.formato,
                        size_bytes: item.file.size,
                    })
                }
            }

            // Parsear piezas dentales si se ingresaron (ej: "46, 45")
            const piezasArray = piezasStr
                .split(',')
                .map((s) => parseInt(s.trim()))
                .filter((n) => !isNaN(n))
                .map((n) => ({
                    toothNo: n,
                    category: 'CROWN',
                    material: material.toUpperCase(),
                }))

            const res = await crearEscaneo3DAction({
                pacienteId,
                nombreCaso: nombreCaso.trim() || 'Escaneo 3D Intraoral',
                archivos: archivosSubidos,
                piezasDentales: piezasArray,
                observaciones: notas.trim() || undefined,
            })

            if (res.error) {
                toast.error(`Error guardando escaneo: ${res.error}`, { id: toastId })
            } else {
                toast.success('Escaneo 3D guardado exitosamente', { id: toastId })
                onEscaneoCreado?.()
                onOpenChange(false)
                setArchivosCola([])
                setNombreCaso('')
                setPiezasStr('')
                setNotas('')
            }
        } catch (err: any) {
            console.error('Error al subir escaneo 3D:', err)
            toast.error(err.message || 'Error al procesar la subida', { id: toastId })
        } finally {
            setIsSubiendo(false)
        }
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-lg p-6 bg-background/95 border-border/70">
                <GlassDialogHeader className="mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                            <GlassDialogTitle className="text-lg">Subir Escaneo 3D</GlassDialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Compatible con modelos .STL, .OBJ y .PLY de Medit, 3Shape o iTero.
                            </p>
                        </div>
                    </div>
                </GlassDialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                            Título del Caso
                        </label>
                        <Input
                            placeholder="Ej: Escaneo Maxilar y Mandíbula - Implante 46"
                            value={nombreCaso}
                            onChange={(e) => setNombreCaso(e.target.value)}
                            required
                        />
                    </div>

                    {/* Zona Drag & Drop */}
                    <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                            Archivos 3D (.STL / .OBJ)
                        </label>
                        <div className="relative border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-background/40 cursor-pointer">
                            <input
                                type="file"
                                multiple
                                accept=".stl,.obj,.ply"
                                onChange={handleFileSelect}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                                <Box className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                                Hacé clic para seleccionar o arrastrá los archivos acá
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Podés subir el Maxilar Superior, Mandíbula y Registro de Mordida
                            </p>
                        </div>
                    </div>

                    {/* Lista de Archivos Seleccionados */}
                    {archivosCola.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Archivos listos ({archivosCola.length})
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                {archivosCola.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/60 text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <FileText className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate font-medium">{item.file.name}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                ({(item.file.size / (1024 * 1024)).toFixed(1)} MB)
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <select
                                                value={item.tipo}
                                                onChange={(e) => {
                                                    const val = e.target.value as ArchivoEnCola['tipo']
                                                    setArchivosCola((prev) =>
                                                        prev.map((it, i) => (i === idx ? { ...it, tipo: val } : it))
                                                    )
                                                }}
                                                className="h-6 text-[11px] rounded-lg bg-background border border-border px-1.5 text-foreground cursor-pointer"
                                            >
                                                <option value="maxilar_superior">Max. Superior</option>
                                                <option value="maxilar_inferior">Mandíbula</option>
                                                <option value="oclusion">Oclusión / Mordida</option>
                                                <option value="otro">Otro</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => handleEliminarArchivo(idx)}
                                                className="text-muted-foreground hover:text-red-500 p-1"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadatos Clínicos Opcionales */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">
                                Piezas Dentales (FDI)
                            </label>
                            <Input
                                placeholder="Ej: 46, 45"
                                value={piezasStr}
                                onChange={(e) => setPiezasStr(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">
                                Material Sugerido
                            </label>
                            <select
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                className="h-9 w-full text-xs rounded-xl bg-background border border-border px-2.5 text-foreground cursor-pointer outline-none"
                            >
                                <option value="Zirconia">Zirconia</option>
                                <option value="Disilicato (e.max)">Disilicato (e.max)</option>
                                <option value="PMMA">PMMA (Provisorio)</option>
                                <option value="Titanio">Titanio</option>
                                <option value="Resina 3D">Resina 3D</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                        <GlassButton
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubiendo}
                        >
                            Cancelar
                        </GlassButton>
                        <GlassButton type="submit" disabled={isSubiendo || archivosCola.length === 0}>
                            {isSubiendo ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    Subiendo...
                                </>
                            ) : (
                                'Guardar Escaneo 3D'
                            )}
                        </GlassButton>
                    </div>
                </form>
            </GlassDialogContent>
        </GlassDialog>
    )
}

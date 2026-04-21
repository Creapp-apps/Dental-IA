'use client'

import { useState, useRef } from 'react'
import { UploadCloud, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { glassAlert } from '@/components/ui/glass-alert'
import { cn } from '@/lib/utils'
import { uploadTenantLogo } from '@/lib/actions/storage'

interface ImageUploaderProps {
    value?: string | null
    onChange: (url: string) => void
    className?: string
}

export function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = async (file: File) => {
        // Validaciones básicas
        if (!file.type.startsWith('image/')) {
            glassAlert.error({ title: 'Formato inválido', description: 'Por favor selecciona una imagen PNG o JPG.' })
            return
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB max
            glassAlert.error({ title: 'Archivo muy grande', description: 'La imagen debe pesar 2MB como máximo.' })
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await uploadTenantLogo(formData)
            if (res.error) {
                glassAlert.error({ title: 'Error al subir', description: res.error })
            } else if (res.url) {
                onChange(res.url)
                glassAlert.success({ title: 'Imagen subida', description: 'El logo se ha cargado correctamente.' })
            }
        } catch (e: any) {
            glassAlert.error({ title: 'Error inesperado', description: e.message })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Caja de Drop / Upload */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-36 group",
                    isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-white/5",
                    isUploading && "opacity-50 pointer-events-none"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    ) : value ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3" />
                    ) : (
                        <div className="h-10 w-10 rounded-full glass flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="h-4 w-4 text-primary" />
                        </div>
                    )}

                    <p className="text-sm font-medium text-foreground">
                        {isUploading ? 'Subiendo imagen...' : value ? 'Imagen lista' : 'Hacé clic o soltá tu logo acá'}
                    </p>
                    {!isUploading && !value && (
                        <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG (Máx. 2MB)
                        </p>
                    )}
                    {value && !isUploading && (
                        <p className="text-xs text-primary mt-1 hover:underline">
                            Hacé clic para reemplazar
                        </p>
                    )}
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0])
                    e.target.value = '' // Reset input
                }}
                disabled={isUploading}
            />

            {/* Hint Box (Recomendaciones) */}
            <div className="glass-subtle rounded-lg p-3.5 flex items-start gap-3">
                <ImageIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong className="text-foreground">Proporciones recomendadas:</strong></p>
                    <ul className="list-disc pl-3 space-y-0.5 opacity-90">
                        <li><strong>Logo principal:</strong> Proporción 3:1 o 4:1 (Ej: 600x200px).</li>
                        <li><strong>Ícono / Isotipo:</strong> Proporción 1:1 o cuadrado (Ej: 200x200px).</li>
                    </ul>
                    <p className="pt-1 opacity-80">Idealmente usá fondo transparente (PNG).</p>
                </div>
            </div>
        </div>
    )
}

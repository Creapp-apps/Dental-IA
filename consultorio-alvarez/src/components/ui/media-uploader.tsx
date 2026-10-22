'use client'

import { useState, useRef } from 'react'
import { UploadCloud, Loader2, CheckCircle2, Film, Image as ImageIcon } from 'lucide-react'
import { glassAlert } from '@/components/ui/glass-alert'
import { cn } from '@/lib/utils'
import { uploadTenantMedia } from '@/lib/actions/storage'

type MediaKind = 'image' | 'video'

interface MediaUploaderProps {
    value?: string | null
    onChange: (url: string) => void
    folder: 'hero' | 'videos' | 'servicios'
    kind?: MediaKind
    className?: string
}

// Límites alineados con el bodySizeLimit de server actions (next.config.ts: 10mb).
const MAX_IMAGE = 3 * 1024 * 1024
const MAX_VIDEO = 10 * 1024 * 1024

export function MediaUploader({ value, onChange, folder, kind = 'image', className }: MediaUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isVideo = kind === 'video'
    const accept = isVideo ? 'video/mp4, video/webm' : 'image/png, image/jpeg, image/webp'
    const maxBytes = isVideo ? MAX_VIDEO : MAX_IMAGE
    const maxLabel = isVideo ? '10MB' : '3MB'

    const handleFile = async (file: File) => {
        const tipoOk = isVideo ? file.type.startsWith('video/') : file.type.startsWith('image/')
        if (!tipoOk) {
            glassAlert.error({ title: 'Formato inválido', description: isVideo ? 'Subí un video MP4 o WebM.' : 'Subí una imagen PNG, JPG o WebP.' })
            return
        }
        if (file.size > maxBytes) {
            glassAlert.error({ title: 'Archivo muy grande', description: `El archivo debe pesar ${maxLabel} como máximo.` })
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', folder)

            const res = await uploadTenantMedia(formData)
            if (res.error) {
                glassAlert.error({ title: 'Error al subir', description: res.error })
            } else if (res.url) {
                onChange(res.url)
                glassAlert.success({ title: isVideo ? 'Video subido' : 'Imagen subida', description: 'El archivo se cargó correctamente.' })
            }
        } catch (e: any) {
            glassAlert.error({ title: 'Error inesperado', description: e.message })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div
                className={cn(
                    'relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-28 group',
                    isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-white/5',
                    isUploading && 'opacity-50 pointer-events-none'
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
                {/* Preview del medio cargado */}
                {value && !isUploading && (
                    isVideo ? (
                        <video src={value} className="absolute inset-0 h-full w-full object-cover opacity-60" muted playsInline />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={value} alt="preview" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                    )
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/10">
                    {isUploading ? (
                        <Loader2 className="h-7 w-7 text-primary animate-spin mb-2" />
                    ) : value ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-400 mb-2 drop-shadow" />
                    ) : (
                        <div className="h-9 w-9 rounded-full glass flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            {isVideo ? <Film className="h-4 w-4 text-primary" /> : <UploadCloud className="h-4 w-4 text-primary" />}
                        </div>
                    )}
                    <p className="text-xs font-medium text-foreground drop-shadow">
                        {isUploading ? 'Subiendo...' : value ? 'Hacé clic para reemplazar' : (isVideo ? 'Subí tu video' : 'Subí tu imagen')}
                    </p>
                    {!isUploading && !value && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            {isVideo ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                            {isVideo ? `MP4 / WebM (Máx. ${maxLabel})` : `PNG, JPG, WebP (Máx. ${maxLabel})`}
                        </p>
                    )}
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={accept}
                onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0])
                    e.target.value = ''
                }}
                disabled={isUploading}
            />
        </div>
    )
}

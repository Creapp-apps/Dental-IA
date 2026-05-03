'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Image as ImageIcon, Trash2, Download, UploadCloud, Loader2, Plus, File, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { glassAlert } from '@/components/ui/glass-alert'
import { uploadPacienteAdjunto, deletePacienteAdjunto } from '@/lib/actions/adjuntos'
import { useRouter } from 'next/navigation'

interface Adjunto {
    id: string
    nombre_archivo: string
    url_archivo: string
    tipo_archivo: string
    size_bytes: number
    observaciones: string | null
    created_at: string
}

interface TabAdjuntosProps {
    pacienteId: string
    adjuntos: Adjunto[]
}

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType === 'application/pdf') return FileText
    return File
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function TabAdjuntos({ pacienteId, adjuntos }: TabAdjuntosProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [showUploadForm, setShowUploadForm] = useState(false)
    const [previewAdjunto, setPreviewAdjunto] = useState<Adjunto | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    
    // For the form
    const [fileToUpload, setFileToUpload] = useState<File | null>(null)
    const [observaciones, setObservaciones] = useState('')
    
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (file: File) => {
        // Validation
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            glassAlert.error({ title: 'Formato inválido', description: 'Por favor seleccioná un PDF o una imagen (JPG/PNG).' })
            return
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB
            glassAlert.error({ title: 'Archivo muy grande', description: 'El archivo debe pesar 10MB como máximo.' })
            return
        }
        
        setFileToUpload(file)
        setShowUploadForm(true)
    }

    const handleUploadSubmit = async () => {
        if (!fileToUpload) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', fileToUpload)
            formData.append('pacienteId', pacienteId)
            if (observaciones) {
                formData.append('observaciones', observaciones)
            }

            const res = await uploadPacienteAdjunto(formData)
            if (res.error) {
                glassAlert.error({ title: 'Error al subir', description: res.error })
            } else {
                glassAlert.success({ title: 'Archivo subido', description: 'El estudio se ha guardado correctamente.' })
                // Reset form
                setFileToUpload(null)
                setObservaciones('')
                setShowUploadForm(false)
                // Refresh data
                router.refresh()
            }
        } catch (e: any) {
            glassAlert.error({ title: 'Error inesperado', description: e.message })
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (id: string, url: string) => {
        if (!confirm('¿Estás seguro de eliminar este archivo? Esta acción no se puede deshacer.')) return
        
        try {
            const res = await deletePacienteAdjunto(id, url)
            if (res.error) {
                glassAlert.error({ title: 'Error al eliminar', description: res.error })
            } else {
                glassAlert.success({ title: 'Archivo eliminado', description: 'El archivo fue eliminado correctamente.' })
                router.refresh()
            }
        } catch (e: any) {
            glassAlert.error({ title: 'Error', description: 'No se pudo eliminar el archivo.' })
        }
    }

    return (
        <div className="space-y-4">
            {/* Cabecera y botón de subir */}
            <div className="flex items-center justify-between glass rounded-2xl shadow-glass p-5">
                <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Estudios y Documentos ({adjuntos.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Radiografías, resultados de laboratorio, consentimientos, etc.
                    </p>
                </div>
                {!showUploadForm && (
                    <button 
                        onClick={() => setShowUploadForm(true)}
                        className="glass-button bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg transition-all h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Subir archivo</span>
                    </button>
                )}
            </div>

            {/* Formulario de subida */}
            <AnimatePresence>
                {showUploadForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                            <h4 className="text-sm font-medium text-foreground">Subir nuevo archivo</h4>
                            
                            {!fileToUpload ? (
                                <div
                                    className={cn(
                                        "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-32 group",
                                        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-white/5"
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        setIsDragging(false)
                                        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="h-10 w-10 rounded-full glass flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <UploadCloud className="h-4 w-4 text-primary" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">
                                            Hacé clic o soltá tu archivo acá
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            PDF, JPG, PNG (Máx. 10MB)
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="application/pdf,image/png,image/jpeg,image/webp"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                                            e.target.value = ''
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="glass-subtle rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                {fileToUpload.type.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground line-clamp-1">{fileToUpload.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatBytes(fileToUpload.size)}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setFileToUpload(null)}
                                            className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                            disabled={isUploading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-foreground mb-1.5 block">
                                            Observaciones (opcional)
                                        </label>
                                        <input 
                                            type="text"
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            placeholder="Ej: Radiografía panorámica post-tratamiento"
                                            className="w-full glass-input h-9 px-3 rounded-xl text-sm"
                                            disabled={isUploading}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button 
                                            onClick={() => {
                                                setFileToUpload(null)
                                                setObservaciones('')
                                                setShowUploadForm(false)
                                            }}
                                            className="glass px-4 h-9 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
                                            disabled={isUploading}
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleUploadSubmit}
                                            disabled={isUploading}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isUploading ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                            ) : (
                                                <><UploadCloud className="h-4 w-4" /> Subir archivo</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lista de archivos */}
            {adjuntos.length === 0 ? (
                <div className="glass rounded-2xl shadow-glass p-8 text-center">
                    <div className="h-12 w-12 rounded-full glass flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aún no hay archivos</p>
                    <p className="text-xs text-muted-foreground mt-1">Acá van a aparecer los estudios y documentos del paciente.</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {adjuntos.map((adj) => {
                        const Icon = getFileIcon(adj.tipo_archivo)
                        return (
                            <div key={adj.id} className="glass rounded-xl p-4 shadow-sm hover:shadow-glass transition-shadow group flex flex-col justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1" title={adj.nombre_archivo}>
                                            {adj.nombre_archivo}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatBytes(adj.size_bytes)} · {format(new Date(adj.created_at), "d MMM yyyy", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                
                                {adj.observaciones && (
                                    <p className="text-xs text-muted-foreground mt-3 bg-muted/20 p-2 rounded-lg line-clamp-2">
                                        {adj.observaciones}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                                    <button 
                                        onClick={() => setPreviewAdjunto(adj)}
                                        className="flex-1 glass h-8 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Eye className="h-3 w-3" /> Ver
                                    </button>
                                    <a 
                                        href={adj.url_archivo} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 glass h-8 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Download className="h-3 w-3" /> Descargar
                                    </a>
                                    <button 
                                        onClick={() => handleDelete(adj.id, adj.url_archivo)}
                                        className="h-8 w-8 shrink-0 glass rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center justify-center"
                                        title="Eliminar archivo"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal de visualización */}
            {mounted && createPortal(
                <AnimatePresence>
                    {previewAdjunto && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
                        onClick={() => setPreviewAdjunto(null)}
                    >
                        {/* Header Flotante */}
                        <div 
                            className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                                    {previewAdjunto.tipo_archivo.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-medium text-white line-clamp-1">{previewAdjunto.nombre_archivo}</h4>
                                    <p className="text-xs text-white/60">{formatBytes(previewAdjunto.size_bytes)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPreviewAdjunto(null)}
                                className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Contenedor del Archivo */}
                        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative max-w-full max-h-full flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {previewAdjunto.tipo_archivo.startsWith('image/') ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img 
                                        src={previewAdjunto.url_archivo} 
                                        alt={previewAdjunto.nombre_archivo} 
                                        className="max-w-full max-h-[85vh] object-contain rounded-md shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                                    />
                                ) : previewAdjunto.tipo_archivo === 'application/pdf' ? (
                                    <iframe 
                                        src={`${previewAdjunto.url_archivo}#toolbar=0`} 
                                        className="w-[90vw] max-w-5xl h-[85vh] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-white ring-1 ring-white/10"
                                        title={previewAdjunto.nombre_archivo}
                                    />
                                ) : (
                                    <div className="text-center p-8 bg-white/5 backdrop-blur-xl rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
                                        <File className="h-16 w-16 text-white/50 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-white">Vista previa no disponible</p>
                                        <p className="text-sm text-white/60 mt-2 mb-6">Este tipo de archivo debe ser descargado para visualizarse.</p>
                                        <a 
                                            href={previewAdjunto.url_archivo} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center gap-2 w-full bg-white text-black h-11 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all"
                                        >
                                            <Download className="h-4 w-4" /> Descargar archivo
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

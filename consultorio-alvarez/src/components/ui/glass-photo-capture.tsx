'use client'

import { createPortal } from 'react-dom'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Check, RefreshCcw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GlassButton } from '@/components/ui/glass-button'
import { glassAlert } from '@/components/ui/glass-alert'
import { cn } from '@/lib/utils'

interface GlassPhotoCaptureProps {
    value?: string
    onChange: (url: string) => void
    className?: string
}

export function GlassPhotoCapture({ value, onChange, className }: GlassPhotoCaptureProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<'IDLE' | 'CAMERA' | 'PREVIEW' | 'UPLOADING'>('IDLE')
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Detener la cámara al cerrar
    useEffect(() => {
        if (!isOpen && stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }, [isOpen, stream])

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
            })
            setStream(mediaStream)
            setMode('CAMERA')
        } catch (err: any) {
            console.error('Error accessing camera:', err)
            glassAlert.error({
                title: 'Error de cámara',
                description: 'No pudimos acceder a la cámara web. Verificá los permisos del navegador.'
            })
        }
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')

            canvas.width = video.videoWidth > 0 ? video.videoWidth : 640
            canvas.height = video.videoHeight > 0 ? video.videoHeight : 640

            if (context) {
                context.translate(canvas.width, 0)
                context.scale(-1, 1)

                context.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
                setCapturedImage(imageDataUrl)
                setMode('PREVIEW')

                if (stream) {
                    stream.getTracks().forEach(track => track.stop())
                    setStream(null)
                }
            }
        }
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        startCamera()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            glassAlert.error({ title: 'Archivo muy grande', description: 'La imagen debe pesar menos de 5MB.' })
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            setCapturedImage(event.target?.result as string)
            setMode('PREVIEW')
        }
        reader.readAsDataURL(file)
    }

    const confirmAndUpload = async () => {
        if (!capturedImage) return

        setMode('UPLOADING')
        try {
            const response = await fetch(capturedImage)
            const blob = await response.blob()
            const file = new File([blob], `patient-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

            const supabase = createClient()
            const filename = `${crypto.randomUUID()}-${file.name}`

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filename, file, { cacheControl: '3600', upsert: false })

            if (error) throw error

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filename)

            onChange(publicUrlData.publicUrl)

            glassAlert.success({
                title: 'Foto guardada',
                description: 'La foto de perfil se ha subido correctamente.'
            })
            setIsOpen(false)

        } catch (error: any) {
            console.error('Upload Error:', error)
            glassAlert.error({
                title: 'Error al subir',
                description: error.message || 'Ocurrió un error inesperado subiendo la imagen.'
            })
            setMode('PREVIEW')
        }
    }

    return (
        <div className={className}>
            {/* Trigger Button / Avatar Preview */}
            <div className="flex flex-col items-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setMode('IDLE')
                        setCapturedImage(null)
                        setIsOpen(true)
                    }}
                    className="relative group h-24 w-24 rounded-full bg-sidebar border border-border shadow-sm flex items-center justify-center overflow-hidden transition-all hover:ring-4 hover:ring-primary/20"
                >
                    {value ? (
                        <img src={value} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    )}

                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <span className="text-xs font-medium text-foreground">{value ? 'Cambiar' : 'Agregar foto'}</span>
                    </div>
                </button>
            </div>

            {/* Modal Glass */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-md bg-sidebar/95 supports-[backdrop-filter]:bg-sidebar/80 backdrop-blur-3xl border border-sidebar-border shadow-glass-xl rounded-3xl overflow-hidden flex flex-col z-50 p-6"
                            >
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-foreground">Foto del Paciente</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Tomá una foto desde el mostrador o subí un archivo.</p>
                                </div>

                                {/* Viewport content */}
                                <div className="relative aspect-square w-full bg-black/20 rounded-2xl overflow-hidden flex items-center justify-center border border-border/50 mb-6">

                                    {mode === 'IDLE' && (
                                        <div className="flex flex-col gap-4 w-full px-8">
                                            <GlassButton onClick={startCamera} className="h-14 justify-center text-base" variant="default">
                                                <Camera className="h-5 w-5 mr-3" />
                                                Activar Cámara Web
                                            </GlassButton>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                            />
                                            <GlassButton onClick={() => fileInputRef.current?.click()} className="h-14 justify-center text-base">
                                                <Upload className="h-5 w-5 mr-3" />
                                                Subir Archivo Local
                                            </GlassButton>
                                        </div>
                                    )}

                                    {mode === 'CAMERA' && (
                                        <>
                                            <video
                                                ref={(node) => {
                                                    if (node && stream && node.srcObject !== stream) {
                                                        node.srcObject = stream
                                                    }
                                                    // @ts-ignore
                                                    videoRef.current = node
                                                }}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover scale-x-[-1]" // Mirror effect
                                            />
                                            <canvas ref={canvasRef} className="hidden" />
                                            <div className="absolute bottom-4 inset-x-0 flex justify-center">
                                                <button
                                                    onClick={capturePhoto}
                                                    className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border-4 border-black/10"
                                                >
                                                    <div className="h-12 w-12 rounded-full border-2 border-black/80" />
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {(mode === 'PREVIEW' || mode === 'UPLOADING') && capturedImage && (
                                        <div className="w-full h-full relative">
                                            <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                                            {mode === 'UPLOADING' && (
                                                <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center">
                                                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                                                    <p className="font-medium text-foreground">Procesando y subiendo...</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                {mode === 'PREVIEW' && (
                                    <div className="flex gap-3 justify-end mt-auto">
                                        <GlassButton variant="ghost" onClick={retakePhoto} className="flex-1">
                                            <RefreshCcw className="h-4 w-4 mr-2" /> Eliminar
                                        </GlassButton>
                                        <GlassButton variant="default" onClick={confirmAndUpload} className="flex-1">
                                            <Check className="h-4 w-4 mr-2" /> Guardar Foto
                                        </GlassButton>
                                    </div>
                                )}

                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { GlassButton } from '@/components/ui/glass-button'

export function getCroppedImg(
    imageSrc: string,
    pixelCrop: any
): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        const image = new Image()
        image.src = imageSrc
        await new Promise((r) => (image.onload = r))

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No 2d context'))

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas is empty'))
        }, 'image/jpeg', 0.9)
    })
}

interface AvatarCropperModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    imageSrc: string | null
    onCropCompleteAction: (blob: Blob, previewUrl: string) => void
}

export function AvatarCropperModal({
    open,
    onOpenChange,
    imageSrc,
    onCropCompleteAction
}: AvatarCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    const onCropComplete = useCallback((croppedArea: any, pixels: any) => {
        setCroppedAreaPixels(pixels)
    }, [])

    const handleConfirm = async () => {
        if (!imageSrc || !croppedAreaPixels) return

        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            const croppedImageUrl = URL.createObjectURL(croppedImageBlob)
            onCropCompleteAction(croppedImageBlob, croppedImageUrl)
            onOpenChange(false)
        } catch (e) {
            console.error(e)
        }
    }

    if (!imageSrc) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] glass p-0 overflow-hidden border-border/40">
                <DialogHeader className="p-4 border-b border-border/20 bg-background/20">
                    <DialogTitle className="text-foreground">Recortar Fotografía</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-[320px] bg-black flex flex-col relative items-center justify-center">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="px-6 py-4 flex items-center gap-4 bg-background/40">
                    <span className="text-xs text-muted-foreground w-12 font-medium">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        min={1}
                        max={3}
                        step={0.05}
                        className="flex-1 accent-primary"
                    />
                </div>
                <DialogFooter className="p-4 border-t border-border/20 bg-background/20 flex gap-2 sm:justify-end">
                    <div className="flex w-full justify-end gap-2">
                        <GlassButton size="sm" variant="glass" onClick={() => onOpenChange(false)}>Cancelar</GlassButton>
                        <GlassButton size="sm" onClick={handleConfirm}>Confirmar Rostro</GlassButton>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

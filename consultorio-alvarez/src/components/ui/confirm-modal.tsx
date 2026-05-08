import { AlertTriangle } from 'lucide-react'
import { GlassDialog, GlassDialogContent, GlassDialogHeader, GlassDialogTitle, GlassDialogDescription, GlassDialogFooter } from './glass-dialog'
import { GlassButton } from './glass-button'

interface ConfirmModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    onConfirm: () => void
    isDestructive?: boolean
    confirmText?: string
    cancelText?: string
    isPending?: boolean
}

export function ConfirmModal({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    isDestructive = true,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isPending = false
}: ConfirmModalProps) {
    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-md">
                <GlassDialogHeader>
                    <div className="flex items-center gap-3">
                        {isDestructive && (
                            <div className="flex shrink-0 items-center justify-center rounded-full bg-red-500/20 w-10 h-10">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                        )}
                        <div>
                            <GlassDialogTitle>{title}</GlassDialogTitle>
                            <GlassDialogDescription className="mt-1.5">{description}</GlassDialogDescription>
                        </div>
                    </div>
                </GlassDialogHeader>
                
                <GlassDialogFooter className="mt-6">
                    <GlassButton 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        {cancelText}
                    </GlassButton>
                    <GlassButton 
                        variant={isDestructive ? 'destructive' : 'default'} 
                        onClick={() => {
                            onConfirm()
                            // If not pending, we can close immediately. 
                            // If pending, let the parent close it when done.
                            if (!isPending) onOpenChange(false)
                        }}
                        disabled={isPending}
                    >
                        {isPending ? 'Procesando...' : confirmText}
                    </GlassButton>
                </GlassDialogFooter>
            </GlassDialogContent>
        </GlassDialog>
    )
}

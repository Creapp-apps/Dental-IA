import { Loader2 } from 'lucide-react'

export default function GlobalLoading() {
    return (
        <div className="flex h-[70vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground animate-in fade-in zoom-in duration-500">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-r-primary animate-spin" />
                    <Loader2 className="h-5 w-5 text-primary opacity-0" /> {/* Oculto, solo para mantener tamaño si fallara el CSS */}
                </div>
                <p className="text-sm font-medium tracking-tight">Cargando sección...</p>
            </div>
        </div>
    )
}

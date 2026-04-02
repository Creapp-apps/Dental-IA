// Loading skeleton que aparece INSTANTÁNEAMENTE mientras el servidor
// fetchea los datos de la página /pacientes/nuevo.
// Framer Motion en template.tsx anima este skeleton con ease in/out.

export default function NuevoPacienteLoading() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted/60" />
                <div className="h-8 w-44 rounded-lg bg-muted/60" />
            </div>

            {/* Card: Perfil */}
            <div className="glass rounded-2xl shadow-glass p-5">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted/60" />
                    <div className="space-y-2 flex-1">
                        <div className="h-5 w-40 rounded bg-muted/60" />
                        <div className="h-4 w-64 rounded bg-muted/40" />
                    </div>
                </div>
            </div>

            {/* Card: Datos personales */}
            <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                <div className="h-5 w-36 rounded bg-muted/60" />
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="h-3.5 w-20 rounded bg-muted/40" />
                            <div className="h-9 rounded-lg bg-muted/30" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Card: Contacto */}
            <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                <div className="h-5 w-24 rounded bg-muted/60" />
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="h-3.5 w-16 rounded bg-muted/40" />
                            <div className="h-9 rounded-lg bg-muted/30" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Card: Obra social */}
            <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                <div className="h-5 w-28 rounded bg-muted/60" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-9 rounded-lg bg-muted/30" />
                    <div className="h-9 rounded-lg bg-muted/30" />
                </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
                <div className="h-10 w-36 rounded-lg bg-primary/20" />
                <div className="h-10 w-24 rounded-lg bg-muted/30" />
            </div>
        </div>
    )
}

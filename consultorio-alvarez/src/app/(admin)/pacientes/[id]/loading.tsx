export default function FichaPacienteLoading() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl glass animate-pulse bg-muted/50" />
                    <div className="space-y-1.5">
                        <div className="h-8 w-64 rounded-xl bg-muted/60 animate-pulse" />
                    </div>
                </div>
                <div className="h-9 w-32 rounded-xl bg-muted/40 animate-pulse" />
            </div>

            {/* Layout: Sidebar + Tabs */}
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* ── Left Profile Card Skeleton ── */}
                <div className="space-y-4">
                    <div className="glass rounded-2xl shadow-glass p-5 space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-4 ring-primary/10 animate-pulse" />
                            <div className="h-5 w-40 rounded-lg bg-muted/60 animate-pulse mb-1.5" />
                            <div className="h-4 w-20 rounded-md bg-muted/40 animate-pulse" />
                        </div>

                        <div className="space-y-3 pt-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="h-3.5 w-16 rounded bg-muted/40 animate-pulse" />
                                    <div className="h-3.5 w-24 rounded bg-muted/50 animate-pulse" />
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-border">
                            <div className="h-8 w-full rounded-xl bg-muted/40 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* ── Right Content Skeleton ── */}
                <div className="space-y-4">
                    {/* Tab Bar Skeleton */}
                    <div className="flex gap-1 glass rounded-xl p-1 shadow-glass overflow-x-auto">
                        {['Consulta', 'Turnos', 'Evoluciones', 'Odontograma', 'Escaneos 3D', 'Presupuestos', 'Adjuntos'].map((name, idx) => (
                            <div
                                key={name}
                                className={`h-9 flex-1 min-w-[70px] rounded-lg animate-pulse ${
                                    idx === 0 ? 'bg-primary/20' : 'bg-muted/30'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Tab Main Content Card Skeleton */}
                    <div className="glass rounded-2xl shadow-glass p-6 space-y-4 min-h-[380px]">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div className="h-5 w-44 rounded-lg bg-muted/60 animate-pulse" />
                            <div className="h-7 w-28 rounded-lg bg-muted/40 animate-pulse" />
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="h-4 w-full rounded-lg bg-muted/40 animate-pulse" />
                            <div className="h-4 w-5/6 rounded-lg bg-muted/30 animate-pulse" />
                            <div className="h-4 w-4/6 rounded-lg bg-muted/30 animate-pulse" />
                        </div>

                        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="h-20 rounded-xl bg-muted/20 border border-border/30 animate-pulse" />
                            <div className="h-20 rounded-xl bg-muted/20 border border-border/30 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, Phone, CreditCard } from 'lucide-react'
import { type Paciente } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function BuscadorPacientes({
    pacientes,
    initialQuery,
}: {
    pacientes: Paciente[]
    initialQuery: string
}) {
    const [query, setQuery] = useState(initialQuery)
    const [, startTransition] = useTransition()
    const router = useRouter()

    function handleSearch(val: string) {
        setQuery(val)
        startTransition(() => {
            const params = new URLSearchParams()
            if (val) params.set('q', val)
            router.push(`/pacientes?${params.toString()}`)
        })
    }

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, apellido o DNI..."
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Link href="/pacientes/nuevo" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <UserPlus className="h-4 w-4" />
                    Nuevo paciente
                </Link>
            </div>

            {/* Tabla */}
            {pacientes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                    <p className="text-muted-foreground text-sm">
                        {query ? `No se encontraron pacientes para "${query}"` : 'No hay pacientes registrados aún.'}
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border border-border overflow-hidden bg-card">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paciente</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">DNI</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Teléfono</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Obra social</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alta</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {pacientes.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-foreground">
                                            {p.apellido}, {p.nombre}
                                        </p>
                                        {p.fecha_nacimiento && (
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(p.fecha_nacimiento + 'T00:00:00'), 'dd/MM/yyyy')}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                        {p.dni ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        {p.telefono ? (
                                            <a
                                                href={`tel:${p.telefono}`}
                                                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Phone className="h-3.5 w-3.5" />
                                                {p.telefono}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {p.obra_social ? (
                                            <Badge variant="secondary" className="font-normal gap-1">
                                                <CreditCard className="h-3 w-3" />
                                                {p.obra_social.nombre}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground hidden">
                                        {format(new Date(p.created_at), "dd/MM/yy")}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/pacientes/${p.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                                            Ver ficha
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

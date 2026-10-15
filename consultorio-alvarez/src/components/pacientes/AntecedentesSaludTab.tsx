'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeartPulse, Pencil, Check, X } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { guardarAntecedentesSalud } from '@/lib/actions/pacientes'
import {
    PREGUNTAS,
    AFECCIONES,
    anamnesisVacia,
    anamnesisTieneDatos,
    type AntecedentesSalud,
} from '@/lib/pacientes/antecedentes-salud'

interface AntecedentesSaludTabProps {
    pacienteId: string
    inicial?: AntecedentesSalud | null
}

/** Normaliza lo guardado a una estructura completa (todas las preguntas presentes). */
function normalizar(saved?: AntecedentesSalud | null): AntecedentesSalud {
    const base = anamnesisVacia()
    if (!saved) return base
    const preguntas = { ...base.preguntas }
    for (const p of PREGUNTAS) {
        const r = saved.preguntas?.[p.id]
        if (r) preguntas[p.id] = { valor: !!r.valor, detalle: r.detalle ?? '' }
    }
    return {
        preguntas,
        afecciones: saved.afecciones ?? [],
        afecciones_detalle: saved.afecciones_detalle ?? {},
        consentimiento: saved.consentimiento,
        actualizado_en: saved.actualizado_en,
        actualizado_por: saved.actualizado_por,
    }
}

export function AntecedentesSaludTab({ pacienteId, inicial }: AntecedentesSaludTabProps) {
    const router = useRouter()
    const [editando, setEditando] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<AntecedentesSalud>(() => normalizar(inicial))

    const tieneDatos = anamnesisTieneDatos(inicial)

    function setPregunta(id: string, campo: 'valor' | 'detalle', v: boolean | string) {
        setData(prev => ({
            ...prev,
            preguntas: { ...prev.preguntas, [id]: { ...prev.preguntas[id], [campo]: v } },
        }))
    }

    function toggleAfeccion(id: string) {
        setData(prev => {
            const marcada = prev.afecciones.includes(id)
            return { ...prev, afecciones: marcada ? prev.afecciones.filter(x => x !== id) : [...prev.afecciones, id] }
        })
    }

    function setAfeccionDetalle(id: string, v: string) {
        setData(prev => ({ ...prev, afecciones_detalle: { ...(prev.afecciones_detalle ?? {}), [id]: v } }))
    }

    function setConsentimiento(aceptado: boolean) {
        setData(prev => ({
            ...prev,
            consentimiento: aceptado
                ? { aceptado: true, fecha: new Date().toISOString().slice(0, 10) }
                : undefined,
        }))
    }

    async function guardar() {
        setSaving(true)
        setError(null)
        const res = await guardarAntecedentesSalud(pacienteId, data)
        setSaving(false)
        if (res?.error) { setError(res.error); return }
        setEditando(false)
        router.refresh()
    }

    function cancelar() {
        setData(normalizar(inicial))
        setEditando(false)
        setError(null)
    }

    return (
        <div className="glass rounded-2xl shadow-glass p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    Antecedentes de Salud
                </h3>
                {!editando ? (
                    <GlassButton size="sm" variant="glass" onClick={() => setEditando(true)} className="text-xs h-8">
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        {tieneDatos ? 'Editar' : 'Completar'}
                    </GlassButton>
                ) : (
                    <div className="flex gap-2">
                        <GlassButton size="sm" variant="outline" onClick={cancelar} disabled={saving} className="text-xs h-8">
                            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </GlassButton>
                        <GlassButton size="sm" onClick={guardar} loading={saving} className="text-xs h-8">
                            <Check className="h-3.5 w-3.5 mr-1" /> Guardar
                        </GlassButton>
                    </div>
                )}
            </div>

            {!editando && !tieneDatos && (
                <p className="text-sm text-muted-foreground italic">Sin antecedentes de salud cargados.</p>
            )}

            {(editando || tieneDatos) && (
                <>
                    {/* Preguntas Sí/No */}
                    <div className="space-y-2.5">
                        {PREGUNTAS.map(p => {
                            const resp = data.preguntas[p.id]
                            return (
                                <div key={p.id} className="glass-subtle rounded-xl px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm text-foreground">{p.label}</span>
                                        {editando ? (
                                            <SiNo valor={resp.valor} onChange={v => setPregunta(p.id, 'valor', v)} />
                                        ) : (
                                            <span className={cn('text-xs font-semibold shrink-0 px-2 py-0.5 rounded-lg',
                                                resp.valor ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground')}>
                                                {resp.valor ? 'SÍ' : 'NO'}
                                            </span>
                                        )}
                                    </div>
                                    {p.tieneDetalle && resp.valor && (
                                        editando ? (
                                            <Textarea
                                                className="mt-2"
                                                rows={1}
                                                placeholder="¿Cuál? / Especificar..."
                                                value={resp.detalle ?? ''}
                                                onChange={e => setPregunta(p.id, 'detalle', e.target.value)}
                                            />
                                        ) : resp.detalle ? (
                                            <p className="text-xs text-muted-foreground mt-1">→ {resp.detalle}</p>
                                        ) : null
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Afecciones */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Afecciones</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {AFECCIONES.map(af => {
                                const marcada = data.afecciones.includes(af.id)
                                if (!editando && !marcada) return null
                                return (
                                    <div key={af.id} className="space-y-1">
                                        <button
                                            type="button"
                                            disabled={!editando}
                                            onClick={() => editando && toggleAfeccion(af.id)}
                                            className={cn(
                                                'w-full flex items-center gap-2 text-left text-sm px-2.5 py-1.5 rounded-lg border transition-colors',
                                                marcada
                                                    ? 'border-red-500/40 bg-red-500/10 text-foreground'
                                                    : 'border-border/50 text-muted-foreground hover:bg-muted/40',
                                                !editando && 'cursor-default'
                                            )}
                                        >
                                            <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0',
                                                marcada ? 'bg-red-500 border-red-500' : 'border-muted-foreground/40')}>
                                                {marcada && <Check className="h-3 w-3 text-white" />}
                                            </span>
                                            {af.label}
                                        </button>
                                        {af.tieneDetalle && marcada && (
                                            editando ? (
                                                <Textarea
                                                    rows={1}
                                                    placeholder="¿Cuál?"
                                                    value={data.afecciones_detalle?.[af.id] ?? ''}
                                                    onChange={e => setAfeccionDetalle(af.id, e.target.value)}
                                                />
                                            ) : data.afecciones_detalle?.[af.id] ? (
                                                <p className="text-xs text-muted-foreground pl-2">→ {data.afecciones_detalle[af.id]}</p>
                                            ) : null
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Consentimiento */}
                    <div className="pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Consentimiento / Declaración</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            Declaro que he contestado todas las preguntas con honestidad, según mi conocimiento. Expreso mi
                            consentimiento para que se realicen las prestaciones y/o tratamientos propuestos por profesionales.
                        </p>
                        {editando ? (
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.consentimiento?.aceptado ?? false}
                                    onChange={e => setConsentimiento(e.target.checked)}
                                    className="h-4 w-4 rounded accent-primary"
                                />
                                Declaración aceptada
                            </label>
                        ) : data.consentimiento?.aceptado ? (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Check className="h-4 w-4" /> Aceptada el {data.consentimiento.fecha}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Pendiente de aceptación.</p>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    {!editando && data.actualizado_en && (
                        <p className="text-[11px] text-muted-foreground">
                            Última actualización: {new Date(data.actualizado_en).toLocaleDateString('es-AR')}
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

function SiNo({ valor, onChange }: { valor: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex rounded-lg overflow-hidden border border-border/60 shrink-0">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={cn('px-3 py-1 text-xs font-semibold', valor ? 'bg-red-500 text-white' : 'bg-transparent text-muted-foreground hover:bg-muted/40')}
            >SÍ</button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={cn('px-3 py-1 text-xs font-semibold', !valor ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40')}
            >NO</button>
        </div>
    )
}

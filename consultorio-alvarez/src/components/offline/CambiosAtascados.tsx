'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { syncManager } from '@/lib/offline/sync-manager'
import { localDb, type SyncOutboxItem } from '@/lib/offline/db'
import { describirItem, mensajeDeError } from '@/lib/offline/outbox-mensajes'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Atascado {
    item: SyncOutboxItem
    etiqueta: string
}

/**
 * Nombre legible de la fila que el item intenta subir. Si ya no está en la
 * base local, se cae al payload guardado en el propio item, que es lo único
 * que queda del cambio.
 */
async function etiquetaDeItem(item: SyncOutboxItem): Promise<string> {
    if (item.entity === 'pacientes') {
        const p = await localDb.pacientes.get(item.entity_id)
        const nombre = p
            ? `${p.nombre} ${p.apellido}`
            : `${item.payload?.nombre ?? ''} ${item.payload?.apellido ?? ''}`.trim()
        return nombre || 'sin nombre'
    }

    if (item.entity === 'turnos') {
        const t = await localDb.turnos.get(item.entity_id)
        return diaMes(t?.fecha_inicio ?? item.payload?.fecha_inicio, false)
    }

    const e = await localDb.evoluciones.get(item.entity_id)
    return diaMes(e?.fecha ?? item.payload?.fecha, true)
}

/** "del dd/MM", o "sin fecha" si el valor falta o no es una fecha válida (una fila atascada suele traer datos raros). */
function diaMes(valor: unknown, esIso: boolean): string {
    if (!valor) return 'sin fecha'
    const d = esIso ? parseISO(String(valor)) : new Date(valor as string)
    return isValid(d) ? `del ${format(d, 'dd/MM')}` : 'sin fecha'
}

function fechaCreacion(iso: string): string | null {
    const d = new Date(iso)
    return isValid(d) ? format(d, "d 'de' MMMM, HH:mm 'hs'", { locale: es }) : null
}

export function CambiosAtascados({ cantidad }: { cantidad: number }) {
    const [atascados, setAtascados] = useState<Atascado[]>([])
    const [aDescartar, setADescartar] = useState<Atascado | null>(null)

    const cargar = useCallback(async () => {
        if (cantidad === 0) return
        try {
            const items = await syncManager.listarAtascados()
            const conEtiqueta = await Promise.all(
                items.map(async item => ({ item, etiqueta: await etiquetaDeItem(item) }))
            )
            setAtascados(conEtiqueta)
        } catch (err) {
            console.warn('Error listando cambios atascados:', err)
        }
    }, [cantidad])

    // El setState de cargar() ocurre después de leer Dexie (async), no de forma síncrona
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { cargar() }, [cargar])

    const reintentar = async (id: number | undefined) => {
        if (id === undefined) return
        try {
            await syncManager.reintentarItem(id)
        } catch (err) {
            console.warn('Error reintentando cambio atascado:', err)
            toast.error('No se pudo reintentar el cambio. Probá de nuevo.')
        }
        // El contador puede no cambiar (p. ej. si vuelve a fallar): se relee la lista igual
        await cargar()
    }

    const reintentarTodos = async () => {
        try {
            await syncManager.reintentarTodos()
        } catch (err) {
            console.warn('Error reintentando cambios atascados:', err)
            toast.error('No se pudieron reintentar los cambios. Probá de nuevo.')
        }
        await cargar()
    }

    const descartar = async (id: number | undefined) => {
        setADescartar(null)
        if (id === undefined) return
        try {
            const descartados = await syncManager.descartarItem(id)
            if (descartados === 0) {
                // Ya no estaba atascado (p. ej. "Reintentar todos" lo volvió a poner en cola): no se tocó nada
                toast.info('Ese cambio ya no estaba con problema, así que no se descartó nada.')
            } else if (descartados > 1) {
                toast.success(`Se descartaron ${descartados} cambios de este registro.`)
            } else {
                toast.success('Cambio descartado.')
            }
        } catch (err) {
            console.warn('Error descartando cambio atascado:', err)
            toast.error('No se pudo descartar el cambio. Probá de nuevo.')
        }
        // Con 0 la lista quedó vieja: se relee para que la fila desaparezca
        await cargar()
    }

    // Con cantidad 0 no hay nada que mostrar, aunque la lista guardada sea vieja
    if (cantidad === 0 || atascados.length === 0) return null

    return (
        <>
            <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <span className="text-xs font-bold">
                            {atascados.length === 1
                                ? 'Un cambio con problema'
                                : `${atascados.length} cambios con problema`}
                        </span>
                    </div>
                    {atascados.length > 1 && (
                        <button
                            onClick={reintentarTodos}
                            className="text-[11px] font-semibold text-red-800 dark:text-red-200 underline underline-offset-2 cursor-pointer"
                        >
                            Reintentar todos
                        </button>
                    )}
                </div>

                <p className="text-[11px] text-red-900/80 dark:text-red-200/80 leading-relaxed">
                    Estos cambios no se pudieron subir a la nube y no se van a reintentar solos.
                </p>

                {atascados.map(({ item, etiqueta }) => {
                    const motivo = mensajeDeError(item.last_error_code, item.error_message)
                    // Si no hay una explicación propia, el motivo es el texto crudo de la base (en inglés):
                    // se muestra como detalle técnico y no como explicación principal
                    const esTecnico = !!item.error_message && motivo === item.error_message

                    return (
                        <div key={item.id} className="rounded-lg bg-background/60 p-2.5 space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                                {describirItem(item, etiqueta)}
                            </p>
                            {fechaCreacion(item.created_at) && (
                                <p className="text-[11px] text-muted-foreground">
                                    {fechaCreacion(item.created_at)}
                                </p>
                            )}
                            {esTecnico ? (
                                <>
                                    <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                                        No se pudo subir este cambio a la nube.
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed break-words">
                                        Detalle técnico: {motivo}
                                    </p>
                                </>
                            ) : (
                                <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                                    {motivo}
                                </p>
                            )}
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    onClick={() => reintentar(item.id)}
                                    className="text-[11px] font-semibold text-foreground underline underline-offset-2 cursor-pointer"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={() => setADescartar({ item, etiqueta })}
                                    className="text-[11px] font-semibold text-muted-foreground hover:text-red-600 underline underline-offset-2 cursor-pointer"
                                >
                                    Descartar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <ConfirmModal
                open={aDescartar !== null}
                onOpenChange={abierto => { if (!abierto) setADescartar(null) }}
                title="Descartar este cambio"
                description={aDescartar
                    ? `${describirItem(aDescartar.item, aDescartar.etiqueta)}. Este cambio no se va a guardar en la nube. Si hay otros cambios en cola sobre el mismo registro, se descartan también, porque no se pueden subir sin este. Lo que quedó guardado en esta computadora puede desaparecer en cuanto el sistema se sincronice, así que no cuentes con recuperarlo después. Si necesitás el contenido, copialo antes de continuar.`
                    : ''}
                confirmText="Descartar"
                onConfirm={() => descartar(aDescartar?.item.id)}
            />
        </>
    )
}

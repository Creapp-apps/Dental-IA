'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extraerRuta } from './rutas'

/** Una hora: cubre de sobra una consulta sin dejar la firma viva de más. */
const VIGENCIA_POR_DEFECTO = 60 * 60

/**
 * URL para mostrar un objeto de un bucket privado.
 *
 * Acepta tanto una ruta como una URL vieja guardada en la base, porque después de la
 * migración conviven las dos formas. Devuelve null si no se puede resolver, para que la
 * pantalla muestre el lugar vacío en vez de romperse.
 *
 * `buckets` puede ser más de uno: los archivos de escaneos 3D viven en `escaneos_3d` o en
 * `paciente_adjuntos` según si la subida primaria funcionó, y la ruta guardada no dice en
 * cuál. Se prueban en orden y gana el primero que firma.
 *
 * `descarga: true` firma la URL para que Supabase la sirva como adjunto
 * (Content-Disposition: attachment); con un string, además baja con ese nombre de archivo
 * en vez del nombre del objeto en Storage. Sirve para botones "Descargar": navegar a esa URL baja
 * el archivo sin abrir una pestaña, y `window.open` después de un await lo bloquea el
 * navegador por popup.
 */
export async function urlFirmada(
    buckets: string | readonly string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO,
    opciones: { descarga?: boolean | string } = {}
): Promise<string | null> {
    if (!valor) return null

    // Un asset local del repo (ej: '/models-3d/demo-maxillary.stl') no está en Storage
    // y no hay nada que firmar: se sirve tal cual.
    if (valor.startsWith('/')) return valor

    const lista: readonly string[] = typeof buckets === 'string' ? [buckets] : buckets

    try {
        const supabase = createClient()

        for (const bucket of lista) {
            const ruta = extraerRuta(valor, bucket)
            if (!ruta) continue

            const storage = supabase.storage.from(bucket)
            const { data, error } = opciones.descarga
                ? await storage.createSignedUrl(ruta, segundos, { download: opciones.descarga })
                : await storage.createSignedUrl(ruta, segundos)
            if (error) {
                console.warn(`[STORAGE] No se pudo firmar ${bucket}/${ruta}:`, error.message)
                continue
            }
            if (data?.signedUrl) return data.signedUrl
        }

        return null
    } catch (err) {
        console.warn('[STORAGE] Error firmando URL:', err)
        return null
    }
}

/**
 * Resuelve la URL firmada en un efecto. Distingue los tres estados: firmando
 * (`cargando`), firmada (`url`) y falló (`!cargando && !url`), para que la pantalla no
 * muestre un spinner eterno ante un objeto que ya no existe.
 */
export interface UrlFirmadaEstado {
    url: string | null
    cargando: boolean
}

export function useUrlFirmada(
    buckets: string | readonly string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO
): UrlFirmadaEstado {
    const clave = typeof buckets === 'string' ? buckets : buckets.join(',')
    // Identifica las entradas para las que se resolvió `url`. Guardarla junto al resultado
    // permite saber en el mismo render si el estado es de otro valor, sin esperar al efecto.
    const entrada = `${clave}|${valor ?? ''}|${segundos}`
    const [resuelto, setResuelto] = useState<{ entrada: string; url: string | null }>({ entrada: '', url: null })

    useEffect(() => {
        if (!valor) return
        let vigente = true

        urlFirmada(buckets, valor, segundos).then(u => {
            if (vigente) setResuelto({ entrada, url: u })
        })

        return () => { vigente = false }
        // `entrada` serializa la lista de buckets: evita refirmar en cada render por una
        // referencia de array nueva.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entrada])

    // Sin valor no hay nada que firmar: vacío y sin cargar. Con valor, mientras lo resuelto
    // no sea de esta entrada se está firmando (también en el primer render con un valor nuevo).
    if (!valor) return { url: null, cargando: false }
    if (resuelto.entrada !== entrada) return { url: null, cargando: true }
    return { url: resuelto.url, cargando: false }
}

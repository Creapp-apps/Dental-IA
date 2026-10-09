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
 */
export async function urlFirmada(
    buckets: string | string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO
): Promise<string | null> {
    if (!valor) return null

    // Un asset local del repo (ej: '/models-3d/demo-maxillary.stl') no está en Storage
    // y no hay nada que firmar: se sirve tal cual.
    if (valor.startsWith('/')) return valor

    const lista = Array.isArray(buckets) ? buckets : [buckets]

    try {
        const supabase = createClient()

        for (const bucket of lista) {
            const ruta = extraerRuta(valor, bucket)
            if (!ruta) continue

            const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ruta, segundos)
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
 * Resuelve la URL firmada en un efecto. Devuelve null mientras firma y si falla, así que
 * quien lo usa muestra su propio placeholder en los dos casos.
 */
export function useUrlFirmada(
    buckets: string | string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO
): string | null {
    const [url, setUrl] = useState<string | null>(null)
    const clave = Array.isArray(buckets) ? buckets.join(',') : buckets

    useEffect(() => {
        let vigente = true
        setUrl(null)

        urlFirmada(buckets, valor, segundos).then(u => {
            if (vigente) setUrl(u)
        })

        return () => { vigente = false }
        // `clave` serializa la lista de buckets: evita refirmar en cada render por una
        // referencia de array nueva.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, valor, segundos])

    return url
}

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
 * (Content-Disposition: attachment). Sirve para botones "Descargar": navegar a esa URL baja
 * el archivo sin abrir una pestaña, y `window.open` después de un await lo bloquea el
 * navegador por popup.
 */
export async function urlFirmada(
    buckets: string | string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO,
    opciones: { descarga?: boolean } = {}
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

            const storage = supabase.storage.from(bucket)
            const { data, error } = opciones.descarga
                ? await storage.createSignedUrl(ruta, segundos, { download: true })
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
    buckets: string | string[],
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO
): UrlFirmadaEstado {
    // Sin valor no hay nada que firmar, así que nace resuelto (vacío) y no cargando.
    const [estado, setEstado] = useState<UrlFirmadaEstado>({ url: null, cargando: !!valor })
    const clave = Array.isArray(buckets) ? buckets.join(',') : buckets

    useEffect(() => {
        let vigente = true
        setEstado({ url: null, cargando: !!valor })

        urlFirmada(buckets, valor, segundos).then(u => {
            if (vigente) setEstado({ url: u, cargando: false })
        })

        return () => { vigente = false }
        // `clave` serializa la lista de buckets: evita refirmar en cada render por una
        // referencia de array nueva.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, valor, segundos])

    return estado
}

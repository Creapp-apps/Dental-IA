/**
 * Rutas de Storage. Toda ruta empieza por el tenant_id, porque las políticas
 * de storage.objects derivan el consultorio del primer segmento del nombre.
 * Un archivo fuera de esa forma no pertenece a nadie y nadie puede leerlo.
 */

/** Buckets que guardan datos de pacientes y por lo tanto no son públicos. */
export const BUCKETS_PRIVADOS: ReadonlySet<string> = new Set([
    'avatars',
    'paciente_adjuntos',
    'escaneos_3d',
])

/** Un adjunto puede estar en cualquiera de los dos: el escaneo 3D cae a paciente_adjuntos si falla la subida primaria. */
export const BUCKETS_ADJUNTOS = ['paciente_adjuntos', 'escaneos_3d'] as const

/**
 * Arma la ruta de un objeto. Tira si falta el tenant: escribir en la raíz del
 * bucket dejaría un archivo que ninguna política alcanza, ni para leerlo ni
 * para borrarlo.
 */
export function rutaTenant(tenantId: string | null | undefined, ...segmentos: string[]): string {
    if (!tenantId) throw new Error('No se puede armar la ruta sin tenant_id')

    const limpios = segmentos
        .map(s => s.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)

    if (limpios.length === 0) throw new Error('No se puede armar la ruta sin segmentos')

    return [tenantId, ...limpios].join('/')
}

export function esRutaDeTenant(ruta: string, tenantId: string): boolean {
    // Sin tenant nadie es dueño de nada: evita que el prefijo '/' matchee.
    if (!tenantId) return false
    return ruta.startsWith(`${tenantId}/`)
}

/**
 * Devuelve la ruta del objeto a partir de lo que haya guardado la base: una
 * ruta, una URL pública vieja o una URL firmada. null si no se puede resolver.
 */
export function extraerRuta(valor: string, bucket: string): string | null {
    if (!valor) return null

    if (!/^https?:\/\//.test(valor)) return valor

    const marca = `/storage/v1/object/`
    const i = valor.indexOf(marca)
    if (i === -1) return null

    // .../object/public/<bucket>/<ruta> o .../object/sign/<bucket>/<ruta>?token=
    const resto = valor.slice(i + marca.length).split('?')[0]
    const partes = resto.split('/')
    const modo = partes.shift()
    if (modo !== 'public' && modo !== 'sign') return null
    if (partes.shift() !== bucket) return null

    // Supabase percent-encodea el nombre en la URL; sin decodificar apuntaría a un objeto inexistente.
    try {
        const ruta = decodeURIComponent(partes.join('/'))
        return ruta || null
    } catch {
        return null
    }
}

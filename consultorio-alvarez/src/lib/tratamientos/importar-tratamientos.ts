// Importación rápida de tipos de tratamiento desde un pegado de texto
// (una prestación por línea). Lógica pura, testeable.

export interface LineaTratamiento {
    nombre: string
    precio_referencia?: number
}

/**
 * Parsea un número en formato argentino: "1.500" = 1500, "1.500,50" = 1500.5,
 * "$ 2.000" = 2000. Devuelve undefined si no hay un número válido > 0.
 */
export function parsearPrecioAR(raw: string): number | undefined {
    const limpio = (raw ?? '').replace(/[^0-9.,]/g, '')
    if (!limpio) return undefined
    // Punto = separador de miles, coma = decimal.
    const normalizado = limpio.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(normalizado)
    if (isNaN(n) || n <= 0) return undefined
    return n
}

/**
 * Parsea el texto pegado. Una línea por tratamiento. Formatos por línea:
 *   "Nombre"
 *   "Nombre ; 1500"   (separador ; o tab — p. ej. al pegar de una planilla)
 * El precio es opcional. Ignora líneas vacías y nombres vacíos.
 */
export function parsearLineasTratamientos(texto: string): LineaTratamiento[] {
    const out: LineaTratamiento[] = []
    for (const raw of (texto ?? '').split(/\r?\n/)) {
        const linea = raw.trim()
        if (!linea) continue
        const partes = linea.split(/[\t;]/).map(s => s.trim())
        const nombre = partes[0]
        if (!nombre) continue
        const precio_referencia = partes.length > 1 ? parsearPrecioAR(partes[partes.length - 1]) : undefined
        out.push(precio_referencia !== undefined ? { nombre, precio_referencia } : { nombre })
    }
    return out
}

/**
 * Separa los que hay que crear de los que se omiten: descarta duplicados dentro
 * del propio pegado y los que ya existen (comparando por nombre, sin distinguir
 * mayúsculas/acentos de más — comparación simple case-insensitive).
 */
export function filtrarNuevos(
    lineas: LineaTratamiento[],
    nombresExistentes: string[],
): { nuevos: LineaTratamiento[]; omitidos: string[] } {
    const yaExiste = new Set(nombresExistentes.map(n => n.trim().toLowerCase()))
    const vistos = new Set<string>()
    const nuevos: LineaTratamiento[] = []
    const omitidos: string[] = []
    for (const l of lineas) {
        const key = l.nombre.toLowerCase()
        if (yaExiste.has(key) || vistos.has(key)) {
            omitidos.push(l.nombre)
            continue
        }
        vistos.add(key)
        nuevos.push(l)
    }
    return { nuevos, omitidos }
}

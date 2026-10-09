/**
 * Migración de una sola corrida: mueve los objetos de Storage a rutas que
 * empiezan por el tenant_id, y reemplaza en la base las URLs completas por
 * la ruta del objeto.
 *
 * Correr con: npx tsx scripts/migrar-storage-a-tenant.ts [--seco]
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 *
 * Se puede cortar y volver a correr: cada objeto se busca en el origen y en el
 * destino antes de moverlo, y cada columna solo se reescribe si difiere.
 * --seco no escribe nada, pero sí lee la base y Storage para decir qué haría.
 *
 * Ojo: si se vuelve a correr cuando ya existen escaneos 3D, tiene la misma ambigüedad de dos
 * buckets que `BUCKETS_ADJUNTOS` (un adjunto puede apuntar a un objeto de `escaneos_3d`) y
 * aborta en un adjunto cuyo objeto está en `escaneos_3d`.
 */
import { createClient } from '@supabase/supabase-js'
import { extraerRuta } from '../src/lib/storage/rutas'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(url, key, { auth: { persistSession: false } })

const SECO = process.argv.includes('--seco')

// Rutas que alguna fila referencia (la vieja y la nueva), por bucket: no son huérfanas.
const referenciados: Record<string, Set<string>> = {
    avatars: new Set(),
    paciente_adjuntos: new Set(),
    escaneos_3d: new Set(),
}

type Cuenta = { filas: number, yaOk: number, aMover: number, yaMovidos: number, columnas: number, sinResolver: number, locales: number }
const cuentas: Record<string, Cuenta> = {}
const nuevaCuenta = (seccion: string): Cuenta =>
    (cuentas[seccion] = { filas: 0, yaOk: 0, aMover: 0, yaMovidos: 0, columnas: 0, sinResolver: 0, locales: 0 })

// Storage no tiene exists(): se lista la carpeta del objeto y se busca el nombre.
async function existe(bucket: string, ruta: string) {
    const i = ruta.lastIndexOf('/')
    const carpeta = i === -1 ? '' : ruta.slice(0, i)
    const nombre = ruta.slice(i + 1)
    const { data, error } = await db.storage.from(bucket).list(carpeta, { search: nombre, limit: 100 })
    if (error) throw new Error(`listar ${bucket}/${carpeta}: ${error.message}`)
    return (data ?? []).some(o => o.name === nombre && o.id !== null)
}

/**
 * Lleva un objeto de desde a hacia, tolerando una corrida anterior cortada:
 * en el origen -> se mueve; solo en el destino -> ya estaba movido;
 * en ninguno -> irrecuperable, se corta. Devuelve true si hizo falta mover.
 */
async function trasladar(bucket: string, desde: string, hacia: string, contexto: string, cuenta: Cuenta) {
    const enOrigen = await existe(bucket, desde)
    const enDestino = await existe(bucket, hacia)

    if (enOrigen && enDestino) throw new Error(`${contexto}: el objeto está en el origen ${desde} y también en el destino ${hacia}, resolver a mano`)
    if (!enOrigen && !enDestino) throw new Error(`${contexto}: el objeto no está ni en ${desde} ni en ${hacia}, irrecuperable`)

    if (enDestino) {
        console.log(`  ${bucket}: ${desde} -> ${hacia}  [ya estaba en el destino]`)
        cuenta.yaMovidos++
        return
    }

    console.log(`  ${bucket}: ${desde} -> ${hacia}  [se mueve]`)
    cuenta.aMover++
    if (SECO) return

    const { error } = await db.storage.from(bucket).move(desde, hacia)
    if (error) throw new Error(`move ${bucket}/${desde} (${contexto}): ${error.message}`)
}

/** Migra una columna que guarda la URL o la ruta de un objeto en el bucket, prefijándola con el tenant. */
async function migrarColumna(tabla: string, columna: string, bucket: string) {
    const seccion = `${tabla}.${columna}`
    console.log(`${seccion} (bucket ${bucket})`)
    const cuenta = nuevaCuenta(seccion)

    const { data, error: errLectura } = await db
        .from(tabla)
        .select(`id, tenant_id, ${columna}`)
        .not(columna, 'is', null)
    if (errLectura) throw new Error(`leer ${seccion}: ${errLectura.message}`)

    for (const fila of (data ?? []) as unknown as Array<Record<string, string>>) {
        cuenta.filas++
        const valor = fila[columna]
        const ruta = extraerRuta(valor, bucket)
        if (!ruta) { console.log(`  sin resolver, se deja (${fila.id}): ${valor}`); cuenta.sinResolver++; continue }

        // Una ruta absoluta es un archivo estático del sitio (p. ej. /models-3d/ de la demo), no un objeto de Storage.
        if (ruta.startsWith('/')) { console.log(`  archivo local, no es de Storage, se deja (${fila.id}): ${valor}`); cuenta.locales++; continue }

        let nueva = ruta
        if (ruta.startsWith(`${fila.tenant_id}/`)) {
            cuenta.yaOk++
        } else {
            nueva = `${fila.tenant_id}/${ruta}`
            await trasladar(bucket, ruta, nueva, `${seccion} fila ${fila.id}`, cuenta)
        }
        referenciados[bucket].add(ruta)
        referenciados[bucket].add(nueva)

        // La columna se reescribe si no guarda ya la ruta (por ejemplo, si guarda una URL).
        if (valor !== nueva) {
            cuenta.columnas++
            if (ruta === nueva) console.log(`  columna ${fila.id}: ${valor} -> ${nueva}`)
            if (SECO) continue
            const { error } = await db.from(tabla).update({ [columna]: nueva }).eq('id', fila.id)
            if (error) throw new Error(`update ${tabla} ${fila.id}: ${error.message}`)
        }
    }
}

async function migrarWaMedia() {
    const seccion = 'whatsapp_mensajes.metadata.media_url'
    const bucket = 'paciente_adjuntos'
    console.log(`${seccion} (bucket ${bucket})`)
    const cuenta = nuevaCuenta(seccion)

    const { data, error: errLectura } = await db
        .from('whatsapp_mensajes')
        .select('id, tenant_id, metadata')
        .not('metadata->>media_url', 'is', null)
    if (errLectura) throw new Error(`leer whatsapp_mensajes: ${errLectura.message}`)

    for (const m of data ?? []) {
        const metadata = m.metadata as Record<string, unknown> | null
        const valor = metadata?.media_url
        if (typeof valor !== 'string' || !valor) continue
        cuenta.filas++

        const ruta = extraerRuta(valor, bucket)
        if (!ruta) { console.log(`  sin resolver, se deja (${m.id}): ${valor}`); cuenta.sinResolver++; continue }

        const prefijo = `wa-media/${m.tenant_id}/`
        let nueva: string
        if (ruta.startsWith(`${m.tenant_id}/`)) {
            nueva = ruta
            cuenta.yaOk++
        } else if (ruta.startsWith(prefijo)) {
            // Reordenamiento, no prefijado: el tenant ya estaba en el segundo segmento.
            nueva = `${m.tenant_id}/wa-media/${ruta.slice(prefijo.length)}`
            await trasladar(bucket, ruta, nueva, `${seccion} fila ${m.id}`, cuenta)
        } else {
            console.log(`  forma inesperada, se deja (${m.id}): ${ruta}`); cuenta.sinResolver++; continue
        }
        referenciados[bucket].add(ruta)
        referenciados[bucket].add(nueva)

        // Aunque el objeto ya esté en su lugar, la columna se reescribe si no guarda la ruta.
        if (valor !== nueva) {
            cuenta.columnas++
            console.log(`  fila ${m.id}: media_url ${valor} -> ${nueva}`)
            if (SECO) continue
            // Se preserva el resto del JSON (en particular raw): solo cambia media_url.
            const { error } = await db
                .from('whatsapp_mensajes')
                .update({ metadata: { ...metadata, media_url: nueva } })
                .eq('id', m.id)
            if (error) throw new Error(`update whatsapp_mensajes ${m.id} (el objeto ya está en ${nueva}): ${error.message}`)
        }
    }
}

/** Lista todos los archivos del bucket, recorriendo las carpetas. */
async function listarArchivos(bucket: string, carpeta = ''): Promise<string[]> {
    const archivos: string[] = []
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.storage.from(bucket).list(carpeta, { limit: 1000, offset })
        if (error) throw new Error(`listar ${bucket}/${carpeta}: ${error.message}`)
        for (const o of data ?? []) {
            const ruta = carpeta ? `${carpeta}/${o.name}` : o.name
            if (o.id === null) archivos.push(...await listarArchivos(bucket, ruta))
            else archivos.push(ruta)
        }
        if ((data ?? []).length < 1000) break
    }
    return archivos
}

/** Archivos que ninguna fila referencia; tras cerrar los buckets quedan inalcanzables. */
async function huerfanos(bucket: string) {
    const todos = await listarArchivos(bucket)
    const sueltos = todos.filter(r => !referenciados[bucket].has(r))
    if (sueltos.length > 0) {
        console.log(`${bucket}: ${sueltos.length} objetos que ninguna fila referencia:`)
        sueltos.forEach(r => console.log(`  ${r}`))
        console.log('  Los que están fuera de una carpeta de consultorio quedan inaccesibles. Revisalos antes de borrarlos.')
    }
    return { total: todos.length, huerfanos: sueltos.length }
}

async function main() {
    if (SECO) console.log('MODO SECO: no se escribe nada\n')
    await migrarColumna('pacientes', 'foto_url', 'avatars')
    await migrarColumna('paciente_adjuntos', 'url_archivo', 'paciente_adjuntos')
    await migrarWaMedia()

    console.log('')
    let totalHuerfanos = 0
    const totales: string[] = []
    for (const b of ['avatars', 'paciente_adjuntos', 'escaneos_3d']) {
        const r = await huerfanos(b)
        totalHuerfanos += r.huerfanos
        totales.push(`${b}: ${r.total} objetos`)
    }

    console.log('\nReconciliación')
    let sinResolver = 0
    for (const [seccion, c] of Object.entries(cuentas)) {
        sinResolver += c.sinResolver
        console.log(`  ${seccion}: ${c.filas} filas, ${c.yaOk} ya tenant-first, ${c.aMover} por mover, ${c.yaMovidos} ya movidos, ${c.columnas} columnas por reescribir, ${c.sinResolver} sin resolver, ${c.locales} locales`)
    }
    console.log(`  ${totales.join(', ')}`)
    console.log(`  ${totalHuerfanos} huérfanos, ${sinResolver} sin resolver`)
    console.log('\nListo.')
}

main().catch(e => { console.error(e); process.exit(1) })

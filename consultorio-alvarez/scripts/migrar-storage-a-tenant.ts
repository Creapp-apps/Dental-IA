/**
 * Migración de una sola corrida: mueve los objetos de Storage a rutas que
 * empiezan por el tenant_id, y reemplaza en la base las URLs completas por
 * la ruta del objeto.
 *
 * Correr con: npx tsx scripts/migrar-storage-a-tenant.ts
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
import { createClient } from '@supabase/supabase-js'
import { extraerRuta } from '../src/lib/storage/rutas'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(url, key, { auth: { persistSession: false } })

const SECO = process.argv.includes('--seco')

// Rutas que alguna fila referencia, por bucket: no son huérfanas aunque sigan en la raíz (en seco todavía no se movieron).
const referenciados: Record<string, Set<string>> = { avatars: new Set(), paciente_adjuntos: new Set() }

async function moverSiHaceFalta(bucket: string, desde: string, tenantId: string) {
    if (desde.startsWith(`${tenantId}/`)) return desde

    const hacia = `${tenantId}/${desde}`
    console.log(`  ${bucket}: ${desde} -> ${hacia}`)
    if (SECO) return hacia

    const { error } = await db.storage.from(bucket).move(desde, hacia)
    if (error) throw new Error(`move ${bucket}/${desde}: ${error.message}`)
    return hacia
}

async function migrarFotosDePacientes() {
    console.log('pacientes.foto_url (bucket avatars)')
    const { data } = await db.from('pacientes').select('id, tenant_id, foto_url').not('foto_url', 'is', null)
    for (const p of data ?? []) {
        const ruta = extraerRuta(p.foto_url as string, 'avatars')
        if (!ruta) { console.log(`  sin resolver, se deja: ${p.foto_url}`); continue }
        referenciados.avatars.add(ruta)
        const nueva = await moverSiHaceFalta('avatars', ruta, p.tenant_id)
        if (!SECO) await db.from('pacientes').update({ foto_url: nueva }).eq('id', p.id)
    }
}

async function migrarAdjuntos() {
    console.log('paciente_adjuntos.url (bucket paciente_adjuntos)')
    const { data } = await db.from('paciente_adjuntos').select('id, tenant_id, url').not('url', 'is', null)
    for (const a of data ?? []) {
        const ruta = extraerRuta(a.url as string, 'paciente_adjuntos')
        if (!ruta) { console.log(`  sin resolver, se deja: ${a.url}`); continue }
        referenciados.paciente_adjuntos.add(ruta)
        const nueva = await moverSiHaceFalta('paciente_adjuntos', ruta, a.tenant_id)
        if (!SECO) await db.from('paciente_adjuntos').update({ url: nueva }).eq('id', a.id)
    }
}

async function huerfanos(bucket: string) {
    const { data } = await db.storage.from(bucket).list('', { limit: 1000 })
    const raiz = (data ?? []).filter(o => o.name && !o.name.includes('/'))
    // list() también devuelve las carpetas (id null); solo los archivos sueltos son objetos huérfanos.
    const archivos = raiz.filter(o => o.id !== null && !referenciados[bucket]?.has(o.name))
    const carpetas = raiz.filter(o => o.id === null)

    if (archivos.length > 0) {
        console.log(`${bucket}: ${archivos.length} objetos sin carpeta de consultorio, ninguna fila los referencia:`)
        archivos.forEach(o => console.log(`  ${o.name}`))
        console.log('  Quedan inaccesibles tras la Tarea 4. Revisalos antes de borrarlos.')
    }
    if (carpetas.length > 0) {
        console.log(`${bucket}: carpetas en la raíz (revisar las que no sean un tenant_id): ${carpetas.map(c => c.name).join(', ')}`)
    }
}

async function main() {
    if (SECO) console.log('MODO SECO: no se escribe nada\n')
    await migrarFotosDePacientes()
    await migrarAdjuntos()
    for (const b of ['avatars', 'paciente_adjuntos', 'escaneos_3d']) await huerfanos(b)
    console.log('\nListo.')
}

main().catch(e => { console.error(e); process.exit(1) })

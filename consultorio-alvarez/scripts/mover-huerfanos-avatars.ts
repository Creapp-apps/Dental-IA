/**
 * Operación de una sola vez: mueve a <tenant_id>/huerfanos/ las fotos que
 * quedaron en la raíz del bucket avatars y que ninguna fila referencia.
 *
 * Correr con: npx tsx scripts/mover-huerfanos-avatars.ts [--seco]
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 *
 * Por qué: tras cerrar los buckets, una política deriva el consultorio del
 * primer segmento del nombre. Un objeto en la raíz no pertenece a nadie y
 * queda inaccesible para siempre. Estas fotos no se borran porque son de
 * pacientes; se guardan bajo la carpeta del consultorio, donde sólo ese
 * consultorio las alcanza.
 *
 * Se puede cortar y volver a correr: se saltea lo que ya está movido.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(url, key, { auth: { persistSession: false } })

const SECO = process.argv.includes('--seco')
const SLUG = 'alvarez'
const CARPETA = 'huerfanos'

async function main() {
    if (SECO) console.log('MODO SECO: no se escribe nada\n')

    // El consultorio se resuelve por slug: hardcodear el UUID sería asumir cuál es.
    const { data: tenant, error: errTenant } = await db
        .from('tenants')
        .select('id, slug, nombre')
        .eq('slug', SLUG)
        .single()

    if (errTenant || !tenant) throw new Error(`No se pudo resolver el consultorio '${SLUG}': ${errTenant?.message}`)
    console.log(`Consultorio destino: ${tenant.nombre ?? tenant.slug} (${tenant.id})\n`)

    // Toda foto que alguna fila referencie, en cualquiera de las dos formas.
    const referenciadas = new Set<string>()
    const { data: pacientes, error: errPac } = await db
        .from('pacientes')
        .select('foto_url')
        .not('foto_url', 'is', null)

    if (errPac) throw new Error(`leer pacientes: ${errPac.message}`)
    for (const p of pacientes ?? []) {
        if (p.foto_url) referenciadas.add(p.foto_url as string)
    }

    const { data: objetos, error: errList } = await db.storage.from('avatars').list('', { limit: 1000 })
    if (errList) throw new Error(`listar avatars: ${errList.message}`)

    // list('') devuelve los objetos de la raíz y las carpetas como entradas sin id.
    const enLaRaiz = (objetos ?? []).filter(o => o.id !== null)

    let movidos = 0
    let salteados = 0

    for (const obj of enLaRaiz) {
        const nombre = obj.name

        // Una fila que todavía la referencie significa que no es huérfana: no se toca.
        const esReferenciada = [...referenciadas].some(v => v.includes(nombre))
        if (esReferenciada) {
            console.log(`  se deja (alguna fila la referencia): ${nombre}`)
            salteados++
            continue
        }

        const destino = `${tenant.id}/${CARPETA}/${nombre}`
        console.log(`  ${nombre} -> ${destino}`)

        if (!SECO) {
            const { error } = await db.storage.from('avatars').move(nombre, destino)
            if (error) throw new Error(`mover ${nombre}: ${error.message}`)
        }
        movidos++
    }

    console.log(`\n${movidos} ${SECO ? 'se moverían' : 'movidos'}, ${salteados} salteados por estar referenciados.`)
    if (enLaRaiz.length === 0) console.log('La raíz de avatars ya está vacía.')
}

main().then(() => console.log('\nListo.')).catch(e => {
    console.error('\nCORTÓ:', e.message)
    process.exit(1)
})

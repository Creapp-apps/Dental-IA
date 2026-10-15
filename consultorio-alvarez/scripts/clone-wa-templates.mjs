#!/usr/bin/env node
// Clona plantillas de mensaje de una WABA origen a una WABA destino (Meta Cloud API).
//
// Uso:
//   SRC_TOKEN=<token lectura origen> DST_TOKEN=<token destino> \
//   node scripts/clone-wa-templates.mjs            # dry-run: muestra qué crearía
//
//   ...mismos env...  node scripts/clone-wa-templates.mjs --apply   # crea de verdad
//
// Env (con defaults para Álvarez -> Curadent):
//   SRC_WABA   WABA origen        (default 2082562109362986  = Álvarez)
//   DST_WABA   WABA destino       (default 1793812051931080  = Curadent)
//   SRC_TOKEN  token con whatsapp_business_management sobre SRC_WABA (solo lectura necesaria)
//   DST_TOKEN  token con whatsapp_business_management sobre DST_WABA (el permanente de Curadent)
//   GRAPH_VERSION  (default v21.0)
//   REPLACEMENTS   JSON opcional {"texto viejo":"texto nuevo", ...} para sobreescribir los defaults
//   ONLY           lista separada por comas de nombres de plantilla a clonar (default: todas APPROVED)
//
// Los tokens se leen SOLO de env y NUNCA se imprimen.

const SRC_WABA = process.env.SRC_WABA || '2082562109362986'
const DST_WABA = process.env.DST_WABA || '1793812051931080'
const SRC_TOKEN = process.env.SRC_TOKEN
const DST_TOKEN = process.env.DST_TOKEN
const V = process.env.GRAPH_VERSION || 'v21.0'
const APPLY = process.argv.includes('--apply')
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)

const DEFAULT_REPLACEMENTS = {
    'Consultorio Álvarez': 'Curadent',
    'Consultorio Alvarez': 'Curadent',
    'Álvarez': 'Curadent',
    'Alvarez': 'Curadent',
    'Dentalva': 'Curadent',
}
const REPLACEMENTS = process.env.REPLACEMENTS
    ? JSON.parse(process.env.REPLACEMENTS)
    : DEFAULT_REPLACEMENTS

if (!SRC_TOKEN || !DST_TOKEN) {
    console.error('Faltan SRC_TOKEN y/o DST_TOKEN en el entorno.')
    process.exit(1)
}

function replaceText(s) {
    if (typeof s !== 'string') return s
    let out = s
    for (const [from, to] of Object.entries(REPLACEMENTS)) {
        out = out.split(from).join(to)
    }
    return out
}

// Transforma los components del formato de LECTURA al formato de CREACIÓN,
// aplicando los reemplazos de texto a los campos visibles y a los ejemplos.
function transformComponents(components) {
    return (components || []).map((c) => {
        const type = c.type // BODY | HEADER | FOOTER | BUTTONS
        if (type === 'BODY') {
            const out = { type: 'BODY', text: replaceText(c.text) }
            if (c.example?.body_text) {
                out.example = { body_text: c.example.body_text.map(row => row.map(replaceText)) }
            }
            return out
        }
        if (type === 'HEADER') {
            const out = { type: 'HEADER', format: c.format }
            if (c.text != null) out.text = replaceText(c.text)
            if (c.example?.header_text) {
                out.example = { header_text: c.example.header_text.map(replaceText) }
            }
            if (c.example?.header_handle) {
                out.example = { header_handle: c.example.header_handle }
            }
            return out
        }
        if (type === 'FOOTER') {
            return { type: 'FOOTER', text: replaceText(c.text) }
        }
        if (type === 'BUTTONS') {
            const buttons = (c.buttons || []).map((b) => {
                const nb = { type: b.type, text: replaceText(b.text) }
                if (b.type === 'URL') nb.url = b.url
                if (b.type === 'PHONE_NUMBER') nb.phone_number = b.phone_number
                if (b.type === 'COPY_CODE' && b.example) nb.example = b.example
                return nb
            })
            return { type: 'BUTTONS', buttons }
        }
        // tipo desconocido: pasar tal cual
        return c
    })
}

async function getAllTemplates() {
    const out = []
    let url = `https://graph.facebook.com/${V}/${SRC_WABA}/message_templates?limit=100&access_token=${SRC_TOKEN}`
    while (url) {
        const r = await fetch(url)
        const j = await r.json()
        if (!r.ok) throw new Error('GET origen falló: ' + JSON.stringify(j.error || j))
        out.push(...(j.data || []))
        url = j.paging?.next || null
    }
    return out
}

async function createTemplate(payload) {
    const r = await fetch(`https://graph.facebook.com/${V}/${DST_WABA}/message_templates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const j = await r.json()
    return { ok: r.ok, body: j }
}

async function main() {
    console.log(`Origen WABA ${SRC_WABA} -> Destino WABA ${DST_WABA}  (${APPLY ? 'APPLY' : 'DRY-RUN'})`)
    console.log('Reemplazos:', REPLACEMENTS)
    console.log('---')

    const all = await getAllTemplates()
    let list = all.filter(t => t.status === 'APPROVED')
    if (ONLY.length) list = list.filter(t => ONLY.includes(t.name))

    console.log(`Plantillas APPROVED en origen: ${all.filter(t => t.status === 'APPROVED').length}. A clonar: ${list.length}`)
    console.log('---')

    for (const t of list) {
        const payload = {
            name: t.name,
            language: t.language,       // ej. 'es_AR'
            category: t.category,       // UTILITY | MARKETING | AUTHENTICATION
            components: transformComponents(t.components),
        }

        // Mostrar el cuerpo resultante para revisión
        const body = payload.components.find(c => c.type === 'BODY')
        const buttons = payload.components.find(c => c.type === 'BUTTONS')
        console.log(`• ${t.name}  [${t.language} / ${t.category}]`)
        if (body) console.log('   BODY:', JSON.stringify(body.text))
        if (buttons) console.log('   BTN :', buttons.buttons.map(b => `${b.type}:${b.text}`).join(' | '))

        if (APPLY) {
            const res = await createTemplate(payload)
            if (res.ok) {
                console.log(`   ✅ creada  id=${res.body.id} status=${res.body.status}`)
            } else {
                const e = res.body.error || res.body
                console.log(`   ❌ error  ${e.code || ''} ${e.error_user_title || e.message || JSON.stringify(e)}`)
            }
        }
        console.log('')
    }

    if (!APPLY) console.log('DRY-RUN terminado. Revisá los textos y volvé a correr con --apply para crearlas.')
}

main().catch(e => { console.error(e.message || e); process.exit(1) })

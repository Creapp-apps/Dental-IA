# Storage privado por consultorio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las radiografías, estudios y fotos de pacientes dejen de ser legibles por cualquiera en internet, y que ningún consultorio pueda leer ni borrar archivos de otro.

**Architecture:** Las rutas de todos los objetos pasan a empezar por el `tenant_id`. Con eso, las políticas de `storage.objects` derivan el consultorio del primer segmento del nombre del archivo. Los buckets con datos de pacientes pasan a privados y se leen con URL firmada; `tenant_assets`, que alimenta la landing pública, sigue siendo de lectura abierta pero con escritura y borrado acotados.

**Tech Stack:** Supabase Storage, Postgres RLS sobre `storage.objects`, Next.js 16, Vitest.

**Spec:** `docs/plans/2026-10-08-roles-y-permisos-design.md`, sección 11.

## Global Constraints

- Las rutas de objetos son siempre `<tenant_id>/<resto>`. El `tenant_id` es el primer segmento, sin excepción.
- Buckets privados: `avatars`, `paciente_adjuntos`, `escaneos_3d`. Bucket público: `tenant_assets`.
- Ningún `getPublicUrl` sobre un bucket privado.
- Estilo del repo: indentación de 4 espacios, SIN punto y coma al final, comillas simples, comentarios en castellano.
- Todo texto de interfaz en español rioplatense, tuteando (`vos`).
- Al cerrar cada tarea tienen que pasar `npm test`, `npx tsc --noEmit` y `npm run build`.

## Estado medido antes de empezar

Contado contra la base real el 2026-10-08:

| Bucket | Objetos | `public` hoy | Destino |
|---|---|---|---|
| `avatars` | 32 | `true` | privado |
| `paciente_adjuntos` | 2 | `true` | privado |
| `tenant_assets` | 2 | `true` | público (landing) |
| `escaneos_3d` | 0 | `true` | privado |

Rutas actuales, por sitio de subida:

| Sitio | Bucket | Ruta | ¿Tenant primero? |
|---|---|---|---|
| `src/lib/actions/adjuntos.ts:43` | `paciente_adjuntos` | `${tenantId}/${pacienteId}/${ts}_${name}` | sí |
| `src/lib/actions/storage.ts:34` | `tenant_assets` | `${tenantId}/logos/logo_${ts}.${ext}` | sí |
| `src/components/config/ConfigView.tsx:715` | `tenant_assets` | `${tenantId}/profesionales/${ts}.jpg` | sí |
| `src/components/ui/glass-photo-capture.tsx:115` | `avatars` | `${uuid}-${name}` | **no** |
| `src/components/pacientes/ModalSubirEscaneo3D.tsx:90` | `escaneos_3d` | `${pacienteId}/${ts}_${name}` | **no** |
| `src/components/pacientes/ModalSubirEscaneo3D.tsx:103` | `paciente_adjuntos` | `3d/${pacienteId}/...` | **no** |
| `src/lib/whatsapp.ts:169` | `paciente_adjuntos` | `wa-media/${tenantId}/${ts}_${id}.${ext}` | **no** |

Sitios de lectura que hoy arman URL pública: `adjuntos.ts:59`, `storage.ts:50`, `whatsapp.ts:185`, `glass-photo-capture.tsx:123`, `ConfigView.tsx:726`, `ModalSubirEscaneo3D.tsx:114` y `:127`.

Dónde se renderiza lo guardado:

- `pacientes.foto_url` → `src/components/pacientes/PacientePerfilOptimistic.tsx:141`. Privado.
- `paciente_adjuntos.url` → `src/components/pacientes/visor-3d/Visor3DModal.tsx:384`. Privado.
- `profesionales.avatar_url` / `foto_url` → landing pública (`LandingProfesionales.tsx:66`, `landing-v2/sections/TeamSection.tsx:96`, `ReservarForm.tsx:276`, `landing-v2/booking/BookingForm.tsx:333`) y `ConfigView.tsx:841`. Público, se queda como está.

## Review Focus

1. **Un valor guardado que ya es una URL completa.** Tras la migración conviven filas con ruta y filas con URL vieja. El helper de lectura tiene que resolver las dos sin romper la pantalla. → Tarea 1.
2. **Una ruta sin tenant que llega desde una fila vieja.** Si alguna columna quedó apuntando a un objeto no migrado, firmar tiene que fallar devolviendo `null` y la interfaz mostrar el lugar vacío, no romperse. → Tarea 1.
3. **`tenant_id` vacío al construir una ruta.** Un cliente sin tenant cacheado no debe escribir en la raíz del bucket, donde ninguna política lo alcanzaría. → Tarea 1.
4. **La URL firmada vence mientras la pantalla está abierta.** Una ficha abierta media hora con una firma de 5 minutos muestra una imagen rota sin explicación. Se confirma a mano en la Tarea 6, paso 7; no hay test automático porque depende del reloj y del navegador.
5. **Un objeto cuyo primer segmento parece un tenant pero no lo es.** La política compara texto; `3d/...` o `wa-media/...` sin migrar quedarían inalcanzables para todos. Es el resultado buscado, pero hay que confirmarlo y no confundirlo con un bug. → Tarea 6.

---

## Task 1: Helper de rutas y lectura

**Files:**
- Create: `src/lib/storage/rutas.ts`
- Create: `src/lib/storage/rutas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `rutaTenant(tenantId: string | null | undefined, ...segmentos: string[]): string`, `esRutaDeTenant(ruta: string, tenantId: string): boolean`, `extraerRuta(valor: string, bucket: string): string | null`, `BUCKETS_PRIVADOS: ReadonlySet<string>`.

- [ ] **Step 1: Escribir los tests que fallan**

Escribir `src/lib/storage/rutas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { rutaTenant, esRutaDeTenant, extraerRuta, BUCKETS_PRIVADOS } from './rutas'

const TENANT = 'bbbf0312-0000-0000-0000-000000000000'

describe('rutaTenant', () => {
    it('pone el tenant como primer segmento', () => {
        expect(rutaTenant(TENANT, 'pacientes', 'foto.jpg')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    it('limpia barras sobrantes en los segmentos', () => {
        expect(rutaTenant(TENANT, '/pacientes/', '/foto.jpg')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    // Review Focus 3: nunca escribir en la raíz del bucket
    it('tira si el tenant está vacío', () => {
        expect(() => rutaTenant('', 'foto.jpg')).toThrow()
        expect(() => rutaTenant(null, 'foto.jpg')).toThrow()
        expect(() => rutaTenant(undefined, 'foto.jpg')).toThrow()
    })

    it('tira si no hay ningún segmento', () => {
        expect(() => rutaTenant(TENANT)).toThrow()
    })
})

describe('esRutaDeTenant', () => {
    it('reconoce la ruta propia', () => {
        expect(esRutaDeTenant(`${TENANT}/pacientes/foto.jpg`, TENANT)).toBe(true)
    })

    it('rechaza la de otro consultorio', () => {
        expect(esRutaDeTenant('otro-tenant/pacientes/foto.jpg', TENANT)).toBe(false)
    })

    // Review Focus 5: las rutas viejas sin tenant no pertenecen a nadie
    it('rechaza una ruta sin tenant', () => {
        expect(esRutaDeTenant('3d/paciente/archivo.stl', TENANT)).toBe(false)
        expect(esRutaDeTenant('foto.jpg', TENANT)).toBe(false)
    })
})

describe('extraerRuta', () => {
    it('devuelve la ruta tal cual si ya es una ruta', () => {
        expect(extraerRuta(`${TENANT}/pacientes/foto.jpg`, 'avatars')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    // Review Focus 1: conviven filas con URL vieja y filas con ruta
    it('saca la ruta de una URL pública vieja', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/public/avatars/${TENANT}/pacientes/foto.jpg`
        expect(extraerRuta(url, 'avatars')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    it('saca la ruta de una URL firmada', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/sign/avatars/${TENANT}/foto.jpg?token=abc`
        expect(extraerRuta(url, 'avatars')).toBe(`${TENANT}/foto.jpg`)
    })

    // Review Focus 2: un valor que no se puede resolver no rompe la pantalla
    it('devuelve null con un valor vacío o de otro bucket', () => {
        expect(extraerRuta('', 'avatars')).toBeNull()
        expect(extraerRuta('https://xyz.supabase.co/storage/v1/object/public/otro/foto.jpg', 'avatars')).toBeNull()
    })
})

describe('BUCKETS_PRIVADOS', () => {
    it('lista exactamente los buckets con datos de pacientes', () => {
        expect(BUCKETS_PRIVADOS.has('avatars')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('paciente_adjuntos')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('escaneos_3d')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('tenant_assets')).toBe(false)
    })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`
Expected: FAIL, no se resuelve `./rutas`.

- [ ] **Step 3: Escribir la implementación**

Escribir `src/lib/storage/rutas.ts`:

```typescript
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
    return ruta.startsWith(`${tenantId}/`)
}

/**
 * Devuelve la ruta del objeto a partir de lo que haya guardado la base: una
 * ruta, una URL pública vieja o una URL firmada. null si no se puede resolver.
 */
export function extraerRuta(valor: string, bucket: string): string | null {
    if (!valor) return null

    if (!valor.startsWith('http')) return valor

    const marca = `/storage/v1/object/`
    const i = valor.indexOf(marca)
    if (i === -1) return null

    // .../object/public/<bucket>/<ruta> o .../object/sign/<bucket>/<ruta>?token=
    const resto = valor.slice(i + marca.length).split('?')[0]
    const partes = resto.split('/')
    const modo = partes.shift()
    if (modo !== 'public' && modo !== 'sign') return null
    if (partes.shift() !== bucket) return null

    const ruta = partes.join('/')
    return ruta || null
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`
Expected: PASS. El total sube de 32 a 44 tests (12 nuevos).

- [ ] **Step 5: Verificar el proyecto**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add consultorio-alvarez/src/lib/storage/rutas.ts consultorio-alvarez/src/lib/storage/rutas.test.ts
git commit -m "feat(storage): helper de rutas por consultorio"
```

---

## Task 2: Normalizar las rutas de subida

**Files:**
- Modify: `src/components/ui/glass-photo-capture.tsx:113-125`
- Modify: `src/components/pacientes/ModalSubirEscaneo3D.tsx:88-130`
- Modify: `src/lib/whatsapp.ts:169`
- Modify: `src/lib/actions/adjuntos.ts:43`
- Modify: `src/lib/actions/storage.ts:34`
- Modify: `src/components/config/ConfigView.tsx:715`

**Interfaces:**
- Consumes: `rutaTenant` de la Tarea 1.
- Produces: todas las subidas escriben en `<tenant_id>/<resto>`.

- [ ] **Step 1: Los tres sitios que ya tienen el tenant adelante**

En `adjuntos.ts:43`, `storage.ts:34` y `ConfigView.tsx:715` la ruta ya empieza por el tenant, pero se arma a mano. Pasarlas por el helper, para que haya un solo lugar donde se decide la forma:

```typescript
// adjuntos.ts
const filePath = rutaTenant(tenantId, pacienteId, `${timestamp}_${safeName}`)

// storage.ts
const fileName = rutaTenant(tenantId, 'logos', `logo_${Date.now()}.${fileExt}`)

// ConfigView.tsx — el upload pasa a recibir la ruta ya armada
const fileName = rutaTenant(tenantId, 'profesionales', `${Date.now()}.jpg`)
// y el .upload(...) usa fileName en vez de `${tenantId}/${fileName}`
```

Importar `rutaTenant` de `@/lib/storage/rutas` en cada archivo.

- [ ] **Step 2: La foto del paciente**

`src/components/ui/glass-photo-capture.tsx` es un componente de cliente y hoy sube `${crypto.randomUUID()}-${file.name}`, sin tenant. El tenant se obtiene del cache local que ya existe:

```typescript
import { syncManager } from '@/lib/offline/sync-manager'
import { rutaTenant } from '@/lib/storage/rutas'

// dentro del handler de subida, antes del upload:
const tenantId = await syncManager.obtenerTenantId()
if (!tenantId) {
    throw new Error('No se pudo determinar el consultorio. Sincronizá y volvé a intentar.')
}
const filename = rutaTenant(tenantId, 'pacientes', `${crypto.randomUUID()}-${file.name}`)
```

El `upload` y el posterior armado de URL usan ese `filename`.

- [ ] **Step 3: Los escaneos 3D**

`src/components/pacientes/ModalSubirEscaneo3D.tsx` sube a `escaneos_3d` con `${pacienteId}/...` y, si falla, cae a `paciente_adjuntos` con `3d/${path}`. Las dos rutas pasan por el helper:

```typescript
const tenantId = await syncManager.obtenerTenantId()
if (!tenantId) {
    throw new Error('No se pudo determinar el consultorio. Sincronizá y volvé a intentar.')
}
const path = rutaTenant(tenantId, pacienteId, `${Date.now()}_${cleanName}`)
// y el fallback:
const fallbackPath = rutaTenant(tenantId, '3d', pacienteId, `${Date.now()}_${cleanName}`)
```

- [ ] **Step 4: Los adjuntos que llegan por WhatsApp**

`src/lib/whatsapp.ts:169` sube `wa-media/${tenantId}/...`, con el tenant en segundo lugar. Se da vuelta:

```typescript
const filePath = rutaTenant(tenantId, 'wa-media', `${Date.now()}_${mediaId}.${ext}`)
```

Ese código corre en el webhook, sin sesión y con el cliente admin, así que el `tenantId` ya lo resolvió quien llama. No hace falta tocar nada más ahí.

- [ ] **Step 5: Verificar**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 44 tests en verde, sin errores de tipos, build OK.

- [ ] **Step 6: Commit**

```bash
git add consultorio-alvarez/src
git commit -m "feat(storage): toda subida escribe bajo la carpeta del consultorio"
```

---

## Task 3: Migrar los objetos y las columnas existentes

**Files:**
- Create: `scripts/migrar-storage-a-tenant.ts`

**Interfaces:**
- Consumes: `extraerRuta` de la Tarea 1.
- Produces: todos los objetos bajo `<tenant_id>/...` y las columnas guardando la ruta, no la URL.

Son 36 objetos en total. El script es de una sola corrida y queda en el repo como registro.

- [ ] **Step 1: Escribir el script**

Escribir `scripts/migrar-storage-a-tenant.ts`:

```typescript
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
        const nueva = await moverSiHaceFalta('paciente_adjuntos', ruta, a.tenant_id)
        if (!SECO) await db.from('paciente_adjuntos').update({ url: nueva }).eq('id', a.id)
    }
}

async function huerfanos(bucket: string) {
    const { data } = await db.storage.from(bucket).list('', { limit: 1000 })
    const sueltos = (data ?? []).filter(o => o.name && !o.name.includes('/'))
    if (sueltos.length > 0) {
        console.log(`${bucket}: ${sueltos.length} objetos sin carpeta de consultorio, ninguna fila los referencia:`)
        sueltos.forEach(o => console.log(`  ${o.name}`))
        console.log('  Quedan inaccesibles tras la Tarea 4. Revisalos antes de borrarlos.')
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
```

- [ ] **Step 2: Correr en seco y leer la salida**

```bash
cd consultorio-alvarez
set -a && . ./.env.local && set +a
npx tsx scripts/migrar-storage-a-tenant.ts --seco
```

Expected: lista de movimientos propuestos y de huérfanos, sin escribir nada. Si aparece algún objeto huérfano, decidir qué hacer con él antes de seguir: tras la Tarea 4 nadie va a poder leerlo.

- [ ] **Step 3: Correr de verdad**

```bash
npx tsx scripts/migrar-storage-a-tenant.ts
```

Expected: cada objeto movido una sola vez; una segunda corrida no debería mover nada.

- [ ] **Step 4: Verificar que no quedó nada suelto**

```bash
npx tsx scripts/migrar-storage-a-tenant.ts --seco
```

Expected: ningún movimiento pendiente.

- [ ] **Step 5: Commit**

```bash
git add consultorio-alvarez/scripts/migrar-storage-a-tenant.ts
git commit -m "chore(storage): script de migracion de objetos a rutas por consultorio"
```

---

## Task 4: Leer con URL firmada

**Files:**
- Create: `src/lib/storage/url-firmada.ts`
- Modify: `src/components/pacientes/PacientePerfilOptimistic.tsx:141`
- Modify: `src/components/pacientes/visor-3d/Visor3DModal.tsx:384`
- Modify: `src/lib/actions/adjuntos.ts:57-60`
- Modify: `src/components/ui/glass-photo-capture.tsx:123`
- Modify: `src/components/pacientes/ModalSubirEscaneo3D.tsx:114,127`
- Modify: `src/lib/whatsapp.ts:184-187`

**Interfaces:**
- Consumes: `extraerRuta`, `BUCKETS_PRIVADOS` de la Tarea 1.
- Produces: `urlFirmada(bucket: string, valor: string | null | undefined, segundos?: number): Promise<string | null>`. Es sólo de cliente: los dos casos de servidor (`adjuntos.ts` y `whatsapp.ts`) guardan la ruta o firman en línea con el cliente admin, y no necesitan el helper.

Esta tarea va **antes** de cerrar los buckets: si se cierran primero, las imágenes se rompen hasta que esto esté.

- [ ] **Step 1: El helper**

Escribir `src/lib/storage/url-firmada.ts`:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { extraerRuta } from './rutas'

/** Una hora: cubre de sobra una consulta sin dejar la firma viva de más. */
const VIGENCIA_POR_DEFECTO = 60 * 60

/**
 * URL para mostrar un objeto de un bucket privado.
 *
 * Acepta tanto una ruta como una URL vieja guardada en la base, porque
 * después de la migración conviven las dos formas. Devuelve null si no se
 * puede resolver, para que la pantalla muestre el lugar vacío en vez de
 * romperse.
 */
export async function urlFirmada(
    bucket: string,
    valor: string | null | undefined,
    segundos: number = VIGENCIA_POR_DEFECTO
): Promise<string | null> {
    if (!valor) return null

    const ruta = extraerRuta(valor, bucket)
    if (!ruta) return null

    try {
        const supabase = createClient()
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ruta, segundos)
        if (error) {
            console.warn(`[STORAGE] No se pudo firmar ${bucket}/${ruta}:`, error.message)
            return null
        }
        return data?.signedUrl ?? null
    } catch (err) {
        console.warn('[STORAGE] Error firmando URL:', err)
        return null
    }
}
```

- [ ] **Step 2: La foto del paciente**

En `PacientePerfilOptimistic.tsx`, reemplazar el `src={p.foto_url}` directo por una URL firmada resuelta en un efecto:

```typescript
const [fotoUrl, setFotoUrl] = useState<string | null>(null)

useEffect(() => {
    let vigente = true
    urlFirmada('avatars', p.foto_url).then(u => { if (vigente) setFotoUrl(u) })
    return () => { vigente = false }
}, [p.foto_url])
```

El `<img>` pasa a `{fotoUrl && <img src={fotoUrl} … />}`. Si no se pudo firmar, queda el avatar con iniciales que el componente ya muestra cuando no hay foto.

- [ ] **Step 3: Los adjuntos y los escaneos**

En `Visor3DModal.tsx:384` el `href={archivo.url}` pasa a resolverse al hacer clic, no al renderizar, porque son varios archivos y no tiene sentido firmarlos todos de entrada:

```typescript
const abrirArchivo = async (valor: string) => {
    const u = await urlFirmada('paciente_adjuntos', valor)
    if (!u) {
        glassAlert.error({ title: 'No se pudo abrir el archivo', description: 'Puede que ya no esté disponible.' })
        return
    }
    window.open(u, '_blank', 'noopener')
}
```

El `<a href>` pasa a `<button onClick={() => abrirArchivo(archivo.url)}>`, conservando el estilo que ya tiene.

En `ModalSubirEscaneo3D.tsx:114` y `:127`, donde hoy se arma la URL pública después de subir, guardar **la ruta** en vez de la URL. Lo que se persiste es la ruta; firmar es responsabilidad de quien muestra.

- [ ] **Step 4: Lo que corre en el servidor**

`adjuntos.ts:57-60` y `whatsapp.ts:184-187` arman la URL pública para guardarla en la base. Pasan a guardar la ruta, igual que el paso anterior. Eliminar esas llamadas a `getPublicUrl`.

`glass-photo-capture.tsx:123` también: `onChange(filename)` con la ruta, no con la URL pública.

Atención: `whatsapp.ts` devuelve esa URL a quien la llama para mandarla por WhatsApp. Ese caso **sí** necesita una URL que Meta pueda descargar sin sesión, así que ahí va una URL firmada con vigencia larga (24 horas), generada con el cliente admin en el mismo archivo.

- [ ] **Step 5: Verificar**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 44 tests, sin errores.

- [ ] **Step 6: Verificación manual, con los buckets todavía públicos**

Abrir una ficha con foto, abrir un adjunto y mirar la landing pública. Todo tiene que seguir viéndose. Esto confirma que las firmas funcionan antes de cerrar nada.

- [ ] **Step 7: Commit**

```bash
git add consultorio-alvarez/src
git commit -m "feat(storage): leer los buckets privados con url firmada"
```

---

## Task 5: Cerrar los buckets

**Files:**
- Create: `supabase/migrations/025_storage_privado.sql`

**Interfaces:**
- Consumes: las rutas normalizadas de las Tareas 2 y 3.
- Produces: `avatars`, `paciente_adjuntos` y `escaneos_3d` privados y acotados por consultorio.

- [ ] **Step 1: Escribir la migración**

Escribir `supabase/migrations/025_storage_privado.sql`:

```sql
-- ============================================================
-- 025: Storage privado y acotado por consultorio
-- ============================================================
-- Los buckets con datos de pacientes se crearon con public = true y una
-- política de lectura abierta: cualquiera con la URL leía radiografías y
-- fotos sin estar logueado, y cualquier autenticado de cualquier consultorio
-- podía borrarlas.
--
-- Requisito: todos los objetos tienen que estar ya bajo <tenant_id>/...
-- (scripts/migrar-storage-a-tenant.ts). Un objeto fuera de esa forma queda
-- inaccesible a propósito.
--
-- tenant_assets NO se cierra: alimenta la landing pública (logos y fotos del
-- equipo). Sí se acotan su escritura y su borrado.

-- ---- 1. Buckets privados ----
UPDATE storage.buckets SET public = false
WHERE id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d');

-- ---- 2. Fuera las políticas viejas ----
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;

-- ---- 3. El consultorio sale del primer segmento del nombre ----
CREATE OR REPLACE FUNCTION storage_tenant_de_objeto(nombre TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN (string_to_array(nombre, '/'))[1]::UUID;
EXCEPTION WHEN OTHERS THEN
    -- Un nombre sin UUID adelante no pertenece a ningún consultorio.
    RETURN NULL;
END;
$$;

-- ---- 4. Buckets privados: sólo el propio consultorio ----
CREATE POLICY "privado_select_mismo_tenant" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

CREATE POLICY "privado_insert_mismo_tenant" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

CREATE POLICY "privado_update_mismo_tenant" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

CREATE POLICY "privado_delete_mismo_tenant" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

-- ---- 5. tenant_assets: lectura pública, escritura acotada ----
CREATE POLICY "assets_select_publico" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'tenant_assets');

CREATE POLICY "assets_escritura_mismo_tenant" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'tenant_assets'
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

CREATE POLICY "assets_update_mismo_tenant" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'tenant_assets'
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );

CREATE POLICY "assets_delete_mismo_tenant" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'tenant_assets'
        AND storage_tenant_de_objeto(name) = get_user_tenant_id()
    );
```

- [ ] **Step 2: Aplicarla**

Correrla en el SQL editor de Supabase. El proyecto no tiene la CLI vinculada, así que va a mano, como las anteriores.

- [ ] **Step 3: Verificar el cierre**

Pedir sin sesión un objeto que antes era público:

```bash
# La URL vieja se arma a mano con una ruta real:
# https://<proyecto>.supabase.co/storage/v1/object/public/paciente_adjuntos/<tenant_id>/<paciente_id>/<archivo>
curl -s -o /dev/null -w "%{http_code}\n" "$URL_PUBLICA_VIEJA"
```

Expected: `400` o `404`, ya no `200`.

- [ ] **Step 4: Commit**

```bash
git add consultorio-alvarez/supabase/migrations/025_storage_privado.sql
git commit -m "feat(storage): buckets privados y politicas por consultorio"
```

---

## Task 6: Verificación manual end-to-end

No escribe código. Confirma que lo anterior funciona y que el agujero quedó tapado.

- [ ] **Step 1: La URL vieja ya no sirve**

Tomar una URL pública de un adjunto de antes de la migración y abrirla en una ventana privada, sin sesión.
Expected: no se descarga nada.

- [ ] **Step 2: Lo propio sí se ve**

Con sesión del consultorio dueño: abrir una ficha con foto, abrir un adjunto, abrir un escaneo.
Expected: todo se ve.

- [ ] **Step 3: Lo ajeno no**

Con sesión del otro consultorio, pedir desde la consola del navegador un archivo del primero:

```javascript
const { data, error } = await supabase.storage.from('paciente_adjuntos').createSignedUrl('<tenant_ajeno>/<ruta>', 60)
```

Expected: error, y `data` nulo.

- [ ] **Step 4: El borrado ajeno tampoco**

Misma sesión, intentar borrar ese objeto.
Expected: falla.

- [ ] **Step 5: La landing sigue en pie**

Abrir la landing pública sin sesión.
Expected: logo y fotos del equipo se ven, porque `tenant_assets` sigue siendo de lectura abierta.

- [ ] **Step 6: Subir algo nuevo**

Subir una foto de paciente, un adjunto y un escaneo. Confirmar en Supabase que la ruta empieza por el `tenant_id`.
Expected: las tres rutas con la forma correcta, y los tres archivos visibles desde la app.

- [ ] **Step 7: Review Focus 4 — la firma vencida**

Dejar una ficha con foto abierta más tiempo que la vigencia de la firma y recargar la imagen.
Expected: la imagen se vuelve a firmar al montar el componente. Si se rompe estando la pantalla abierta, anotarlo: hace falta refirmar por tiempo, no sólo al montar.

- [ ] **Step 8: Anotar el resultado y commitear**

Agregar el registro al final de este plan y commitearlo.

---

## Desvío respecto de la spec

La spec (§11) propone separar las fotos de profesionales en un bucket propio
`perfiles_publicos`, para no dejar abierto un bucket que también guarda fotos de
pacientes. Al medir resultó innecesario: las fotos de profesionales ya viven en
`tenant_assets` (`ConfigView.tsx:715`) y las de pacientes en `avatars`
(`glass-photo-capture.tsx:115`). Están en buckets distintos desde el principio, así que
alcanza con cerrar `avatars` y dejar `tenant_assets` abierto. Un bucket nuevo sería mudanza
sin beneficio.

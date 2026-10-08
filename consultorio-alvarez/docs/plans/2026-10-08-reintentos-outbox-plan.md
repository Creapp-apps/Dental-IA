# Reintentos del outbox de sincronización — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún cambio hecho en una computadora del consultorio se pierda en silencio: los fallos transitorios se reintentan solos con espera creciente y los permanentes quedan visibles esperando una decisión del usuario.

**Architecture:** La política de reintentos vive en funciones puras (`outbox-policy.ts`, `outbox-errors.ts`, `outbox-mensajes.ts`) que no tocan Dexie ni la red y se testean con Vitest. `sync-manager.ts` las aplica contra IndexedDB, `pushOutboxChangesAction` clasifica el error de Postgres del lado del servidor, y `OfflineSyncWidget` expone los atascados con sus acciones.

**Tech Stack:** TypeScript, Next.js 16 (App Router), Dexie 4, Supabase JS 2, Vitest (se incorpora en la Tarea 1).

**Spec:** `docs/plans/2026-10-08-reintentos-outbox-design.md`

## Global Constraints

- Estados válidos del outbox: `PENDIENTE` y `ATASCADO`. `EN_PROCESO` y `ERROR` se eliminan del tipo.
- Escalera de espera, exacta: `attempts` 1 → 5 s, 2 → 15 s, 3 → 1 m, 4 → 5 m, 5 → 15 m, 6 → 1 h, 7 → `ATASCADO`. Máximo siete intentos de subida.
- Código de error desconocido o ausente se trata como **transitorio**.
- La clasificación transitorio/permanente se decide en el servidor, nunca en el cliente.
- Nada se descarta automáticamente. Descartar es siempre una acción explícita del usuario.
- Todo texto de interfaz va en español rioplatense, tuteando (`vos`), igual que el resto del widget.
- Los archivos nuevos siguen el estilo del repo: indentación de 4 espacios, sin punto y coma al final, comillas simples.
- `npx tsc --noEmit`, `npm run lint` sobre los archivos tocados y `npm run build` tienen que pasar al final de cada tarea.

## Review Focus

Cinco condiciones que el diseño implica, que ninguna prueba manual ejercita bien y que son las más probables de romper en producción. Cada una tiene su test asignado a la tarea que es dueña del código.

1. **`attempts` mayor que la escalera** (base local vieja, dato corrupto): `calcularProximoIntento(99, ahora)` tiene que devolver `null` y mandar el item a `ATASCADO`, no indexar fuera del arreglo ni devolver `NaN`. → Tarea 1.
2. **`next_attempt_at` con valor inválido o vacío**: un item con `next_attempt_at` en `null`, `''` o una fecha no parseable tiene que considerarse elegible ahora, no quedar bloqueado para siempre. → Tarea 1.
3. **Mismo `entity_id` en entidades distintas**: un turno atascado no puede bloquear a un paciente que casualmente comparte el UUID. El bloqueo es por par `entity` + `entity_id`. → Tarea 3.
4. **Todos los items filtrados**: si tras aplicar elegibilidad y bloqueo no queda ninguno, no se debe llamar a `pushOutboxChangesAction` con lista vacía ni marcar la sincronización como fallida. → test de `filtrarBloqueados` devolviendo vacío en la Tarea 3, más la guarda `if (elegibles.length > 0)` de la Tarea 5.
5. **Reloj del equipo adelantado**: si la PC tiene la hora mal y `next_attempt_at` queda meses en el futuro, el item nunca se reintentaría. El evento `online` limpia `next_attempt_at` de los `PENDIENTE`, que es la válvula de escape. → Tarea 5, paso 6. Esta no tiene test automático: depende de Dexie y de un evento del navegador, y se cubre a mano en la Tarea 9, paso 3. Es la única de las cinco que queda sin red de seguridad, y conviene saberlo.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/offline/outbox-policy.ts` | **Nuevo.** Escalera de espera, elegibilidad, orden de cola, bloqueo por entidad, transición de estado tras un fallo. Puro, sin Dexie ni red. |
| `src/lib/offline/outbox-errors.ts` | **Nuevo.** Qué códigos de Postgres son permanentes. Puro. Lo importa la server action. |
| `src/lib/offline/outbox-mensajes.ts` | **Nuevo.** Código de error a frase en castellano, y descripción legible de un item. Puro. Lo importa el widget. |
| `src/lib/offline/db.ts` | Dexie `version(4)`, estados y campos nuevos, migración de los `ERROR` existentes. |
| `src/lib/offline/sync-manager.ts` | Aplica la política contra IndexedDB. Métricas nuevas y acciones de reintentar y descartar. |
| `src/lib/actions/offline-sync.ts` | Clasifica el error en el servidor. `upsert` en turnos y pacientes. |
| `src/components/offline/CambiosAtascados.tsx` | **Nuevo.** La sección de cambios atascados con sus acciones y el modal de descarte. Vive aparte porque el widget ya tiene 426 líneas. |
| `src/components/offline/OfflineSyncWidget.tsx` | Estado rojo en el indicador y montaje de la sección nueva. |
| `vitest.config.ts` | **Nuevo.** Configuración de Vitest con el alias `@`. |

---

## Task 1: Vitest y la escalera de espera

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/offline/outbox-policy.ts`
- Create: `src/lib/offline/outbox-policy.test.ts`
- Modify: `package.json` (script `test`, devDependency `vitest`)

**Interfaces:**
- Consumes: nada.
- Produces: `ESPERAS_MS: readonly number[]`, `calcularProximoIntento(attempts: number, ahora: Date): string | null`, `esElegible(item: ItemElegible, ahora: Date): boolean`, `type ItemElegible = { status: EstadoOutbox; next_attempt_at?: string | null }`, `type EstadoOutbox = 'PENDIENTE' | 'ATASCADO'`.

- [ ] **Step 1: Instalar Vitest**

```bash
cd consultorio-alvarez
npm install -D vitest
```

- [ ] **Step 2: Crear la configuración**

Escribir `vitest.config.ts` en la raíz de `consultorio-alvarez/`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
```

- [ ] **Step 3: Agregar el script**

En `package.json`, dentro de `"scripts"`, agregar:

```json
"test": "vitest run"
```

- [ ] **Step 4: Escribir el test que falla**

Escribir `src/lib/offline/outbox-policy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularProximoIntento, esElegible } from './outbox-policy'

const AHORA = new Date('2026-10-08T12:00:00.000Z')

describe('calcularProximoIntento', () => {
    it('devuelve la espera de la escalera para cada intento', () => {
        expect(calcularProximoIntento(1, AHORA)).toBe('2026-10-08T12:00:05.000Z')
        expect(calcularProximoIntento(2, AHORA)).toBe('2026-10-08T12:00:15.000Z')
        expect(calcularProximoIntento(3, AHORA)).toBe('2026-10-08T12:01:00.000Z')
        expect(calcularProximoIntento(4, AHORA)).toBe('2026-10-08T12:05:00.000Z')
        expect(calcularProximoIntento(5, AHORA)).toBe('2026-10-08T12:15:00.000Z')
        expect(calcularProximoIntento(6, AHORA)).toBe('2026-10-08T13:00:00.000Z')
    })

    it('devuelve null cuando se agota la escalera', () => {
        expect(calcularProximoIntento(7, AHORA)).toBeNull()
    })

    // Review Focus 1: base local vieja o dato corrupto
    it('devuelve null con un contador fuera de rango en vez de romper', () => {
        expect(calcularProximoIntento(99, AHORA)).toBeNull()
        expect(calcularProximoIntento(0, AHORA)).toBeNull()
        expect(calcularProximoIntento(-3, AHORA)).toBeNull()
    })
})

describe('esElegible', () => {
    it('toma un pendiente sin espera pendiente', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: null }, AHORA)).toBe(true)
    })

    it('toma un pendiente cuya espera ya pasó', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T11:59:59.000Z' }
        expect(esElegible(item, AHORA)).toBe(true)
    })

    it('deja pasar un pendiente cuya espera todavía no venció', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T12:00:01.000Z' }
        expect(esElegible(item, AHORA)).toBe(false)
    })

    it('nunca toma un atascado', () => {
        expect(esElegible({ status: 'ATASCADO', next_attempt_at: null }, AHORA)).toBe(false)
    })

    // Review Focus 2: no quedar bloqueado para siempre por un valor corrupto
    it('considera elegible un pendiente con next_attempt_at inválido', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: '' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: 'no es fecha' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE' }, AHORA)).toBe(true)
    })
})
```

- [ ] **Step 5: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL. No se puede resolver `./outbox-policy`.

- [ ] **Step 6: Escribir la implementación mínima**

Escribir `src/lib/offline/outbox-policy.ts`:

```typescript
/**
 * Política de reintentos del outbox. Funciones puras: no tocan Dexie ni la red,
 * así se pueden testear y razonar sin levantar nada.
 */

export type EstadoOutbox = 'PENDIENTE' | 'ATASCADO'

export interface ItemElegible {
    status: EstadoOutbox
    next_attempt_at?: string | null
}

/**
 * Espera antes del próximo intento, indexada por el número de intento ya
 * consumido: el primer fallo espera 5 s, el sexto espera 1 h. Agotada la
 * escalera, el item deja de reintentarse.
 */
export const ESPERAS_MS: readonly number[] = [
    5_000,      // 5 s
    15_000,     // 15 s
    60_000,     // 1 m
    300_000,    // 5 m
    900_000,    // 15 m
    3_600_000,  // 1 h
]

/**
 * Momento del próximo intento, o null si ya no quedan.
 * `attempts` es el contador YA incrementado por el fallo actual.
 */
export function calcularProximoIntento(attempts: number, ahora: Date): string | null {
    if (!Number.isInteger(attempts) || attempts < 1) return null

    const espera = ESPERAS_MS[attempts - 1]
    if (espera === undefined) return null

    return new Date(ahora.getTime() + espera).toISOString()
}

/**
 * Un item se sube si está pendiente y su espera venció.
 *
 * Una fecha ilegible cuenta como vencida a propósito: un valor corrupto tiene
 * que provocar un reintento, no dejar el cambio enterrado para siempre.
 */
export function esElegible(item: ItemElegible, ahora: Date): boolean {
    if (item.status !== 'PENDIENTE') return false
    if (!item.next_attempt_at) return true

    const momento = new Date(item.next_attempt_at).getTime()
    if (Number.isNaN(momento)) return true

    return momento <= ahora.getTime()
}
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS, 8 tests.

- [ ] **Step 8: Verificar que no rompimos el proyecto**

Run: `npx tsc --noEmit && npm run build`
Expected: ambos sin errores.

- [ ] **Step 9: Commit**

```bash
git add consultorio-alvarez/package.json consultorio-alvarez/package-lock.json consultorio-alvarez/vitest.config.ts consultorio-alvarez/src/lib/offline/outbox-policy.ts consultorio-alvarez/src/lib/offline/outbox-policy.test.ts
git commit -m "test(sync): vitest y escalera de espera del outbox"
```

---

## Task 2: Clasificación de errores de Postgres

**Files:**
- Create: `src/lib/offline/outbox-errors.ts`
- Create: `src/lib/offline/outbox-errors.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `CODIGOS_PERMANENTES: ReadonlySet<string>`, `esReintentable(code: string | null | undefined): boolean`.

- [ ] **Step 1: Escribir el test que falla**

Escribir `src/lib/offline/outbox-errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { esReintentable } from './outbox-errors'

describe('esReintentable', () => {
    it('no reintenta los fallos permanentes', () => {
        expect(esReintentable('23505')).toBe(false) // clave duplicada
        expect(esReintentable('23503')).toBe(false) // la fila referenciada no existe
        expect(esReintentable('23502')).toBe(false) // falta un dato obligatorio
        expect(esReintentable('23514')).toBe(false) // viola una regla de la tabla
        expect(esReintentable('22P02')).toBe(false) // formato inválido
        expect(esReintentable('42501')).toBe(false) // RLS
        expect(esReintentable('42703')).toBe(false) // columna inexistente
        expect(esReintentable('42P01')).toBe(false) // tabla inexistente
        expect(esReintentable('PGRST204')).toBe(false) // esquema desactualizado
    })

    it('reintenta los fallos transitorios', () => {
        expect(esReintentable('57014')).toBe(true) // timeout de consulta
        expect(esReintentable('53300')).toBe(true) // demasiadas conexiones
        expect(esReintentable('53400')).toBe(true) // límite de configuración
        expect(esReintentable('08006')).toBe(true) // fallo de conexión
        expect(esReintentable('40001')).toBe(true) // serialización
        expect(esReintentable('40P01')).toBe(true) // deadlock
        expect(esReintentable('XX000')).toBe(true) // error interno del pooler
    })

    it('trata como transitorio un código desconocido o ausente', () => {
        expect(esReintentable('99999')).toBe(true)
        expect(esReintentable(undefined)).toBe(true)
        expect(esReintentable(null)).toBe(true)
        expect(esReintentable('')).toBe(true)
    })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL. No se puede resolver `./outbox-errors`.

- [ ] **Step 3: Escribir la implementación**

Escribir `src/lib/offline/outbox-errors.ts`:

```typescript
/**
 * Qué fallos de Supabase tiene sentido reintentar.
 *
 * La lista enumera los PERMANENTES y todo lo demás se reintenta. Es a
 * propósito: marcar atascado al primer error raro avisa antes, pero llena el
 * widget de rojo por hipos que se arreglaban solos, y un indicador que alarma
 * de más se vuelve ruido que nadie mira. Como el tope son siete intentos, un
 * error desconocido que además sea permanente igual termina visible en poco
 * más de una hora.
 */
export const CODIGOS_PERMANENTES: ReadonlySet<string> = new Set([
    '23505',    // unique_violation: DNI o N° de historia clínica repetido
    '23503',    // foreign_key_violation: el paciente referenciado ya no existe
    '23502',    // not_null_violation: falta un dato obligatorio
    '23514',    // check_violation: viola una regla de la tabla
    '22P02',    // invalid_text_representation: UUID o número mal formado
    '42501',    // insufficient_privilege: RLS rechazó la operación
    '42703',    // undefined_column: la app quedó vieja respecto del esquema
    '42P01',    // undefined_table: idem
    'PGRST204', // la columna no está en el cache de esquema de PostgREST
])

/**
 * Reintentar un fallo permanente no lo arregla: sólo retrasa el momento en que
 * una persona se entera.
 */
export function esReintentable(code: string | null | undefined): boolean {
    if (!code) return true
    return !CODIGOS_PERMANENTES.has(code)
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS, 11 tests en total entre los dos archivos.

- [ ] **Step 5: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/outbox-errors.ts consultorio-alvarez/src/lib/offline/outbox-errors.test.ts
git commit -m "feat(sync): clasificar errores de postgres en transitorios y permanentes"
```

---

## Task 3: Orden de cola, bloqueo por entidad y transición de estado

**Files:**
- Modify: `src/lib/offline/outbox-policy.ts`
- Modify: `src/lib/offline/outbox-policy.test.ts`

**Interfaces:**
- Consumes: de la Tarea 1, `calcularProximoIntento`, `EstadoOutbox`.
- Produces: `ordenarCola<T extends { id?: number }>(items: T[]): T[]`, `filtrarBloqueados<T extends ItemDeEntidad>(elegibles: T[], atascados: ItemDeEntidad[]): T[]`, `type ItemDeEntidad = { entity: string; entity_id: string }`, `siguienteEstadoTrasFallo(attemptsActuales: number, retriable: boolean, errorCode: string | undefined, errorMessage: string | undefined, ahora: Date): CambioDeEstado`, `interface CambioDeEstado { status: EstadoOutbox; attempts: number; next_attempt_at: string | null; last_error_code?: string; error_message?: string }`.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `src/lib/offline/outbox-policy.test.ts`:

```typescript
import { ordenarCola, filtrarBloqueados, siguienteEstadoTrasFallo } from './outbox-policy'

describe('ordenarCola', () => {
    it('ordena por id ascendente, que es el orden en que el usuario hizo los cambios', () => {
        const items = [{ id: 7 }, { id: 2 }, { id: 11 }]
        expect(ordenarCola(items).map(i => i.id)).toEqual([2, 7, 11])
    })

    it('no muta el arreglo original', () => {
        const items = [{ id: 3 }, { id: 1 }]
        ordenarCola(items)
        expect(items.map(i => i.id)).toEqual([3, 1])
    })

    it('manda al final los items sin id', () => {
        const items = [{ id: undefined }, { id: 5 }]
        expect(ordenarCola(items).map(i => i.id)).toEqual([5, undefined])
    })
})

describe('filtrarBloqueados', () => {
    it('saltea los items de una fila que tiene algo atascado', () => {
        const elegibles = [
            { entity: 'pacientes', entity_id: 'p1' },
            { entity: 'pacientes', entity_id: 'p2' },
        ]
        const atascados = [{ entity: 'pacientes', entity_id: 'p1' }]

        expect(filtrarBloqueados(elegibles, atascados)).toEqual([
            { entity: 'pacientes', entity_id: 'p2' },
        ])
    })

    // Review Focus 3: el bloqueo es por par entity + entity_id
    it('no bloquea a otra entidad que comparta el id', () => {
        const elegibles = [{ entity: 'pacientes', entity_id: 'mismo-uuid' }]
        const atascados = [{ entity: 'turnos', entity_id: 'mismo-uuid' }]

        expect(filtrarBloqueados(elegibles, atascados)).toEqual(elegibles)
    })

    it('sin atascados devuelve todo', () => {
        const elegibles = [{ entity: 'turnos', entity_id: 't1' }]
        expect(filtrarBloqueados(elegibles, [])).toEqual(elegibles)
    })

    // Review Focus 4: la tanda puede quedar vacía, y quien llama tiene que
    // poder distinguir "no hay nada que subir" de "falló la subida"
    it('devuelve vacío cuando todo está bloqueado', () => {
        const elegibles = [{ entity: 'turnos', entity_id: 't1' }]
        const atascados = [{ entity: 'turnos', entity_id: 't1' }]
        expect(filtrarBloqueados(elegibles, atascados)).toEqual([])
    })
})

describe('siguienteEstadoTrasFallo', () => {
    it('manda a ATASCADO un fallo permanente sin recorrer la escalera', () => {
        const estado = siguienteEstadoTrasFallo(0, false, '23505', 'duplicate key', AHORA)

        expect(estado).toEqual({
            status: 'ATASCADO',
            attempts: 1,
            next_attempt_at: null,
            last_error_code: '23505',
            error_message: 'duplicate key',
        })
    })

    it('reprograma un fallo transitorio con la espera que toca', () => {
        const estado = siguienteEstadoTrasFallo(0, true, '57014', 'timeout', AHORA)

        expect(estado.status).toBe('PENDIENTE')
        expect(estado.attempts).toBe(1)
        expect(estado.next_attempt_at).toBe('2026-10-08T12:00:05.000Z')
    })

    it('manda a ATASCADO al agotar la escalera', () => {
        const estado = siguienteEstadoTrasFallo(6, true, '57014', 'timeout', AHORA)

        expect(estado.status).toBe('ATASCADO')
        expect(estado.attempts).toBe(7)
        expect(estado.next_attempt_at).toBeNull()
    })

    // Review Focus 1: contador fuera de rango heredado de una base vieja
    it('manda a ATASCADO un contador fuera de rango en vez de romper', () => {
        const estado = siguienteEstadoTrasFallo(98, true, undefined, undefined, AHORA)

        expect(estado.status).toBe('ATASCADO')
        expect(estado.next_attempt_at).toBeNull()
    })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test`
Expected: FAIL. `ordenarCola`, `filtrarBloqueados` y `siguienteEstadoTrasFallo` no existen.

- [ ] **Step 3: Escribir la implementación**

Agregar al final de `src/lib/offline/outbox-policy.ts`:

```typescript
export interface ItemDeEntidad {
    entity: string
    entity_id: string
}

export interface CambioDeEstado {
    status: EstadoOutbox
    attempts: number
    next_attempt_at: string | null
    last_error_code?: string
    error_message?: string
}

/**
 * La cola se sube en el orden en que el odontólogo hizo los cambios. El índice
 * de Dexie no garantiza ese orden, y dos operaciones sobre la misma fila
 * aplicadas al revés dejan la base inconsistente.
 */
export function ordenarCola<T extends { id?: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        if (a.id === undefined) return 1
        if (b.id === undefined) return -1
        return a.id - b.id
    })
}

/**
 * Saca de la tanda los items de una fila que ya tiene algo atascado.
 *
 * Aplicar una modificación encima de una creación que nunca entró deja la base
 * inconsistente. El bloqueo es por par entity + entity_id: dos tablas distintas
 * no se bloquean entre sí aunque compartan el identificador.
 */
export function filtrarBloqueados<T extends ItemDeEntidad>(
    elegibles: T[],
    atascados: ItemDeEntidad[]
): T[] {
    if (atascados.length === 0) return elegibles

    const clave = (i: ItemDeEntidad) => `${i.entity}::${i.entity_id}`
    const bloqueadas = new Set(atascados.map(clave))

    return elegibles.filter(i => !bloqueadas.has(clave(i)))
}

/**
 * Estado del item después de un fallo de subida.
 * `attemptsActuales` es el contador ANTES de contar este fallo.
 */
export function siguienteEstadoTrasFallo(
    attemptsActuales: number,
    retriable: boolean,
    errorCode: string | undefined,
    errorMessage: string | undefined,
    ahora: Date
): CambioDeEstado {
    const attempts = (Number.isInteger(attemptsActuales) ? attemptsActuales : 0) + 1

    const next_attempt_at = retriable ? calcularProximoIntento(attempts, ahora) : null

    return {
        status: next_attempt_at ? 'PENDIENTE' : 'ATASCADO',
        attempts,
        next_attempt_at,
        last_error_code: errorCode,
        error_message: errorMessage,
    }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test`
Expected: PASS, 22 tests en total.

- [ ] **Step 5: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/outbox-policy.ts consultorio-alvarez/src/lib/offline/outbox-policy.test.ts
git commit -m "feat(sync): orden de cola, bloqueo por entidad y transicion de estado"
```

---

## Task 4: Dexie version(4) y migración de los `ERROR` existentes

**Files:**
- Modify: `src/lib/offline/db.ts:105-141`

**Interfaces:**
- Consumes: de la Tarea 1, `EstadoOutbox`.
- Produces: `SyncOutboxItem` con `status: EstadoOutbox`, `next_attempt_at?: string | null`, `last_error_code?: string`.

- [ ] **Step 1: Actualizar el tipo del item**

En `src/lib/offline/db.ts`, reemplazar la interfaz `SyncOutboxItem` por:

```typescript
export interface SyncOutboxItem {
    id?: number
    tenant_id: string
    entity: 'turnos' | 'pacientes' | 'evoluciones'
    entity_id: string
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    payload: any
    created_at: string
    attempts: number
    status: EstadoOutbox
    /** Momento a partir del cual el item vuelve a ser elegible. */
    next_attempt_at?: string | null
    /** Código de Postgres del último fallo, para clasificar y para mostrar. */
    last_error_code?: string
    error_message?: string
}
```

Y agregar el import arriba del archivo, junto a los demás:

```typescript
import type { EstadoOutbox } from './outbox-policy'
```

- [ ] **Step 2: Agregar la versión 4 con su migración**

En el constructor de `DentalIaLocalDatabase`, después del bloque `this.version(3)`, agregar:

```typescript
        // Reintentos del outbox. Los items que quedaron en 'ERROR' vuelven a
        // 'PENDIENTE' con el contador en cero: hoy están varados en las
        // computadoras del consultorio sin reintentarse ni verse. Con la
        // escalera nueva se recuperan y, si el fallo era permanente, terminan
        // en 'ATASCADO' y por fin quedan a la vista.
        this.version(4).stores({
            sync_outbox: '++id, tenant_id, entity, entity_id, status, created_at, next_attempt_at'
        }).upgrade(async tx => {
            await tx.table('sync_outbox').toCollection().modify(item => {
                if (item.status === 'ERROR' || item.status === 'EN_PROCESO') {
                    item.status = 'PENDIENTE'
                    item.attempts = 0
                    item.next_attempt_at = null
                }
            })
        })
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: errores SOLO en `sync-manager.ts` por el literal `'ERROR'` que todavía asigna. Eso se arregla en la Tarea 5. Anotar los errores y seguir.

- [ ] **Step 4: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/db.ts
git commit -m "feat(sync): dexie v4 con estados nuevos y rescate de los items en ERROR"
```

---

## Task 5: El sync-manager aplica la política

**Files:**
- Modify: `src/lib/offline/sync-manager.ts`
- Modify: `src/lib/actions/offline-sync.ts`

**Interfaces:**
- Consumes: de las Tareas 1 y 3, `esElegible`, `ordenarCola`, `filtrarBloqueados`, `siguienteEstadoTrasFallo`. De la Tarea 2, `esReintentable`.
- Produces: `PushResultItem` con `error_code?: string` y `retriable: boolean`; `SyncStatus` con `atascadosCount: number` y `authError: boolean`.

- [ ] **Step 1: Clasificar el error en el servidor**

En `src/lib/actions/offline-sync.ts`, reemplazar la interfaz `PushResultItem` (línea 26) por:

```typescript
export interface PushResultItem {
    outbox_id: number
    success: boolean
    error?: string
    /** Código de Postgres, cuando lo hubo. */
    error_code?: string
    /** Decidido acá: el cliente no interpreta mensajes de error. */
    retriable: boolean
}
```

- [ ] **Step 2: Usar el clasificador en cada resultado**

En el mismo archivo, agregar el import:

```typescript
import { esReintentable } from '@/lib/offline/outbox-errors'
```

Y agregar este helper justo antes de `pushOutboxChangesAction`:

```typescript
/**
 * Arma el resultado de una operación a partir del error de Supabase, dejando
 * decidido del lado del servidor si vale la pena reintentarla.
 */
function resultado(outboxId: number, error: { code?: string; message?: string } | null): PushResultItem {
    if (!error) return { outbox_id: outboxId, success: true, retriable: false }

    return {
        outbox_id: outboxId,
        success: false,
        error: error.message,
        error_code: error.code,
        retriable: esReintentable(error.code),
    }
}
```

Reemplazar cada `results.push({ outbox_id: item.id || 0, success: !error, error: error?.message })` del archivo por `results.push(resultado(item.id || 0, error))`.

Reemplazar el push de discrepancia de tenant por:

```typescript
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: 'Discrepancia de tenant',
                retriable: false,
            })
```

Y el del `catch (opErr: any)` por:

```typescript
            results.push({
                outbox_id: item.id || 0,
                success: false,
                error: opErr.message || 'Excepción al sincronizar operación',
                retriable: true,
            })
```

- [ ] **Step 3: Pasar turnos y pacientes a `upsert`**

En las ramas `item.entity === 'turnos'` y `item.entity === 'pacientes'`, operación `INSERT`, cambiar `.insert(payload)` por `.upsert(payload)` y agregar el comentario encima de cada una:

```typescript
                    // upsert y no insert: si la respuesta de un push anterior se
                    // perdió, el reintento no puede fallar por clave duplicada y
                    // marcar como atascado un dato que ya está en la nube.
```

- [ ] **Step 4: Sumar las métricas nuevas**

En `src/lib/offline/sync-manager.ts`, agregar a `SyncStatus`:

```typescript
    atascadosCount: number
    authError: boolean
```

Inicializarlos en `this.status` con `atascadosCount: 0` y `authError: false`.

En `refreshLocalMetrics()`, agregar la cuenta de atascados al `Promise.all` y al `updateStatus`:

```typescript
                localDb.sync_outbox.where('status').equals('ATASCADO').count(),
```

- [ ] **Step 5: Aplicar la política en el push**

En `synchronize()`, reemplazar el bloque que arranca en `const pendingItems = await localDb.sync_outbox` y termina al cerrar el `if (pendingItems.length > 0)` por:

```typescript
            const ahora = new Date()

            const [todosPendientes, atascados] = await Promise.all([
                localDb.sync_outbox.where('status').equals('PENDIENTE').toArray(),
                localDb.sync_outbox.where('status').equals('ATASCADO').toArray()
            ])

            const elegibles = filtrarBloqueados(
                ordenarCola(todosPendientes.filter(i => esElegible(i, ahora))),
                atascados
            )

            if (elegibles.length > 0) {
                console.log(`[SYNC MANAGER] Subiendo ${elegibles.length} cambios pendientes a Supabase...`)
                const pushResults = await pushOutboxChangesAction(elegibles)

                // Lista de entrada no vacía y respuesta vacía significa que el
                // servidor no pudo resolver el tenant: la sesión venció. Sin
                // esto los items se quedan pendientes para siempre en silencio.
                if (pushResults.length === 0) {
                    this.updateStatus({ isSyncing: false, authError: true })
                    return { success: false, pushed: 0, pulled: 0, error: 'La sesión venció. Volvé a iniciar sesión.' }
                }

                this.updateStatus({ authError: false })

                for (const r of pushResults) {
                    if (r.success) {
                        await localDb.sync_outbox.delete(r.outbox_id)
                        pushedCount++
                        continue
                    }

                    const item = elegibles.find(i => i.id === r.outbox_id)
                    await localDb.sync_outbox.update(
                        r.outbox_id,
                        siguienteEstadoTrasFallo(item?.attempts ?? 0, r.retriable, r.error_code, r.error, new Date())
                    )
                }
            }
```

Agregar los imports correspondientes arriba del archivo:

```typescript
import { esElegible, filtrarBloqueados, ordenarCola, siguienteEstadoTrasFallo } from './outbox-policy'
```

- [ ] **Step 6: Limpiar la espera al volver la conexión**

En el listener del evento `online` del constructor, antes de llamar a `this.synchronize()`, agregar:

```typescript
                        // La escalera esperaba por una condición que acaba de
                        // cambiar. Se conserva `attempts` para que reconectar
                        // varias veces no vuelva la escalera infinita, y es la
                        // válvula de escape si el reloj del equipo está mal.
                        await localDb.sync_outbox
                            .where('status').equals('PENDIENTE')
                            .modify({ next_attempt_at: null })
```

Convertir ese callback en `async` para poder usar el `await`.

- [ ] **Step 7: Verificar que compila y que los tests siguen pasando**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: todo sin errores, 22 tests en verde.

- [ ] **Step 8: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/sync-manager.ts consultorio-alvarez/src/lib/actions/offline-sync.ts
git commit -m "feat(sync): reintentos con backoff, bloqueo por entidad y aviso de sesion vencida"
```

---

## Task 6: Acciones de reintentar y descartar

**Files:**
- Modify: `src/lib/offline/sync-manager.ts`

**Interfaces:**
- Consumes: de la Tarea 4, `SyncOutboxItem`.
- Produces: en `syncManager`, los métodos públicos `listarAtascados(): Promise<SyncOutboxItem[]>`, `reintentarItem(outboxId: number): Promise<void>`, `reintentarTodos(): Promise<void>`, `descartarItem(outboxId: number): Promise<void>`.

- [ ] **Step 1: Agregar los métodos**

En la clase `OfflineSyncManager`, después de `enqueueMutation`, agregar:

```typescript
    /**
     * Los cambios que no van a subir solos, del más viejo al más nuevo.
     */
    public async listarAtascados(): Promise<SyncOutboxItem[]> {
        const items = await localDb.sync_outbox.where('status').equals('ATASCADO').toArray()
        return items.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    }

    /**
     * Devuelve un item a la cola desde cero. El usuario decidió que vale la
     * pena probar de nuevo, así que la escalera arranca limpia.
     */
    public async reintentarItem(outboxId: number): Promise<void> {
        await localDb.sync_outbox.update(outboxId, {
            status: 'PENDIENTE',
            attempts: 0,
            next_attempt_at: null,
            error_message: undefined,
            last_error_code: undefined
        })

        await this.refreshLocalMetrics()

        if (navigator.onLine && !this.status.isSyncing) {
            this.synchronize().catch(console.warn)
        }
    }

    public async reintentarTodos(): Promise<void> {
        const atascados = await this.listarAtascados()
        for (const item of atascados) {
            if (item.id !== undefined) await this.reintentarItem(item.id)
        }
    }

    /**
     * Saca el cambio de la cola. La fila sigue en IndexedDB, pero como ya no
     * queda nada pendiente para ella, la próxima sincronización la va a borrar
     * del equipo. Descartar es perder el cambio, no dejarlo acá: quien llama
     * tiene que habérselo dicho al usuario antes.
     */
    public async descartarItem(outboxId: number): Promise<void> {
        await localDb.sync_outbox.delete(outboxId)
        await this.refreshLocalMetrics()
    }
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores, 22 tests en verde.

- [ ] **Step 3: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/sync-manager.ts
git commit -m "feat(sync): acciones de reintentar y descartar cambios atascados"
```

---

## Task 7: Mensajes en castellano

**Files:**
- Create: `src/lib/offline/outbox-mensajes.ts`
- Create: `src/lib/offline/outbox-mensajes.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `mensajeDeError(code: string | undefined, mensajeTecnico: string | undefined): string`, `describirItem(item: Pick<SyncOutboxItem, 'entity' | 'operation'>, etiqueta: string): string`.

- [ ] **Step 1: Escribir el test que falla**

Escribir `src/lib/offline/outbox-mensajes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mensajeDeError, describirItem } from './outbox-mensajes'

describe('mensajeDeError', () => {
    it('traduce los códigos conocidos', () => {
        expect(mensajeDeError('23505', 'duplicate key')).toContain('Ya existe otro registro')
        expect(mensajeDeError('23503', 'fk')).toContain('ya no existe en la nube')
        expect(mensajeDeError('42501', 'denied')).toContain('no tiene permiso')
        expect(mensajeDeError('42703', 'col')).toContain('desactualizada')
        expect(mensajeDeError('PGRST204', 'cache')).toContain('desactualizada')
    })

    it('cae al mensaje técnico cuando no conoce el código', () => {
        expect(mensajeDeError('99999', 'algo raro pasó')).toBe('algo raro pasó')
    })

    it('tiene algo que decir aunque no haya ni código ni mensaje', () => {
        expect(mensajeDeError(undefined, undefined)).toBe('No se pudo subir el cambio a la nube.')
    })
})

describe('describirItem', () => {
    it('describe la operación en castellano', () => {
        expect(describirItem({ entity: 'pacientes', operation: 'INSERT' }, 'Ana Gómez'))
            .toBe('Paciente Ana Gómez — alta')
        expect(describirItem({ entity: 'turnos', operation: 'UPDATE' }, 'del 12/10'))
            .toBe('Turno del 12/10 — modificación')
        expect(describirItem({ entity: 'evoluciones', operation: 'DELETE' }, 'del 08/10'))
            .toBe('Evolución del 08/10 — eliminación')
    })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL. No se puede resolver `./outbox-mensajes`.

- [ ] **Step 3: Escribir la implementación**

Escribir `src/lib/offline/outbox-mensajes.ts`:

```typescript
import type { SyncOutboxItem } from './db'

/**
 * Códigos de Postgres traducidos a algo que un odontólogo pueda leer y actuar
 * en consecuencia. Un solo lugar, para que el widget no acumule condicionales.
 */
const MENSAJES: Record<string, string> = {
    '23505': 'Ya existe otro registro con ese dato, por ejemplo el mismo DNI o número de historia clínica.',
    '23503': 'El paciente al que pertenece este cambio ya no existe en la nube.',
    '23502': 'Falta completar un dato obligatorio.',
    '23514': 'Alguno de los datos no cumple con las reglas del sistema.',
    '22P02': 'Alguno de los datos tiene un formato inválido.',
    '42501': 'Tu usuario no tiene permiso para hacer este cambio.',
    '42703': 'La aplicación quedó desactualizada. Recargá la página.',
    '42P01': 'La aplicación quedó desactualizada. Recargá la página.',
    'PGRST204': 'La aplicación quedó desactualizada. Recargá la página.',
}

export function mensajeDeError(code: string | undefined, mensajeTecnico: string | undefined): string {
    if (code && MENSAJES[code]) return MENSAJES[code]
    if (mensajeTecnico) return mensajeTecnico
    return 'No se pudo subir el cambio a la nube.'
}

const ENTIDADES: Record<string, string> = {
    pacientes: 'Paciente',
    turnos: 'Turno',
    evoluciones: 'Evolución',
}

const OPERACIONES: Record<string, string> = {
    INSERT: 'alta',
    UPDATE: 'modificación',
    DELETE: 'eliminación',
}

/**
 * `etiqueta` la arma quien llama resolviendo entity_id contra la tabla local:
 * el nombre del paciente, la fecha del turno. Acá sólo se la enmarca.
 */
export function describirItem(
    item: Pick<SyncOutboxItem, 'entity' | 'operation'>,
    etiqueta: string
): string {
    const entidad = ENTIDADES[item.entity] ?? item.entity
    const operacion = OPERACIONES[item.operation] ?? item.operation

    return `${entidad} ${etiqueta} — ${operacion}`
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS, 26 tests en total.

- [ ] **Step 5: Commit**

```bash
git add consultorio-alvarez/src/lib/offline/outbox-mensajes.ts consultorio-alvarez/src/lib/offline/outbox-mensajes.test.ts
git commit -m "feat(sync): mensajes en castellano para los cambios atascados"
```

---

## Task 8: El widget muestra los atascados

**Files:**
- Create: `src/components/offline/CambiosAtascados.tsx`
- Modify: `src/components/offline/OfflineSyncWidget.tsx:120-140` (`getWidgetTitle` y `getWidgetSubtitle`) y `:314` (antes del bloque "Alerta de Cambios Pendientes")

**Interfaces:**
- Consumes: de la Tarea 5, `SyncStatus.atascadosCount` y `SyncStatus.authError`. De la Tarea 6, `syncManager.listarAtascados()`, `reintentarItem()`, `reintentarTodos()`, `descartarItem()`. De la Tarea 7, `mensajeDeError()` y `describirItem()`.
- Produces: `<CambiosAtascados cantidad={number} />`.

**Nota sobre el estilo de este archivo:** `OfflineSyncWidget.tsx` usa `Dialog` de `@/components/ui/dialog` (no `GlassDialog`) y botones `<button>` con clases Tailwind (no `GlassButton`). El componente nuevo sigue ese estilo. Como el widget ya tiene 426 líneas y hace varias cosas, la sección nueva va en su propio archivo en vez de engordarlo.

- [ ] **Step 1: Crear el componente**

Escribir `src/components/offline/CambiosAtascados.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { syncManager } from '@/lib/offline/sync-manager'
import { localDb, type SyncOutboxItem } from '@/lib/offline/db'
import { describirItem, mensajeDeError } from '@/lib/offline/outbox-mensajes'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Atascado {
    item: SyncOutboxItem
    etiqueta: string
}

/**
 * Nombre legible de la fila que el item intenta subir. Si ya no está en la
 * base local, se cae al payload guardado en el propio item, que es lo único
 * que queda del cambio.
 */
async function etiquetaDeItem(item: SyncOutboxItem): Promise<string> {
    if (item.entity === 'pacientes') {
        const p = await localDb.pacientes.get(item.entity_id)
        const nombre = p
            ? `${p.nombre} ${p.apellido}`
            : `${item.payload?.nombre ?? ''} ${item.payload?.apellido ?? ''}`.trim()
        return nombre || 'sin nombre'
    }

    if (item.entity === 'turnos') {
        const t = await localDb.turnos.get(item.entity_id)
        const fecha = t?.fecha_inicio ?? item.payload?.fecha_inicio
        return fecha ? `del ${format(new Date(fecha), 'dd/MM')}` : 'sin fecha'
    }

    const e = await localDb.evoluciones.get(item.entity_id)
    const fecha = e?.fecha ?? item.payload?.fecha
    return fecha ? `del ${format(parseISO(fecha), 'dd/MM')}` : 'sin fecha'
}

export function CambiosAtascados({ cantidad }: { cantidad: number }) {
    const [atascados, setAtascados] = useState<Atascado[]>([])
    const [aDescartar, setADescartar] = useState<Atascado | null>(null)

    const cargar = useCallback(async () => {
        if (cantidad === 0) {
            setAtascados([])
            return
        }
        try {
            const items = await syncManager.listarAtascados()
            const conEtiqueta = await Promise.all(
                items.map(async item => ({ item, etiqueta: await etiquetaDeItem(item) }))
            )
            setAtascados(conEtiqueta)
        } catch (err) {
            console.warn('Error listando cambios atascados:', err)
        }
    }, [cantidad])

    useEffect(() => { cargar() }, [cargar])

    if (atascados.length === 0) return null

    return (
        <>
            <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <span className="text-xs font-bold">
                            {atascados.length === 1
                                ? 'Un cambio con problema'
                                : `${atascados.length} cambios con problema`}
                        </span>
                    </div>
                    {atascados.length > 1 && (
                        <button
                            onClick={() => syncManager.reintentarTodos()}
                            className="text-[11px] font-semibold text-red-800 dark:text-red-200 underline underline-offset-2 cursor-pointer"
                        >
                            Reintentar todos
                        </button>
                    )}
                </div>

                <p className="text-[11px] text-red-900/80 dark:text-red-200/80 leading-relaxed">
                    Estos cambios no se pudieron subir a la nube y no se van a reintentar solos.
                </p>

                {atascados.map(({ item, etiqueta }) => (
                    <div key={item.id} className="rounded-lg bg-background/60 p-2.5 space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                            {describirItem(item, etiqueta)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {format(new Date(item.created_at), "d 'de' MMMM, HH:mm 'hs'", { locale: es })}
                        </p>
                        <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                            {mensajeDeError(item.last_error_code, item.error_message)}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                            <button
                                onClick={() => item.id !== undefined && syncManager.reintentarItem(item.id)}
                                className="text-[11px] font-semibold text-foreground underline underline-offset-2 cursor-pointer"
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={() => setADescartar({ item, etiqueta })}
                                className="text-[11px] font-semibold text-muted-foreground hover:text-red-600 underline underline-offset-2 cursor-pointer"
                            >
                                Descartar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                open={aDescartar !== null}
                onOpenChange={abierto => { if (!abierto) setADescartar(null) }}
                title="Descartar este cambio"
                description={aDescartar
                    ? `${describirItem(aDescartar.item, aDescartar.etiqueta)}. Este cambio no se va a guardar en la nube y va a desaparecer de esta computadora en la próxima sincronización. Si necesitás el contenido, copialo antes de continuar.`
                    : ''}
                confirmText="Descartar"
                onConfirm={() => {
                    if (aDescartar?.item.id !== undefined) {
                        syncManager.descartarItem(aDescartar.item.id)
                    }
                    setADescartar(null)
                }}
            />
        </>
    )
}
```

- [ ] **Step 2: Poner el indicador en rojo**

En `OfflineSyncWidget.tsx`, en `getWidgetTitle` (línea ~120), agregar las dos ramas nuevas **antes** de la de `pendingOutboxCount`, dejando `isSyncing` y la de sin internet donde están:

```typescript
        if (status.authError) return 'La sesión venció'
        if (status.atascadosCount > 0) {
            return `${status.atascadosCount} ${status.atascadosCount === 1 ? 'cambio con problema' : 'cambios con problema'}`
        }
```

Y en `getWidgetSubtitle` (línea ~128), también antes de la rama de `pendingOutboxCount`:

```typescript
        if (status.authError) return 'Volvé a iniciar sesión para sincronizar'
        if (status.atascadosCount > 0) return 'Tocá acá para revisarlos'
```

En las clases condicionales del indicador contraído, agregar `status.atascadosCount > 0 || status.authError` como primera condición, con las mismas clases que hoy usan el ámbar pero en rojo: `text-red-600`, `bg-red-500/15`, `border-red-500/40`, `text-red-700 dark:text-red-300`.

- [ ] **Step 3: Montar la sección en el panel**

En `OfflineSyncWidget.tsx`, justo **antes** del bloque comentado `{/* Alerta de Cambios Pendientes (si los hay) */}` (línea 314), agregar:

```tsx
                        <CambiosAtascados cantidad={status.atascadosCount} />
```

E importar el componente arriba:

```typescript
import { CambiosAtascados } from '@/components/offline/CambiosAtascados'
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npm test && npx eslint src/components/offline/CambiosAtascados.tsx src/components/offline/OfflineSyncWidget.tsx && npm run build`
Expected: todo sin errores salvo los `no-explicit-any` preexistentes del repo.

- [ ] **Step 5: Commit**

```bash
git add consultorio-alvarez/src/components/offline/CambiosAtascados.tsx consultorio-alvarez/src/components/offline/OfflineSyncWidget.tsx
git commit -m "feat(sync): el widget muestra los cambios atascados con reintentar y descartar"
```

---

## Task 9: Verificación manual end-to-end

**Files:** ninguno. Esta tarea no escribe código; confirma que lo escrito funciona contra la base real.

- [ ] **Step 1: Levantar el entorno**

```bash
cd consultorio-alvarez && npm run dev
```

Abrir `http://localhost:3000`, iniciar sesión y abrir las DevTools en la pestaña Application para poder mirar IndexedDB.

- [ ] **Step 2: Fallo permanente**

Con la pestaña Network en *Offline*, crear un paciente con un DNI que ya exista. Volver a *Online* y esperar la sincronización.

Esperado: el item queda en `ATASCADO` con `attempts` en `1`, sin recorrer la escalera. El widget se pone rojo y dice "1 cambio con problema". El detalle muestra "Ya existe otro registro con ese dato...".

- [ ] **Step 3: Fallo transitorio**

Con una evolución nueva encolada, cortar la red justo después de que arranque el push.

Esperado: el item queda en `PENDIENTE`, `attempts` sube y `next_attempt_at` avanza por la escalera. Al volver la conexión, `next_attempt_at` se limpia y el reintento sale de inmediato, sin esperar el backoff.

- [ ] **Step 4: Idempotencia**

Forzar el reintento de un item cuyo dato ya está en Supabase (editando `status` a `PENDIENTE` a mano desde DevTools después de una subida exitosa).

Esperado: el `upsert` lo acepta y el item se borra de la cola. No aparece como atascado por clave duplicada.

- [ ] **Step 5: Bloqueo por entidad**

Dejar atascada el alta de un paciente. Editar ese mismo paciente. Sincronizar.

Esperado: la edición **no** sube y permanece `PENDIENTE`. Los cambios de otros pacientes sí suben.

- [ ] **Step 6: Sesión vencida**

Borrar las cookies de sesión con un cambio pendiente en la cola y sincronizar.

Esperado: el widget dice "La sesión venció" en lugar de quedarse pendiente en silencio.

- [ ] **Step 7: Migración de la base local**

En DevTools, poner a mano un item en `status: 'ERROR'` con la versión anterior de la base, recargar la app.

Esperado: el `upgrade` de la versión 4 lo deja en `PENDIENTE` con `attempts` en `0` y se reintenta.

- [ ] **Step 8: Descartar**

Descartar un cambio atascado.

Esperado: el modal muestra la descripción del cambio y la advertencia de que va a desaparecer. Al confirmar, el item sale de la cola y el widget vuelve a verde. Tras la siguiente sincronización completa, la fila ya no está en el equipo.

- [ ] **Step 9: Commit del registro de verificación**

Anotar el resultado de cada paso al final de este plan, marcando lo que pasó y lo que no, y commitear.

```bash
git add consultorio-alvarez/docs/plans/2026-10-08-reintentos-outbox-plan.md
git commit -m "docs(sync): registro de verificacion manual de reintentos"
```

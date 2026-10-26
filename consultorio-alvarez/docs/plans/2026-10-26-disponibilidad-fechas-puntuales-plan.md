# Disponibilidad por fechas puntuales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada profesional se configure en modo "recurrente" (días de semana, actual) o "fechas puntuales" (fechas exactas), y que el gestor web y el bot ofrezcan solo esos días.

**Architecture:** La lógica nueva (horizonte por modo, fecha en lista, esquema único → horario sintético) se extrae a un módulo **puro** `src/lib/disponibilidad/disponibilidad-core.ts`, testeado en `node` como el resto del repo. Las tres funciones de `src/lib/actions/reservas.ts` (compartidas por web y bot) la consumen. La config agrega el toggle de modo + calendario. Persistencia: 3 columnas nuevas en `profesionales`.

**Tech Stack:** Next.js (versión con breaking changes — leer `node_modules/next/dist/docs/` antes de tocar APIs de Next), Supabase (Postgres), React, Tailwind, react-day-picker 9, Vitest (env node).

**Spec:** `docs/plans/2026-10-26-disponibilidad-fechas-puntuales-design.md`

## Global Constraints

- Default de modo = `'recurrente'`: los profesionales existentes no cambian de comportamiento.
- El modo fechas limita **solo web + bot**. No tocar la agenda interna (admin/recepción) ni `bloqueos_agenda`.
- Guardado de config: **no** modificar los ítems por día del prof en `tenants.horarios` al cambiar de modo.
- Horizonte **por modo**: recurrente `21` días, fechas `90`. No ampliar el horizonte global.
- Migración con par `_rollback` en `supabase/migrations/`. Próxima = `041`.
- Fechas como strings `"YYYY-MM-DD"` en zona `America/Argentina/Buenos_Aires`; comparaciones por string.
- Copy de UI en es-AR rioplatense (skill `brand-guidelines`).
- Un solo lugar de lógica de disponibilidad: `reservas.ts` (web y bot comparten `getTurnosDisponibles`).

## Review Focus

- **Prof recurrente no debe ganar días más allá de 21** tras subir el horizonte a 90 (regresión que afectaría a todos los tenants). → Test en Task 2 (`capHorizonte`) + cap aplicado en Task 3.
- **Prof en modo fechas con solo fechas pasadas**: no reservable, pero **sigue visible** en la web. → Test en Task 2 (`tieneFechasFuturas`) + display intacto en Task 3.
- **Write-path forjado**: `crearReservaPublica` debe rechazar un slot en una fecha no marcada aunque el cliente la mande a mano. → Test en Task 2 (`fechaEnLista`) + validación en Task 4.
- **Zona horaria**: el `dateStr` del día se calcula en AR y se compara como string contra `fechas_atencion`; no mezclar con `Date` UTC. → Verificación en Task 3 (reusar el `dateStr` ya calculado en el loop).
- **Esquema único sin horas cargadas** en modo fechas (`fechas_horario` null): el prof no ofrece slots en vez de romper. → Test en Task 2 (`esquemaFechasAHorario(null) === null`).

---

### Task 1: Migración 041 + tipos

**Files:**
- Create: `supabase/migrations/041_profesional_modo_disponibilidad.sql`
- Create: `supabase/migrations/041_profesional_modo_disponibilidad_rollback.sql`
- Modify: `src/types/index.ts` (interface `Profesional`, nuevo tipo `EsquemaHorario`)

**Interfaces:**
- Produces: columnas `modo_disponibilidad text not null default 'recurrente'`, `fechas_atencion text[] not null default '{}'`, `fechas_horario jsonb` en tabla `profesionales`.
- Produces (tipos): `EsquemaHorario = Omit<HorarioAtencion, 'dia' | 'profesional_id'>`; `Profesional` gana `modo_disponibilidad: 'recurrente' | 'fechas'`, `fechas_atencion: string[]`, `fechas_horario?: EsquemaHorario | null`.

- [ ] **Step 1: Escribir la migración 041**

```sql
ALTER TABLE profesionales
  ADD COLUMN modo_disponibilidad text NOT NULL DEFAULT 'recurrente',
  ADD COLUMN fechas_atencion text[] NOT NULL DEFAULT '{}',
  ADD COLUMN fechas_horario jsonb;

ALTER TABLE profesionales
  ADD CONSTRAINT profesionales_modo_disponibilidad_chk
  CHECK (modo_disponibilidad IN ('recurrente', 'fechas'));
```

- [ ] **Step 2: Escribir el rollback 041**

```sql
ALTER TABLE profesionales DROP CONSTRAINT IF EXISTS profesionales_modo_disponibilidad_chk;
ALTER TABLE profesionales
  DROP COLUMN IF EXISTS modo_disponibilidad,
  DROP COLUMN IF EXISTS fechas_atencion,
  DROP COLUMN IF EXISTS fechas_horario;
```

- [ ] **Step 3: Extender tipos en `src/types/index.ts`**

Agregar `export type EsquemaHorario = Omit<HorarioAtencion, 'dia' | 'profesional_id'>` y los tres campos a `Profesional` con los tipos del bloque Interfaces.

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/041_profesional_modo_disponibilidad.sql supabase/migrations/041_profesional_modo_disponibilidad_rollback.sql src/types/index.ts
git commit -m "feat(disponibilidad): migración 041 modo por profesional + tipos"
```

---

### Task 2: Módulo puro de disponibilidad (core + tests)

**Files:**
- Create: `src/lib/disponibilidad/disponibilidad-core.ts`
- Test: `src/lib/disponibilidad/disponibilidad-core.test.ts`

**Interfaces:**
- Consumes: `EsquemaHorario` (Task 1).
- Produces:
  - `export const HORIZONTE_RECURRENTE = 21`
  - `export const HORIZONTE_FECHAS = 90`
  - `export type ModoDisponibilidad = 'recurrente' | 'fechas'`
  - `export function capHorizonte(modo: ModoDisponibilidad): number`
  - `export function horizonteMaximo(modos: ModoDisponibilidad[]): number`
  - `export function fechaEnLista(fechas: string[] | null | undefined, dateStr: string): boolean`
  - `export function tieneFechasFuturas(fechas: string[] | null | undefined, todayStr: string): boolean` (today-inclusive)
  - `export function esquemaFechasAHorario(esquema: EsquemaHorario | null | undefined): (EsquemaHorario & { activo: boolean }) | null`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest'
import {
    capHorizonte, horizonteMaximo, fechaEnLista, tieneFechasFuturas,
    esquemaFechasAHorario, HORIZONTE_RECURRENTE, HORIZONTE_FECHAS,
} from './disponibilidad-core'

describe('capHorizonte', () => {
    it('recurrente = 21, fechas = 90', () => {
        expect(capHorizonte('recurrente')).toBe(HORIZONTE_RECURRENTE)
        expect(capHorizonte('fechas')).toBe(HORIZONTE_FECHAS)
    })
})

describe('horizonteMaximo', () => {
    it('90 si hay al menos un fechas', () => {
        expect(horizonteMaximo(['recurrente', 'fechas'])).toBe(90)
    })
    it('21 si todos recurrentes, 21 si vacío', () => {
        expect(horizonteMaximo(['recurrente', 'recurrente'])).toBe(21)
        expect(horizonteMaximo([])).toBe(21)
    })
})

describe('fechaEnLista', () => {
    it('match exacto', () => {
        expect(fechaEnLista(['2026-11-10', '2026-11-24'], '2026-11-10')).toBe(true)
        expect(fechaEnLista(['2026-11-10'], '2026-11-03')).toBe(false)
    })
    it('null/undefined/vacío = false', () => {
        expect(fechaEnLista(null, '2026-11-10')).toBe(false)
        expect(fechaEnLista([], '2026-11-10')).toBe(false)
    })
})

describe('tieneFechasFuturas', () => {
    it('hoy-inclusive', () => {
        expect(tieneFechasFuturas(['2026-10-26'], '2026-10-26')).toBe(true)
        expect(tieneFechasFuturas(['2026-11-10'], '2026-10-26')).toBe(true)
        expect(tieneFechasFuturas(['2026-01-01'], '2026-10-26')).toBe(false)
    })
    it('null/vacío = false', () => {
        expect(tieneFechasFuturas(null, '2026-10-26')).toBe(false)
        expect(tieneFechasFuturas([], '2026-10-26')).toBe(false)
    })
})

describe('esquemaFechasAHorario', () => {
    it('null si no hay esquema', () => {
        expect(esquemaFechasAHorario(null)).toBeNull()
        expect(esquemaFechasAHorario(undefined)).toBeNull()
    })
    it('agrega activo:true y preserva campos', () => {
        const r = esquemaFechasAHorario({ activo_manana: true, apertura_manana: '09:00', cierre_manana: '13:00' } as any)
        expect(r?.activo).toBe(true)
        expect(r?.apertura_manana).toBe('09:00')
    })
})
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `npm test -- src/lib/disponibilidad/disponibilidad-core.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `disponibilidad-core.ts`**

Implementar las funciones del bloque Interfaces. `horizonteMaximo` devuelve `HORIZONTE_FECHAS` si algún modo es `'fechas'`, si no `HORIZONTE_RECURRENTE`. `tieneFechasFuturas` compara strings `>= todayStr`. `esquemaFechasAHorario` devuelve `null` si el esquema es falsy, si no `{ ...esquema, activo: true }`. Módulo puro: sin imports de Supabase ni Next.

- [ ] **Step 4: Correr los tests para verlos pasar**

Run: `npm test -- src/lib/disponibilidad/disponibilidad-core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/disponibilidad/disponibilidad-core.ts src/lib/disponibilidad/disponibilidad-core.test.ts
git commit -m "feat(disponibilidad): core puro de modo/fechas con tests"
```

---

### Task 3: Cablear listado de días y de profesionales (`reservas.ts`)

**Files:**
- Modify: `src/lib/actions/reservas.ts` (`getTurnosDisponibles` ~L138-333, `getProfesionalesPublicos` ~L34-121)

**Interfaces:**
- Consumes: `capHorizonte`, `horizonteMaximo`, `fechaEnLista`, `tieneFechasFuturas`, `esquemaFechasAHorario` (Task 2); columnas de Task 1.

- [ ] **Step 1: Ampliar los `select` de profesionales**

En `getTurnosDisponibles` el `select('id')` de `activeProfs` (L144-148) pasa a `select('id, modo_disponibilidad, fechas_atencion, fechas_horario')`. En `getProfesionalesPublicos`, agregar `modo_disponibilidad, fechas_atencion` al `select` de `allProfs` (L39-44).

- [ ] **Step 2: Horizonte por modo + decisión por prof en el loop de `getTurnosDisponibles`**

- Calcular `maxDias = horizonteMaximo(activeProfs.map(p => p.modo_disponibilidad))` **antes** de la query `turnosOcupados` (L163) y usarlo tanto en su `endDate` como en el límite del loop (`i <= maxDias`). Se calcula sobre `activeProfs` (superconjunto) porque la query corre antes de filtrar `targetProfs`; traer turnos de más es inocuo.
- Dentro del loop, por cada `prof`:
  - Si `modo_disponibilidad === 'fechas'`: si `!fechaEnLista(prof.fechas_atencion, dateStr)` → `continue`; el horario `h` = `esquemaFechasAHorario(prof.fechas_horario)`.
  - Si no (recurrente): si `i > capHorizonte('recurrente')` → `continue` (no aportar días > 21); `h` = `getHorarioProf(...)` como hoy.
  - Resto del cálculo de slots (colisiones, pasado) sin cambios; sigue usando el `dateStr` ya calculado en AR.

- [ ] **Step 3: Display de `getProfesionalesPublicos` — no ocultar fechas sin fechas futuras**

En el filtro `availableProfs` (L72-77): un prof con `modo_disponibilidad === 'fechas'` se **incluye siempre que esté activo**, sin mirar `tenant.horarios` (puede no tener ítems ahí). No aplicar el gate de "fecha futura" al display. La no-reservabilidad ya la da el listado de días (Step 2). Los profs recurrentes mantienen el filtro actual.

- [ ] **Step 4: Verificar compilación y que los tests del core siguen verdes**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; suite verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/reservas.ts
git commit -m "feat(disponibilidad): listado web/bot respeta modo por profesional"
```

---

### Task 4: Validación del write-path (`crearReservaPublica`)

**Files:**
- Modify: `src/lib/actions/reservas.ts` (`crearReservaPublica` ~L335-430+)

**Interfaces:**
- Consumes: `fechaEnLista`, `esquemaFechasAHorario` (Task 2); columnas de Task 1.

- [ ] **Step 1: Cargar campos de modo del prof objetivo**

El `select` de `profs` (L416-420) suma `modo_disponibilidad, fechas_atencion, fechas_horario`.

- [ ] **Step 2: Aplicar la regla por modo antes de confirmar la reserva**

Para el profesional al que se reserva:
- Si `modo_disponibilidad === 'fechas'`: rechazar con error si `!fechaEnLista(fechas_atencion, data.fecha)`; el chequeo de slot usa `profTieneSlot(esquemaFechasAHorario(fechas_horario), data.hora)`.
- Si recurrente: `profTieneSlot(getHorarioProf(...), data.hora)` como hoy.
- Un slot inválido devuelve el mismo tipo de error que ya usa la función (`{ error: ... }`), de modo que una fecha no marcada forjada por el cliente no se cuele.

- [ ] **Step 3: Verificar compilación y suite**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores; suite verde.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/reservas.ts
git commit -m "feat(disponibilidad): crearReservaPublica valida fecha marcada en modo fechas"
```

---

### Task 5: Config UI — toggle de modo + calendario + esquema de horas

**Files:**
- Modify: `src/components/config/ConfigView.tsx` (`TabHorarios` ~L1243+)

**Interfaces:**
- Consumes: `actualizarProfesional(id, data)` de `src/lib/actions/config.ts:146` (update genérico; acepta los 3 campos nuevos); `src/components/ui/calendar.tsx` (react-day-picker 9, `mode="multiple"`).

- [ ] **Step 1: Selector de modo por profesional**

En `TabHorarios`, para el `selectedProfId`, agregar un control Recurrente / Fechas puntuales que lee/escribe `modo_disponibilidad` del profesional (los profs ya llegan por `getProfesionales` → `select('*')`).

- [ ] **Step 2: Rama de UI según modo**

- **Recurrente**: la grilla por día de semana actual, sin cambios.
- **Fechas puntuales**: ocultar la grilla por día; mostrar
  - `<Calendar mode="multiple" ...>` para marcar/desmarcar fechas → se serializan a `fechas_atencion` (`"YYYY-MM-DD"`, AR).
  - un editor de **esquema único** de horas (mañana/tarde, aperturas/cierres y exclusión de slots web) → `fechas_horario`.

- [ ] **Step 3: Guardado**

El guardar del modo fechas llama `actualizarProfesional(selectedProfId, { modo_disponibilidad, fechas_atencion, fechas_horario })`. **No** tocar `tenants.horarios` del prof al cambiar de modo (los ítems por día quedan para la agenda interna). Copy es-AR.

- [ ] **Step 4: Verificar compilación y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/components/config/ConfigView.tsx
git commit -m "feat(config): toggle recurrente/fechas con calendario y esquema único"
```

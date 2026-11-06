# Triage de la bandeja de Mensajes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar la bandeja de `/mensajes` en carriles de triage por color (🔴🟡🔵🟢) con motivo en palabras por conversación, para que sea intuitiva y no abrumadora.

**Architecture:** Dos columnas nuevas (`prioridad`, `motivo`) en `whatsapp_conversaciones`, estampadas por el bot en los mismos UPDATE donde ya cambia el estado. Una función pura de clasificación (estado+prioridad → carril+etiqueta, con regla de no-degradar) concentra la corrección y se testea con vitest. El frontend agrupa en el cliente.

**Tech Stack:** Next.js (versión con cambios propios — ver AGENTS.md), Supabase (Postgres + migrations NNN_*.sql), React/TypeScript, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-triage-bandeja-mensajes-design.md`

## Global Constraints

- Multi-tenant: todo query filtra por `tenant_id` (ya es así en `getConversaciones`).
- Gate de calidad: `npx tsc --noEmit` debe pasar; `npm test` (vitest) verde. Lint no gatea.
- No cambiar respuestas del bot ni su silencio en PENDIENTE/ATENDIENDO: solo sumar columnas al UPDATE existente.
- Migraciones: par `048_*.sql` + `048_*_rollback.sql`, estilo de las existentes.
- Copy de etiquetas en es-AR (skill `brand-guidelines` si hay dudas).
- Antes de tocar rutas/server de Next, leer `node_modules/next/dist/docs/` (AGENTS.md).

## Review Focus

- **Una urgencia roja activa recibe un adjunto** → debe seguir en 🔴, no degradar a 🟡. (Task 2: `debeEstampar`; Task 3: estampado solo en punto de derivación con guard.)
- **Paciente confirma turno por recordatorio estando en PENDIENTE/ATENDIENDO** → NO debe marcarse 🟢 "bajo control". (Task 2 carril por estado; Task 3 guard `estado=BOT`.)
- **Conversación `HUMANO_PENDIENTE` con `prioridad=null`** (dato viejo / sin clasificar) → cae en 🟡, nunca se oculta. (Task 2: default amarillo.)
- **El chip "Cerrados" con miles de conversaciones** → no debe cargarse en la apertura normal. (Task 4: scope activas por defecto, cerradas bajo demanda.)
- **`estado=HUMANO_ATENDIENDO` sin operador resoluble** (asignado_a nulo tras realtime) → etiqueta azul sin romper. (Task 2: etiqueta azul tolera nombre vacío.)

---

### Task 1: Migración — columnas `prioridad`/`motivo` + backfill

**Files:**
- Create: `supabase/migrations/048_whatsapp_triage_prioridad.sql`
- Create: `supabase/migrations/048_whatsapp_triage_prioridad_rollback.sql`

**Interfaces:**
- Produces: columnas `whatsapp_conversaciones.prioridad text` (`CHECK IN ('rojo','amarillo','verde')`, nullable) y `whatsapp_conversaciones.motivo text` (nullable).

- [ ] **Step 1: Escribir la migración**

`ALTER TABLE public.whatsapp_conversaciones ADD COLUMN IF NOT EXISTS prioridad text CHECK (prioridad IN ('rojo','amarillo','verde')); ADD COLUMN IF NOT EXISTS motivo text;`

Backfill: para conversaciones en `estado='HUMANO_PENDIENTE'`, setear `prioridad='amarillo', motivo='revisar'` donde `prioridad IS NULL` (default seguro: nada se oculta; el motivo fino se reasigna cuando el paciente vuelve a escribir). Dejar el resto en null.

- [ ] **Step 2: Escribir el rollback**

`ALTER TABLE public.whatsapp_conversaciones DROP COLUMN IF EXISTS prioridad; DROP COLUMN IF EXISTS motivo;`

- [ ] **Step 3: Aplicar en local/staging y verificar**

Run: aplicar la migración con el flujo de supabase del proyecto (ej. `supabase db push` o `psql -f`).
Expected: `\d whatsapp_conversaciones` muestra `prioridad` y `motivo`; una fila `HUMANO_PENDIENTE` previa quedó `amarillo/revisar`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/048_whatsapp_triage_prioridad.sql supabase/migrations/048_whatsapp_triage_prioridad_rollback.sql
git commit -m "feat(mensajes): columnas prioridad/motivo para triage de bandeja"
```

---

### Task 2: Lógica pura de clasificación y precedencia (TDD)

**Files:**
- Create: `src/lib/mensajes/triage.ts`
- Test: `src/lib/mensajes/triage.test.ts`

**Interfaces:**
- Produces:
  - `type Carril = 'rojo' | 'amarillo' | 'azul' | 'verde'`
  - `type Prioridad = 'rojo' | 'amarillo' | 'verde'`
  - `const MOTIVOS: Record<string, { carril: Prioridad; etiqueta: string }>` (slug → carril+etiqueta, tabla en Task 3).
  - `carrilDe(input: { estado: string; prioridad: Prioridad | null; motivo: string | null; asignadoNombre?: string | null }): { carril: Carril; etiqueta: string }`
  - `rango(p: Prioridad | null): number` (rojo=3, amarillo=2, verde=1, null=0)
  - `debeEstampar(actual: Prioridad | null, nueva: Prioridad): boolean` (true si `rango(nueva) >= rango(actual)`)

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// carrilDe: el estado manda
test('PENDIENTE + rojo -> carril rojo con etiqueta del motivo', () => {
  expect(carrilDe({estado:'HUMANO_PENDIENTE',prioridad:'rojo',motivo:'urgencia'}))
    .toEqual({carril:'rojo', etiqueta:'🚨 Dolor / urgencia'})
})
test('PENDIENTE + prioridad null -> amarillo (nunca se oculta)', () => {
  expect(carrilDe({estado:'HUMANO_PENDIENTE',prioridad:null,motivo:null}).carril).toBe('amarillo')
})
test('ATENDIENDO -> azul con nombre del operador', () => {
  expect(carrilDe({estado:'HUMANO_ATENDIENDO',prioridad:'rojo',motivo:'urgencia',asignadoNombre:'Eduardo'}))
    .toEqual({carril:'azul', etiqueta:'👤 Atiende: Eduardo'})
})
test('ATENDIENDO sin nombre -> azul sin romper', () => {
  expect(carrilDe({estado:'HUMANO_ATENDIENDO',prioridad:null,motivo:null,asignadoNombre:null}).carril).toBe('azul')
})
test('BOT + turno_confirmado -> verde "Turno confirmado"', () => {
  expect(carrilDe({estado:'BOT',prioridad:'verde',motivo:'turno_confirmado'}))
    .toEqual({carril:'verde', etiqueta:'✅ Turno confirmado'})
})
test('BOT sin motivo -> verde "Bot gestionando"', () => {
  expect(carrilDe({estado:'BOT',prioridad:null,motivo:null}))
    .toEqual({carril:'verde', etiqueta:'🤖 Bot gestionando'})
})
// debeEstampar: no degradar
test('no degrada rojo a amarillo', () => { expect(debeEstampar('rojo','amarillo')).toBe(false) })
test('sube amarillo a rojo', () => { expect(debeEstampar('amarillo','rojo')).toBe(true) })
test('estampa sobre null', () => { expect(debeEstampar(null,'amarillo')).toBe(true) })
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/lib/mensajes/triage.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/lib/mensajes/triage.ts`**

`carrilDe` sigue la precedencia del spec (sección "Reglas de clasificación"): `CERRADO`→fuera (el caller no lo pasa a grupos); `HUMANO_ATENDIENDO`→azul; `BOT`→verde (etiqueta según `motivo==='turno_confirmado'`); `HUMANO_PENDIENTE`→carril = `prioridad ?? 'amarillo'`, etiqueta = `MOTIVOS[motivo]?.etiqueta ?? MOTIVOS['revisar'].etiqueta`. Poblar `MOTIVOS` (slug → {carril, etiqueta}) con la tabla "Mapeo motivo → carril + etiqueta" del spec, más `turno_confirmado`→{verde,"✅ Turno confirmado"} y `revisar`→{amarillo,"📋 Revisar"}.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/lib/mensajes/triage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mensajes/triage.ts src/lib/mensajes/triage.test.ts
git commit -m "feat(mensajes): lógica de carriles de triage + regla de no-degradar"
```

---

### Task 3: Estampar prioridad/motivo en el bot

**Files:**
- Modify: `src/app/api/webhooks/whatsapp/route.ts` (puntos de derivación + bloque confirmación recordatorio ~479-500 + resets de estado)
- Modify: `src/lib/whatsapp-auto-flow.ts` (puntos de derivación)
- Modify: `src/lib/actions/whatsapp-chat.ts` (resets: a BOT/CERRADO limpiar; desasignar conservar/`revisar`)

**Interfaces:**
- Consumes: `debeEstampar`, `Prioridad` de `src/lib/mensajes/triage.ts` (Task 2).
- Produces: cada conversación derivada/transicionada queda con `prioridad`+`motivo` coherentes.

Mapeo punto de derivación → slug (añadir `prioridad`+`motivo` al UPDATE de estado existente):

| Punto (archivo:línea aprox) | motivo slug | prioridad |
|---|---|---|
| route `urgencia_derivada_humano` ~628 | `urgencia` | rojo |
| route `HABLAR_RECEPCIONISTA` ~699 | `pide_recepcion` | amarillo |
| route `confirmacion_guardia` ~812 | `guardia` | rojo |
| route anti-loop ~980 | `bot_no_entendio` | amarillo |
| auto-flow otra fecha ~730 | `reprogramar` | amarillo |
| auto-flow adjunto ~924 | `adjunto_foto`/`adjunto_audio`/`adjunto_documento` (según tipo) | amarillo |
| auto-flow número equivocado ~983 | `numero_equivocado` | amarillo |
| auto-flow impedimento ~1123 | `cambio_cancelacion` | amarillo |
| auto-flow dato clínico ~1172 | `dato_clinico` | amarillo |
| auto-flow turno especial ~1216 | `turno_especial` | amarillo |
| auto-flow queja ~1586 | `queja` | rojo |
| auto-flow pide persona ~1618 | `pide_recepcion` | amarillo |
| auto-flow reprograma texto ~1681 | `reprogramar` | amarillo |

- [ ] **Step 1: Estampar en cada punto de derivación**

En cada UPDATE que ya hace `estado:'HUMANO_PENDIENTE'`, añadir `prioridad` y `motivo` del mapeo. Como esos puntos solo corren desde `BOT` (en PENDIENTE/ATENDIENDO el webhook retorna temprano en ~895), la escritura no puede degradar un rojo activo; igual usar `debeEstampar` donde el punto pueda re-dispararse sobre un pendiente.

- [ ] **Step 2: Turno confirmado (bloque recordatorio ~479-500)**

Cuando `respuesta_paciente='CONFIRMAR'`, añadir al flujo un UPDATE de la conversación con `prioridad='verde', motivo='turno_confirmado'` **solo si `estado='BOT'`** (leer el estado actual de la conversación; si es PENDIENTE/ATENDIENDO, no tocar).

- [ ] **Step 3: Resets de estado en `whatsapp-chat.ts`**

- `cambiarEstadoConversacion` → `BOT`: setear `prioridad=null, motivo=null`. → `CERRADO`: `prioridad=null, motivo=null`.
- `asignarConversacion` con `usuarioId=null` (desasignar → PENDIENTE): si `prioridad IS NULL` dejar `amarillo`/`revisar`; si no, conservar.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/whatsapp/route.ts src/lib/whatsapp-auto-flow.ts src/lib/actions/whatsapp-chat.ts
git commit -m "feat(mensajes): el bot estampa prioridad/motivo al derivar y al confirmar turno"
```

---

### Task 4: Backend — lectura de conversaciones por alcance

**Files:**
- Modify: `src/lib/actions/whatsapp-chat.ts` (`WhatsAppConversacionRow`, `getConversaciones`)

**Interfaces:**
- Consumes: columnas `prioridad`/`motivo` (Task 1).
- Produces: `WhatsAppConversacionRow` con `prioridad: Prioridad | null` y `motivo: string | null`; `getConversaciones` por defecto trae solo estados activos (BOT, HUMANO_PENDIENTE, HUMANO_ATENDIENDO); un alcance `'cerrados'` trae `estado='CERRADO'`.

- [ ] **Step 1: Ampliar el tipo y el SELECT**

Agregar `prioridad` y `motivo` al `interface WhatsAppConversacionRow` y al `.select(...)`.

- [ ] **Step 2: Alcance del query**

Reutilizar el parámetro de filtro de `getConversaciones`: para los alcances activos, filtrar `estado IN ('BOT','HUMANO_PENDIENTE','HUMANO_ATENDIENDO')`; para `'cerrados'`, `estado='CERRADO'`. Mantener orden `ultimo_mensaje_at` desc.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/whatsapp-chat.ts
git commit -m "feat(mensajes): getConversaciones expone prioridad/motivo y acota a activas"
```

---

### Task 5: Frontend — carriles, grupos colapsables y badge de motivo

**Files:**
- Modify: `src/components/mensajes/ChatInboxView.tsx`

**Interfaces:**
- Consumes: `carrilDe`, `Carril` de `src/lib/mensajes/triage.ts` (Task 2); `prioridad`/`motivo` de las filas (Task 4).

- [ ] **Step 1: Chips de carril**

Reemplazar los tabs actuales por chips `Todo / 🔴 Urgente / 🟡 Requiere atención / 🔵 En curso / 🟢 Bajo control / Cerrados`, cada uno con contador (derivado del set activo con `carrilDe`). Quitar "Mis Chats".

- [ ] **Step 2: Agrupar y renderizar**

En "Todo": agrupar las conversaciones activas por `carrilDe(...).carril` en 4 grupos colapsables (orden rojo, amarillo, azul, verde), encabezado con color+título+contador+chevron; verde arranca colapsado. Cada fila muestra el badge `carrilDe(...).etiqueta` con el color del carril. Un chip de carril filtra a ese grupo. "Cerrados" hace fetch con alcance `'cerrados'` (Task 4) y muestra lista plana.

- [ ] **Step 3: Conservar lo existente**

Buscador de texto, filtro de fecha (Hoy/7 días/Mes), `formatFechaChat`, punto de no-leídos: siguen funcionando dentro de cada grupo.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores.
Manual: abrir `/mensajes` en local (`npm run dev`), confirmar los 4 grupos, verde colapsado, badges con texto, chip "Cerrados" trae lista plana, buscador y fecha operan.

- [ ] **Step 5: Commit**

```bash
git add src/components/mensajes/ChatInboxView.tsx
git commit -m "feat(mensajes): bandeja en carriles de triage con grupos colapsables y motivo en texto"
```

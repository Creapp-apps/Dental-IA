# Triage del Centro de Alertas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar el Centro de Alertas en 4 grupos de triage (🔴 urgente / 🟡 requiere respuesta / 🟢 agenda / ⚪ sistema) con motivo en palabras y link correcto por tipo.

**Architecture:** Dos columnas (`prioridad`, `motivo`) en `notificaciones`, estampadas en cada insert (las derivaciones del bot reusan el mismo slug que ya estampan en la conversación). Una función pura agrupa y rutea; el frontend agrupa en el cliente.

**Tech Stack:** Supabase (migrations NNN_*.sql), Next.js (cambios propios — AGENTS.md), React/TS, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-triage-centro-alertas-design.md`

## Global Constraints

- Multi-tenant: todo query filtra `tenant_id`.
- Gate: `npx tsc --noEmit` y `npm test` (vitest) verdes. Lint no gatea.
- Migración par `049_*.sql` + `049_*_rollback.sql`, estilo de las existentes (ver 048).
- Git root = carpeta PADRE `Consultorio Alvarez`; `git add consultorio-alvarez/...`.
- No cambiar qué notificaciones se generan ni su texto; solo sumar `prioridad`/`motivo` al insert.
- Reusar vocabulario de `src/lib/mensajes/triage.ts` (slugs de motivo de WhatsApp).
- Copy es-AR (skill `brand-guidelines` si hay dudas).

## Review Focus

- Alerta `rojo` nunca cae en grupo operativo ni se rotula "Reprogramación". (Task 2 `grupoNotificacion`; Task 5 render)
- Fila vieja sin `prioridad`/`motivo` → grupo Sistema o fallback por título, nunca pantalla en blanco. (Task 2 default; Task 5 fallback)
- Alerta de WhatsApp (motivo de conversación) → link a `/mensajes`, no a `/agenda` vacía. (Task 2 `rutaNotificacion`; Task 5)
- Notificación con `prioridad='verde'` pero motivo de pago/sistema → grupo Sistema, no Agenda. (Task 2 orden de reglas)
- Contador del chip/grupo = largo real del grupo filtrado (no engaña con 0). (Task 5)

---

### Task 1: Migración `049` — columnas + backfill en `notificaciones`

**Files:**
- Create: `supabase/migrations/049_notificaciones_triage_prioridad.sql`
- Create: `supabase/migrations/049_notificaciones_triage_prioridad_rollback.sql`

**Interfaces:**
- Produces: `notificaciones.prioridad text CHECK IN ('rojo','amarillo','verde')` nullable, `notificaciones.motivo text` nullable.

- [ ] **Step 1: Migración**

`ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS prioridad text CHECK (prioridad IN ('rojo','amarillo','verde')); ADD COLUMN IF NOT EXISTS motivo text;` (en un solo ALTER con coma).

Backfill por `tipo` (motivo fino se reasigna al regenerarse):
- `tipo IN ('turno_confirmado','turno_cancelado','turno_nuevo')` → `prioridad='verde'`, `motivo = 'turno_confirmado' | 'turno_cancelado' | 'reserva_web'` respectivamente.
- `tipo='turno_reprogramado'` con título que contiene 'guardia'/'urgencia' (ILIKE) → `prioridad='rojo', motivo='urgencia'`.
- resto `tipo='turno_reprogramado'` → `prioridad='amarillo', motivo='revisar'`.
- `tipo IN ('alerta','sistema')` → `motivo='sistema'` (prioridad null).
Solo donde `prioridad IS NULL`.

- [ ] **Step 2: Rollback** — `DROP COLUMN IF EXISTS prioridad; DROP COLUMN IF EXISTS motivo;`

- [ ] **Step 3: Verificación estática** (los subagentes NO aplican migraciones — lo hace el usuario). Confirmar sintaxis, idempotencia, que el rollback invierte. Nombrar que la aplicación queda pendiente.

- [ ] **Step 4: Commit** — `git add consultorio-alvarez/supabase/migrations/049_*` ; `feat(alertas): columnas prioridad/motivo en notificaciones`

---

### Task 2: Lógica pura — grupo, etiqueta y ruta (TDD)

**Files:**
- Create: `src/lib/mensajes/notificaciones.ts`
- Test: `src/lib/mensajes/notificaciones.test.ts`

**Interfaces:**
- Consumes: puede importar el mapeo `MOTIVOS` de `./triage` para las etiquetas de WhatsApp.
- Produces:
  - `type GrupoAlerta = 'urgente' | 'requiere_respuesta' | 'agenda' | 'sistema'`
  - `const MOTIVOS_AGENDA: string[]` = `['turno_confirmado','turno_cancelado','turno_reprogramado_real','reserva_web']`
  - `const MOTIVOS_SISTEMA: string[]` = `['pago_senia','vencimiento','sistema']`
  - `grupoNotificacion(prioridad: 'rojo'|'amarillo'|'verde'|null, motivo: string|null): GrupoAlerta`
  - `etiquetaNotificacion(prioridad, motivo): string` — badge en palabras (WhatsApp reusa MOTIVOS de triage; operativos/sistema tienen su copy).
  - `rutaNotificacion(grupo: GrupoAlerta, referenciaId: string|null): string` — `urgente`/`requiere_respuesta` → `/mensajes`; `agenda` → `referenciaId ? '/agenda?turno='+referenciaId : '/agenda'`; `sistema` → `/dashboard`.

- [ ] **Step 1: Tests que fallan**

```ts
test('rojo -> urgente', () => { expect(grupoNotificacion('rojo','urgencia')).toBe('urgente') })
test('amarillo -> requiere_respuesta', () => { expect(grupoNotificacion('amarillo','adjunto_foto')).toBe('requiere_respuesta') })
test('verde operativo -> agenda', () => { expect(grupoNotificacion('verde','turno_confirmado')).toBe('agenda') })
test('verde con motivo de pago -> sistema (motivo manda sobre verde)', () => { expect(grupoNotificacion('verde','pago_senia')).toBe('sistema') })
test('sin prioridad ni motivo -> sistema', () => { expect(grupoNotificacion(null,null)).toBe('sistema') })
test('ruta de urgente va a mensajes', () => { expect(rutaNotificacion('urgente','abc')).toBe('/mensajes') })
test('ruta de agenda va a agenda con turno', () => { expect(rutaNotificacion('agenda','t1')).toBe('/agenda?turno=t1') })
test('etiqueta de adjunto_foto reusa triage', () => { expect(etiquetaNotificacion('amarillo','adjunto_foto')).toContain('foto') })
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run src/lib/mensajes/notificaciones.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** `src/lib/mensajes/notificaciones.ts`.

`grupoNotificacion` en ESTE orden (clave para el Review Focus): `prioridad==='rojo'`→urgente; `prioridad==='amarillo'`→requiere_respuesta; `motivo ∈ MOTIVOS_SISTEMA`→sistema; (`prioridad==='verde'` || `motivo ∈ MOTIVOS_AGENDA`)→agenda; else→sistema. `etiquetaNotificacion` toma de `MOTIVOS` de triage si existe, si no usa un mapa local (Confirmación, Cancelación, Reserva online, Pago, Sistema, Revisar).

- [ ] **Step 4: Correr y ver pasar** — PASS.

- [ ] **Step 5: Commit** — `feat(alertas): lógica de grupos, etiquetas y ruteo de notificaciones`

---

### Task 3: Estampar prioridad/motivo en los inserts de `notificaciones`

**Files:**
- Modify: `src/app/api/webhooks/whatsapp/route.ts` (×8 inserts + el de recordatorio ~565)
- Modify: `src/lib/whatsapp-auto-flow.ts` (×9 inserts)
- Modify: `src/lib/actions/reservas.ts` (×2), `src/lib/pagos/confirmar-senia.ts` (×1), y cualquier otro insert que aparezca en el grep.

**Interfaces:**
- Consumes: slugs de motivo ya definidos en la feature anterior (Task 3 del inbox) y en `notificaciones.ts` (Task 2).

- [ ] **Step 1: Inventario** — correr `grep -rn "from('notificaciones')" src | grep insert` y cubrir TODOS.

- [ ] **Step 2: Estampar.** Para cada insert, agregar `prioridad` + `motivo`:
  - Derivaciones del bot (route.ts/auto-flow.ts): usar el MISMO `prioridad`/`motivo` que el bloque ya estampa en la conversación (está calculado ahí al lado). Slugs: urgencia/guardia/queja→rojo; pide_recepcion/adjunto_*/dato_clinico/turno_especial/cambio_cancelacion/reprogramar/numero_equivocado/bot_no_entendio→amarillo.
  - Recordatorio (route.ts ~565, `notifTipo`): `verde` + motivo `turno_confirmado`/`turno_cancelado`/`turno_reprogramado_real`.
  - Reserva web (reservas.ts): `verde` + `reserva_web`.
  - Seña (confirmar-senia.ts): `motivo='pago_senia'` (prioridad null).
  - Avisos de vencimiento/sistema si insertan: `motivo='vencimiento'`/`'sistema'`.
  - El `tipo` existente se deja igual (no se migra el enum).

- [ ] **Step 3: tsc** — `npx tsc --noEmit` limpio.

- [ ] **Step 4: Commit** — `feat(alertas): los inserts de notificaciones llevan prioridad/motivo`

---

### Task 4: Tipo `Notificacion` + provider exponen prioridad/motivo

**Files:**
- Modify: `src/types/index.ts` (`interface Notificacion`)
- Modify: `src/components/providers/NotificationProvider.tsx` (SELECT / tipo cargado)

**Interfaces:**
- Produces: `Notificacion` con `prioridad: 'rojo'|'amarillo'|'verde'|null` y `motivo: string|null`.

- [ ] **Step 1:** Agregar los campos a `interface Notificacion`. Confirmar que el fetch del provider usa `*` o agregar las columnas al SELECT; verificar que la suscripción realtime propaga los campos (payload.new los incluye).
- [ ] **Step 2: tsc** limpio.
- [ ] **Step 3: Commit** — `feat(alertas): Notificacion expone prioridad/motivo`

---

### Task 5: Frontend — Centro de Alertas en 4 grupos

**Files:**
- Modify: `src/components/dashboard/DashboardLiveAlerts.tsx`

**Interfaces:**
- Consumes: `grupoNotificacion`, `etiquetaNotificacion`, `rutaNotificacion`, `GrupoAlerta` de `@/lib/mensajes/notificaciones` (Task 2); `notif.prioridad`/`notif.motivo` (Task 4).

Referencia visual aprobada: `.superpowers/brainstorm/6917-1794067927/content/alertas.html`.

- [ ] **Step 1: Chips** — `Todo / 🔴 Urgente / 🟡 Requiere respuesta / 🟢 Agenda / ⚪ Sistema`, con contador (del set no-leído vía `grupoNotificacion`).
- [ ] **Step 2: Grupos** — agrupar las no-leídas por `grupoNotificacion` en 4 grupos colapsables (orden urgente, requiere_respuesta, agenda, sistema). Rojo+amarillo abiertos; verde+gris colapsados. Chip aísla un grupo (force-expand al seleccionarlo).
- [ ] **Step 3: Fila** — badge = `etiquetaNotificacion(prioridad, motivo)` tintado por grupo. Reemplazar `getNotificationStyle` (title-sniffing) por el mapeo basado en prioridad/motivo, con el title-sniffing SOLO como fallback cuando `motivo` es null (filas viejas). El click rutea con `rutaNotificacion(grupo, referencia_id)` (conversación→/mensajes, turno→/agenda). "Ver en mensajes" / "Ver en agenda" según destino.
- [ ] **Step 4: Conservar** — no-leídas, "marcar todas como leídas", descartar (✓), `formatDistanceToNow`, realtime.
- [ ] **Step 5: Verificar** — `npx tsc --noEmit` limpio. Manual (usuario): `/` (dashboard), confirmar 4 grupos, colapsado correcto, badges, link a mensajes vs agenda.
- [ ] **Step 6: Commit** — `feat(alertas): Centro de Alertas en grupos de triage con motivo y ruteo correcto`

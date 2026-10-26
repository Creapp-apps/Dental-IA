# Disponibilidad por fechas puntuales (modo por profesional)

Fecha: 2026-10-26
Estado: diseño aprobado pendiente

## Intent y por qué

Hoy la disponibilidad de un profesional se define solo por **día de la semana**:
si cargás "martes", el gestor de turnos web y el bot de WhatsApp ofrecen
*todos* los martes. Esto no sirve para profesionales que atienden de forma
irregular.

Caso real (tenant Curadent Moreno): el Dr. Alfredo Luna viene los martes, pero
**solo dos veces al mes**, no todos. Con el modelo actual la recepción no puede
expresar "este martes sí, el otro no", y el paciente ve martes que el doctor no
trabaja.

Objetivo: que la configuración decida sola qué días se ofrecen, de modo que el
paciente que elige a ese profesional vea únicamente las fechas reales en que
atiende —sin importar que la próxima sea dentro de semanas.

## Goals

- Agregar un **modo de disponibilidad por profesional**, elegible desde la config:
  - **Recurrente** (comportamiento actual): atiende todos los días de semana
    activos. Es el default y no cambia para nadie.
  - **Fechas puntuales**: atiende solo en fechas exactas que la recepción marca
    en un calendario.
- En modo *fechas puntuales*, el profesional carga **un único esquema de horas**
  (mañana/tarde, aperturas/cierres, slots deshabilitados) que se aplica a **todas**
  las fechas marcadas, sin importar el día de semana.
- El gestor de turnos web y el bot de WhatsApp respetan el modo: para un prof en
  modo fechas, un día se ofrece **solo si** la fecha está en su lista.
- El horizonte de días ofrecidos es **según el modo**: recurrente mantiene los ~21
  días actuales (nada cambia para las clínicas normales); solo el prof en modo
  fechas llega a ~90 días, para que sus fechas lejanas aparezcan.

## Non-goals

- No se toca la **agenda interna** (admin/recepción). El modo fechas limita
  **solo** web + bot. La recepción puede seguir agendando a mano cualquier día a
  ese profesional (override manual). Fuera de alcance.
- No se toca `bloqueos_agenda` (bloqueos de fechas/vacaciones). Es independiente y
  sigue funcionando igual.

## Anti-goals (qué haría fracasar esto aunque "funcione")

- **Modelo híbrido**: recurrente + fechas extra + excepciones todo a la vez.
  Rechazado explícitamente: confunde a quien configura y multiplica casos de
  borde. Es un **toggle de dos modos excluyentes**, no una combinación.
- Horas por fecha individual en modo fechas. Se descartó: una fecha marcada usa
  el esquema único del prof, no un horario propio por fecha.
- Horas en modo fechas tomadas "del día de semana que caiga". Se descartó: deja
  fechas sin horas cuando el día de semana no tiene esquema cargado.

## Constraints y contexto técnico

- **Stack**: Next.js (versión con breaking changes; leer
  `node_modules/next/dist/docs/` antes de tocar APIs de Next), Supabase, React,
  Tailwind. Multi-tenant.
- **Modelo actual** (`src/types/index.ts`, `HorarioAtencion`): los horarios viven
  en `tenants.horarios` (array JSON). Cada ítem:
  `{ dia: 0-6, profesional_id, activo, activo_manana, apertura_manana, cierre_manana, activo_tarde, apertura_tarde, cierre_tarde, web_personalizado, web_activo_manana, web_activo_tarde, web_slots_deshabilitados }`.
  La disponibilidad por prof se expresa con ítems que tienen `profesional_id`;
  si un prof no tiene ninguno, cae al horario general de la clínica.
- **Una sola fuente de verdad para días/slots**: `src/lib/actions/reservas.ts`.
  - `getTurnosDisponibles(tenantSlug, profesionalId?)` — genera los días con slots.
    La usan **web** (`FloatingChatbot`, `BookingForm`) y **bot** (vía
    `whatsapp-auto-flow.ts` y `whatsapp-guardia.ts`). Tocarla acá cubre ambos.
  - `getProfesionalesPublicos(...)` — filtra qué profesionales se ofrecen.
  - `crearReservaPublica(...)` — valida al crear la reserva.
- **Horizonte actual = 21 días**, hardcodeado en dos lugares de
  `getTurnosDisponibles`: la query de `turnosOcupados` (`endDate +21`) y el loop
  `for (let i = 0; i <= 21; i++)`. 21 días es insuficiente para un prof que viene
  dos veces al mes. **El horizonte es por modo**: recurrente sigue en ~21; fechas
  llega a ~90. NO ampliar el horizonte global, porque eso alargaría la ventana de
  reserva de *todas* las clínicas (incluidas las 100% recurrentes) de ~3 semanas a
  ~3 meses —cambio no deseado: más ausentismo, agenda lejana bloqueada, selector de
  días más largo y más cómputo para todos—. El loop debe recorrer hasta el máximo
  (90) pero descartar, para cada prof recurrente, los días más allá de su ventana
  de 21; o equivalentemente calcular el horizonte efectivo según los modos de los
  profs objetivo. El selector de días de la web ya renderiza solo los días que la
  función devuelve, así que un prof recurrente nunca verá días más allá de 21.
- **Migraciones**: numeradas con par `_rollback` en `supabase/migrations/`. Última
  es 040; la nueva es **041**.

## El cómo (decisiones tomadas)

### Persistencia

El dato es atributo del **profesional**, no del array `horarios`. Migración 041
agrega a la tabla `profesionales`:

- `modo_disponibilidad text not null default 'recurrente'`
  (valores: `'recurrente'` | `'fechas'`).
- `fechas_atencion text[] not null default '{}'` — fechas exactas `"YYYY-MM-DD"`
  en que atiende (solo relevante en modo `'fechas'`).
- `fechas_horario jsonb` — esquema único de horas para modo `'fechas'`. Misma
  forma que `HorarioAtencion` **sin** `dia` ni `profesional_id`:
  `{ activo_manana, apertura_manana, cierre_manana, activo_tarde, apertura_tarde, cierre_tarde, web_activo_manana, web_activo_tarde, web_slots_deshabilitados }`.
  Nullable; si falta en modo fechas, el prof no ofrece slots.

Default `'recurrente'` ⇒ los profesionales existentes no cambian de comportamiento,
sin migración de datos. El `rollback` dropea las tres columnas.

### Tipos

Extender `Profesional` en `src/types/index.ts` con los tres campos. Definir un tipo
para `fechas_horario` reutilizando la forma de `HorarioAtencion` (Omit de `dia` y
`profesional_id`, o un tipo nuevo `EsquemaHorario`).

### Lógica de disponibilidad (`reservas.ts`) — el corazón

En las tres funciones, cargar de `profesionales` los campos nuevos
(`modo_disponibilidad, fechas_atencion, fechas_horario`) además de los que ya
traen. Hoy `getTurnosDisponibles` solo selecciona `id` de `activeProfs`; hay que
ampliar ese select.

Regla de un día para un profesional:

- `modo === 'recurrente'` → comportamiento actual: el día se ofrece si su día de
  semana (`dow`) matchea un horario activo (sin cambios).
- `modo === 'fechas'` → el día se ofrece **solo si** su `dateStr` (`"YYYY-MM-DD"`
  en horario Argentina) está en `fechas_atencion`. Las horas/slots salen de un
  **horario sintético** construido desde `fechas_horario` (mismo shape que un
  ítem de `horarios`), alimentado a la helper existente `generarSlotsParaDia`.

Puntos concretos a tocar:

1. `getTurnosDisponibles`: en el loop por día, para cada prof decidir según su
   modo. Horizonte **por modo** (recurrente ~21, fechas ~90, ver Constraints): el
   loop llega a 90 pero cada prof recurrente no aporta días más allá de 21. La
   query de `turnosOcupados` sube a 90 (trae de más para los recurrentes, inocuo).
   Extender el select de `activeProfs` con los campos nuevos.
2. `getProfesionalesPublicos`: **no** debe ocultar al prof en modo fechas sin
   fechas futuras. Esta función alimenta también el roster del equipo en la landing
   (`src/app/(public)/page.tsx:71`), y la decisión del producto es que un prof real
   **sigue visible** aunque no tenga fechas cargadas; solo queda **no reservable**.
   La no-reservabilidad ya la garantiza `getTurnosDisponibles` (no genera días si no
   hay fechas futuras). Por lo tanto el filtro de display de esta función **no
   cambia** para modo fechas: el prof se muestra igual que uno recurrente activo.
3. `crearReservaPublica`: la validación de que el slot es válido debe aplicar la
   misma regla por modo, para que no se cuele una reserva en una fecha no marcada.

### Config UI (`src/components/config/ConfigView.tsx`, `TabHorarios`)

Por profesional, agregar un selector de modo (Recurrente / Fechas puntuales):

- **Recurrente**: se muestra la grilla por día de semana actual (sin cambios).
- **Fechas puntuales**: se oculta la grilla por día; en su lugar
  - un **calendario mensual** para marcar/desmarcar fechas (multi-selección).
    Reutilizar `src/components/ui/calendar.tsx`.
  - un editor de **esquema único de horas** (mañana/tarde, aperturas/cierres, y la
    exclusión de slots web que ya existe).
- Guardar escribe `modo_disponibilidad`, `fechas_atencion`, `fechas_horario` en
  `profesionales` (nuevo action / extender el de guardar horarios).
- **Al cambiar de modo (recurrente ↔ fechas) el guardado NO toca los ítems por día
  que el prof ya tenga en `tenant.horarios`**. La agenda interna los sigue leyendo
  (non-goal: no tocar la agenda interna); web/bot los ignoran o no según el modo
  vigente. Un prof creado directo en modo fechas simplemente no tiene esos ítems, y
  la agenda interna lo mostrará en blanco para carga manual —aceptable—.

Copy de UI en es-AR rioplatense (ver skill `brand-guidelines`).

## Qué queda a criterio del builder

- Nombre exacto del tipo para el esquema de horas (`EsquemaHorario` vs `Omit<...>`).
- Si la escritura de los campos nuevos va en un server action nuevo o extiende el
  existente de guardar horarios.
- Si conviene extraer una helper compartida `estaDisponibleEnFecha(prof, dateStr, dow)`
  para no repetir la regla por modo en las tres funciones (recomendado).
- Detalle visual del calendario de multi-selección y del editor de horas.
- Si limpiar fechas pasadas de `fechas_atencion` al guardar o dejarlas (son inocuas;
  el filtro de "fecha futura" ya las ignora).
- Valor fino del horizonte de modo fechas (90 días es el piso acordado; podría
  parametrizarse). El de recurrente queda en 21.
- Cómo expresar el horizonte por modo en el loop (recorrer 90 y descartar >21 para
  recurrentes, vs calcular el máximo efectivo según los profs objetivo).

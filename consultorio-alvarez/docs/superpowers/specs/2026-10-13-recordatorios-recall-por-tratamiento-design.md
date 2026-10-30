# Recordatorios de recall por tratamiento — Diseño

Fecha: 2026-10-13
Repo: Dental-IA (`consultorio-alvarez`)
Estado: diseño aprobado en brainstorming, pendiente de revisión del spec.

## Objetivo

Permitir que, desde la ficha de un paciente, se configure cada cuánto tiempo
(cada 4, 6, 8, 12 meses, etc.) se le envía un recordatorio de **recall** por
WhatsApp, por cada tratamiento que se haya hecho. El recordatorio invita al
paciente a agendar un nuevo control cuando pasó el intervalo definido desde su
último turno realizado de ese tratamiento.

Caso de uso: implantes, tratamientos de control espaciado y en general todo lo
que no requiere mantención mensual sino cada varios meses.

### Qué NO es este feature

- No reemplaza el recordatorio de confirmación de 48hs (`/api/cron/send-reminders`),
  que sigue igual y atado a un turno existente.
- No construye el flujo de agendamiento: la plantilla de Meta de recall ya
  dispara los botones de días/horarios disponibles, y ese flujo ya está linkeado.

## Contexto del sistema actual (verificado en código)

- **Multi-tenant**: todas las tablas llevan `tenant_id` (default `get_auth_tenant_id()`).
  Credenciales de WhatsApp por tenant vía `getWhatsAppCredentialsForTenant(tenant_id)`
  (`src/lib/whatsapp`).
- **Turno realizado** = `turnos.estado = 'ATENDIDO'` (enum `estado_turno`:
  PENDIENTE, CONFIRMADO, EN_SALA, ATENDIDO, CANCELADO, AUSENTE).
- **Tratamiento del turno**: `turnos.tipo_tratamiento_id` → FK a `tipos_tratamiento`.
  De acá sale el ancla "por tratamiento".
- **Envío WhatsApp**: Meta Cloud API v20.0, endpoint
  `https://graph.facebook.com/v20.0/{phoneNumberId}/messages`, `type: 'template'`,
  `language: { code: 'es_AR' }`, con componentes `body` + botones `quick_reply`.
  Patrón de referencia: `src/app/api/cron/send-reminders/route.ts`.
- **Sanitizado de teléfono** (Argentina): quitar no-dígitos; si empieza con `11`
  o tiene 10 dígitos → anteponer `54`; si empieza con `549` → reemplazar por `54`.
  Reusar la misma lógica.
- **Protección del cron**: `CRON_SECRET` (default `ALVAREZ_CRON_SECRET_KEY`),
  aceptado como `?key=` o header `Authorization: Bearer`.
- **Registro de crons**: `vercel.json` (array `crons`). Ya existen send-reminders,
  send-today-reminders y diario. También hay un cron externo (cron-job.org) que
  pega al warmup; la fuente de verdad del scheduling de la app es `vercel.json`.
- **Ficha paciente**: `src/components/pacientes/FichaPacienteTabs.tsx`, con tabs
  consulta / turnos / evoluciones / odontograma / escaneos3d / presupuestos / adjuntos.
- **Zona horaria**: `America/Argentina/Buenos_Aires`, como en los crons existentes.

### Discrepancia conocida a resolver en implementación

`supabase-schema.sql` (desactualizado, jul-2026) define una tabla
`recordatorios_log` con `turno_id NOT NULL` y enum `canal_recordatorio`
(`WHATSAPP`/`SMS`/`EMAIL`). Pero el código vivo escribe en una tabla
`recordatorios` con columnas `canal` (texto, p.ej. `'WHATSAPP_48HS'`),
`estado_envio`, `telefono`, `mensaje_enviado`, `error_detalle`, `fecha_envio`.
**Antes de escribir migraciones hay que confirmar el esquema real de la DB live**
(tabla y columnas de log efectivas). El diseño de abajo no depende de reusar esa
tabla: el recall lleva su propio log.

## Modelo de datos

### Tabla nueva: `recall_configs`

Una fila por par (paciente, tratamiento).

```
recall_configs
  id                     uuid PK default uuid_generate_v4()
  tenant_id              uuid NOT NULL default get_auth_tenant_id() → tenants
  paciente_id            uuid NOT NULL → pacientes (ON DELETE CASCADE)
  tipo_tratamiento_id    uuid NOT NULL → tipos_tratamiento (ON DELETE CASCADE)
  intervalo_meses        int  NOT NULL  (ej: 4, 6, 8, 12)
  plantilla              text NOT NULL  (nombre de template Meta; default a definir)
  activo                 bool NOT NULL default true
  ultimo_envio_at        timestamptz    (NULL hasta el primer envío; dedupe por ciclo)
  created_at             timestamptz NOT NULL default now()
  updated_at             timestamptz NOT NULL default now()
  CONSTRAINT recall_configs_unico UNIQUE (paciente_id, tipo_tratamiento_id)
```

- Índice sugerido: `(tenant_id, activo)` para el barrido del cron.
- Trigger `update_updated_at_column` (ya existe en el proyecto) sobre `updated_at`.
- **RLS**: aislamiento por tenant idéntico al resto (SELECT/INSERT/UPDATE/DELETE con
  `tenant_id = get_auth_tenant_id()`). Agregar `recall_configs` al patrón del
  bloque `DO $$ ... FOR t IN SELECT unnest(ARRAY[...])` de `supabase-schema.sql`,
  o replicar las 4 políticas en la migración.

Decisión: **no** se persiste `proximo_envio_at`. Se calcula en cada corrida del
cron a partir del último turno ATENDIDO, así nunca queda desfasado si el paciente
asiste, reprograma o cambia el intervalo.

### Tabla nueva (log/auditoría): `recall_envios`

El log de recordatorios existente exige `turno_id`, y un recall puede no tener
turno asociado (ese es justamente el punto). Por eso lleva su propio log liviano.

```
recall_envios
  id                 uuid PK
  tenant_id          uuid NOT NULL → tenants
  recall_config_id   uuid NOT NULL → recall_configs (ON DELETE CASCADE)
  paciente_id        uuid NOT NULL → pacientes
  tipo_tratamiento_id uuid NOT NULL → tipos_tratamiento
  canal              text NOT NULL default 'WHATSAPP_RECALL'
  estado_envio       text NOT NULL   ('ENVIADO' | 'FALLIDO')
  telefono           text
  ancla_at           timestamptz     (fecha del turno ATENDIDO usado como ancla)
  error_detalle      text
  created_at         timestamptz NOT NULL default now()
```

- RLS por tenant igual que el resto.
- El dedupe efectivo lo da `recall_configs.ultimo_envio_at`; esta tabla es
  auditoría e historial.

## Flujo del cron — `GET/POST /api/cron/send-recalls`

Endpoint nuevo, mismo esqueleto que `send-reminders` (auth por `CRON_SECRET`,
TZ Argentina, cliente admin `createAdminClient()`). Corre **1 vez por día**.

Por cada `recall_configs` con `activo = true` (join a `pacientes`, `tipos_tratamiento`):

1. **Calcular ancla**: `MAX(turnos.fecha_inicio)` donde
   `paciente_id` y `tipo_tratamiento_id` coinciden y `estado = 'ATENDIDO'`.
   - Si no hay ninguno → **skip** (el paciente nunca se hizo ese tratamiento todavía).
2. **Calcular vencimiento**: `vence = ancla + intervalo_meses`.
   - Suma de meses con cuidado de fin de mes (ej: 31-ago + 6 meses). Usar date math
     consistente (preferible `date_trunc`/`+ interval` en SQL, o librería de fechas
     en JS; evitar el salto de día por meses de distinta longitud).
3. **Condición de envío**: enviar solo si
   `hoy >= vence` **Y** (`ultimo_envio_at IS NULL` **O** `ultimo_envio_at < ancla`).
   - La segunda condición evita reenviar dentro del mismo ciclo. Cuando el paciente
     asiste a un nuevo control, aparece un turno ATENDIDO más nuevo → el ancla avanza
     → `ultimo_envio_at < ancla` vuelve a ser verdadero en el próximo ciclo. Reset
     automático sin tocar nada.
4. **Skip si ya tiene turno futuro** de ese tratamiento: si existe un `turnos` del
   mismo `paciente_id` + `tipo_tratamiento_id` con `fecha_inicio >= hoy` y estado en
   (`PENDIENTE`, `CONFIRMADO`, `EN_SALA`) → **skip** (ya va a venir, no lo molestamos).
5. **Validaciones de envío** (como en send-reminders):
   - Paciente sin `telefono` → skip + log FALLIDO con motivo.
   - `getWhatsAppCredentialsForTenant(tenant_id)` nulo → skip (WhatsApp no configurado).
   - Sanitizar teléfono con la regla de Argentina.
6. **Enviar** plantilla Meta de recall (`template.name = recall_configs.plantilla`,
   `language.code = 'es_AR'`) con los componentes que defina la plantilla (los botones
   de agendamiento ya vienen linkeados por la plantilla).
7. **Registrar resultado**:
   - Éxito → `UPDATE recall_configs SET ultimo_envio_at = now()` + insert en
     `recall_envios` (ENVIADO, con `ancla_at`).
   - Fallo → insert en `recall_envios` (FALLIDO, `error_detalle`). No se toca
     `ultimo_envio_at` para que reintente al día siguiente.

Respuesta del endpoint: `{ success, results[] }` con status por config, igual que
el cron actual.

## UI — tab nuevo en la ficha del paciente

En `FichaPacienteTabs.tsx`, agregar un tab (ej. id `recall`, label "Controles" o
"Recordatorios", con ícono acorde, p.ej. `BellRing` de lucide). Contenido
(`TabRecall`, componente nuevo):

- Lista de configuraciones de recall del paciente. Por cada una:
  - Tratamiento (`tipos_tratamiento.nombre`).
  - Toggle `activo`.
  - Selector de `intervalo_meses` (4 / 6 / 8 / 12 / otro numérico).
  - Plantilla (si hay más de una; si no, default fijo y oculto en v1).
  - **Próximo envío calculado** (solo lectura): último turno ATENDIDO de ese
    tratamiento + intervalo. Si no hay turno ATENDIDO, mostrar "aún sin control
    realizado".
  - Último envío (`ultimo_envio_at`) si existe.
- Botón "Agregar recordatorio de control" → elegir tratamiento (de
  `tipos_tratamiento` del tenant) + intervalo. UNIQUE(paciente, tratamiento) evita
  duplicados.

Persistencia vía server actions (patrón del resto de tabs). Respetar roles/permisos
existentes (quién puede editar la ficha).

## Registro del cron

Agregar a `vercel.json → crons`:

```json
{ "path": "/api/cron/send-recalls", "schedule": "0 13 * * *" }
```

Horario a confirmar con el cliente (sugerido media mañana/mediodía Argentina; `0 13 * * *`
es UTC ≈ 10:00 ART). Si se prefiere cron-job.org, se agrega la entrada equivalente
apuntando a `https://www.dentalva.ar/api/cron/send-recalls?key=CRON_SECRET`.

## Edge cases cubiertos

- Paciente sin teléfono → skip + log FALLIDO.
- WhatsApp no configurado para el tenant → skip.
- Sin turno ATENDIDO del tratamiento → skip (no hay ancla).
- Turno futuro ya agendado del mismo tratamiento → skip (ya tiene control).
- Reenvío dentro del mismo ciclo → bloqueado por `ultimo_envio_at < ancla`.
- Reset de ciclo → automático al registrarse un nuevo turno ATENDIDO.
- Aislamiento multi-tenant → RLS + filtro por `tenant_id` + credenciales por tenant.
- Fin de mes en la suma de intervalos → date math cuidada.
- Fallo de Meta → se registra y reintenta al día siguiente (no marca `ultimo_envio_at`).

## Testing

- **Unit** (vitest, ya configurado): cálculo de ancla, de vencimiento (incluyendo
  fin de mes), y de la condición de envío/dedupe (tabla de casos: sin ancla,
  vence hoy sin envío previo, ya enviado este ciclo, turno futuro agendado).
- **Integración del endpoint**: mock de Supabase admin + fetch a Meta; verificar
  skips, inserts en `recall_envios` y update de `ultimo_envio_at`.
- Sanitizado de teléfono: reusar/compartir con el cron de 48hs si conviene extraer
  a util común.

## Contrato de la plantilla Meta (creada 2026-10-13)

Plantilla creada en WhatsApp Manager, pendiente de aprobación de Meta:

- **name**: `recall_control_tratamiento`
- **idioma**: `es_AR` (Spanish ARG) — el envío debe usar `language: { code: 'es_AR' }`.
- **categoría**: Marketing.
- **encabezado**: texto fijo "Control de tu tratamiento" (sin variable).
- **cuerpo** (3 variables, en este orden):
  - `{{1}}` = nombre del paciente
  - `{{2}}` = nombre del tratamiento (`tipos_tratamiento.nombre`)
  - `{{3}}` = nombre del consultorio (`tenants.nombre`)
- **pie**: "Si no querés recibir estos avisos, respondé BAJA."
- **botón**: respuesta rápida (quick_reply) "Agendar mi control".

El cron arma los `components`:
- `body` con los 3 parámetros en orden (nombre, tratamiento, consultorio).
- `button` `sub_type: 'quick_reply'`, `index: '0'`, `parameters: [{ type: 'payload',
  payload: 'MENU_TURNOS' }]`.

El payload `MENU_TURNOS` es lo que dispara el flujo autónomo de agendamiento
(`whatsapp-auto-flow.ts` → `procesarMensajeAutonomo` detecta `buttonPayload ===
'MENU_TURNOS'` → `obtenerProximosTresSlots` → botones `SLOT_RES_<date>_<hora>` →
pide nombre → pide DNI → crea turno). Reusa el flujo existente sin cambios.

## To-do adicional: honrar opt-out "BAJA"

El pie promete baja por "BAJA", pero hoy el webhook no la maneja. En implementación:
`procesarMensajeAutonomo` (o el webhook antes de delegar) debe detectar el texto
`BAJA` y desactivar los recall del paciente (`recall_configs.activo = false` para
ese `paciente_id` del tenant), con confirmación por WhatsApp. Requisito de
compliance de categoría Marketing.

## Trabajo del cliente (fuera de código)

- Enviar la plantilla a revisión de Meta y avisar cuando esté **aprobada**.

## Abierto a confirmar en implementación

- Esquema real de la tabla de log en la DB live (ver "Discrepancia conocida").
- Horario exacto del cron.
- Nombre del tab en la ficha ("Controles" vs "Recordatorios").
- Si se permite más de una plantilla por consultorio o una sola default en v1.

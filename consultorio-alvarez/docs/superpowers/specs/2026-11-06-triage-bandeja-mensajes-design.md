# Triage de la bandeja de Mensajes (WhatsApp) — Diseño

Fecha: 2026-11-06
Estado: propuesta para aprobar

## Intención y por qué

La bandeja de Mensajes (`/mensajes`, componente `src/components/mensajes/ChatInboxView.tsx`)
hoy muestra todas las conversaciones en una lista plana ordenada por fecha, con tabs de
estado técnico (`Todos / Pendientes / Mis Chats / Bot Activo / Cerrados`). Eduardo —
usuario mayor, dueño del consultorio — la encuentra **abrumadora y difícil de entender**.
Abre Mensajes a la mañana para ver **qué pasó mientras no atendía** y qué necesita su
atención, y hoy tiene que interpretar una lista indiferenciada.

El objetivo es reorganizar la bandeja como un **triage por prioridad**, con grupos de
color (rojo / amarillo / verde + un neutro azul "en curso"), donde **el color ordena y un
texto en palabras claras explica el motivo** de cada conversación. Nada librado a la
interpretación del usuario.

Dato habilitante: el bot **ya distingue ~13 motivos** por los que deriva una conversación
a un humano, y cada derivación deja una etiqueta (`metadata.accion`) en el último mensaje
enviado + una notificación. La información de triage ya existe; falta **capturarla en la
conversación, agruparla y mostrarla**.

## Objetivos

- Agrupar las conversaciones en **4 carriles visuales** por prioridad/estado, con títulos
  en palabras, color e indicador de cantidad.
- Mostrar en **cada fila** un "motivo" en lenguaje llano (ej. "Mandó una foto",
  "Dolor / urgencia", "Quiere reprogramar").
- Permitir **filtrar por carril** (ver solo uno).
- Que el carril verde ("bajo control") arranque **colapsado** para no estorbar.
- Mantener lo que ya funciona: buscador de texto, filtro por fecha (Hoy/7 días/Mes),
  orden por `ultimo_mensaje_at` desc dentro de cada grupo, tiempo relativo estilo WhatsApp.
- Quitar el filtro "Mis Chats" (decisión del usuario: consultorio chico, no lo necesita).

## No-objetivos

- No cambiar la lógica del bot ni sus respuestas: solo **anotar** la conversación con
  prioridad+motivo en los puntos donde el bot YA actualiza el estado.
- No construir un tablero de métricas ni reporting.
- No tocar la Agenda. El detalle de turnos confirmados/cancelados sigue viviendo en la
  Agenda; en Mensajes el turno confirmado es solo una etiqueta del carril verde.
- No rediseñar el panel de conversación (lado derecho). Solo la **lista** (columna izquierda).

## Anti-objetivos (qué sería un fracaso aunque "funcione")

- Que Eduardo tenga que adivinar qué significa un color → cada fila DEBE tener texto.
- Que el rediseño agregue densidad en vez de quitarla.
- Que una conversación urgente (dolor, reclamo) quede fuera del carril rojo o enterrada.
- Falsos "bajo control": una conversación que necesita humano NO puede caer en verde.

## El modelo de carriles

Cuatro grupos, en este orden de arriba hacia abajo:

| Carril | Color | Título en pantalla | Arranca | Se define por |
|---|---|---|---|---|
| Urgente | 🔴 rojo | "Urgente — atención ya" | abierto | `estado=HUMANO_PENDIENTE` + motivo rojo |
| Requiere atención | 🟡 amarillo | "Requiere atención" | abierto | `estado=HUMANO_PENDIENTE` + motivo amarillo |
| En curso | 🔵 azul | "En curso (ya lo atiende alguien)" | abierto | `estado=HUMANO_ATENDIENDO` |
| Bajo control | 🟢 verde | "Bajo control (el bot se encarga)" | **colapsado** | `estado=BOT` |

`CERRADO` no es un carril: se accede por un **6º chip "Cerrados"** (decisión del usuario)
que reemplaza los 4 grupos por una **lista plana** de conversaciones cerradas.

### Mapeo motivo → carril + etiqueta (los 13 casos reales)

La prioridad (rojo/amarillo) de una conversación en `HUMANO_PENDIENTE` sale del **motivo**
de la derivación. Mapeo de `metadata.accion` (del bot) → carril + etiqueta en palabras:

**🔴 Rojo (urgente):**
- `urgencia_derivada_humano` → "🚨 Dolor / urgencia"
- `confirmacion_guardia` → "🚨 Guardia a validar"
- `queja_derivada_urgente` → "😠 Reclamo / queja"

**🟡 Amarillo (requiere atención):**
- `derivado_recepcion` (y botón `HABLAR_RECEPCIONISTA`) → "💬 Pide recepción"
- adjunto foto (`foto_recibida_acuse`) → "📎 Mandó una foto"
- adjunto audio (`nota_voz_recibida_acuse`) → "🎤 Mandó un audio"
- adjunto documento → "📄 Mandó un documento"
- `dato_clinico_derivado` → "🩺 Dato clínico"
- `derivado_turno_especial` → "🦷 Turno especial"
- `impedimento_ofrece_opciones` / `impedimento_derivado_humano` → "📅 Quiere cambiar/cancelar"
- `pide_otra_fecha_derivado` / `pide_fecha_reprograma_derivado` → "📅 Quiere reprogramar"
- `numero_equivocado_derivado` → "⚠️ Número equivocado"
- `derivado_por_loop` → "🤖 El bot no entendió"

**🔵 Azul (en curso):** no usa motivo. Etiqueta "👤 Atiende: {nombre del operador}"
(de `asignado_a`).

**🟢 Verde (bajo control):** `estado=BOT`. Dos etiquetas:
- Si el último turno del paciente quedó confirmado por el recordatorio → "✅ Turno confirmado".
- Si no → "🤖 Bot gestionando".

## Cómo se calcula y se guarda la prioridad (decisión del builder)

**Decisión tomada (mía): persistir en la conversación, no derivar en lectura.**

Se agregan dos columnas a `whatsapp_conversaciones`:
- `prioridad text` — uno de `rojo | amarillo | verde | null`.
- `motivo text` — slug del motivo (ej. `urgencia`, `adjunto_foto`, `reprogramar`,
  `turno_confirmado`, …), null cuando no aplica.

Se setean **en los mismos puntos del código donde el bot ya hace el `UPDATE ... SET estado**
(ver inventario abajo): se agregan `prioridad` y `motivo` al update existente. No se agrega
ningún query nuevo al flujo del bot.

Por qué persistir y no derivar al leer:
- El bot ya hace ese UPDATE en cada derivación → costo marginal casi nulo.
- La bandeja queda con un query trivial (sin joins a la tabla de mensajes), filtrable y
  **ordenable por prioridad** directo en SQL.
- Evita un N+1 o un lateral join a `whatsapp_mensajes` por cada conversación en cada carga.

Puntos de seteo (todos ya existentes, se les suma prioridad+motivo). Citas del mapa del
código (archivo:línea aprox., a confirmar por el builder al tocar cada uno):

- Webhook `src/app/api/webhooks/whatsapp/route.ts`:
  - urgencia derivada (`~628`, helper `derivarUrgenciaAHumano`) → rojo / `urgencia`
  - "hablar con recepcionista" (`~699`) → amarillo / `pide_recepcion`
  - confirmación de guardia (`~812`) → rojo / `guardia`
  - anti-loop, bot no entendió (`~980`) → amarillo / `bot_no_entendio`
  - **adjuntos**: el motivo fino (`adjunto_foto` / `adjunto_audio` / `adjunto_documento`,
    → amarillo) se estampa **en el punto de derivación del auto-flow** (`~924`), que solo
    corre cuando `estado=BOT` (en PENDIENTE/ATENDIENDO el webhook retorna temprano, `:895`).
    **No** se estampa en el insert crudo del mensaje entrante (`route.ts ~306-316`): ese
    insert corre para TODO mensaje y degradaría un rojo activo a amarillo (ver Reglas de
    precedencia).
  - **turno confirmado por recordatorio**: en el bloque de confirmación (`~479-500`), cuando
    `respuesta_paciente = CONFIRMAR`, se estampa `prioridad=verde, motivo=turno_confirmado`
    **solo si `estado=BOT`**. Si la conversación está en PENDIENTE/ATENDIENDO (hay un humano
    en el medio), NO se toca prioridad/motivo. (Cierra el hueco de que hoy el turno confirmado
    no deja rastro, sin crear un falso "bajo control".)
- Auto-flow `src/lib/whatsapp-auto-flow.ts`: `~730` (otra fecha), `~924` (adjunto, si no se
  movió al webhook), `~983` (número equivocado), `~1123` (impedimento),
  `~1172` (dato clínico), `~1216` (turno especial), `~1586` (queja), `~1618` (pide persona),
  `~1681` (reprograma texto) → cada uno con su motivo+carril del mapeo de arriba.
- Panel `src/lib/actions/whatsapp-chat.ts`:
  - al tomar/responder (HUMANO_ATENDIENDO): el carril pasa a azul por estado; `prioridad`/
    `motivo` pueden quedar como estaban (se ignoran mientras está en ATENDIENDO).
  - al desasignar → vuelve a HUMANO_PENDIENTE: conserva el último `prioridad`/`motivo`.
  - al volver a BOT o CERRAR: limpiar `prioridad`/`motivo` a null (ya no hay pendiente).

**Migración de datos existentes:** backfill único. Para conversaciones ya en
`HUMANO_PENDIENTE`, derivar `prioridad`/`motivo` del último mensaje del bot con
`metadata.accion` (o default amarillo / `revisar` si no se puede inferir). Conversaciones en
BOT/ATENDIENDO/CERRADO quedan con prioridad null. Esto evita que las viejas aparezcan sin
clasificar el primer día.

## Reglas de clasificación y precedencia (DECIDIDO — crítico)

Esto resuelve el riesgo de "enterrar una urgencia" y los conflictos estado↔prioridad.

**Derivación del carril en el cliente — manda el `estado`:**
- `CERRADO` → no entra en los carriles (solo bajo el chip "Cerrados").
- `HUMANO_ATENDIENDO` → 🔵 azul, etiqueta "Atiende: {operador}". Ignora prioridad/motivo.
- `BOT` → 🟢 verde. Etiqueta: `motivo=turno_confirmado` → "Turno confirmado"; si no →
  "Bot gestionando". (Cualquier prioridad vieja se ignora; además se limpia al volver a BOT.)
- `HUMANO_PENDIENTE` → carril por `prioridad`: `rojo`→🔴, `amarillo`→🟡, `null`→🟡 (default
  amarillo, nunca se oculta). Nunca cae en verde ni azul.

**Escritura de `prioridad`/`motivo` — nunca degradar un pendiente activo:**
- Rango: `rojo`(3) > `amarillo`(2) > `verde`(1) > `null`(0).
- Al estampar sobre una conversación que ya está en `HUMANO_PENDIENTE`: aplicar solo si el
  rango nuevo **≥** el actual. Nunca bajar un pendiente activo (una foto que llega sobre un
  "dolor" rojo mantiene el rojo y su motivo).
- Los motivos del bot se estampan **en el punto de derivación** (que corre desde `BOT`), no
  en el insert crudo del mensaje entrante. El `turno_confirmado` (verde) solo se estampa si
  `estado=BOT`.

**Reset al cambiar de estado (en `whatsapp-chat.ts` / webhook):**
- → `BOT` (reanudar bot): `prioridad=null, motivo=null` (queda verde "bot gestionando"),
  salvo el estampado explícito `turno_confirmado`.
- → `CERRADO`: `prioridad=null, motivo=null`.
- → `HUMANO_ATENDIENDO` (operador toma): conserva prioridad/motivo (no se muestran en azul,
  pero quedan guardados para cuando se desasigne).
- Desasignar (→ `HUMANO_PENDIENTE`): conserva el último prioridad/motivo; si quedó `null`,
  default `amarillo` / `revisar`.

## Alcance del query (DECIDIDO)

- La carga inicial de la bandeja trae **solo estados activos** (`BOT`, `HUMANO_PENDIENTE`,
  `HUMANO_ATENDIENDO`), excluyendo `CERRADO`. Los contadores de los 5 chips de carril salen
  de ese set. Esto evita cargar el archivo de cerradas (crece sin techo) en cada apertura.
- El chip **"Cerrados"** dispara un fetch aparte (`estado=CERRADO`), mostrado como lista
  plana; se puede paginar/limitar más adelante. `getConversaciones` se ajusta para aceptar
  este alcance (activas por defecto; cerradas bajo demanda).

## Backend: lectura

`getConversaciones` (`src/lib/actions/whatsapp-chat.ts ~60-141`) suma `prioridad` y `motivo`
al SELECT y, por defecto, filtra a estados activos (ver Alcance del query). Se mantiene el
orden `ultimo_mensaje_at` desc. El agrupamiento por carril se hace en el **cliente** (deriva
el carril de `estado` + `prioridad` según las Reglas de precedencia): menos cambios en el
server y la lista activa no es grande.

## Frontend: la lista

`ChatInboxView.tsx`:
- Reemplazar los tabs planos por **chips de carril** arriba: `Todo / 🔴 Urgente /
  🟡 Requiere atención / 🔵 En curso / 🟢 Bajo control / Cerrados`, cada uno con contador.
  (Se quita "Mis Chats".)
- "Todo" muestra los 4 carriles agrupados. Cada chip de carril filtra a un solo grupo.
  "Cerrados" reemplaza los grupos por una lista plana de conversaciones cerradas.
- Render en **grupos colapsables** por carril (rojo, amarillo, azul, verde), con encabezado
  de color + título + contador + chevron. Verde arranca colapsado.
- Cada fila suma un **badge de motivo** en palabras (mapeo de arriba), con el color del carril.
- Se conservan: buscador de texto, filtro por fecha (Hoy/7 días/Mes), tiempo relativo
  (`formatFechaChat`), punto de no-leídos (`no_leidos_operador`).

Referencia visual aprobada: mockup en
`.superpowers/brainstorm/80035-1793986255/content/bandeja.html` (el usuario lo aprobó).

## Constraints

- Multi-tenant: todo filtrado por `tenant_id` (ya es así en `getConversaciones`).
- No romper el silencio del bot: el bot sigue callando en HUMANO_PENDIENTE/ATENDIENDO
  (`route.ts ~616`, `~895`). El cambio solo agrega columnas al UPDATE existente.
- Next.js del repo es una versión con cambios propios: leer `node_modules/next/dist/docs/`
  antes de tocar rutas/server (ver AGENTS.md). El grueso del cambio es Supabase + React.
- Gate de calidad: `tsc --noEmit` (lint no gatea). Probar en local antes de push.

## Qué queda a criterio del builder

- Slugs exactos de `motivo` y el mapeo final slug → etiqueta+emoji (tabla de arriba es la
  guía; los textos se pueden pulir con la skill `brand-guidelines`).
- Nombre e implementación de la migración + el script de backfill.
- Colores exactos del mockup → tokens Tailwind del proyecto.
- Detalles de interacción (animación de colapso, persistir qué grupo quedó colapsado, etc.).

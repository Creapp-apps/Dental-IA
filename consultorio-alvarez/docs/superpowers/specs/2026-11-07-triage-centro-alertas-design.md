# Triage del Centro de Alertas (notificaciones) — Diseño

Fecha: 2026-11-07
Estado: propuesta aprobada en mockup (pendiente doc)

## Intención y por qué

El Centro de Alertas (`src/components/dashboard/DashboardLiveAlerts.tsx`) muestra las
notificaciones no leídas en una **lista plana** (primeras 3 + "ver restantes"). Con 45
pendientes se vuelve inmanejable y, peor, **mal rotulado**: la tabla `notificaciones` tiene
un `tipo` grueso (`turno_nuevo | turno_reprogramado | turno_cancelado | turno_confirmado |
alerta | sistema`) y casi todas las derivaciones del bot se guardan con el cajón de sastre
`turno_reprogramado`. El componente hoy adivina el rótulo por el **título** (detecta
"guardia/urgencia" así) y todo lo demás cae en "Reprogramación" — por eso "Foto enviada" y
"Paciente esperando respuesta" aparecen como "Reprogramación".

Queremos aplicar la **misma metodología de triage que la bandeja de Mensajes**: agrupar las
alertas por prioridad/categoría con un motivo en palabras, para que el dueño (Eduardo)
monitoree con precisión y pueda aislar un tipo específico. Prioridad declarada por el usuario:
primero **lo que necesita que alguien responda**, después **lo operativo de agenda**.

Habilitante: ya existe la taxonomía (`prioridad` + `motivo` slugs) en `src/lib/mensajes/triage.ts`.

## Objetivos

- Agregar `prioridad` + `motivo` a `notificaciones`, estampados **en el insert**, reusando el
  slug que el bot ya calcula para la conversación (y un mapeo explícito para las no-bot).
- Agrupar el Centro de Alertas en **4 grupos** con color, título, contador y chips para aislar.
- Mostrar el **motivo en palabras** por alerta (badge), con el color del grupo.
- Arreglar el link: alertas de conversación → `/mensajes` (abre el chat); de turno → `/agenda`.
- Mantener lo que funciona: no-leídas, "marcar todas como leídas", descartar, tiempo relativo,
  realtime del `NotificationProvider`.

## No-objetivos

- No cambiar qué notificaciones se generan ni su texto; solo **anotarlas** y reagruparlas.
- No tocar la lógica del bot más allá de pasar `prioridad`/`motivo` al insert existente.
- No rediseñar el push (web-push) ni el badge del sidebar.

## Anti-objetivos (fracaso aunque "funcione")

- Que una alerta urgente quede rotulada como "Reprogramación" o enterrada bajo lo operativo.
- Que el link "Ver" siga llevando a una agenda vacía para alertas de WhatsApp.
- Agregar densidad en vez de quitarla.

## Los 4 grupos

En orden (arriba lo que hay que responder):

| Grupo | Color | Título | Arranca | Qué cae |
|---|---|---|---|---|
| Urgente | 🔴 rojo | "Urgente — responder ya" | abierto | prioridad `rojo` (dolor/urgencia, reclamo, guardia) |
| Requiere respuesta | 🟡 amarillo | "Requiere respuesta" | abierto | prioridad `amarillo` (adjunto, dato clínico, pide recepción, reprogramar/cancelar, paciente esperando, número equivocado, bot no entendió) |
| Agenda | 🟢 verde | "Agenda (operativo)" | colapsado | motivos operativos de turno: confirmado, cancelado, reprogramado real, reserva web |
| Sistema | ⚪ gris | "Sistema" | colapsado | pago/seña, aviso de vencimiento, `sistema`, y cualquier resto sin clasificar |

## Modelo de datos y clasificación

**Columnas nuevas en `notificaciones`:** `prioridad text CHECK IN ('rojo','amarillo','verde')`
nullable, `motivo text` nullable. (Mismo vocabulario que `whatsapp_conversaciones`.)

**Grupo derivado en el cliente** — función pura `grupoNotificacion(prioridad, motivo): 'urgente'
| 'requiere_respuesta' | 'agenda' | 'sistema'` (nueva, en `src/lib/mensajes/` junto a `triage.ts`
o un `notificaciones.ts`), con su etiqueta/badge por motivo:
- `prioridad === 'rojo'` → `urgente`.
- `prioridad === 'amarillo'` → `requiere_respuesta`.
- `prioridad === 'verde'` o motivo operativo de turno (`turno_confirmado`, `turno_cancelado`,
  `turno_reprogramado_real`, `reserva_web`) → `agenda`.
- resto (motivo `pago_senia`, `vencimiento`, `sistema`, o sin clasificar) → `sistema`.

El badge/etiqueta por motivo reusa el mapeo de `triage.ts` donde aplica (foto, dato clínico,
etc.) y agrega los operativos/sistema (Confirmación, Cancelación, Reserva online, Pago, Sistema).

## Estampado en el insert (dónde)

Todos los `from('notificaciones').insert(...)` suman `prioridad` + `motivo`. Sitios (grep):

- **Derivaciones del bot** — `route.ts` (×8: ~565, 652, 677, 724, 838, 854, 927, 1003) y
  `whatsapp-auto-flow.ts` (×9: ~734, 931, 988, 1128, 1177, 1225, 1594, 1626, 1688). Cada uno ya
  calcula el mismo motivo/prioridad que estampa en la conversación (feature anterior): pasar el
  mismo slug. El catch-all `tipo: 'turno_reprogramado'` se mantiene (no se migra el enum `tipo`),
  pero ahora el `motivo`/`prioridad` lleva el dato real.
- **Ciclo de recordatorio** — `route.ts` ~565 (`notifTipo` = turno_confirmado/cancelado/
  reprogramado): motivo operativo (`turno_confirmado`/`turno_cancelado`/`turno_reprogramado_real`),
  prioridad `verde`.
- **Reserva web** — `reservas.ts` (×2, turno_nuevo): motivo `reserva_web`, prioridad `verde`.
- **Seña/pago** — `confirmar-senia.ts` (×1): motivo `pago_senia`, grupo sistema (prioridad null o verde).
- **Avisos de vencimiento / sistema** (si insertan en `notificaciones`): motivo `vencimiento`/`sistema`.

El implementer del plan corre el grep `from('notificaciones').insert` para asegurar cobertura total.

## Backfill

Las no-leídas existentes no tienen prioridad/motivo → caerían en "Sistema". Backfill por `tipo`:
`turno_confirmado/cancelado/nuevo` → verde + motivo operativo; `turno_reprogramado` sin más señal
→ amarillo/`revisar` (default seguro, no se oculta); `alerta`/`sistema` → sistema. Opcionalmente,
afinar las de WhatsApp por título (guardia/urgencia → rojo) en el mismo UPDATE.

## Backend / lectura

El `NotificationProvider` (`src/components/providers/NotificationProvider.tsx`) y el tipo
`Notificacion`/`TipoNotificacion` (`src/types/index.ts`) suman `prioridad`/`motivo`. El SELECT
que alimenta el provider los trae. No se cambia la suscripción realtime (los campos nuevos viajan
en la fila).

## Frontend

`DashboardLiveAlerts.tsx`:
- Chips arriba: `Todo / 🔴 Urgente / 🟡 Requiere respuesta / 🟢 Agenda / ⚪ Sistema`, con contador.
- 4 grupos colapsables (orden rojo, amarillo, verde, gris); rojo+amarillo abiertos, verde+gris
  colapsados. Un chip aísla un grupo (force-expand al seleccionarlo).
- Cada alerta con badge de motivo (`grupoNotificacion` + mapeo de etiquetas).
- **Link por tipo:** si la notificación es de conversación (motivo de WhatsApp / `referencia_id`
  es conversación) → `/mensajes` (idealmente abriendo esa conversación); si es de turno
  (`referencia_id` = turnoId) → `/agenda?turno=`. Reemplaza el `getNotificationStyle` de
  title-sniffing por el mapeo basado en `prioridad`/`motivo` (con el title-sniffing como fallback
  para filas viejas sin motivo).
- Mantener: no-leídas, marcar todas, descartar, `formatDistanceToNow`.

Referencia visual aprobada: mockup `.superpowers/brainstorm/6917-1794067927/content/alertas.html`.

## Constraints

- Multi-tenant (`tenant_id`), ya presente.
- Migración par `049_*.sql` + rollback (estilo existente).
- Gate: `npx tsc --noEmit` + `npm test` (vitest) verdes. Lint no gatea.
- Next del repo con cambios propios (AGENTS.md) — pero el grueso es Supabase + React.
- Git root = carpeta padre; `git add consultorio-alvarez/...`.

## Review Focus

- Alerta urgente (rojo) nunca rotulada como "Reprogramación" ni en grupo operativo. (grupo por prioridad)
- Fila vieja sin `prioridad`/`motivo` (pre-backfill o insert no migrado) no rompe: cae en Sistema o usa el fallback de título, nunca pantalla en blanco.
- Alerta de WhatsApp: el link va a `/mensajes`, no a una agenda vacía.
- `referencia_id` ambiguo (turno vs conversación): el ruteo elige bien el destino.
- Chip "Agenda"/"Sistema" colapsado no esconde un contador en 0 engañoso (contador = largo real del grupo).

## Qué queda a criterio del builder

- Slugs exactos de los motivos operativos/sistema y su etiqueta (`turno_reprogramado_real`,
  `reserva_web`, `pago_senia`, `vencimiento`) + copy (skill `brand-guidelines`).
- Si `grupoNotificacion` vive en `triage.ts` o en un `notificaciones.ts` nuevo.
- Cómo distingue el ruteo conversación-vs-turno (por motivo, o por un flag en la notificación).
- Nombre de la migración `049` + script de backfill.
- Abrir la conversación puntual en `/mensajes` (deep-link) vs solo navegar a `/mensajes`.

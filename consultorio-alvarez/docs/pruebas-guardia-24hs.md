# Pruebas reales — Bot "Guardia 24hs" (WhatsApp)

Instructivo para validar manualmente los parches de congruencia del bot
(campaña 2026-10-16, lotes 1 a 5b). Se prueba enviando mensajes desde un
WhatsApp real al número del consultorio y verificando la respuesta del bot.

## Preparación / precondiciones generales

- Probar desde un número de WhatsApp real (idealmente uno de prueba).
- Varios casos necesitan **un turno existente** para ese número, o un
  **recordatorio pendiente** (los flujos de confirmar/cancelar/reprogramar
  viven en la "rama A", que solo se activa si hay un recordatorio enviado).
- Si el número **ya es paciente**, el flujo de reserva ofrece
  "A mi nombre / Para otra persona" (1 clic) en vez de pedir nombre + DNI.
- La migración `037_whatsapp_reserva_contexto.sql` debe estar aplicada
  (necesaria para los casos RC8 y RC9). Estado: aplicada 2026-10-16.
- Tip: ir mirando la conversación también en la app (Mensajes) y las
  notificaciones, para confirmar las derivaciones a humano.

---

## Lote 1 — No ejecutar acciones destructivas en falso

### RC1 · No cancelar por síntoma / excusa
- Precondición: tener un turno próximo para ese número.
- Enviar: `me amanecí con fiebre` — o — `creo que no voy a llegar`
- ✅ Esperado: **NO** cancela. Responde con botones **Reprogramar / Cancelar /
  Mantenerlo** (o deriva a un humano si no encuentra turno).
- ❌ Antes: cancelaba el turno automáticamente.

### RC1b · Responder "no cancelar" a un recordatorio
- Precondición: recordatorio (`solicitud_turnos`) pendiente.
- Enviar: `no cancelar`
- ✅ Esperado: **NO** cancela.
- ❌ Antes: el bug lo interpretaba como cancelar.

### RC2 · Reacción / sticker no dispara el menú
- Reaccionar a un mensaje con 👍 o ❤️, o enviar un sticker.
- ✅ Esperado: el bot **no responde nada** (silencio).
- ❌ Antes: mandaba el menú de bienvenida completo (a veces varias veces).

### RC3 · Deduplicación (difícil de forzar a mano)
- Se valida en logs: si Meta reintrega el mismo mensaje (mismo `wa_message_id`),
  el bot responde **una sola vez**.

---

## Lote 2 — Clínico siempre atendido + número equivocado

### RC4 · Dolor / urgencia siempre responde
- Enviar: `me duele mucho la muela, no aguanto`
- ✅ Esperado: respuesta de urgencia — menú de triage si está configurado, o
  "recibimos tu urgencia, te contactamos ya" + la conversación queda en espera
  de un humano (HUMANO_PENDIENTE) + alerta al equipo.
- ❌ Antes: caía al menú genérico o quedaba sin respuesta.

### RC4b · Falso positivo de urgencia evitado
- Enviar: `quiero un turno para una muela`
- ✅ Esperado: ofrece turnos (NO lo trata como urgencia). "muela" ya no dispara
  urgencia.

### RC5 · Número equivocado / opt-out
- Enviar: `no soy María, se confundieron de número`
- ✅ Esperado: disculpa + el bot **deja de responder automáticamente** +
  alerta al equipo para corregir el contacto.
- ❌ Antes: le ofrecía slots igual.

---

## Lote 3 — Orden de intenciones (FAQ y "mi turno" primero)

### RC6 · "mi turno" no ofrece slots nuevos
- Precondición: turno existente para ese número.
- Enviar: `cuándo es mi turno?`
- ✅ Esperado: muestra **tu** turno (fecha / hora / profesional).
- ❌ Antes: ofrecía sacar un turno nuevo.

### RC6b · FAQ antes que reserva
- `cuánto sale una limpieza?` → ✅ responde aranceles / medios de pago.
- `atienden OSDE?` → ✅ responde obras sociales.
- `en qué lugar quedan?` → ✅ responde ubicación.
- ❌ Antes: cualquiera de estas podía disparar la oferta de slots.

---

## Lote 4 — Validación de datos

### RC10 · Adjunto no se interpreta como DNI
- Enviar un PDF o imagen con nombre tipo `comprobante-15-10-2026.pdf`.
- ✅ Esperado: "¡Recibido! lo adjuntamos a tu ficha…" + deriva a un humano.
- ❌ Antes: respondía "no hay turnos para el DNI 15102026".

### RC10b · Recordatorio de turno vencido (no reproducible a mano)
- Se valida en que el cron ya **no** envía recordatorios de turnos con fecha
  anterior a hoy.

---

## Lote 5a — Estructural

### RC11 · Urgencia honesta (requiere triage configurado)
- Activar Urgencia → elegir categoría → tocar **Confirmar turno de guardia**.
- ✅ Esperado: "¡Recibimos tu urgencia! … una recepcionista te va a
  *confirmar*…", con **fecha legible** (no `2026-10-20`), y queda en espera de
  un humano.
- ❌ Antes: decía "Turno Confirmado" (falso, no creaba turno) y con fecha cruda.

### RC12 · Match de teléfono (indirecto)
- Se valida en que el bot ya no muestra/cancela el turno de otra persona por
  coincidencia parcial de teléfono. Usa los últimos 10 dígitos exactos.

### RC13 · Anti-loop de menú
- Enviar 3 mensajes seguidos sin sentido: `asdasd` → `qwqwqw` → `zxzxzx`
- ✅ Esperado: tras el 2.º/3.º intento, en vez de repetir el menú, dice "no
  logro ayudarte, avisé a una persona…" y deriva a un humano.
- ❌ Antes: menú infinito en loop.

---

## Lote 5b — Reserva (requiere migración 037)

### RC8 · Reserva multi-paso persistente
- Enviar: `quiero un turno` → tocar un horario → te pide nombre → escribir
  `Juan Perez` → te pide DNI → escribir `30111222`.
- ✅ Esperado: completa la reserva (el nombre y el DNI no se pierden entre
  pasos, aunque corra en instancias serverless distintas).
- ❌ Antes: el estado vivía en memoria (RAM) y se cortaba el flujo.

### RC9 · Selección numérica de slot
- Enviar: `quiero un turno` → el bot lista `1️⃣ 2️⃣ 3️⃣` → responder `2`.
- ✅ Esperado: toma la opción 2 y sigue la reserva.
- ❌ Antes: respondía con el menú genérico.

---

## Pendiente (feature, no bug)

### RC7 · Auto-reprogramación
- Hoy, al tocar "Reprogramar", el bot **registra** el pedido + avisa a recepción
  + alerta. No ofrece slots para elegir una nueva fecha solo.
- Mejora futura: ofrecer slots y **mover** el turno (no crear uno nuevo).

## Hallazgos de código no urgentes (para revisar con tiempo)

- El gate de horario (`esHorarioFueraDeAtencion`) existe pero no está conectado:
  el bot promete "una recepcionista se comunicará" también fuera de horario.
- Los horarios de atención en la FAQ de ubicación están hardcodeados
  (Lun–Vie 09–20, Sáb 09–13), no salen de la config real del tenant.
- `enviarMenuPrincipalWhatsApp` (menú de guardia de 2 botones) es código muerto.

---

## Relevamiento de producción — 2026-10-24

Segundo análisis de la base de chats (`whatsapp_mensajes` / `whatsapp_conversaciones`),
ventana de 14–30 días. Se separó cada hallazgo por fecha respecto del parche del
2026-10-16.

**Resultado de los parches previos (RC1–RC13):** aguantaron. Tomando como corte el
2026-10-16, las fallas graves **no reincidieron** en los días siguientes (188
conversaciones):

- RC1 (cancelar por síntoma/excusa): 3 casos antes del parche, **0 después**.
- RC5 (número equivocado sin frenar): 4 casos antes, **0 después**.
- RC10 (DNI con forma de fecha): 1 caso antes (2026-10-15), **0 después**.
- RC9 (selección numérica de slot): el caso observado era del 2026-10-14
  (pre-parche); la lógica ya vive en `whatsapp-auto-flow.ts` (clic/numérico
  `SLOTS_OFRECIDOS`). No se tocó.

**Fallas vigentes detectadas (posteriores al parche) y corregidas en esta campaña:**

### RC14 · Nota de voz no cae al menú
- Enviar un audio (nota de voz) al número del consultorio.
- ✅ Esperado: acuse "¡Recibimos tu nota de voz!…" + deriva a un humano
  (`HUMANO_PENDIENTE`) + aviso "🎙️ Nota de voz" al equipo.
- ❌ Antes: respondía el menú de bienvenida genérico.

### RC15 · Cierre / cortesía / emoji no dispara el menú
- Enviar un emoji solo (`👍`, `🙏`, `🫰`, `👌`): el bot **no responde nada** (silencio).
- Enviar un cierre: `ok`, `dale`, `listo`, `perfecto`, `ok gracias`,
  `estoy yendo`, `allí estaré`, `excelente, muchas gracias 🫂`.
- ✅ Esperado: respuesta corta de cortesía (o silencio en el caso del emoji solo).
- ❌ Antes: cualquiera de estos devolvía el menú de bienvenida completo.
- Nota: el match se hace sobre el texto sin emojis, así `perfecto 👌 allí estaré`
  cuenta igual que `perfecto allí estaré`. El flujo de reserva/DNI corre antes,
  así que un `ok` suelto nunca pisa un paso en curso.

### RC16 · Reclick del botón no duplica turnos
- Tocar varias veces seguidas "Si, confirmo" en el mismo recordatorio.
- ✅ Esperado: el turno se confirma **una sola vez**; los reclicks se ignoran.
- ❌ Antes: cada toque reconfirmaba y re-enviaba plantilla + notificación
  (se vieron 6 confirmaciones del mismo turno). El dedupe por `wa_message_id`
  no los agarra porque son mensajes distintos; ahora se corta por recordatorio
  ya respondido con la misma acción.

### RC17 · Pedir otra fecha en texto (fuera de los slots ofrecidos)
- Precondición: el bot acaba de ofrecer los 3 próximos slots.
- Enviar en texto: `semana próxima` / `pasada esa fecha` / `para noviembre` /
  `ninguna de esas`.
- ✅ Esperado: deriva a una persona para coordinar la fecha + aviso a recepción.
- ❌ Antes: caía al menú genérico. (Relacionado con RC7: la auto-reprogramación
  con elección de fecha sigue pendiente como feature.)

### RC18 · Dato clínico relevante se deriva al profesional
- Enviar: `tomo anticoagulantes` / `soy alérgico a la penicilina` /
  `estoy embarazada` / `soy diabético` / `tengo marcapasos`.
- ✅ Esperado: acuse "¡Gracias por avisarnos!…" + aviso "🩺 Dato clínico" al
  equipo + `HUMANO_PENDIENTE`.
- ❌ Antes: respondía el menú genérico.
- Límite conocido: detecta las menciones comunes, pero **no** capta marcas
  sueltas mal escritas (p. ej. "Aplixaban" por apixaban). Ese caso puntual todavía
  cae al flujo general.

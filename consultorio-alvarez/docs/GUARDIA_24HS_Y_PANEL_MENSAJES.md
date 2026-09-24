# 📋 Plan de Desarrollo: Sistema de Guardia 24hs Odontológica + Handoff Humano en WhatsApp

> **Fecha de creación:** 24 de Septiembre de 2026  
> **Estado:** Listo para implementar  
> **Tecnología:** Next.js (App Router), Supabase (PostgreSQL + Realtime), WhatsApp Cloud API Oficial (Meta Graph API v20+).

---

## 🎯 Objetivo General
1. **Inbox / Panel de "Mensajes" Multiatención:** Permitir al equipo de recepción y profesionales intervenir en chats de WhatsApp con firma de operador personalizada (`[Nombre del Operador]`), al estilo de **ZonaProp**, manteniendo el control de quién habla y cuándo el bot debe pausarse o reanudarse.
2. **Servicio de Guardia 24hs Inteligente (Triage Autoguiado):**
   - Detección automática de urgencias fuera de hora.
   - Algoritmo de asignación inmediata del **primer turno libre más cercano** disponible en la agenda.
   - Envío automático de **Tips clínicos de primeros auxilios y alivio del dolor** (junto con advertencias de qué NO hacer) para contener al paciente hasta su llegada al consultorio.
   - Botón de escalado para **emergencias críticas** que dispara Push Notifications directas al odontólogo de guardia.

---

## 🏗️ 1. Arquitectura de Datos (Supabase)

### A. Conversaciones y Mensajes (`whatsapp_conversaciones` y `whatsapp_mensajes`)
```sql
-- 1. Estados de conversación
CREATE TYPE estado_wa_conversacion AS ENUM ('BOT', 'HUMANO_PENDIENTE', 'HUMANO_ATENDIENDO', 'CERRADO');
CREATE TYPE remitente_wa_mensaje AS ENUM ('paciente', 'bot', 'agente');

-- 2. Tabla de Conversaciones
CREATE TABLE whatsapp_conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    telefono TEXT NOT NULL, -- Normalizado (ej: 5491130174859)
    nombre_contacto TEXT,
    estado estado_wa_conversacion NOT NULL DEFAULT 'BOT',
    asignado_a UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_mensaje_texto TEXT,
    no_leidos_operador INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, telefono)
);

-- 3. Tabla de Mensajes
CREATE TABLE whatsapp_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversacion_id UUID NOT NULL REFERENCES whatsapp_conversaciones(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'texto', -- 'texto', 'interactivo', 'imagen', 'audio'
    remitente remitente_wa_mensaje NOT NULL,
    agente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    agente_nombre TEXT, -- Ej: 'Yesica Judith Perazzo' o 'Dr. Álvarez'
    contenido TEXT NOT NULL,
    wa_message_id TEXT, -- ID provisto por Meta
    estado_envio TEXT DEFAULT 'enviado', -- 'enviado', 'entregado', 'leido', 'fallido'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Realtime para actualización instantánea en el panel
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversaciones;
```

### B. Tabla de Triage y Tips de Dolor (`triage_guardia_config`)
```sql
CREATE TABLE triage_guardia_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- 'DOLOR_PULSATIL', 'FRACTURA_DIENTE', 'SANGRADO', 'ORTODONCIA'
    titulo_boton TEXT NOT NULL, -- Ej: '⚡ Dolor agudo / Muela latiente'
    tips_alivio TEXT NOT NULL, -- Consejos médicos de alivio inmediato
    advertencias TEXT NOT NULL, -- Qué NO hacer (ej: no calor, no aspirina en encía)
    prioridad_agenda INT DEFAULT 1,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🤖 2. Flujo del Triage y Guardia 24hs (Basado en Botones Quick Reply + Descripción Libre)

```
[Paciente envía cualquier mensaje o consulta]: "Hola buenas noches"
                         ↓
             [Webhook WhatsApp / Bot]
                         ↓
"🦷 Consultorio Álvarez — Asistente Digital
¡Hola! ¿En qué te podemos ayudar hoy?
Por favor seleccioná una opción para brindarte atención inmediata:"

   [ 🚨 Urgencia / Guardia ]    [ 💬 Hablar con Recepción ]
                         ↓
   [Paciente presiona: "🚨 Urgencia / Guardia"]
                         ↓
1. Notificación inmediata en el panel de administración: "🚨 Protocolo de Guardia Activado".
2. El bot responde invitando a describir la situación y ofreciendo botones clínicos de alivio:

"🚨 Protocolo de Guardia Odontológica Activado
Entendemos tu urgencia y estamos para asistirte de inmediato.
Podés describirnos por este chat qué te está sucediendo (o enviarnos una foto o audio de la zona afectada).

Para brindarte consejos médicos de alivio inmediato y asignarte el turno prioritario más cercano, también podés seleccionar tu situación:"

   [ ⚡ Dolor agudo / Muela ]   [ 🦷 Diente roto / caído ]   [ 🩸 Sangrado o Bracket ]
                         ↓
   [Paciente describe su cuadro y/o presiona "⚡ Dolor agudo / Muela"]
                         ↓
[Algoritmo Fast-Slot consulta disponibilidad de agenda en Supabase]:
"🩺 CONSEJOS DE ALIVIO INMEDIATO:
• Doble almohada: Elevá la cabeza al acostarte para reducir la presión en la zona.
• Frío local: Compresa fría sobre la mejilla (10 min sí, 10 min descanso).
⚠️ NUNCA apliques calor en la cara (empeora la infección e inflamación).
⚠️ NUNCA apoyes aspirina sobre la encía (produce quemaduras químicas).

─────────────────────
🗓️ PRIMER TURNO DISPONIBLE:
Te podemos atender el Jueves 24/09 a las 09:00 hs con el Dr. Álvarez.

¿Deseás confirmar este turno o preferís que una recepcionista te contacte en cuanto inicie la atención?"

   [ ✅ Confirmar Turno ]    [ 💬 Hablar con Recepción ]
                         ↓
   [Paciente confirma turno]
                         ↓
1. Notificación en tiempo real al panel administrativo de Álvarez.
2. Confirmación al paciente con dirección del consultorio y recordatorio de DNI.
```

> 💡 **Salvavidas complementario por palabras clave:** Si el paciente no toca los botones y escribe directamente palabras como *"urgencia"*, *"dolor"*, *"muela"*, *"sangre"*, *"partió"*, etc., el detector en segundo plano dispara de todas formas el menú de triage de forma automática.

---

## 🤖 2. Flujo del Triage y Guardia 24hs (Basado en Botones Quick Reply + Descripción Libre)

```
[Paciente a las 23:30 hs]: "Me duele muchísimo una muela, no puedo dormir"
                         ↓
             [Webhook WhatsApp / Bot]
                         ↓
"Hola, entendemos tu malestar y estamos para ayudarte 🚨.
Para asignarte el turno de guardia disponible más cercano, contanos:
¿Cuál es tu situación?"

  [ ⚡ Dolor agudo / Latiente ]
  [ 🦷 Diente roto o caído ]
  [ 🩸 Sangrado o bracket ]
                         ↓
  [Paciente elige: "⚡ Dolor agudo"]
                         ↓
[Algoritmo Fast-Slot consulta disponibilidad de agenda en Supabase]:
"Tenemos disponible para atenderte hoy a primera hora:
🗓️ Hoy a las 09:00 hs con el Dr. Álvarez.
📍 Consultorio Álvarez - Av. Rivadavia 1234.

¿Te confirmamos este turno de urgencia?"

  [ ✅ Sí, reservar turno ]
  [ ⏱️ Ver otros horarios ]
                         ↓
  [Paciente confirma turno]
                         ↓
1. Se crea el Turno en DB (estado: 'CONFIRMADO', tipo: 'URGENCIA_GUARDIA').
2. Se envía mensaje con TIPS CLÍNICOS según la categoría elegida:
   "🩺 MIENTRAS LLEGA TU TURNO, SEGUÍ ESTOS CONSEJOS:
   • Doble almohada: Elevá la cabeza para reducir la presión en la zona.
   • Frío local: Hielo envuelto en paño sobre la mejilla (10 min sí, 10 min no).
   ⚠️ NUNCA apliques calor en la cara (empeora la infección).
   ⚠️ NUNCA apoyes aspirina sobre la encía (provoca quemaduras químicas).

   Si presentás hinchazón en el cuello o dificultad para respirar:
   [ 🚨 Emergencia Crítica / Alertar Guardia ]"
```

---

## 👨‍💻 3. Intervención Humana (Handoff estilo ZonaProp)

### A. Cuándo se activa:
- El paciente presiona *"Hablar con Recepción / Asesor"* o *"🚨 Emergencia Crítica"*.
- El bot no reconoce la consulta y deriva a atención personalizada.
- El operador desde el panel toma el control del chat manualmente.

### B. Comportamiento del Sistema:
1. `conversacion.estado` cambia a `'HUMANO_PENDIENTE'` o `'HUMANO_ATENDIENDO'`.
2. El bot **guarda silencio total** para ese número (no interfiere).
3. Se genera notificación Push y alerta en la campana del dashboard.

### C. Envío con Prefijo de Operador:
Cuando el operador escribe en el panel:
```typescript
// En src/lib/actions/whatsapp-chat.ts
export async function enviarMensajeAgente(conversacionId: string, texto: string) {
    const usuario = await getCurrentUsuario();
    const conversacion = await getConversacion(conversacionId);

    // Formateo con el nombre del agente (exacto como ZonaProp)
    const textoConFirma = `[${usuario.nombre} ${usuario.apellido}]\n${texto}`;

    // Despacho a WhatsApp Cloud API
    await sendWhatsAppCloudMessage(conversacion.telefono, textoConFirma);

    // Guardado en BD para reflejar en el panel
    await guardarMensaje({
        conversacion_id: conversacionId,
        remitente: 'agente',
        agente_id: usuario.id,
        agente_nombre: `${usuario.nombre} ${usuario.apellido}`,
        contenido: textoConFirma,
    });
}
```

---

## 🖥️ 4. Panel de Mensajes en el Dashboard (`src/app/(admin)/mensajes`)

- **Ruta:** `/mensajes`
- **Ícono Sidebar:** `MessageSquareText` con badge de chats pendientes.
- **Vistas:**
  - **Filtros rápidos:** *Todos* | *Pendientes de Atención* (alerta amarilla/roja) | *Mis Chats* | *Bot Activo* | *Cerrados*.
  - **Detalle de Chat:**
    - Cabecera con datos del paciente, botón para ir a su Historia Clínica / Ficha.
    - Selector de estado: `[ Reanudar Bot ]` | `[ Tomar Chat ]` | `[ Finalizar y Cerrar ]`.
    - Burbujas de chat con timestamps y nombres de agentes diferenciados.
    - Respuestas rápidas predefinidas (plantillas frecuentes).

---

## 🚀 Estado de la Implementación (Fase 1 Completada)

- [x] **Paso 1: Script de Migración SQL Creado:** Archivo [015_whatsapp_inbox_guardia_triage.sql](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/supabase/migrations/015_whatsapp_inbox_guardia_triage.sql) listo para ejecutar en Supabase SQL Editor.
- [x] **Paso 2: Webhook Resiliente y Defensivo:** Modificado [route.ts](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/app/api/webhooks/whatsapp/route.ts) sin alterar en lo más mínimo la confirmación de turnos existente. Incluye persistencia y máquina de estados Bot vs Humano.
- [x] **Paso 3: Servicio de Guardia y Fast-Slot:** Desarrollado [whatsapp-guardia.ts](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/lib/whatsapp-guardia.ts) con detección de urgencias, cálculo de disponibilidad inmediata y despacho de menús de triage.
- [x] **Paso 4: Server Actions Multiatención:** Creado [whatsapp-chat.ts](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/lib/actions/whatsapp-chat.ts) con firma de operador personalizada `[Nombre Apellido]` estilo ZonaProp.
- [x] **Paso 5: Pantalla de Mensajes en el Dashboard:** Desarrollados [ChatInboxView.tsx](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/components/mensajes/ChatInboxView.tsx) y [page.tsx](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/app/(admin)/mensajes/page.tsx) con soporte Supabase Realtime, filtros y respuestas rápidas.
- [x] **Paso 6: Acceso en Menú:** Agregado el acceso a **Mensajes** en [Sidebar.tsx](file:///Users/sebamaza/Desktop/PROYECTOS%20DEV/Consultorio%20Alvarez/consultorio-alvarez/src/components/layout/Sidebar.tsx).

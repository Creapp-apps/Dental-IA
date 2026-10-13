# Runbook — Alta y vinculación del número de WhatsApp (tenant Curadent)

> Guía paso a paso para hacer EN VIVO con el cliente. Objetivo: que el número de
> WhatsApp de **Curadent** quede vinculado a la plataforma DentalIA (Meta Cloud API)
> y responda automáticamente con el flujo Guardia 24hs, igual que Álvarez pero con
> los datos de Curadent.

Fecha prevista: a completar la mañana siguiente al 2026-10-13.
Repo: `Creapp-apps/Dental-IA` · Proyecto Vercel: `dental-ia`.

---

## 0. Conceptos clave (leer antes de arrancar)

- **Un solo webhook para toda la plataforma.** No hay un webhook por clínica.
  Todos los números (Álvarez, Curadent, …) pegan al mismo endpoint y la app
  resuelve el tenant por el `phone_number_id` que Meta manda en el payload
  (`resolveTenantByPhoneNumberId` en `src/lib/whatsapp.ts`).
- **El dominio NO rutea el webhook.** En Vercel, todos los dominios apuntan al
  mismo deploy. Por eso el webhook debe ir al **dominio central SaaS**, no al
  dominio propio de un consultorio.
  - Dominio central (usar este): **`dentalia.com.ar`**
  - `dentalva.ar` = dominio propio de **Álvarez** (NO usar para el webhook).
- **Dos lugares distintos de Meta:**
  1. **Business del cliente** (tenemos rol *Socio* con control total): WABA,
     número, código de verificación, System User / token.
  2. **Nuestra Meta App** (cuenta de desarrollador): webhook (URL + verify token),
     suscripción del campo `messages`, y asociación de la WABA a la App.

### Datos fijos
- **URL del webhook (cargar en Meta):**
  `https://dentalia.com.ar/api/webhooks/whatsapp`
- **Verify token:** es el valor de la env var `META_WA_VERIFY_TOKEN` en Vercel
  (proyecto `dental-ia`, entorno Production).
  - ⚠️ Si esa env var NO está seteada en Vercel, el código usa el fallback
    literal `ALVAREZ_WA_WEBHOOK_VERIFY_TOKEN` (ver `route.ts` GET). En ese caso,
    ese es el valor a poner en Meta. **Confirmar el valor real antes de empezar.**
- **Campo a suscribir en el webhook:** `messages`.
- **Versión Graph API usada en el código:** `v20.0`.
- **Permisos del token permanente:** `whatsapp_business_messaging` +
  `whatsapp_business_management`.

### Pre-check (ya confirmado)
- [x] Rol *Socio* con control total en el Business del cliente.
- [x] El número de Curadent está **libre** (no activo en WhatsApp normal ni
      WhatsApp Business App). Si estuviera activo, hay que borrarlo de esa app
      ANTES de pedir el código, o la verificación se traba.
- [x] El tenant **Curadent ya existe** en la plataforma.
- [x] Código de la plataforma listo y desplegado (ver "Estado del código" abajo).

### Pre-check a verificar mañana
- [ ] `dentalia.com.ar` está asignado al proyecto `dental-ia` en Vercel y resuelve
      por HTTPS (abrir `https://dentalia.com.ar` en el navegador).
- [ ] Valor real de `META_WA_VERIFY_TOKEN` en Vercel Production (o usar el fallback).
- [ ] El cliente está disponible con el teléfono del número en mano para leer el código.

---

## 1. (Business del cliente) Agregar y verificar el número

1. Entrar a **Meta Business Suite / Business Settings** del negocio del cliente
   (donde somos Socio) → **Cuentas → Cuentas de WhatsApp (WABA)**.
   - Si no existe WABA para Curadent, crear una.
2. Dentro de la WABA → **Números de teléfono → Agregar número de teléfono**.
3. Cargar el número de Curadent y el **nombre para mostrar** (display name).
   - El display name pasa por revisión de Meta; puede quedar "pendiente" un rato.
4. Elegir método de verificación: **SMS** o **llamada**.
5. Meta envía el **código de 6 dígitos** al teléfono del cliente →
   el cliente nos lo dicta → lo ingresamos → **número verificado**.
6. Registrar el número en Cloud API y definir el **PIN de verificación en dos pasos**
   (guardarlo; se pide en re-registros).

**Resultado:** anotar el **Phone Number ID** del número (se usa en el paso 4).

---

## 2. (Business del cliente) Asociar la WABA a nuestra Meta App

La WABA de Curadent tiene que quedar conectada a **nuestra** Meta App (la del
webhook), para que los mensajes lleguen a nuestro endpoint.

- Opción A: compartir/asignar la WABA del cliente a nuestra Meta App desde el
  Business Settings del cliente (asignación de activos → la App como socio).
- Opción B: si el número se creó en una WABA que ya cuelga de nuestra App, ya está.

**Anotar también el WABA ID.**

---

## 3. (Nuestra Meta App) Webhook + suscripción

1. Ir a `developers.facebook.com` → nuestra App → **WhatsApp → Configuración**.
2. En **Webhook**:
   - Callback URL: `https://dentalia.com.ar/api/webhooks/whatsapp`
   - Verify token: el valor confirmado en el Pre-check.
   - Guardar → Meta hace un GET de verificación; el endpoint devuelve el challenge.
     Si falla, revisar que la URL resuelva (HTTPS) y que el verify token coincida.
3. En los **campos del webhook**, suscribir **`messages`**.
4. Suscribir la **WABA de Curadent** a la App (webhooks de esa WABA activos).

**Verificación rápida:** en Vercel → proyecto `dental-ia` → Logs, al guardar el
webhook debería verse el GET de verificación respondido 200.

---

## 4. (Business del cliente) Token permanente

1. Business Settings del cliente → **Usuarios → Usuarios del sistema (System Users)**.
2. Crear/usar un System User y **asignarle la WABA** de Curadent con control total.
3. **Generar token** con los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copiar el **Access Token** (permanente, no el temporal de 24hs).

---

## 5. (App DentalIA) Cargar credenciales en el tenant Curadent

1. Entrar a la plataforma como admin de **Curadent** (o vía superadmin).
2. **Configuración → Integraciones → WhatsApp**.
3. En la sección **"Credenciales Meta Cloud API"** (agregada hoy):
   - **Phone Number ID**: el del paso 1.
   - **Access Token (permanente)**: el del paso 4.
4. **Guardar Configuración.**
   - Esto hace un upsert en la tabla `tenant_integrations`
     (`provider='whatsapp'`, `is_active=true`, `credentials={access_token, phone_number_id}`).

> Alternativa manual (si la UI falla): insertar/actualizar la fila en
> `tenant_integrations` para el `tenant_id` de Curadent con
> `credentials = {"access_token":"…","phone_number_id":"…"}` y `is_active=true`.

---

## 6. Prueba en vivo

1. Desde un celular cualquiera, enviar un mensaje de WhatsApp al número de Curadent.
2. Esperado: responde el **menú principal del bot con el nombre "Curadent"**
   (no "Consultorio Álvarez"), y la dirección/datos de Curadent donde corresponda.
3. Probar el botón **🚨 Urgencia / Dolor** → debe disparar el flujo de guardia y,
   al confirmar, el mensaje de confirmación debe decir **Curadent** + su dirección.
4. Verificar en Vercel Logs: `[WA WEBHOOK] ... tenant` resuelto a Curadent, sin
   `Unrecognized tenant ignored`.

### Checklist final
- [ ] Llega el webhook (GET verificado 200).
- [ ] `phone_number_id` de Curadent carga en `tenant_integrations`.
- [ ] Mensaje entrante → menú con nombre **Curadent**.
- [ ] Flujo de guardia/urgencia OK con datos de Curadent.
- [ ] Link de reserva que manda el bot apunta a `dentalia.com.ar/reservar?slug=curadent`
      (o al dominio propio de Curadent si se configuró `custom_domain`).

---

## Troubleshooting

- **El GET de verificación falla en Meta:** verify token no coincide, o
  `dentalia.com.ar` no resuelve en Vercel. Revisar env `META_WA_VERIFY_TOKEN` y
  que el dominio esté asignado al proyecto.
- **Mensaje entra pero se ignora (`Unrecognized tenant ignored`):** el
  `phone_number_id` entrante no está cargado en `tenant_integrations` de ningún
  tenant. Cargar bien el Phone Number ID (paso 5).
- **Responde "como Álvarez":** el tenant no se resolvió o faltan datos del tenant
  en la tabla `tenants` (`nombre`, `direccion`, `ciudad`). Completar esos campos de
  Curadent.
- **No envía (error de token):** el Access Token no es permanente o le faltan
  permisos. Regenerar System User token con los dos permisos.
- **No se puede verificar el número:** probablemente sigue activo en WhatsApp/
  WhatsApp Business App. Borrarlo de esa app y reintentar.

---

## Estado del código (ya hecho el 2026-10-13, desplegado en `main`)

Commits:
- `0c61c60` feat(whatsapp): credenciales Cloud API por tenant y mensajes sin hardcodear Álvarez
- `72ecf9b` fix(whatsapp): link de reserva cae al dominio central, no al de Álvarez

Cambios:
- `TabIntegraciones.tsx`: el wizard de WhatsApp ahora captura y guarda
  `phone_number_id` + `access_token` (lo que el backend necesita).
- `webhooks/whatsapp/route.ts`: nombre/dirección salen de la fila `tenants`;
  se eliminó `enviarAutoRespuestaMeta` (dead code hardcodeado a Álvarez).
- `whatsapp-auto-flow.ts` / `whatsapp-guardia.ts`: sin fallbacks hardcodeados a
  Álvarez; `baseUrl` del link de reserva cae a `dentalia.com.ar`.

**Conclusión:** el código está listo y es multi-tenant. Lo que falta mañana es
puramente la operación en Meta (pasos 1-4) + cargar credenciales (paso 5) + probar.

# 📱 Roadmap de Autoservicio y Automatización WhatsApp

**Estado:** Planificado / Pendiente de implementación  
**Objetivo:** Automatizar el 85% - 90% de las consultas de WhatsApp para Consultorio Álvarez, minimizando la intervención humana solo a casos excepcionales.

---

## 1. Menú Principal de Acceso Inmediato (3 Botones Rápidos)
El bot responderá a los mensajes entrantes con un mensaje interactivo con 3 botones de acción (dentro del límite de 20 caracteres de Meta):

1. **`[ 🚨 Guardia 24hs ]`** (15 caracteres)
   - Dispara el flujo de triage odontológico (Dolor pulsátil, Sangrado, Fractura, Ortodoncia).
   - Ofrece tips médicos inmediatos y propone el turno más próximo (Fast-Slot).

2. **`[ 📅 Sacar Turno ]`** (14 caracteres)
   - Envía el link directo de reserva online en tiempo real:
     `https://dentalva.ar/reservar?slug=alvarez`
   - Permite al paciente autogestionar su cita 24/7 sin esperar a recepción.

3. **`[ 📋 Más Opciones ]`** (15 caracteres)
   - Despliega el menú interactivo tipo lista de WhatsApp (*Interactive List Message*).

---

## 2. Menú Desplegable Tipo Lista (Interactive List Message)
WhatsApp permite agrupar hasta 10 opciones en listas nativas desplegables:

### Sección A: Información del Consultorio
- **💳 Obras Sociales y Prepagas:**
  - Extrae en tiempo real de la tabla `obras_sociales` del tenant.
  - Envía la lista de las 17 prepagas aceptadas (Swiss Medical, IOMA, Medifé, OMINT, Sancor, etc.) y modalidades de copago.
- **📍 Ubicación y Horarios:**
  - Extrae la dirección (`Av. Maipú 2841 1B`).
  - Envía el link a Google Maps para navegación por GPS.
  - Envía los horarios de atención activos del día.
- **🦷 Tratamientos y Especialidades:**
  - Muestra la lista de servicios (Ortodoncia, Implantes, Prótesis, Limpieza, Odontopediatría, Blanqueamiento).

### Sección B: Atención Personalizada
- **👩‍💼 Hablar con Recepción:**
  - **Filtro Inteligente previo (Human Gate):**  
    El bot solicita al paciente:
    1. Nombre y Apellido.
    2. Motivo o duda específica.
  - Al recibir los datos, pasa la conversación a estado `HUMANO_PENDIENTE` y activa el badge/alerta sonoro en el panel `/mensajes`.

---

## 3. Arquitectura y Código a Tocar
- **`src/lib/whatsapp-guardia.ts`**:
  - Función `enviarMenuPrincipalWhatsApp` (3 botones).
  - Función `enviarListaOpcionesWhatsApp` (Interactive List).
  - Función `enviarInfoObrasSocialesWhatsApp` (Query a `obras_sociales`).
  - Función `enviarUbicacionYHorariosWhatsApp` (Query a `tenants` y `landing_config`).
- **`src/app/api/webhooks/whatsapp/route.ts`**:
  - Manejo de `list_reply.id` para cada opción de la lista.

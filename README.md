# 🦷 Dental-IA — Sistema Operativo Clínico & SaaS Odontológico con IA

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Meta Cloud API](https://img.shields.io/badge/WhatsApp_API-Official_Meta-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://developers.facebook.com/products/whatsapp/)
[![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-Checkout_Pro-009EE3?style=for-the-badge&logo=mercadopago&logoColor=white)](https://www.mercadopago.com.ar)

**La solución integral para consultorios y centros odontológicos modernos: Automatización de agenda 24/7 con IA, odontograma interactivo multicapa, historia clínica digital y gestión financiera.**

[Explorar CreAPP Lab](https://creapp.com.ar) • [Reportar un Issue](https://github.com/Creapp-apps/Dental-IA/issues)

</div>

---

## 🌟 Visión del Producto

**Dental-IA** es una plataforma SaaS de alta gama diseñada específicamente para eliminar los cuellos de botella operativos de clínicas odontológicas: ausentismo de pacientes (*no-shows*), colapso de recepción, gestión en papel y cálculos manuales de liquidación.

Integra en una única solución cloud:
1. **Asistente Conversacional IA (WhatsApp Oficial):** Atención, resolución de dudas y agendamiento autónomo 24/7 conectado a Meta Cloud API.
2. **Turnero Web Público & Cobro de Señas:** Pasarela de pago integrada (Mercado Pago) para asegurar el compromiso del turno.
3. **Odontograma Interactivo Multicapa:** Notación internacional FDI (32 piezas dentales, 5 caras por pieza) con historial evolutivo.
4. **Historia Clínica Digital Unificada:** Antecedentes médicos, consentimientos informados y almacenamiento seguro de radiografías en la nube.
5. **Sala de Espera Digital en Tiempo Real:** Notificaciones silenciosas e instantáneas desde recepción directo a la pantalla del profesional.
6. **Módulo de Liquidaciones Automatizadas:** Cálculo instantáneo de honorarios, comisiones y prácticas por profesional.

---

## 🚀 Arquitectura y Módulos Principales

### 🤖 1. Asistente con IA & WhatsApp (Meta Cloud API)
* **Atención y Agendamiento 24/7:** Responde fuera del horario comercial, feriados y madrugadas. Asigna turnos consultando la disponibilidad médica en tiempo real y respetando tiempos de sanitización.
* **Confirmación Proactiva de Turnos:** Dispara mensajes interactivos 24 horas antes con botones directos (*Confirmar / Reprogramar / Cancelar*), actualizando el estado de la agenda al instante.
* **Triaje Inteligente de Urgencias:** Detecta dolor agudo, hemorragias o traumatismos y activa alertas prioritarias para el equipo médico.

### 🦷 2. Odontograma Digital Multicapa (FDI 32 Piezas)
* **Gráficos vectoriales e interactivos:** Selección precisa de caras (Oclusal, Mesial, Distal, Vestibular, Palatina/Lingual).
* **Convención cromática internacional:** Registro de caries, restauraciones, endodoncias, coronas, implantes, prótesis y extracciones con un clic.
* **Control de versiones clínicas:** Comparación inmediata entre el estado inicial (*diagnóstico*) y los tratamientos en curso o concluidos.

### 💳 3. Turnero Online con Cobro de Seña (Mercado Pago)
* **Eliminación de No-Shows:** Permite exigir un depósito/seña configurable para confirmar el turno.
* **Webhooks bidireccionales:** Confirmación instantánea del pago e impacto inmediato en la agenda de Supabase.

### 🏥 4. Sala de Espera Digital & Notificaciones
* **Avisos sin interrupciones:** Recepción notifica la llegada del paciente y el doctor recibe una alerta silenciosa e interactiva en su monitor.
* **Push Notifications & WebSockets:** Actualizaciones en milisegundos con Supabase Realtime y Web-Push.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework Web** | `Next.js 16 (App Router)` + `React 19` | Server Components, alto rendimiento y SSR. |
| **Lenguaje** | `TypeScript 5` | Tipado estricto de punta a punta. |
| **Estilos & UI** | `TailwindCSS` + `Radix UI` + `Shadcn UI` | Diseño responsivo, accesible y estético. |
| **3D & Animaciones** | `Three.js` + `@react-three/fiber` + `GSAP` | Visualización clínica y transiciones fluidas. |
| **Base de Datos & Auth** | `Supabase` (PostgreSQL) | RLS (Row Level Security), Auth SSR y Realtime. |
| **Mensajería & WhatsApp** | `Meta Cloud API Webhooks` | Canal conversacional oficial 24/7. |
| **Pagos** | `Mercado Pago SDK` (Checkout Pro) | Cobro de señas y aranceles online. |
| **Emails Transaccionales**| `Resend` + `@react-email` | Recordatorios y notificaciones de agenda. |

---

## 💻 Instalación y Desarrollo Local

### Prerrequisitos
* Node.js 18+ o superior
* Cuenta de Supabase configurada con el schema clínico
* Token de acceso y Webhook de Meta for Developers (WhatsApp Cloud API)

### 1. Clonar el repositorio
```bash
git clone https://github.com/Creapp-apps/Dental-IA.git
cd Dental-IA/consultorio-alvarez
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del frontend:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# WhatsApp Meta Cloud API
WHATSAPP_API_TOKEN=tu_meta_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=tu_verify_token

# Mercado Pago
MP_ACCESS_TOKEN=tu_mercadopago_access_token

# Resend
RESEND_API_KEY=tu_resend_api_key
```

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 🔒 Seguridad y Privacidad de Datos Médicos
* **Cumplimiento estricto de privacidad:** Historias clínicas y datos de pacientes protegidos mediante **Row Level Security (RLS)** en PostgreSQL a nivel de fila y consultorio.
* **Archivos adjuntos cifrados:** Radiografías y consentimientos almacenados en buckets privados con URLs firmadas de expiración corta.

---

<div align="center">
<sub>Diseñado y desarrollado con los más altos estándares de ingeniería por <b>CreAPP Software Lab</b> © 2026</sub>
</div>

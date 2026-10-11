-- Migración 028: OTP de reserva (arregla DT-001 de la auditoría 2026-10-10).
-- Antes, getPacientePorDni devolvía PII (nombre, apellido, teléfono, email) a un
-- anónimo con sólo DNI + slug, cross-tenant. Ahora, para autocompletar un
-- "paciente existente" en la reserva pública, hay que probar posesión del contacto
-- registrado con un código de un solo uso. Esta tabla guarda esos códigos (hasheados)
-- y sirve también de contador para el rate-limit.
-- Diseño: brainstorm 2026-10-10 (protocolo OTP, canal WhatsApp con fallback email).

BEGIN;

CREATE TABLE IF NOT EXISTS public.otp_reserva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    dni TEXT NOT NULL,                       -- sólo dígitos, normalizado por la app
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE, -- null si el DNI no era paciente (anti-enumeración: igual se registra el intento)
    canal TEXT,                              -- 'whatsapp' | 'email' | null (no se pudo entregar)
    code_hash TEXT NOT NULL,                 -- sha256(salt:pepper:codigo); nunca el código en claro
    salt TEXT NOT NULL,
    intentos INT NOT NULL DEFAULT 0,
    max_intentos INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    request_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Búsqueda del OTP vigente y conteo para rate-limit.
CREATE INDEX IF NOT EXISTS idx_otp_reserva_tenant_dni ON public.otp_reserva (tenant_id, dni, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_reserva_ip ON public.otp_reserva (request_ip, created_at DESC);

COMMENT ON TABLE public.otp_reserva IS
    'Códigos OTP de un solo uso para revelar/autocompletar datos de paciente en la reserva pública (migración 028, DT-001). Solo se accede vía service_role desde server actions.';

-- RLS activado SIN policies a propósito: deny-all para anon y authenticated.
-- Estos códigos sólo se crean y verifican server-side con el cliente admin
-- (service_role, que bypassa RLS). Ningún cliente del browser debe leerlos/escribirlos.
ALTER TABLE public.otp_reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_reserva FORCE ROW LEVEL SECURITY;

COMMIT;

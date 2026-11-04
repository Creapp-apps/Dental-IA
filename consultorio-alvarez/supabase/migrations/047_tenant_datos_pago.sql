-- Datos de transferencia / pago online que el bot de WhatsApp pasa cuando el
-- paciente pregunta por alias, CBU, transferencia o pago online (RC19). Texto
-- libre que carga cada consultorio (alias, CBU/CVU, link de pago, titular…).
-- NULL/vacío: el bot deriva a recepción para pasar los datos.
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS datos_pago TEXT;

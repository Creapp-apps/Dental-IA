-- Visibilidad del profesional en los canales públicos (landing, reserva online y
-- bot de WhatsApp). Es independiente de `activo`: un profesional puede seguir
-- 100% operativo en la agenda interna pero quedar oculto para los pacientes.
-- Por defecto TRUE para no cambiar el comportamiento de los ya existentes.
ALTER TABLE public.profesionales
    ADD COLUMN IF NOT EXISTS visible_web BOOLEAN NOT NULL DEFAULT TRUE;

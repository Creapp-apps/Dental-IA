-- Nombre configurable del asistente virtual de la landing (chatbot flotante).
-- Cada consultorio puede renombrarlo; por defecto "CinthIA".
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS asistente_nombre TEXT NOT NULL DEFAULT 'CinthIA';

COMMENT ON COLUMN public.landing_config.asistente_nombre IS 'Nombre del asistente virtual (chatbot) que aparece en la landing. Editable por el consultorio. Default: CinthIA.';

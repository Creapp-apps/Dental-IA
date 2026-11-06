-- Rollback de la migración 048.
ALTER TABLE public.whatsapp_conversaciones
    DROP COLUMN IF EXISTS prioridad,
    DROP COLUMN IF EXISTS motivo;

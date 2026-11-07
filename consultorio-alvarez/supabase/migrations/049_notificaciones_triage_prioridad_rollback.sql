ALTER TABLE public.notificaciones
    DROP COLUMN IF EXISTS prioridad,
    DROP COLUMN IF EXISTS motivo;

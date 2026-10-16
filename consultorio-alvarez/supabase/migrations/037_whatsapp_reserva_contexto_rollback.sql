-- Rollback de 037
ALTER TABLE public.whatsapp_conversaciones DROP COLUMN IF EXISTS reserva_contexto;

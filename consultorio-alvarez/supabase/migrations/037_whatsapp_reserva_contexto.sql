-- Estado de la reserva conversacional del bot de WhatsApp (slot elegido, nombre,
-- DNI pendiente, slots ofrecidos). Antes vivía en un Map en memoria del proceso,
-- que en serverless (Vercel) se pierde entre requests y cortaba las reservas
-- multi-paso. Ahora persiste por conversación.
ALTER TABLE public.whatsapp_conversaciones ADD COLUMN IF NOT EXISTS reserva_contexto jsonb;

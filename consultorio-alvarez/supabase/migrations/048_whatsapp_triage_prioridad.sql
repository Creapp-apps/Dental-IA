-- Triage de la bandeja de Mensajes: el bot clasifica cada conversación que
-- escala a humano con una prioridad (semáforo) y un motivo corto.
-- NULL = sin clasificar (conversaciones viejas o que no escalaron).
ALTER TABLE public.whatsapp_conversaciones
    ADD COLUMN IF NOT EXISTS prioridad TEXT CHECK (prioridad IN ('rojo', 'amarillo', 'verde')),
    ADD COLUMN IF NOT EXISTS motivo TEXT;

-- Backfill: las pendientes de humano quedan en amarillo/revisar (default seguro,
-- nada se oculta). El motivo fino se reasigna cuando el paciente vuelve a escribir.
UPDATE public.whatsapp_conversaciones
   SET prioridad = 'amarillo',
       motivo = 'revisar'
 WHERE estado = 'HUMANO_PENDIENTE'
   AND prioridad IS NULL;

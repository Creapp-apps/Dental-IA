-- Triage del Centro de Alertas: cada notificación lleva una prioridad (semáforo)
-- y un motivo corto, para agrupar y filtrar las alertas.
-- NULL = sin clasificar (cae en el grupo "Sistema" / usa fallback por título).
ALTER TABLE public.notificaciones
    ADD COLUMN IF NOT EXISTS prioridad TEXT CHECK (prioridad IN ('rojo', 'amarillo', 'verde')),
    ADD COLUMN IF NOT EXISTS motivo TEXT;

-- Backfill por tipo (el motivo fino se reasigna cuando la notificación se regenera).

-- Operativas de agenda -> verde.
UPDATE public.notificaciones
   SET prioridad = 'verde',
       motivo = CASE tipo
                    WHEN 'turno_confirmado' THEN 'turno_confirmado'
                    WHEN 'turno_cancelado'  THEN 'turno_cancelado'
                    WHEN 'turno_nuevo'      THEN 'reserva_web'
                END
 WHERE tipo IN ('turno_confirmado', 'turno_cancelado', 'turno_nuevo')
   AND prioridad IS NULL;

-- Catch-all 'turno_reprogramado' con título de guardia/urgencia -> rojo.
UPDATE public.notificaciones
   SET prioridad = 'rojo',
       motivo = 'urgencia'
 WHERE tipo = 'turno_reprogramado'
   AND (titulo ILIKE '%guardia%' OR titulo ILIKE '%urgencia%')
   AND prioridad IS NULL;

-- Resto del catch-all 'turno_reprogramado' -> amarillo/revisar (default seguro, nada se oculta).
UPDATE public.notificaciones
   SET prioridad = 'amarillo',
       motivo = 'revisar'
 WHERE tipo = 'turno_reprogramado'
   AND prioridad IS NULL;

-- Avisos de sistema / genéricos.
UPDATE public.notificaciones
   SET motivo = 'sistema'
 WHERE tipo IN ('alerta', 'sistema')
   AND motivo IS NULL;

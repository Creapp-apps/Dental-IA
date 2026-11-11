-- 050_reconcile_notificaciones_conversacion_atendida.sql
--
-- Backfill puntual (one-time data fix).
--
-- Contexto: las urgencias/avisos de WhatsApp se escriben en DOS tablas separadas
-- que nunca se sincronizaban entre sí:
--   * whatsapp_conversaciones (lo que ve la bandeja "Mensajes": estado/prioridad)
--   * notificaciones          (lo que ve el "Centro de Alertas": flag `leida`)
-- Al atender/cerrar un chat solo se tocaba whatsapp_conversaciones, así que la
-- alerta del dashboard quedaba "pendiente" para siempre. El código ya fue
-- corregido para marcar la alerta leída al atender (ver whatsapp-chat.ts), pero
-- las alertas viejas quedaron huérfanas. Esta migración las concilia una vez.
--
-- Criterio seguro: marcar leída SOLO la notificación cuya conversación ya NO está
-- pendiente, es decir el chat ya volvió al bot o se cerró (estado BOT o CERRADO).
-- Las conversaciones todavía en HUMANO_PENDIENTE / HUMANO_ATENDIENDO quedan
-- intactas: siguen siendo pendientes reales.
--
-- Las alertas de agenda/turno tienen referencia_id = id de turno, que no coincide
-- con ningún whatsapp_conversaciones.id, por lo que el JOIN las excluye solas.

-- Vista previa (opcional, no modifica nada): descomentar para contar antes de aplicar.
-- SELECT n.tenant_id, c.estado, count(*)
-- FROM notificaciones n
-- JOIN whatsapp_conversaciones c
--   ON c.id = n.referencia_id AND c.tenant_id = n.tenant_id
-- WHERE n.leida = false
--   AND c.estado IN ('BOT', 'CERRADO')
-- GROUP BY n.tenant_id, c.estado;

UPDATE notificaciones AS n
SET leida = true
FROM whatsapp_conversaciones AS c
WHERE c.id = n.referencia_id
  AND c.tenant_id = n.tenant_id
  AND n.leida = false
  AND c.estado IN ('BOT', 'CERRADO');

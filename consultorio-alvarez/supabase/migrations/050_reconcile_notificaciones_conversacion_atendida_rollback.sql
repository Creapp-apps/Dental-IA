-- 050_reconcile_notificaciones_conversacion_atendida_rollback.sql
--
-- NO-OP intencional.
--
-- La migración 050 es un backfill de datos: marcó `leida = true` en notificaciones
-- cuya conversación ya estaba atendida/cerrada. No se puede revertir con exactitud
-- porque no se guardó cuáles filas estaban en false antes (podrían haberse marcado
-- leídas por otra vía). Volver a ponerlas en false reabriría alertas ya resueltas.
--
-- Si realmente hiciera falta reabrir, hacerlo manualmente y con criterio sobre los
-- ids concretos, nunca en bloque.

SELECT 1;

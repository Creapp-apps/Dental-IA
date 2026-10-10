-- Rollback de la migración 026.
--
-- OJO: vuelve a exigir profesional en cada turno, así que falla si quedó alguno
-- sin asignar. Primero hay que asignarlos a mano; la consulta de control es:
--   SELECT id, fecha_inicio FROM public.turnos WHERE profesional_id IS NULL;

BEGIN;

ALTER TABLE public.turnos
    ALTER COLUMN profesional_id SET NOT NULL;

COMMIT;

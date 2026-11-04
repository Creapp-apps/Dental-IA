-- Rollback de la migración 046: tombstones de bajas.
DROP TRIGGER IF EXISTS trg_tombstone_pacientes ON public.pacientes;
DROP TRIGGER IF EXISTS trg_tombstone_turnos ON public.turnos;
DROP FUNCTION IF EXISTS public.registrar_eliminacion();
DROP TABLE IF EXISTS public.registros_eliminados;

-- Rollback migración 042: elimina el trigger y la función de numeración de HC.
-- Ojo: al volver atrás, la numeración automática deja de existir y hay que
-- reponer la lógica en la app antes de insertar pacientes sin HC.
BEGIN;

DROP TRIGGER IF EXISTS trg_asignar_nro_historia_clinica ON public.pacientes;
DROP FUNCTION IF EXISTS public.asignar_nro_historia_clinica();

COMMIT;

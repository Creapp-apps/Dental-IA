-- Rollback de 035
DROP TRIGGER IF EXISTS trg_turnos_marcar_confirmado ON public.turnos;
DROP FUNCTION IF EXISTS public.turnos_marcar_confirmado();
ALTER TABLE public.turnos DROP COLUMN IF EXISTS fue_confirmado;

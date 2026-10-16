-- Registra si un turno llegó a estar CONFIRMADO alguna vez, para distinguir en
-- el historial "confirmó y vino" / "confirmó y no vino" del simple "vino/no vino".
-- Sin backfill: se contabiliza a partir de esta implementación.
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS fue_confirmado boolean NOT NULL DEFAULT false;

-- Trigger: cualquier camino que ponga el turno en CONFIRMADO (agenda manual,
-- webhook de MercadoPago, confirmación por WhatsApp) deja la constancia. Solo
-- pone true; nunca lo revierte, así la ausencia posterior sigue siendo
-- "confirmó y no vino".
CREATE OR REPLACE FUNCTION public.turnos_marcar_confirmado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.estado = 'CONFIRMADO' THEN
        NEW.fue_confirmado := true;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turnos_marcar_confirmado ON public.turnos;
CREATE TRIGGER trg_turnos_marcar_confirmado
    BEFORE INSERT OR UPDATE ON public.turnos
    FOR EACH ROW
    EXECUTE FUNCTION public.turnos_marcar_confirmado();

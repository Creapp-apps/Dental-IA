-- Rollback de la migración 023: la agenda vuelve a ser de todo el consultorio.

BEGIN;

DROP POLICY IF EXISTS "turnos_select" ON public.turnos;
DROP POLICY IF EXISTS "turnos_insert" ON public.turnos;
DROP POLICY IF EXISTS "turnos_update" ON public.turnos;
DROP POLICY IF EXISTS "turnos_delete" ON public.turnos;

CREATE POLICY "tenant_isolation_turnos" ON public.turnos
    FOR ALL USING (tenant_id = get_user_tenant_id());

COMMIT;

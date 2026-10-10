-- Rollback de la migración 022: la tabla pacientes vuelve a ser de todo el
-- consultorio y la vista desaparece.
--
-- Usarlo sólo si el profesional queda sin poder trabajar en producción. El
-- teléfono y el DNI vuelven a estar a su alcance, incluido el snapshot local.

BEGIN;

DROP POLICY IF EXISTS "pacientes_select" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_insert" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete" ON public.pacientes;

CREATE POLICY "tenant_isolation_pacientes" ON public.pacientes
    FOR ALL USING (tenant_id = get_user_tenant_id());

DROP VIEW IF EXISTS public.pacientes_clinico;

COMMIT;

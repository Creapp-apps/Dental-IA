-- Rollback de 032_fix_tenant_integrations_rls.sql
DROP POLICY IF EXISTS "ti_rw_select" ON public.tenant_integrations;
DROP POLICY IF EXISTS "ti_rw_insert" ON public.tenant_integrations;
DROP POLICY IF EXISTS "ti_rw_update" ON public.tenant_integrations;

-- Migración 013: Aislamiento multi-tenant estricto para tabla notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas permisivas anteriores
DROP POLICY IF EXISTS "Permitir select a usuarios autenticados del mismo tenant" ON public.notificaciones;
DROP POLICY IF EXISTS "Permitir insert a usuarios autenticados del mismo tenant" ON public.notificaciones;
DROP POLICY IF EXISTS "Permitir update a usuarios autenticados del mismo tenant" ON public.notificaciones;
DROP POLICY IF EXISTS "Permitir delete a usuarios autenticados del mismo tenant" ON public.notificaciones;
DROP POLICY IF EXISTS "tenant_isolation_notificaciones" ON public.notificaciones;

-- 2. Crear política estricta de aislamiento por tenant usando get_user_tenant_id()
CREATE POLICY "tenant_isolation_notificaciones" ON public.notificaciones
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

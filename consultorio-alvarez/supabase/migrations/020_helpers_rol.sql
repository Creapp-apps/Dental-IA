-- Migration 020: helpers de rol para las políticas RLS.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §6
--
-- Son la contraparte en SQL de getActor() y la base sobre la que se escriben
-- las políticas por rol (migración 021). Por sí solas no cambian ningún
-- comportamiento: nada las usa todavía.
--
-- Análogas a get_user_tenant_id() (001_schema_completo.sql): STABLE y
-- SECURITY DEFINER, porque leen public.usuarios, tabla con RLS activa, desde
-- adentro de las políticas de otras tablas.

BEGIN;

-- Rol del usuario autenticado: 'superadmin' | 'admin' | 'profesional'.
-- Devuelve NULL si quien consulta no tiene fila en public.usuarios (por ejemplo
-- un paciente del portal, que es authenticated pero no pertenece al equipo).
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- Profesional vinculado al usuario autenticado. NULL para admin y superadmin.
-- Es lo que acota la agenda del profesional a sus propios turnos.
CREATE OR REPLACE FUNCTION public.get_user_profesional_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT profesional_id FROM public.usuarios WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_user_rol() FROM public;
REVOKE ALL ON FUNCTION public.get_user_profesional_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_rol() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_profesional_id() TO authenticated, service_role;

COMMIT;

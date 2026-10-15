-- Migración: corrige las RLS policies de tenant_integrations.
--
-- Las policies originales (scripts/create-integrations-table.sql) referenciaban
-- `auth.users.tenant_id`, pero en esta app el tenant del usuario vive en
-- `public.usuarios`, no en `auth.users`. Resultado: el primer upsert real a la
-- tabla (al cargar las credenciales Cloud API de un tenant que no es Álvarez —
-- Álvarez usa el fallback de `.env`) fallaba con "Error del servidor al guardar
-- credenciales" (new row violates row-level security policy).
--
-- Este fix ya fue aplicado a mano en producción el 2026-10-15; esta migración lo
-- deja versionado y reproducible. Las policies en Postgres son permisivas (OR),
-- así que agregar éstas habilita el acceso correcto sin depender de las viejas.
-- `guardarIntegracion` escribe con el cliente de sesión (sujeto a RLS).

DROP POLICY IF EXISTS "ti_rw_select" ON public.tenant_integrations;
DROP POLICY IF EXISTS "ti_rw_insert" ON public.tenant_integrations;
DROP POLICY IF EXISTS "ti_rw_update" ON public.tenant_integrations;

CREATE POLICY "ti_rw_select" ON public.tenant_integrations FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "ti_rw_insert" ON public.tenant_integrations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "ti_rw_update" ON public.tenant_integrations FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1));

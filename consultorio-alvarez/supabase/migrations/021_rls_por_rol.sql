-- Migration 021: RLS por rol, primera tanda.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §7
--
-- Hasta acá las políticas eran `FOR ALL USING (tenant_id = get_user_tenant_id())`:
-- aislaban el consultorio y nada más, así que cualquier usuario autenticado del
-- consultorio tenía CRUD completo sobre todo, incluida la tabla `usuarios`, donde
-- un profesional podía cambiarse el rol a sí mismo.
--
-- Esta migración reemplaza esas políticas por una por operación en las tablas que
-- no dependen de pasos posteriores del plan.
--
-- QUEDAN AFUERA A PROPÓSITO:
--   * `pacientes`: negarle el SELECT al profesional recién tiene sentido cuando
--     exista la vista `pacientes_clinico` (§8, migración 022), que es su único
--     camino de lectura. Antes de eso le rompe la ficha del paciente.
--   * `turnos`: acotar la agenda al profesional es §9 (migración 023), junto con
--     el turno sin asignar y el carril "Sin asignar" de la agenda.
--   * `recordatorios`, `notifications` y las tablas de WhatsApp: el diseño no les
--     cambia el alcance, siguen aisladas por consultorio.
--
-- Recordatorio que vale para toda esta capa: `service_role` ignora RLS. Los
-- caminos que todavía usan el cliente admin (queries.ts, webhooks, crons,
-- superadmin.ts) no evalúan nada de esto. Por eso el paso 3 puso requireAdmin()
-- en las server actions administrativas, y por eso cada módulo que se pase al
-- cliente con sesión gana la protección de verdad.

BEGIN;

-- ── Helper ────────────────────────────────────────────────────────

-- ¿El usuario autenticado administra su consultorio? El superadmin de la
-- plataforma pasa, porque opera los consultorios desde el panel de Dental-IA.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT rol IN ('admin', 'superadmin') FROM public.usuarios WHERE id = auth.uid()),
        false
    );
$$;

REVOKE ALL ON FUNCTION public.es_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated, service_role;

-- ── COBROS — sólo admin (§4: el profesional no los ve) ────────────

DROP POLICY IF EXISTS "tenant_isolation_cobros" ON public.cobros;

CREATE POLICY "cobros_select" ON public.cobros
    FOR SELECT USING (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "cobros_insert" ON public.cobros
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "cobros_update" ON public.cobros
    FOR UPDATE USING (tenant_id = get_user_tenant_id() AND es_admin())
    WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "cobros_delete" ON public.cobros
    FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin());

-- ── USUARIOS — cada uno su fila; el equipo, sólo admin ────────────
-- Cierra el agujero más directo: que un profesional se promueva a admin.

DROP POLICY IF EXISTS "tenant_isolation_usuarios" ON public.usuarios;

CREATE POLICY "usuarios_select" ON public.usuarios
    FOR SELECT USING (
        id = auth.uid()
        OR (tenant_id = get_user_tenant_id() AND es_admin())
    );
CREATE POLICY "usuarios_insert" ON public.usuarios
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "usuarios_update" ON public.usuarios
    FOR UPDATE USING (tenant_id = get_user_tenant_id() AND es_admin())
    WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "usuarios_delete" ON public.usuarios
    FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin());

-- ── CONFIGURACIÓN DEL CONSULTORIO — lee el equipo, escribe el admin ──
-- profesionales, tipos_tratamiento y obras_sociales las necesita leer cualquiera
-- para agendar y atender; cambiarlas es administrar el consultorio.

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['profesionales', 'tipos_tratamiento', 'obras_sociales']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_%s" ON public.%I', tbl, tbl);

        EXECUTE format(
            'CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (tenant_id = get_user_tenant_id())',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_insert" ON public.%I FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin())',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_update" ON public.%I FOR UPDATE USING (tenant_id = get_user_tenant_id() AND es_admin()) WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin())',
            tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_delete" ON public.%I FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin())',
            tbl, tbl);
    END LOOP;
END $$;

-- ── TENANTS — el consultorio propio; lo edita su admin ────────────
-- Sin políticas de INSERT ni DELETE: crear o borrar consultorios es del
-- superadmin, que opera con service_role desde el panel de la plataforma.

DROP POLICY IF EXISTS "tenant_own" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants
    FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY "tenants_update" ON public.tenants
    FOR UPDATE USING (id = get_user_tenant_id() AND es_admin())
    WITH CHECK (id = get_user_tenant_id() AND es_admin());

-- ── PRESUPUESTOS — los arma el profesional; los borra el admin ────

DROP POLICY IF EXISTS "tenant_isolation_presupuestos" ON public.presupuestos;

CREATE POLICY "presupuestos_select" ON public.presupuestos
    FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "presupuestos_insert" ON public.presupuestos
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "presupuestos_update" ON public.presupuestos
    FOR UPDATE USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "presupuestos_delete" ON public.presupuestos
    FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin());

DROP POLICY IF EXISTS "tenant_isolation_presupuesto_items" ON public.presupuesto_items;

CREATE POLICY "presupuesto_items_select" ON public.presupuesto_items
    FOR SELECT USING (
        presupuesto_id IN (SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id())
    );
CREATE POLICY "presupuesto_items_insert" ON public.presupuesto_items
    FOR INSERT WITH CHECK (
        presupuesto_id IN (SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id())
    );
CREATE POLICY "presupuesto_items_update" ON public.presupuesto_items
    FOR UPDATE USING (
        presupuesto_id IN (SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id())
    )
    WITH CHECK (
        presupuesto_id IN (SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id())
    );
CREATE POLICY "presupuesto_items_delete" ON public.presupuesto_items
    FOR DELETE USING (
        es_admin()
        AND presupuesto_id IN (SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id())
    );

-- ── HISTORIAL CLÍNICO — se borra lo propio, o lo borra el admin ───
-- El profesional crea y edita evoluciones (también las de un colega sobre un
-- paciente que ambos atienden: §3 lo deja explícito), pero sólo borra las suyas.

DROP POLICY IF EXISTS "tenant_isolation_historial_clinico" ON public.historial_clinico;

CREATE POLICY "historial_clinico_select" ON public.historial_clinico
    FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "historial_clinico_insert" ON public.historial_clinico
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "historial_clinico_update" ON public.historial_clinico
    FOR UPDATE USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "historial_clinico_delete" ON public.historial_clinico
    FOR DELETE USING (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR profesional_id = get_user_profesional_id())
    );

-- ── ODONTOGRAMA — igual, por `updated_by` ─────────────────────────
-- `updated_by` admite NULL (piezas cargadas sin profesional): esas las borra
-- sólo el admin.

DROP POLICY IF EXISTS "tenant_isolation_odontograma_piezas" ON public.odontograma_piezas;

CREATE POLICY "odontograma_piezas_select" ON public.odontograma_piezas
    FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "odontograma_piezas_insert" ON public.odontograma_piezas
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "odontograma_piezas_update" ON public.odontograma_piezas
    FOR UPDATE USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "odontograma_piezas_delete" ON public.odontograma_piezas
    FOR DELETE USING (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR updated_by = get_user_profesional_id())
    );

-- ── ADJUNTOS DEL PACIENTE — borra el que subió, o el admin ────────
-- Acá `created_by` apunta a auth.users, no a profesionales.
-- (El acceso al archivo en sí ya quedó cerrado en la migración 025.)

DROP POLICY IF EXISTS "tenant_isolation_paciente_adjuntos" ON public.paciente_adjuntos;

CREATE POLICY "paciente_adjuntos_select" ON public.paciente_adjuntos
    FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "paciente_adjuntos_insert" ON public.paciente_adjuntos
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "paciente_adjuntos_update" ON public.paciente_adjuntos
    FOR UPDATE USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "paciente_adjuntos_delete" ON public.paciente_adjuntos
    FOR DELETE USING (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR created_by = auth.uid())
    );

COMMIT;

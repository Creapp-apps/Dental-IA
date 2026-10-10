-- Migration 023: la agenda del profesional son sus turnos.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §9
--
-- Acota la agenda y también la ficha del paciente, donde el profesional verá
-- únicamente sus propios turnos con esa persona.
--
-- El profesional puede cambiar el estado de sus turnos (EN_SALA, ATENDIDO), que
-- es parte de atender. No puede crear, reprogramar ni reasignar: eso es de
-- recepción. RLS no sabe restringir columnas, así que "sólo el estado" lo hace
-- cumplir el código (turnos.ts y el push del outbox en offline-sync.ts); acá se
-- frena el alcance, que es lo que protege la cartera de pacientes.

BEGIN;

DROP POLICY IF EXISTS "tenant_isolation_turnos" ON public.turnos;

CREATE POLICY "turnos_select" ON public.turnos
    FOR SELECT USING (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR profesional_id = get_user_profesional_id())
    );

CREATE POLICY "turnos_insert" ON public.turnos
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());

CREATE POLICY "turnos_update" ON public.turnos
    FOR UPDATE USING (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR profesional_id = get_user_profesional_id())
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND (es_admin() OR profesional_id = get_user_profesional_id())
    );

CREATE POLICY "turnos_delete" ON public.turnos
    FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin());

COMMIT;

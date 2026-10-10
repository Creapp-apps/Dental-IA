-- Migration 022: el profesional deja de ver los datos de contacto del paciente.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §8
--
-- La app es local-first: fetchFullSnapshotAction baja los pacientes a IndexedDB
-- de la computadora del profesional. Enmascarar en pantalla no sirve de nada, el
-- teléfono quedaría en esa máquina y se lee con F12. Por eso el filtro va en el
-- origen, y son dos piezas:
--
--   1. `pacientes_clinico`, una vista sin teléfono, email, DNI, CUIT, dirección,
--      ciudad, número de afiliado ni notas internas. Es el camino de lectura del
--      profesional cuando consulta con su propia sesión.
--   2. RLS sobre la tabla base, que a partir de acá sólo contesta al admin.
--
-- La vista corre con los privilegios de su dueño (no lleva security_invoker), así
-- que no la frena RLS y filtra el consultorio ella misma. Como get_user_tenant_id()
-- es NULL sin sesión, con service_role no devuelve nada: los caminos del servidor
-- que leen con el cliente admin usan la lista de columnas de queries.ts, no la
-- vista.
--
-- Qué puede escribir el profesional sobre un paciente: sólo motivo de consulta,
-- alergias, medicación y antecedentes, y sólo por la server action
-- actualizarDatosClinicosPaciente, que corre con service_role y valida el rol.
-- RLS no sabe restringir columnas y una vista no es actualizable sin reglas, así
-- que la lista blanca vive en ese único archivo.

BEGIN;

-- ── La vista ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.pacientes_clinico AS
SELECT
    id,
    tenant_id,
    nro_historia_clinica,
    nombre,
    apellido,
    fecha_nacimiento,
    genero,
    obra_social_id,
    plan_obra_social,
    motivo_consulta,
    alergias,
    medicacion_actual,
    antecedentes,
    foto_url,
    registro_completo,
    created_at,
    updated_at
FROM public.pacientes
WHERE tenant_id = get_user_tenant_id();

COMMENT ON VIEW public.pacientes_clinico IS
    'Pacientes sin datos de contacto, para el rol profesional (migración 022, diseño §8).';

REVOKE ALL ON public.pacientes_clinico FROM PUBLIC;
GRANT SELECT ON public.pacientes_clinico TO authenticated, service_role;

-- ── La tabla base pasa a ser sólo del admin ───────────────────────
-- El profesional no la toca ni para leer: su camino es la vista, y lo clínico lo
-- edita por la server action acotada.

DROP POLICY IF EXISTS "tenant_isolation_pacientes" ON public.pacientes;

CREATE POLICY "pacientes_select" ON public.pacientes
    FOR SELECT USING (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "pacientes_insert" ON public.pacientes
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "pacientes_update" ON public.pacientes
    FOR UPDATE USING (tenant_id = get_user_tenant_id() AND es_admin())
    WITH CHECK (tenant_id = get_user_tenant_id() AND es_admin());
CREATE POLICY "pacientes_delete" ON public.pacientes
    FOR DELETE USING (tenant_id = get_user_tenant_id() AND es_admin());

COMMIT;

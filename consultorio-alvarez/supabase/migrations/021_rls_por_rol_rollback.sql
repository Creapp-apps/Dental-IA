-- Rollback de la migración 021: vuelve a las políticas `FOR ALL` por consultorio.
--
-- Deja la base como estaba antes del paso 4: aislamiento por consultorio y
-- ningún control por rol. Usarlo sólo si una pantalla queda rota en producción
-- y no hay tiempo de arreglarla; el agujero que cierra la 021 vuelve a abrirse.
--
-- No borra get_user_rol(), get_user_profesional_id() ni es_admin(): son
-- inofensivas si nada las usa, y las necesita el reintento.

BEGIN;

-- ── Políticas por operación creadas en la 021 ─────────────────────

DO $$
DECLARE
    tbl TEXT;
    op TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'cobros', 'usuarios', 'profesionales', 'tipos_tratamiento', 'obras_sociales',
        'presupuestos', 'presupuesto_items', 'historial_clinico',
        'odontograma_piezas', 'paciente_adjuntos'
    ]
    LOOP
        FOREACH op IN ARRAY ARRAY['select', 'insert', 'update', 'delete']
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s_%s" ON public.%I', tbl, op, tbl);
        END LOOP;
    END LOOP;
END $$;

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;

-- ── Políticas originales (001_schema_completo.sql) ────────────────

CREATE POLICY "tenant_own" ON public.tenants
    FOR ALL USING (id = get_user_tenant_id());

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'usuarios', 'profesionales', 'obras_sociales', 'tipos_tratamiento',
        'cobros', 'presupuestos', 'historial_clinico', 'odontograma_piezas',
        'paciente_adjuntos'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL USING (tenant_id = get_user_tenant_id())',
            tbl, tbl);
    END LOOP;
END $$;

CREATE POLICY "tenant_isolation_presupuesto_items" ON public.presupuesto_items
    FOR ALL USING (
        presupuesto_id IN (
            SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id()
        )
    );

COMMIT;

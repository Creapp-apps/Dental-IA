            CREATE TABLE IF NOT EXISTS notificaciones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                titulo TEXT NOT NULL,
                mensaje TEXT NOT NULL,
                tipo TEXT NOT NULL,
                referencia_id TEXT,
                leida BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- ── Habilitar RLS ────────────────────
            ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

            -- Evitar errores de "policy already exists" borrándolas primero
            DROP POLICY IF EXISTS "Permitir select a usuarios autenticados del mismo tenant" ON notificaciones;
            CREATE POLICY "Permitir select a usuarios autenticados del mismo tenant"
            ON notificaciones FOR SELECT
            TO authenticated
            USING (true);

            DROP POLICY IF EXISTS "Permitir insert a usuarios autenticados del mismo tenant" ON notificaciones;
            CREATE POLICY "Permitir insert a usuarios autenticados del mismo tenant"
            ON notificaciones FOR INSERT
            TO authenticated
            WITH CHECK (true);

            DROP POLICY IF EXISTS "Permitir update a usuarios autenticados del mismo tenant" ON notificaciones;
            CREATE POLICY "Permitir update a usuarios autenticados del mismo tenant"
            ON notificaciones FOR UPDATE
            TO authenticated
            USING (true);

            DROP POLICY IF EXISTS "Permitir delete a usuarios autenticados del mismo tenant" ON notificaciones;
            CREATE POLICY "Permitir delete a usuarios autenticados del mismo tenant"
            ON notificaciones FOR DELETE
            TO authenticated
            USING (true);

            -- Habilitar canal realtime para notificaciones
            -- Si supabase_realtime no incluye notificaciones, se requiere correr este comando manualmente si falla el script global
            -- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

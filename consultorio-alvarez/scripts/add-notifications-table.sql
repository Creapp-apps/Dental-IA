-- Script para crear la tabla de notificaciones y habilitar modo Realtime

-- 1. Crear la tabla base
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'sistema', -- 'turno_nuevo', 'alerta', 'sistema'
    referencia_id UUID, -- ID contextual (ej. ID del turno)
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (Aislamiento por Tenant)
CREATE POLICY "Permitir select a usuarios autenticados del mismo tenant"
ON notificaciones FOR SELECT
TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Permitir insert a usuarios autenticados del mismo tenant"
ON notificaciones FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Permitir update a usuarios autenticados del mismo tenant"
ON notificaciones FOR UPDATE
TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Permitir delete a usuarios autenticados del mismo tenant"
ON notificaciones FOR DELETE
TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 4. Habilitar la publicación en tiempo real vía WebSockets (Supabase Realtime)
-- Esto es fundamental para que `supabase.channel()` reaccione a los `INSERT`
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notificaciones'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
    END IF;
END $$;

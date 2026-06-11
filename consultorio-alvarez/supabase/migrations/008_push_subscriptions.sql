-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Usuarios manejan sus suscripciones" ON push_subscriptions;
CREATE POLICY "Usuarios manejan sus suscripciones" ON push_subscriptions
  FOR ALL TO authenticated 
  USING (profile_id = auth.uid()) 
  WITH CHECK (profile_id = auth.uid());

-- Índices para optimizar búsquedas por perfil y por endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON push_subscriptions(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_profile_endpoint ON push_subscriptions(profile_id, ((subscription->>'endpoint')));

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at 
  BEFORE UPDATE ON push_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

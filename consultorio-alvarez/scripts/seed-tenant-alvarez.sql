-- ============================================================
-- SEED MVP — Consultorio Álvarez (tenant + landing_config)
-- Ejecutar en Supabase SQL Editor ANTES del deploy
-- ============================================================

-- ── Tabla TENANTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla LANDING_CONFIG (una por tenant) ─────────────────────
CREATE TABLE IF NOT EXISTS landing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  hero_badge TEXT NOT NULL DEFAULT 'Reservar Turno',
  hero_titulo TEXT NOT NULL DEFAULT 'Agenda tu visita',
  hero_subtitulo TEXT,
  servicios_titulo TEXT DEFAULT 'Nuestros Servicios',
  equipo_titulo TEXT DEFAULT 'Nuestro Equipo',
  booking_titulo TEXT DEFAULT 'Agenda tu visita',
  booking_subtitulo TEXT,
  servicios JSONB DEFAULT '[]',
  color_primary TEXT DEFAULT '#0d9488',
  color_primary_hover TEXT DEFAULT '#0f766e',
  color_accent TEXT DEFAULT '#2dd4bf',
  color_bg_hero TEXT DEFAULT '#f0fdfa',
  color_bg_dark TEXT DEFAULT '#0b1525',
  logo_url TEXT,
  logo_config JSONB,
  meta_title TEXT,
  meta_description TEXT,
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT false,
  footer_address TEXT,
  footer_phone TEXT,
  footer_email TEXT,
  footer_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon) — necesario para la landing y portal
CREATE POLICY "Público lee tenants" ON tenants
  FOR SELECT TO anon USING (true);
CREATE POLICY "Autenticados leen tenants" ON tenants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Público lee landing_config" ON landing_config
  FOR SELECT TO anon USING (true);
CREATE POLICY "Autenticados leen landing_config" ON landing_config
  FOR SELECT TO authenticated USING (true);
-- Nota: las escrituras usan service_role (admin client) que omite RLS.
-- Política de escritura se agrega luego cuando exista la tabla 'perfiles'.

-- ── SEED: Consultorio Álvarez ─────────────────────────────────
INSERT INTO tenants (slug, nombre)
VALUES ('alvarez', 'Consultorio Álvarez')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO landing_config (
  tenant_id,
  hero_titulo,
  hero_subtitulo,
  footer_address,
  footer_phone,
  footer_email,
  footer_hours,
  meta_title,
  meta_description,
  servicios
)
SELECT
  id,
  'Atención odontológica profesional',
  'Más de 15 años cuidando tu salud bucal. Pedí turno online en minutos.',
  'Av. Corrientes 1234, Piso 3, Of. 5, CABA',
  '+54 9 11 4567-8900',
  'turnos@consultorioalvarez.com.ar',
  'Lun–Vie 9:00–18:00 · Sáb 10:00–13:00',
  'Consultorio Álvarez | Odontología CABA',
  'Consultorio odontológico con más de 15 años de experiencia. Turnos online para limpieza dental, ortodoncia, endodoncia y más.',
  '[
    {"icono": "shield", "titulo": "Sin dolor", "descripcion": "Técnicas modernas para una experiencia cómoda"},
    {"icono": "clock", "titulo": "Turnos puntuales", "descripcion": "Respetamos tu tiempo al máximo"},
    {"icono": "star", "titulo": "Atención de calidad", "descripcion": "Tecnología de vanguardia y diagnóstico preciso"},
    {"icono": "heart", "titulo": "Seguimiento", "descripcion": "Historia clínica digital completa y personalizada"}
  ]'::jsonb
FROM tenants
WHERE slug = 'alvarez'
ON CONFLICT (tenant_id) DO NOTHING;

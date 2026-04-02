-- =====================================================
-- LANDING CONFIG — Configuración de landing por tenant
-- Ejecutar en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS landing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Textos del Hero
    hero_badge TEXT NOT NULL DEFAULT 'Reservar Turno',
    hero_titulo TEXT NOT NULL DEFAULT 'Agenda tu visita',
    hero_subtitulo TEXT NOT NULL DEFAULT 'Seleccioná día, horario y profesional. Te confirmaremos a la brevedad.',

    -- Textos de secciones
    servicios_titulo TEXT NOT NULL DEFAULT 'Nuestros Servicios',
    equipo_titulo TEXT NOT NULL DEFAULT 'Nuestro Equipo',
    booking_titulo TEXT NOT NULL DEFAULT 'Agenda tu visita',
    booking_subtitulo TEXT NOT NULL DEFAULT 'Seleccioná día, horario y profesional. Te confirmaremos a la brevedad.',

    -- Servicios (array JSON)
    servicios JSONB NOT NULL DEFAULT '[
        {"icono": "shield", "titulo": "Sin dolor", "descripcion": "Técnicas modernas para una experiencia cómoda"},
        {"icono": "clock", "titulo": "Turnos puntuales", "descripcion": "Respetamos tu tiempo al máximo"},
        {"icono": "star", "titulo": "Atención premium", "descripcion": "Tecnología de vanguardia"},
        {"icono": "heart", "titulo": "Seguimiento", "descripcion": "Historia clínica digital personalizada"}
    ]'::jsonb,

    -- Paleta de colores (formato hex)
    color_primary TEXT NOT NULL DEFAULT '#0d9488',
    color_primary_hover TEXT NOT NULL DEFAULT '#0f766e',
    color_accent TEXT NOT NULL DEFAULT '#2dd4bf',
    color_bg_hero TEXT NOT NULL DEFAULT '#f0fdfa',
    color_bg_dark TEXT NOT NULL DEFAULT '#0b1525',

    -- Logo y brand
    logo_url TEXT,

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Dominio personalizado (Fase 2)
    custom_domain TEXT UNIQUE,
    domain_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id)
);

-- RLS
ALTER TABLE landing_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la landing page la necesita sin auth)
CREATE POLICY "landing_config_public_read" ON landing_config
    FOR SELECT USING (true);

-- Escritura solo para service_role (las server actions usan createAdminClient)
-- No se necesitan políticas adicionales ya que usamos service_role key en el backend

-- Insertar config default para el tenant Álvarez (ya existente)
INSERT INTO landing_config (tenant_id)
SELECT id FROM tenants WHERE slug = 'alvarez'
ON CONFLICT (tenant_id) DO NOTHING;

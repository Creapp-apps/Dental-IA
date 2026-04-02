-- Migración: Soporte para Logo Dinámico y Tipográfico

ALTER TABLE public.landing_config
ADD COLUMN IF NOT EXISTS logo_config JSONB DEFAULT '{
  "type": "text",
  "text": "Consultorio",
  "font": "font-sans",
  "icon": "Stethoscope",
  "color_style": "gradient"
}'::jsonb;

COMMENT ON COLUMN public.landing_config.logo_config IS 'Configuración visual del logo: { type: "text"|"image", text: string, font: string, icon: string, color_style: "gradient"|"solid"|"currentColor" }';

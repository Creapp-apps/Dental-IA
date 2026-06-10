-- Migración: agregar columnas de subtítulos personalizables a landing_config

ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS servicios_subtitulo TEXT NOT NULL DEFAULT 'Cada tratamiento combina precisión clínica con la más alta estética dental.';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS equipo_subtitulo TEXT NOT NULL DEFAULT 'Un equipo multidisciplinario con más de 15 años de experiencia.';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS coberturas_subtitulo TEXT NOT NULL DEFAULT 'Trabajamos con las principales coberturas del país para brindarte la mejor atención médica sin preocupaciones.';

COMMENT ON COLUMN landing_config.servicios_subtitulo IS 'Subtítulo personalizable de la sección de servicios en la landing page.';
COMMENT ON COLUMN landing_config.equipo_subtitulo IS 'Subtítulo personalizable de la sección del equipo de profesionales en la landing page.';
COMMENT ON COLUMN landing_config.coberturas_subtitulo IS 'Subtítulo personalizable de la sección de obras sociales y prepagas en la landing page.';

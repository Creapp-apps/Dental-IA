-- Textos editables de la sección "Nosotros" (video tour), antes hardcodeados.
--  about_titulo / about_subtitulo: encabezado de la sección.
--  about_features: las 3 tarjetas de la derecha [{title,description}].
-- Las escenas (video + título + subtítulo + nombre/badge) siguen en about_videos.
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS about_titulo text;
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS about_subtitulo text;
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS about_features jsonb;

COMMENT ON COLUMN public.landing_config.about_titulo IS 'Título de la sección Nosotros. NULL usa el default de la plantilla.';
COMMENT ON COLUMN public.landing_config.about_subtitulo IS 'Subtítulo de la sección Nosotros. NULL usa el default.';
COMMENT ON COLUMN public.landing_config.about_features IS 'Tarjetas de la sección Nosotros: [{title,description}]. NULL usa las de la plantilla.';

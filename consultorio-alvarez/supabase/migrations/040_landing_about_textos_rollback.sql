-- Rollback de 040
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS about_titulo;
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS about_subtitulo;
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS about_features;

-- Medios de la landing editables por tenant (antes hardcodeados de Álvarez).
--  hero_slides:   fotos del Hero con sus textos      [{image_url,title,description,tag}]
--  about_videos:  videos de la sección "Nosotros"     [{src,title,subtitle,badge}]
--  about_visible: mostrar/ocultar la sección de video. NULL = default por slug
--                 (solo Álvarez la muestra); TRUE = visible; FALSE = oculta.
-- Las imágenes de servicios se guardan dentro del jsonb `servicios` existente
-- (campo image_url por item), no necesita columna nueva.
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS hero_slides jsonb;
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS about_videos jsonb;
ALTER TABLE public.landing_config ADD COLUMN IF NOT EXISTS about_visible boolean;

COMMENT ON COLUMN public.landing_config.hero_slides IS 'Slides del Hero por tenant: [{image_url,title,description,tag}]. NULL/vacío usa el default.';
COMMENT ON COLUMN public.landing_config.about_videos IS 'Videos de la sección Nosotros: [{src,title,subtitle,badge}]. NULL/vacío usa el default.';
COMMENT ON COLUMN public.landing_config.about_visible IS 'Visibilidad de la sección de video. NULL=default por slug (solo Álvarez), TRUE=visible, FALSE=oculta.';

-- El bucket tenant_assets guardaba solo imágenes (5MB, PNG/JPEG/WebP). Para
-- permitir los videos del Hero/Nosotros, subimos el límite a 15MB y sumamos
-- video/mp4 y video/webm. El tope real de subida lo marca el server action
-- (next.config.ts: bodySizeLimit 10mb), por eso los videos deben ser livianos.
UPDATE storage.buckets
SET file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','video/mp4','video/webm']
WHERE id = 'tenant_assets';

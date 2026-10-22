-- Rollback de 039
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS hero_slides;
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS about_videos;
ALTER TABLE public.landing_config DROP COLUMN IF EXISTS about_visible;

-- Revertir el bucket a solo imágenes (5MB).
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp']
WHERE id = 'tenant_assets';

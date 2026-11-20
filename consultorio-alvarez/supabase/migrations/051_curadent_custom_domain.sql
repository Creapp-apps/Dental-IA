-- ============================================================
-- Migración 051: Dominio personalizado del tenant Curadent
-- ============================================================
-- Asigna el dominio oficial curadent.com.ar al tenant slug 'curadent'.
-- La columna custom_domain y su índice ya existen (migración 011).

UPDATE public.tenants
SET custom_domain = 'curadent.com.ar'
WHERE slug = 'curadent' AND (custom_domain IS NULL OR custom_domain = '');

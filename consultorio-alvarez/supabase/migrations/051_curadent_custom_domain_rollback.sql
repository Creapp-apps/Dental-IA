-- ============================================================
-- Rollback Migración 051: Dominio personalizado del tenant Curadent
-- ============================================================

UPDATE public.tenants
SET custom_domain = NULL
WHERE slug = 'curadent' AND custom_domain = 'curadent.com.ar';

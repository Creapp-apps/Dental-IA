-- ============================================================
-- Migración 011: Soporte de Dominios Personalizados en Tenants
-- ============================================================

-- 1. Agregar columna custom_domain en la tabla tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- 2. Crear índice para búsqueda ultra-rápida por dominio en el proxy/middleware
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain 
ON public.tenants(custom_domain);

-- 3. Configurar dominio oficial de Consultorio Álvarez si no está definido
UPDATE public.tenants 
SET custom_domain = 'dentalva.ar' 
WHERE slug = 'alvarez' AND (custom_domain IS NULL OR custom_domain = '');

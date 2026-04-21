-- ============================================================
-- SCRIPT: AÑADIR COLUMNA DE PLANES A OBRAS SOCIALES
-- ============================================================
-- Este script es necesario para añadir la columna "planes" 
-- a la tabla obras_sociales en producción sin borrar datos.
-- ============================================================

ALTER TABLE public.obras_sociales 
ADD COLUMN IF NOT EXISTS planes TEXT;

SELECT 'Columna planes añadida correctamente a obras_sociales' as result;

-- ============================================================
-- SCRIPT: AÑADIR CUIT A PACIENTES
-- ============================================================
-- Se ejecuta desde el panel de SQL Editor en Supabase.
-- ============================================================

ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS cuit TEXT;

SELECT 'Columna cuit añadida correctamente a pacientes' as result;

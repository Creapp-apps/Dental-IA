-- ============================================================
-- SCRIPT: AÑADIR CAMPO AVATAR A PROFESIONALES
-- ============================================================
-- Añade rastreo de recursos en la nube asignados a la identidad
-- del profesional sobre la tabla existente.
-- ============================================================

ALTER TABLE public.profesionales 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Opcionalmente, notificamos que se ejecutó con éxito
SELECT 'Columna avatar_url añadida exitosamente' as success;

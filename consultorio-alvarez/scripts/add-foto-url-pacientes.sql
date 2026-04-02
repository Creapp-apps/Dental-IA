-- Script para agregar la columna foto_url a la tabla pacientes

-- 1. Agregar la columna (si no existe)
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Recargar la caché del esquema de Supabase/PostgREST
NOTIFY pgrst, 'reload schema';

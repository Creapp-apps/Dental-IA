-- ============================================================
-- SCRIPT: CREACIÓN DE BUCKET "tenant_assets" PARA LOGOS Y RECURSOS
-- ============================================================
-- Este script crea un nuevo bucket de almacenamiento público en 
-- Supabase y configura políticas rigurosas de Tenant Isolation.
--
-- INSTRUCCIONES: Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- 1. Aseguramos que la extensión existe (por si acaso)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear el bucket (Público, con límite de 5MB y restringido a imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tenant_assets', 
    'tenant_assets', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- (RLS ya suele estar habilitado por defecto en la tabla storage.objects por Supabase)
-- Nos saltamos el ALTER TABLE para evitar errores de permisos de propietario.

-- 4. POLÍTICAS DE RLS PARA `tenant_assets`

-- -> Cualquier visitante de la web puede descargar las imágenes para verlas
DROP POLICY IF EXISTS "Imágenes públicas" ON storage.objects;
CREATE POLICY "Imágenes públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant_assets');

-- -> Los usuarios autenticados pueden subir (INSERT) archivos SÓLO si 
-- el nombre de la carpeta principal coincide con su tenant_id.
-- Ej: "tenant_assets/{tenant_id_uuid}/logo/mi-logo.png"
DROP POLICY IF EXISTS "Subir imágenes del tenant" ON storage.objects;
CREATE POLICY "Subir imágenes del tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tenant_assets' 
    AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- -> Actualizar: Mismo requisito de carpeta
DROP POLICY IF EXISTS "Actualizar imágenes del tenant" ON storage.objects;
CREATE POLICY "Actualizar imágenes del tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tenant_assets' 
    AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- -> Borrar: Mismo requisito de carpeta
DROP POLICY IF EXISTS "Borrar imágenes del tenant" ON storage.objects;
CREATE POLICY "Borrar imágenes del tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'tenant_assets' 
    AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Listo!
SELECT 'Bucket tenant_assets configurado con éxito' as success;

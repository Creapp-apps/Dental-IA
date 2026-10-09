-- ROLLBACK de 025_storage_privado.sql. NO es una migración a aplicar: es la vuelta atrás de
-- emergencia, para pegar en el SQL editor de Supabase si algo sale mal.
--
-- Reabre los tres buckets, borra las ocho políticas nuevas (por nombre: las creamos en 025) y
-- la función storage_tenant_de_objeto, que va después de las políticas porque dependen de ella.
-- Ojo: NO restaura las políticas viejas que 025 borró por descubrimiento. Con el bucket público
-- las lecturas por URL pública vuelven a andar sin política, pero las operaciones que pasan por
-- RLS con sesión (createSignedUrl, subir, borrar) quedan denegadas hasta crear políticas.

UPDATE storage.buckets SET public = true
WHERE id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d');

DROP POLICY IF EXISTS "privado_select_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_insert_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_update_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_delete_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_select_publico" ON storage.objects;
DROP POLICY IF EXISTS "assets_escritura_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_update_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_delete_mismo_tenant" ON storage.objects;

DROP FUNCTION IF EXISTS storage_tenant_de_objeto(TEXT);

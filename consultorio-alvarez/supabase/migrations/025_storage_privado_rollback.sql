-- ################################################################################
-- ROLLBACK DE EMERGENCIA de 025_storage_privado.sql. NO es una migración a aplicar.
--
-- ATENCIÓN: correr esto REABRE EL ACCESO PÚBLICO a radiografías y fotos de pacientes.
-- Cualquiera con la URL las lee sin login, y cualquier usuario autenticado de cualquier
-- consultorio puede subir, pisar o borrar archivos del otro. Es exactamente el agujero que
-- 025 cierra. Existe SÓLO para destrabar un incidente en producción.
--
-- En cuanto el incidente termine, volver a aplicar 025_storage_privado.sql.
-- ################################################################################
--
-- Qué hace: reabre los tres buckets, borra las ocho políticas de 025 (por nombre: las creamos
-- nosotros) y crea políticas TEMPORAL_INSEGURA_* que reproducen el estado previo. No se pueden
-- restaurar las políticas originales porque 025 las borró por descubrimiento; sin estas
-- temporales, con el bucket público la app no podría firmar URLs, subir ni borrar con sesión.
-- Después borra la función storage_tenant_de_objeto, que va al final porque las políticas
-- de 025 dependen de ella.

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

-- Políticas TEMPORALES e INSEGURAS: sin aislamiento por consultorio, a propósito.
-- tenant_assets se cubre en los mismos buckets para que también recupere su escritura.
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_lectura_publica" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_insert" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_update" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_delete" ON storage.objects;

CREATE POLICY "TEMPORAL_INSEGURA_lectura_publica" ON storage.objects
FOR SELECT TO public
USING (bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d', 'tenant_assets'));

CREATE POLICY "TEMPORAL_INSEGURA_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d', 'tenant_assets'));

CREATE POLICY "TEMPORAL_INSEGURA_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d', 'tenant_assets'));

CREATE POLICY "TEMPORAL_INSEGURA_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d', 'tenant_assets'));

-- Va después de borrar las políticas que la usaban; si no, el DROP falla por dependencia.
DROP FUNCTION IF EXISTS public.storage_tenant_de_objeto(TEXT);

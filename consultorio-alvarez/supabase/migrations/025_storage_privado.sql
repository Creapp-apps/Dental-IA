-- Migración: Cerrar los buckets de Storage
--
-- El agujero: avatars, paciente_adjuntos y escaneos_3d se crearon con public = true y una
-- política de lectura abierta. Cualquiera con la URL leía radiografías y fotos de pacientes
-- sin estar logueado, y cualquier usuario autenticado de un consultorio podía borrar los
-- archivos del otro.
--
-- PRECONDICIÓN (no se negocia): todos los objetos tienen que estar ya bajo
-- <tenant_id>/... (scripts/migrar-storage-a-tenant.ts corrido de verdad) y la app tiene que
-- leer con URLs firmadas. Un objeto fuera de esa forma queda inaccesible, a propósito.
--
-- tenant_assets queda PÚBLICO a propósito para lectura: alimenta la landing, el logo del email
-- de turnos y las fotos del equipo. Sólo se le acota la escritura.
--
-- Se aplica a mano en el SQL editor de Supabase. El rollback está en
-- 025_storage_privado_rollback.sql.

-- 1. Buckets privados
UPDATE storage.buckets SET public = false
WHERE id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d');

-- 2. Fuera las políticas viejas, por descubrimiento
-- No se borran por nombre: hay políticas de 014_paciente_escaneos_3d.sql y otras creadas a
-- mano con nombres en castellano (scripts/create-*-bucket.sql) que no podemos enumerar desde
-- acá. Una sola política permisiva que sobreviva deja el bucket abierto aunque la migración
-- parezca haber funcionado. Se busca el bucket en el nombre, en qual y en with_check.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (
              policyname ~* '(avatars|paciente_adjuntos|escaneos_3d|tenant_assets)'
              OR COALESCE(qual, '') ~* '(avatars|paciente_adjuntos|escaneos_3d|tenant_assets)'
              OR COALESCE(with_check, '') ~* '(avatars|paciente_adjuntos|escaneos_3d|tenant_assets)'
          )
    LOOP
        RAISE NOTICE 'Borrando política de storage.objects: %', pol.policyname;
        EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 3. El consultorio sale del primer segmento del nombre del objeto
-- SQL puro con guard de forma, no plpgsql con EXCEPTION: un bloque EXCEPTION abre una
-- subtransacción por fila y esto corre por fila en cada SELECT sobre storage.objects, incluido
-- cada listado de carpeta. Así Postgres puede inlinearla.
CREATE OR REPLACE FUNCTION storage_tenant_de_objeto(nombre TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
    -- Un nombre sin UUID adelante no pertenece a ningún consultorio: devuelve NULL
    -- y ninguna política lo alcanza. El guard de forma evita el cast que tiraría.
    SELECT CASE
        WHEN (string_to_array(nombre, '/'))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((string_to_array(nombre, '/'))[1])::UUID
    END
$$;

-- 4. Buckets privados: sólo el propio consultorio
CREATE POLICY "privado_select_mismo_tenant" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

CREATE POLICY "privado_insert_mismo_tenant" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

-- WITH CHECK además de USING: sin él un UPDATE puede renombrar un objeto a la carpeta de
-- otro consultorio.
CREATE POLICY "privado_update_mismo_tenant" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
)
WITH CHECK (
    bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

CREATE POLICY "privado_delete_mismo_tenant" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d')
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

-- 5. tenant_assets: lectura pública, escritura acotada
-- La landing y el email leen sin sesión, por eso el SELECT es TO public y sin condición de tenant.
CREATE POLICY "assets_select_publico" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'tenant_assets');

CREATE POLICY "assets_escritura_mismo_tenant" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'tenant_assets'
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

CREATE POLICY "assets_update_mismo_tenant" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'tenant_assets'
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
)
WITH CHECK (
    bucket_id = 'tenant_assets'
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

CREATE POLICY "assets_delete_mismo_tenant" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'tenant_assets'
    AND storage_tenant_de_objeto(name) = get_user_tenant_id()
);

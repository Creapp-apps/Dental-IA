-- ################################################################################
-- ROLLBACK DE EMERGENCIA de 025_storage_privado.sql. NO es una migración a aplicar.
--
-- ATENCIÓN: esto SACA EL AISLAMIENTO ENTRE CONSULTORIOS. Cualquier usuario autenticado de
-- cualquier consultorio puede leer, subir, pisar o borrar archivos de los otros. Es el
-- agujero que 025 cierra. Existe SÓLO para destrabar un incidente en producción.
--
-- Lo que NO hace: no republica nada a visitantes anónimos. Los buckets avatars,
-- paciente_adjuntos y escaneos_3d siguen privados (public = false); la app firma URLs, que
-- sólo necesitan SELECT como authenticated. Únicamente tenant_assets (logo, landing, mail de
-- turnos) se lee sin login, igual que con 025.
--
-- En cuanto el incidente termine, volver a aplicar 025_storage_privado.sql.
-- ################################################################################
--
-- Qué hace: borra las ocho políticas de 025 (por nombre: las creamos nosotros) y crea
-- políticas TEMPORAL_INSEGURA_* que devuelven a los usuarios autenticados el acceso entre
-- consultorios para que la app funcione. No se pueden restaurar las políticas originales
-- porque 025 las borró por descubrimiento. No toca storage.buckets.
-- Después borra la función public.storage_tenant_de_objeto, que va al final porque las
-- políticas de 025 dependen de ella.

DROP POLICY IF EXISTS "privado_select_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_insert_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_update_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "privado_delete_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_select_publico" ON storage.objects;
DROP POLICY IF EXISTS "assets_escritura_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_update_mismo_tenant" ON storage.objects;
DROP POLICY IF EXISTS "assets_delete_mismo_tenant" ON storage.objects;

-- Políticas TEMPORALES e INSEGURAS: sin aislamiento por consultorio, a propósito.
-- tenant_assets se cubre en insert/update/delete para que también recupere su escritura.
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_lectura_publica" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_select" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_lectura_tenant_assets" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_insert" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_update" ON storage.objects;
DROP POLICY IF EXISTS "TEMPORAL_INSEGURA_delete" ON storage.objects;

-- Lectura sin condición de tenant, pero sólo para sesiones autenticadas.
CREATE POLICY "TEMPORAL_INSEGURA_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('avatars', 'paciente_adjuntos', 'escaneos_3d'));

-- tenant_assets sigue legible sin login: la landing y el logo del mail de turnos lo necesitan.
CREATE POLICY "TEMPORAL_INSEGURA_lectura_tenant_assets" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'tenant_assets');

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

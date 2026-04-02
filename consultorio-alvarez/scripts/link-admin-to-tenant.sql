-- ============================================================
-- VINCULAR USUARIO ADMIN AL TENANT ÁLVAREZ
-- Ejecutar en Supabase → SQL Editor
-- ============================================================
-- Reemplazá el email si usaste uno distinto al crear el usuario.

DO $$
DECLARE
    v_user_id  UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Obtener el ID del usuario creado en auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'admin@consultorioalvarez.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users. Verificá el email.';
    END IF;

    -- 2. Obtener el tenant del consultorio
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = 'alvarez'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant "alvarez" no encontrado. Asegurate de haber ejecutado las migraciones.';
    END IF;

    -- 3. Insertar en public.usuarios (o actualizar si ya existe)
    INSERT INTO public.usuarios (id, tenant_id, email, nombre, apellido, rol)
    VALUES (v_user_id, v_tenant_id, 'admin@consultorioalvarez.com', 'Admin', 'Álvarez', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = v_tenant_id, rol = 'admin';

    RAISE NOTICE '✅ Usuario vinculado al tenant % con rol admin', v_tenant_id;
END $$;

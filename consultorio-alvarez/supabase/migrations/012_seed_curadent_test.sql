-- ============================================================
-- Migración 012: Seed de prueba para Curadent Odontología
-- ============================================================

DO $$
DECLARE
    v_curadent_id UUID := gen_random_uuid();
    v_prof1_id UUID := gen_random_uuid();
    v_prof2_id UUID := gen_random_uuid();
BEGIN
    -- 1. Insertar Tenant Curadent (solo si no existe)
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'curadent') THEN
        INSERT INTO public.tenants (
            id,
            slug,
            nombre,
            descripcion,
            custom_domain,
            color_primario,
            color_secundario,
            telefono,
            email_contacto,
            direccion,
            ciudad,
            provincia,
            landing_activa,
            turnos_online_activos,
            activo
        ) VALUES (
            v_curadent_id,
            'curadent',
            'Curadent Odontología',
            'Centro odontológico integral de alta complejidad',
            'curadent.local',
            '#2563eb',
            '#1d4ed8',
            '+54 9 11 9876-5432',
            'contacto@curadent.com.ar',
            'Av. Corrientes 2450',
            'CABA',
            'Buenos Aires',
            true,
            true,
            true
        );
    ELSE
        SELECT id INTO v_curadent_id FROM public.tenants WHERE slug = 'curadent';
    END IF;

    -- 2. Profesionales exclusivos de Curadent
    IF NOT EXISTS (SELECT 1 FROM public.profesionales WHERE tenant_id = v_curadent_id) THEN
        INSERT INTO public.profesionales (id, tenant_id, nombre, apellido, especialidad, matricula, color_agenda, email, activo)
        VALUES 
            (v_prof1_id, v_curadent_id, 'Martín', 'Gómez', 'Implantología & Cirugía', 'MN-88421', '#2563eb', 'dr.gomez@curadent.com.ar', true),
            (v_prof2_id, v_curadent_id, 'Lucía', 'Benítez', 'Ortodoncia Invisible', 'MN-91204', '#06b6d4', 'dra.benitez@curadent.com.ar', true);
    END IF;

    -- 3. Configuración de Landing para Curadent
    IF NOT EXISTS (SELECT 1 FROM public.landing_config WHERE tenant_id = v_curadent_id) THEN
        INSERT INTO public.landing_config (
            tenant_id,
            hero_badge,
            hero_titulo,
            hero_subtitulo,
            booking_titulo,
            booking_subtitulo,
            color_primary,
            color_primary_hover,
            color_accent,
            custom_domain
        ) VALUES (
            v_curadent_id,
            'Curadent Especialistas',
            'Tu sonrisa en las mejores manos',
            'Tecnología digital de última generación en odontología.',
            'Reservá tu consulta en Curadent',
            'Elegí el profesional y horario para tu turno.',
            '#2563eb',
            '#1d4ed8',
            '#06b6d4',
            'curadent.local'
        );
    END IF;

    -- 4. Integración Mercado Pago para Curadent con SEÑA ACTIVADA ($15.000)
    IF NOT EXISTS (SELECT 1 FROM public.tenant_integrations WHERE tenant_id = v_curadent_id AND provider = 'mercadopago') THEN
        INSERT INTO public.tenant_integrations (
            tenant_id,
            provider,
            credentials,
            is_active
        ) VALUES (
            v_curadent_id,
            'mercadopago',
            jsonb_build_object(
                'access_token', 'APP_USR_CURADENT_TEST_TOKEN',
                'public_key', 'APP_USR_CURADENT_TEST_PK',
                'cobrar_senia', true,
                'monto_senia', 15000
            ),
            true
        );
    END IF;

    -- 5. Integración WhatsApp para Curadent con número propio
    IF NOT EXISTS (SELECT 1 FROM public.tenant_integrations WHERE tenant_id = v_curadent_id AND provider = 'whatsapp') THEN
        INSERT INTO public.tenant_integrations (
            tenant_id,
            provider,
            credentials,
            is_active
        ) VALUES (
            v_curadent_id,
            'whatsapp',
            jsonb_build_object(
                'phone_number_id', 'CURADENT_WA_PHONE_123456',
                'access_token', 'CURADENT_META_TOKEN_123456'
            ),
            true
        );
    END IF;

    RAISE NOTICE 'Curadent creado exitosamente con ID: %', v_curadent_id;
END $$;

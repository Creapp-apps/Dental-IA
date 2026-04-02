-- ============================================================
-- SEED DATA — Consultorio Álvarez
-- Ejecutar DESPUÉS de 001_schema_completo.sql
-- ============================================================

-- Obtener el tenant_id del tenant 'alvarez'
-- (Asumimos que ya se insertó en la migración anterior)

DO $$
DECLARE
    v_tenant_id UUID;
    v_prof1_id UUID := gen_random_uuid();
    v_prof2_id UUID := gen_random_uuid();
BEGIN
    -- Obtener tenant
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'alvarez';
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant alvarez no encontrado. Ejecutar 001_schema_completo.sql primero.';
    END IF;

    -- ============================================================
    -- PROFESIONALES
    -- ============================================================
    INSERT INTO public.profesionales (id, tenant_id, nombre, apellido, especialidad, matricula, color_agenda, email)
    VALUES 
        (v_prof1_id, v_tenant_id, 'Ricardo', 'Álvarez', 'Odontología General', 'MP-12345', '#2563eb', 'ricardo@consultorioalvarez.com'),
        (v_prof2_id, v_tenant_id, 'Martín', 'Álvarez', 'Ortodoncia', 'MP-12346', '#16a34a', 'martin@consultorioalvarez.com');

    -- ============================================================
    -- OBRAS SOCIALES
    -- ============================================================
    INSERT INTO public.obras_sociales (tenant_id, nombre, codigo) VALUES
        (v_tenant_id, 'OSDE', 'OSDE'),
        (v_tenant_id, 'Swiss Medical', 'SWISS'),
        (v_tenant_id, 'Galeno', 'GAL'),
        (v_tenant_id, 'IOMA', 'IOMA'),
        (v_tenant_id, 'PAMI', 'PAMI'),
        (v_tenant_id, 'Medifé', 'MDF'),
        (v_tenant_id, 'Particular', NULL);

    -- ============================================================
    -- TIPOS DE TRATAMIENTO
    -- ============================================================
    INSERT INTO public.tipos_tratamiento (tenant_id, nombre, duracion_minutos, prioridad, color, descripcion, precio_referencia) VALUES
        (v_tenant_id, 'Tratamiento de Conducto', 90, 'ALTA', '#ef4444', 'Endodoncia completa', 85000),
        (v_tenant_id, 'Extracción Simple', 45, 'ALTA', '#f97316', 'Extracción dental simple', 25000),
        (v_tenant_id, 'Extracción Compleja', 60, 'ALTA', '#f97316', 'Extracción molar o pieza incluida', 45000),
        (v_tenant_id, 'Limpieza Dental', 45, 'NORMAL', '#3b82f6', 'Profilaxis y detartraje', 12000),
        (v_tenant_id, 'Revisión de Rutina', 30, 'BAJA', '#22c55e', 'Control periódico', 8000),
        (v_tenant_id, 'Consulta de Urgencia', 30, 'URGENTE', '#dc2626', 'Atención de emergencia dental', 15000),
        (v_tenant_id, 'Colocación de Corona', 60, 'NORMAL', '#8b5cf6', 'Corona cerámica o porcelana', 120000),
        (v_tenant_id, 'Ortodoncia - Control', 30, 'NORMAL', '#6366f1', 'Control y ajuste de brackets', 8000),
        (v_tenant_id, 'Blanqueamiento', 60, 'BAJA', '#84cc16', 'Blanqueamiento dental profesional', 35000),
        (v_tenant_id, 'Implante - Evaluación', 45, 'NORMAL', '#7c3aed', 'Evaluación para implante oseointegrado', 15000),
        (v_tenant_id, 'Selladores', 30, 'BAJA', '#0ea5e9', 'Sellado de fisuras preventivo', 6000),
        (v_tenant_id, 'Obturación / Composite', 45, 'NORMAL', '#f59e0b', 'Restauración con composite', 22000),
        (v_tenant_id, 'Prótesis - Control', 30, 'NORMAL', '#06b6d4', 'Control de prótesis removible', 8000);

    RAISE NOTICE 'Seed data insertado correctamente para tenant: %', v_tenant_id;
END $$;

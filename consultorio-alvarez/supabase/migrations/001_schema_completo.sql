-- ============================================================
-- CONSULTORIO ÁLVAREZ — Schema Multi-tenant Completo
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- ---- 1. TENANTS ----
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    logo_url TEXT,
    telefono TEXT,
    email_contacto TEXT,
    direccion TEXT,
    ciudad TEXT,
    provincia TEXT,
    cuit TEXT,
    color_primario TEXT NOT NULL DEFAULT '#2563eb',
    color_secundario TEXT NOT NULL DEFAULT '#1e40af',
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'elite')),
    landing_activa BOOLEAN NOT NULL DEFAULT true,
    turnos_online_activos BOOLEAN NOT NULL DEFAULT true,
    horarios JSONB NOT NULL DEFAULT '[
        {"dia": 1, "apertura": "09:00", "cierre": "18:00", "activo": true},
        {"dia": 2, "apertura": "09:00", "cierre": "18:00", "activo": true},
        {"dia": 3, "apertura": "09:00", "cierre": "18:00", "activo": true},
        {"dia": 4, "apertura": "09:00", "cierre": "18:00", "activo": true},
        {"dia": 5, "apertura": "09:00", "cierre": "13:00", "activo": true},
        {"dia": 6, "apertura": "00:00", "cierre": "00:00", "activo": false},
        {"dia": 0, "apertura": "00:00", "cierre": "00:00", "activo": false}
    ]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 2. USUARIOS (vinculados a auth.users) ----
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'secretaria' CHECK (rol IN ('admin', 'profesional', 'secretaria')),
    profesional_id UUID, -- se llena si rol = 'profesional'
    avatar_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 3. PROFESIONALES ----
CREATE TABLE IF NOT EXISTS public.profesionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    especialidad TEXT,
    matricula TEXT,
    foto_url TEXT,
    descripcion TEXT,
    color_agenda TEXT NOT NULL DEFAULT '#2563eb',
    email TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK retroactiva de usuarios.profesional_id
ALTER TABLE public.usuarios
ADD CONSTRAINT fk_usuarios_profesional
FOREIGN KEY (profesional_id) REFERENCES public.profesionales(id) ON DELETE SET NULL;

-- ---- 4. OBRAS SOCIALES ----
CREATE TABLE IF NOT EXISTS public.obras_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 5. TIPOS DE TRATAMIENTO ----
CREATE TABLE IF NOT EXISTS public.tipos_tratamiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    prioridad TEXT NOT NULL DEFAULT 'NORMAL' CHECK (prioridad IN ('URGENTE', 'ALTA', 'NORMAL', 'BAJA')),
    color TEXT NOT NULL DEFAULT '#3b82f6',
    descripcion TEXT,
    precio_referencia NUMERIC(12, 2),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 6. PACIENTES ----
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nro_historia_clinica TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    dni TEXT,
    fecha_nacimiento DATE,
    genero TEXT CHECK (genero IN ('M', 'F', 'X')),
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    ciudad TEXT,
    obra_social_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL,
    n_afiliado TEXT,
    motivo_consulta TEXT,
    alergias TEXT,
    medicacion_actual TEXT,
    antecedentes TEXT,
    notas_internas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, nro_historia_clinica)
);

-- ---- 7. TURNOS ----
CREATE TABLE IF NOT EXISTS public.turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    profesional_id UUID NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
    tipo_tratamiento_id UUID NOT NULL REFERENCES public.tipos_tratamiento(id) ON DELETE RESTRICT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'EN_SALA', 'ATENDIDO', 'CANCELADO', 'AUSENTE')),
    prioridad_override TEXT CHECK (prioridad_override IN ('URGENTE', 'ALTA', 'NORMAL', 'BAJA')),
    notas TEXT,
    origen TEXT NOT NULL DEFAULT 'SECRETARIA' CHECK (origen IN ('ONLINE', 'SECRETARIA', 'PROFESIONAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 8. HISTORIAL CLÍNICO ----
CREATE TABLE IF NOT EXISTS public.historial_clinico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
    profesional_id UUID NOT NULL REFERENCES public.profesionales(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT,
    procedimiento_realizado TEXT,
    piezas_tratadas TEXT[], -- array de piezas ej: {'18', '24', '36'}
    presupuesto NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 9. COBROS ----
CREATE TABLE IF NOT EXISTS public.cobros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    monto_total NUMERIC(12, 2) NOT NULL,
    monto_pagado NUMERIC(12, 2) NOT NULL DEFAULT 0,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OBRA_SOCIAL')),
    obra_social_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'PARCIAL')),
    fecha_pago DATE,
    comprobante_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 10. PRESUPUESTOS ----
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    profesional_id UUID NOT NULL REFERENCES public.profesionales(id) ON DELETE RESTRICT,
    estado TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'PRESENTADO', 'APROBADO', 'RECHAZADO', 'VENCIDO')),
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notas TEXT,
    fecha_presentacion DATE,
    fecha_respuesta DATE,
    vigencia_dias INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 11. ITEMS DEL PRESUPUESTO ----
CREATE TABLE IF NOT EXISTS public.presupuesto_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    tipo_tratamiento_id UUID NOT NULL REFERENCES public.tipos_tratamiento(id) ON DELETE RESTRICT,
    pieza_dental TEXT, -- ej: '18', '24'
    descripcion TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 12. ODONTOGRAMA ----
CREATE TABLE IF NOT EXISTS public.odontograma_piezas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    pieza TEXT NOT NULL, -- '11' a '48' (notación FDI)
    estado TEXT NOT NULL DEFAULT 'SANO' CHECK (estado IN (
        'SANO', 'CARIES', 'OBTURADO', 'CORONA', 'PUENTE',
        'AUSENTE', 'IMPLANTE', 'ENDODONCIA', 'PROTESIS',
        'EN_TRATAMIENTO', 'FRACTURADO'
    )),
    cara TEXT, -- 'mesial', 'distal', 'oclusal', 'vestibular', 'palatino/lingual'
    notas TEXT,
    updated_by UUID REFERENCES public.profesionales(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (paciente_id, pieza, cara)
);

-- ---- 13. RECORDATORIOS WHATSAPP ----
CREATE TABLE IF NOT EXISTS public.recordatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
    canal TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (canal IN ('WHATSAPP', 'SMS', 'EMAIL')),
    estado_envio TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_envio IN ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'FALLIDO', 'RESPONDIDO')),
    respuesta_paciente TEXT, -- 'CONFIRMAR', 'CANCELAR', 'REPROGRAMAR'
    telefono TEXT NOT NULL,
    mensaje_enviado TEXT,
    fecha_envio TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    error_detalle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
CREATE INDEX idx_profesionales_tenant ON public.profesionales(tenant_id);
CREATE INDEX idx_pacientes_tenant ON public.pacientes(tenant_id);
CREATE INDEX idx_pacientes_dni ON public.pacientes(tenant_id, dni);
CREATE INDEX idx_pacientes_apellido ON public.pacientes(tenant_id, apellido);
CREATE INDEX idx_obras_sociales_tenant ON public.obras_sociales(tenant_id);
CREATE INDEX idx_tipos_tratamiento_tenant ON public.tipos_tratamiento(tenant_id);
CREATE INDEX idx_turnos_tenant ON public.turnos(tenant_id);
CREATE INDEX idx_turnos_fecha ON public.turnos(tenant_id, fecha_inicio);
CREATE INDEX idx_turnos_profesional ON public.turnos(profesional_id, fecha_inicio);
CREATE INDEX idx_turnos_paciente ON public.turnos(paciente_id);
CREATE INDEX idx_turnos_estado ON public.turnos(tenant_id, estado);
CREATE INDEX idx_historial_paciente ON public.historial_clinico(paciente_id);
CREATE INDEX idx_cobros_paciente ON public.cobros(paciente_id);
CREATE INDEX idx_cobros_estado ON public.cobros(tenant_id, estado);
CREATE INDEX idx_presupuestos_paciente ON public.presupuestos(paciente_id);
CREATE INDEX idx_odontograma_paciente ON public.odontograma_piezas(paciente_id);
CREATE INDEX idx_recordatorios_turno ON public.recordatorios(turno_id);
CREATE INDEX idx_recordatorios_estado ON public.recordatorios(tenant_id, estado_envio);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON public.pacientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_turnos_updated_at BEFORE UPDATE ON public.turnos
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_presupuestos_updated_at BEFORE UPDATE ON public.presupuestos
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_odontograma_updated_at BEFORE UPDATE ON public.odontograma_piezas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontograma_piezas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;

-- Helper: obtener tenant_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies genéricas por tenant_id
-- (Un usuario solo ve datos de SU tenant)

-- TENANTS: solo su propio tenant
CREATE POLICY "tenant_own" ON public.tenants
    FOR ALL USING (id = get_user_tenant_id());

-- Para tablas con tenant_id directo
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'usuarios', 'profesionales', 'pacientes', 'obras_sociales',
            'tipos_tratamiento', 'turnos', 'historial_clinico', 'cobros',
            'presupuestos', 'odontograma_piezas', 'recordatorios'
        ])
    LOOP
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL USING (tenant_id = get_user_tenant_id())',
            tbl, tbl
        );
    END LOOP;
END $$;

-- PRESUPUESTO_ITEMS: acceso vía presupuesto
CREATE POLICY "tenant_isolation_presupuesto_items" ON public.presupuesto_items
    FOR ALL USING (
        presupuesto_id IN (
            SELECT id FROM public.presupuestos WHERE tenant_id = get_user_tenant_id()
        )
    );

-- Landing pública: acceso anónimo al tenant activo
CREATE POLICY "public_tenant_read" ON public.tenants
    FOR SELECT USING (activo = true);

CREATE POLICY "public_profesionales_read" ON public.profesionales
    FOR SELECT USING (
        activo = true AND tenant_id IN (SELECT id FROM public.tenants WHERE activo = true)
    );

CREATE POLICY "public_tipos_tratamiento_read" ON public.tipos_tratamiento
    FOR SELECT USING (
        activo = true AND tenant_id IN (SELECT id FROM public.tenants WHERE activo = true)
    );

CREATE POLICY "public_obras_sociales_read" ON public.obras_sociales
    FOR SELECT USING (
        activo = true AND tenant_id IN (SELECT id FROM public.tenants WHERE activo = true)
    );

-- ============================================================
-- SEED DATA — Consultorio Álvarez
-- ============================================================

-- Crear tenant
INSERT INTO public.tenants (slug, nombre, descripcion, telefono, email_contacto, direccion, ciudad, provincia)
VALUES (
    'alvarez',
    'Consultorio Odontológico Álvarez',
    'Odontología general, ortodoncia, implantes y estética dental',
    '11 4523-7891',
    'info@consultorioalvarez.com',
    'Av. Rivadavia 4520',
    'CABA',
    'Buenos Aires'
);

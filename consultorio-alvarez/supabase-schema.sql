-- ============================================================
-- SCHEMA COMPLETO MULTI-TENANT — Consultorio Álvarez (Dental-IA)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE prioridad_tratamiento AS ENUM ('URGENTE', 'ALTA', 'NORMAL', 'BAJA');
CREATE TYPE estado_turno AS ENUM ('PENDIENTE', 'CONFIRMADO', 'EN_SALA', 'ATENDIDO', 'CANCELADO', 'AUSENTE');
CREATE TYPE origen_turno AS ENUM ('ONLINE', 'SECRETARIA', 'PROFESIONAL');
CREATE TYPE metodo_pago AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OBRA_SOCIAL');
CREATE TYPE estado_cobro AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL');
CREATE TYPE canal_recordatorio AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');
CREATE TYPE rol_usuario AS ENUM ('admin', 'profesional', 'secretaria');

-- ============================================================
-- TENANTS (CLÍNICAS)
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  dominio TEXT UNIQUE, -- ej: alvarez.dental-ia.com
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (USUARIOS EXTENDIDOS)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  rol rol_usuario NOT NULL DEFAULT 'secretaria',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para perfil automático: Crea un super-admin si es el primer usuario o la clínica base si no hay
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Buscar o crear el tenant principal si no hay ninguno
  SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (nombre, dominio) VALUES ('Consultorio Principal', 'principal') RETURNING id INTO v_tenant_id;
  END IF;

  INSERT INTO profiles (id, email, tenant_id, rol)
  VALUES (NEW.id, NEW.email, v_tenant_id, 'admin'); -- Por defecto admin al auto-crearse (ajustable)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TABLAS DEL NEGOCIO (MULTI-TENANT)
-- ============================================================

-- Helper Function para obtener el tenant_id del usuario logueado rápidamente
CREATE OR REPLACE FUNCTION get_auth_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- PROFESIONALES
CREATE TABLE profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  color_agenda TEXT NOT NULL DEFAULT '#3b82f6',
  email TEXT,
  telefono TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INTEGRACIONES
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- Ej: 'whatsapp', 'mercadopago'
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- OBRAS SOCIALES
CREATE TABLE obras_sociales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  codigo TEXT,
  planes TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TIPOS DE TRATAMIENTO
CREATE TABLE tipos_tratamiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 30,
  prioridad prioridad_tratamiento NOT NULL DEFAULT 'NORMAL',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PACIENTES
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT,
  cuit TEXT,
  fecha_nacimiento DATE,
  telefono TEXT,
  email TEXT,
  obra_social_id UUID REFERENCES obras_sociales(id) ON DELETE SET NULL,
  n_afiliado TEXT,
  alergias TEXT,
  medicacion_actual TEXT,
  antecedentes TEXT,
  notas_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TURNOS
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
  tipo_tratamiento_id UUID NOT NULL REFERENCES tipos_tratamiento(id) ON DELETE RESTRICT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  estado estado_turno NOT NULL DEFAULT 'PENDIENTE',
  prioridad_override prioridad_tratamiento,
  notas TEXT,
  origen origen_turno NOT NULL DEFAULT 'SECRETARIA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fecha_coherente CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX idx_turnos_fecha ON turnos(fecha_inicio);
CREATE INDEX idx_turnos_profesional ON turnos(profesional_id);
CREATE INDEX idx_turnos_paciente ON turnos(paciente_id);
CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_tenant_id_turnos ON turnos(tenant_id);

-- HISTORIAL CLÍNICO
CREATE TABLE historial_clinico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  procedimiento_realizado TEXT,
  presupuesto DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COBROS
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  monto_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0,
  metodo_pago metodo_pago NOT NULL DEFAULT 'EFECTIVO',
  obra_social_id UUID REFERENCES obras_sociales(id) ON DELETE SET NULL,
  estado estado_cobro NOT NULL DEFAULT 'PENDIENTE',
  fecha_pago DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BLOQUEOS DE AGENDA
CREATE TABLE bloqueos_agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  profesional_id UUID REFERENCES profesionales(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  aplica_todos_profesionales BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECORDATORIOS LOG
CREATE TABLE recordatorios_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT get_auth_tenant_id() REFERENCES tenants(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  canal canal_recordatorio NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  enviado_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS DE UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON turnos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON tenant_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) MULTI-TENANT BLINDADA
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios_log ENABLE ROW LEVEL SECURITY;

-- Tenants: Solo ver su propio tenant
CREATE POLICY "Ver propio tenant" ON tenants FOR SELECT TO authenticated USING (id = get_auth_tenant_id());

-- Profiles: Usuarios ven perfiles de su mismo tenant
CREATE POLICY "Ver perfiles del tenant" ON profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Editar propio perfil" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Tablas compartidas (Aisladas 100% por tenant_id)
CREATE POLICY "Tenant isolation (SELECT)" ON profesionales FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant isolation (INSERT)" ON profesionales FOR INSERT TO authenticated WITH CHECK (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant isolation (UPDATE)" ON profesionales FOR UPDATE TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant isolation (DELETE)" ON profesionales FOR DELETE TO authenticated USING (tenant_id = get_auth_tenant_id() AND (SELECT rol FROM profiles WHERE id = auth.uid()) = 'admin');

-- Tipos Tratamiento, Obras Sociales, Pacientes, Turnos, Historial, Cobros, Bloqueos, Log, Integrations
-- Aplicar política idéntica en masa para simplificar (Todos CRUD sobre su tenant_id)
DO $$ 
DECLARE 
  t text;
BEGIN 
  FOR t IN SELECT unnest(ARRAY['tipos_tratamiento','obras_sociales','pacientes','turnos','historial_clinico','cobros','bloqueos_agenda','recordatorios_log', 'tenant_integrations']) 
  LOOP
    EXECUTE format('CREATE POLICY "Tenant isolation (SELECT)" ON %I FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant isolation (INSERT)" ON %I FOR INSERT TO authenticated WITH CHECK (tenant_id = get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant isolation (UPDATE)" ON %I FOR UPDATE TO authenticated USING (tenant_id = get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant isolation (DELETE)" ON %I FOR DELETE TO authenticated USING (tenant_id = get_auth_tenant_id());', t);
  END LOOP;
END $$;

-- ============================================================
-- SCHEMA COMPLETO — Consultorio Álvarez
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Extensiones necesarias
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
-- PERFILES DE USUARIO (extiende auth.users)
-- ============================================================
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  rol rol_usuario NOT NULL DEFAULT 'secretaria',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PROFESIONALES
-- ============================================================
CREATE TABLE profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  color_agenda TEXT NOT NULL DEFAULT '#3b82f6',
  email TEXT,
  telefono TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OBRAS SOCIALES
-- ============================================================
CREATE TABLE obras_sociales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIPOS DE TRATAMIENTO
-- ============================================================
CREATE TABLE tipos_tratamiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 30,
  prioridad prioridad_tratamiento NOT NULL DEFAULT 'NORMAL',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACIENTES
-- ============================================================
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT,
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

-- ============================================================
-- TURNOS
-- ============================================================
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================
-- HISTORIAL CLÍNICO
-- ============================================================
CREATE TABLE historial_clinico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  procedimiento_realizado TEXT,
  presupuesto DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_paciente ON historial_clinico(paciente_id);

-- ============================================================
-- COBROS
-- ============================================================
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================
-- BLOQUEOS DE AGENDA
-- ============================================================
CREATE TABLE bloqueos_agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID REFERENCES profesionales(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  aplica_todos_profesionales BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOG DE RECORDATORIOS
-- ============================================================
CREATE TABLE recordatorios_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  canal canal_recordatorio NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  enviado_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turnos_updated_at
  BEFORE UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios_log ENABLE ROW LEVEL SECURITY;

-- Política simple: usuarios autenticados ven todo (con rol)
CREATE POLICY "Autenticados pueden ver" ON profesionales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gestiona profesionales" ON profesionales FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

CREATE POLICY "Autenticados ven tipos" ON tipos_tratamiento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gestiona tipos" ON tipos_tratamiento FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

CREATE POLICY "Autenticados ven obras sociales" ON obras_sociales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gestiona obras sociales" ON obras_sociales FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

CREATE POLICY "Autenticados gestionan pacientes" ON pacientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados gestionan turnos" ON turnos FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados gestionan historial" ON historial_clinico FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados gestionan cobros" ON cobros FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados gestionan bloqueos" ON bloqueos_agenda FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados ven recordatorios" ON recordatorios_log FOR SELECT TO authenticated USING (true);

-- Portal público: pacientes pueden insertar turnos (PENDIENTE)
CREATE POLICY "Público puede crear turno pendiente" ON turnos FOR INSERT TO anon
  WITH CHECK (estado = 'PENDIENTE' AND origen = 'ONLINE');
CREATE POLICY "Público puede crear paciente" ON pacientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Público ve profesionales activos" ON profesionales FOR SELECT TO anon USING (activo = true);
CREATE POLICY "Público ve tipos activos" ON tipos_tratamiento FOR SELECT TO anon USING (activo = true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Obras sociales comunes en Argentina
INSERT INTO obras_sociales (nombre, codigo) VALUES
  ('OSDE', 'OSDE'),
  ('Swiss Medical', 'SWISS'),
  ('Galeno', 'GAL'),
  ('IOMA', 'IOMA'),
  ('OSECAC', 'OSECAC'),
  ('PAMI', 'PAMI'),
  ('Medifé', 'MDF'),
  ('Particular / Sin obra social', NULL);

-- Tipos de tratamiento iniciales
INSERT INTO tipos_tratamiento (nombre, duracion_minutos, prioridad, color, descripcion) VALUES
  ('Tratamiento de Conducto', 90, 'ALTA', '#ef4444', 'Endodoncia completa'),
  ('Extracción Simple', 45, 'ALTA', '#f97316', 'Extracción dental simple'),
  ('Extracción Compleja', 60, 'ALTA', '#f97316', 'Extracción molar o pieza incluida'),
  ('Limpieza Dental', 45, 'NORMAL', '#3b82f6', 'Profilaxis y detartraje'),
  ('Revisión de Rutina', 30, 'BAJA', '#22c55e', 'Control periódico'),
  ('Consulta de Urgencia', 30, 'URGENTE', '#dc2626', 'Atención de emergencia dental'),
  ('Colocación de Corona', 60, 'NORMAL', '#8b5cf6', 'Corona cerámica o porcelana'),
  ('Prótesis Parcial', 60, 'NORMAL', '#06b6d4', 'Prótesis removible parcial'),
  ('Ortodoncia - Control', 30, 'NORMAL', '#6366f1', 'Control y ajuste de brackets'),
  ('Blanqueamiento', 60, 'BAJA', '#84cc16', 'Blanqueamiento dental profesional'),
  ('Implante - Evaluación', 45, 'NORMAL', '#7c3aed', 'Evaluación para implante oseointegrado'),
  ('Selladores', 30, 'BAJA', '#0ea5e9', 'Sellado de fisuras preventivo'),
  ('Incrustación / Obturación', 45, 'NORMAL', '#f59e0b', 'Restauración con composite o amalgama');

-- Profesionales (padre e hijo — personalizar nombres)
INSERT INTO profesionales (nombre, apellido, color_agenda, email) VALUES
  ('Dr. Ricardo', 'Álvarez', '#2563eb', 'ricardo.alvarez@consultorioalvarez.com'),
  ('Dr. Martín', 'Álvarez', '#16a34a', 'martin.alvarez@consultorioalvarez.com');

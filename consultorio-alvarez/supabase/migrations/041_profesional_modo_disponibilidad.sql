ALTER TABLE profesionales
  ADD COLUMN modo_disponibilidad text NOT NULL DEFAULT 'recurrente',
  ADD COLUMN fechas_atencion text[] NOT NULL DEFAULT '{}',
  ADD COLUMN fechas_horario jsonb;

ALTER TABLE profesionales
  ADD CONSTRAINT profesionales_modo_disponibilidad_chk
  CHECK (modo_disponibilidad IN ('recurrente', 'fechas'));

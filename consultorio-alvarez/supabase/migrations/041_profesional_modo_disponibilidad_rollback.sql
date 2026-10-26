ALTER TABLE profesionales DROP CONSTRAINT IF EXISTS profesionales_modo_disponibilidad_chk;
ALTER TABLE profesionales
  DROP COLUMN IF EXISTS modo_disponibilidad,
  DROP COLUMN IF EXISTS fechas_atencion,
  DROP COLUMN IF EXISTS fechas_horario;

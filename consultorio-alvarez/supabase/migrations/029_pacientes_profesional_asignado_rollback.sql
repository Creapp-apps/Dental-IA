-- Rollback de 029 — quita el profesional asignado por paciente.

DROP INDEX IF EXISTS idx_pacientes_profesional;

ALTER TABLE pacientes
  DROP COLUMN IF EXISTS profesional_id;

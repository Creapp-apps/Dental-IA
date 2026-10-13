-- Rollback de 030 — quita el tipo de odontograma por paciente.

ALTER TABLE pacientes
  DROP COLUMN IF EXISTS odontograma_tipo;

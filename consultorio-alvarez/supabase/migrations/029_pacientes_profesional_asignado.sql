-- 029 — Profesional asignado (de cabecera) por paciente.
-- El admin asigna un profesional responsable a cada paciente. Es opcional:
-- un paciente puede no tener asignación (NULL). Al eliminar un profesional, la
-- asignación se limpia sola (ON DELETE SET NULL).
--
-- El alcance "mis pacientes" del profesional pasa a ser la unión de los
-- pacientes asignados a él MÁS los que tuvo en su agenda (turnos).
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md (addendum 2026-10-13)

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS profesional_id UUID
  REFERENCES profesionales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_profesional
  ON pacientes(tenant_id, profesional_id);

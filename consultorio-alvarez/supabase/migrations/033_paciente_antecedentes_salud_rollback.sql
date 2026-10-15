-- Rollback de 033_paciente_antecedentes_salud.sql
ALTER TABLE public.pacientes
  DROP COLUMN IF EXISTS antecedentes_salud;

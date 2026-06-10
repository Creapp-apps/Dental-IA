-- Migración: agregar columna registro_completo a pacientes
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS registro_completo BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN pacientes.registro_completo IS 'Identifica si el perfil del paciente ha sido completado por la administración (FALSE si se creó por registro rápido de turno).';

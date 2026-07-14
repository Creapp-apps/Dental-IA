-- Migración: agregar columna numero_pieza a turnos para tratamiento de conducto
-- Ejecutar en Supabase SQL Editor

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS numero_pieza TEXT;

COMMENT ON COLUMN turnos.numero_pieza IS 'Número de pieza dental, única y exclusivamente aplicable a turnos con Tratamiento de Conducto asignado.';

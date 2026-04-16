-- Migración: agregar soporte para sobreturnos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS es_sobreturno BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN turnos.es_sobreturno IS 'Sobreturno: turno rápido (≤15min) que puede superponerse con turnos existentes. Solo para chequeos de rutina.';

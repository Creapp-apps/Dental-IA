-- Migration 026: un turno puede entrar sin profesional asignado.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §10
--
-- Cuando el consultorio oculta la selección de profesional en la reserva web,
-- el paciente elige tratamiento y horario y el turno entra sin profesional, en
-- estado PENDIENTE, para que recepción lo asigne.
--
-- Numerada 026 y no 023 como decía el plan porque 023 quedó para la RLS de
-- turnos y la 025 (storage privado) ya está aplicada en producción.

BEGIN;

ALTER TABLE public.turnos
    ALTER COLUMN profesional_id DROP NOT NULL;

COMMENT ON COLUMN public.turnos.profesional_id IS
    'NULL = turno sin asignar, a la espera de que recepción elija profesional (migración 026).';

COMMIT;

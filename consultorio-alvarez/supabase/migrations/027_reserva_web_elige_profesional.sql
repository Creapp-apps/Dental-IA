-- Migration 027: cada consultorio decide si el paciente elige profesional.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §10
--
-- En true no cambia nada, que es lo que necesita Consultorio Alvarez, donde el
-- paciente elige entre padre e hijo. Curadent la pone en false: la reserva web
-- deja de mostrar el paso de profesional y el turno entra sin asignar.

BEGIN;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS reserva_web_elige_profesional BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tenants.reserva_web_elige_profesional IS
    'Si la reserva online muestra el paso "¿Con quién querés atenderte?" (migración 027).';

COMMIT;

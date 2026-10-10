-- Rollback de la migración 027: se pierde la preferencia de cada consultorio y
-- la reserva web vuelve a pedir siempre profesional.

BEGIN;

ALTER TABLE public.tenants
    DROP COLUMN IF EXISTS reserva_web_elige_profesional;

COMMIT;

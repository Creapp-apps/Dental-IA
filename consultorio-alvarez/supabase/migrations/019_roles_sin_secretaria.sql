-- Migration 019: el modelo de roles queda en superadmin / admin / profesional.
-- Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §5
--
-- 'secretaria' se elimina: nunca se asignó (en producción hay 3 admin y 4
-- profesional) y el código sólo escribe 'admin' o 'profesional'. Las tareas de
-- recepción las hace 'admin'.
--
-- El DEFAULT pasa de 'secretaria' a 'profesional', que es el valor menos
-- peligroso si alguna vez se inserta una fila sin rol explícito.

BEGIN;

ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Red de seguridad: no debería haber filas, pero si las hubiera pasan a 'admin',
-- que es el rol que ahora atiende la recepción.
UPDATE public.usuarios
SET rol = 'admin'
WHERE rol = 'secretaria';

ALTER TABLE public.usuarios
    ALTER COLUMN rol SET DEFAULT 'profesional';

ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('superadmin', 'admin', 'profesional'));

COMMIT;

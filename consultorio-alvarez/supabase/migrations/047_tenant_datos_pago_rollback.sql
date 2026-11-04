-- Rollback de la migración 047.
ALTER TABLE public.tenants
    DROP COLUMN IF EXISTS datos_pago;

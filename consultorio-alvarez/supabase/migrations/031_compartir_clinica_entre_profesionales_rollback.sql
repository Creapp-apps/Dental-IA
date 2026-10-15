-- Rollback de 031_compartir_clinica_entre_profesionales.sql
ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS compartir_clinica_entre_profesionales;

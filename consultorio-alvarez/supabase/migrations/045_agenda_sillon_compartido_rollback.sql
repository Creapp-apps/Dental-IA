-- Rollback: quita la flag de sillón compartido por tenant.
ALTER TABLE public.tenants DROP COLUMN IF EXISTS agenda_sillon_compartido;

-- Rollback: quita la columna de visibilidad web del profesional.
ALTER TABLE public.profesionales DROP COLUMN IF EXISTS visible_web;

-- Default de vigencia de presupuestos: 30 -> 7 días (precios con validez corta).
ALTER TABLE public.presupuestos ALTER COLUMN vigencia_dias SET DEFAULT 7;

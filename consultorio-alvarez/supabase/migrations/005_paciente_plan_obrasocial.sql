-- Agregar columna de plan para la obra social en la tabla pacientes
ALTER TABLE public.pacientes
ADD COLUMN plan_obra_social text NULL;

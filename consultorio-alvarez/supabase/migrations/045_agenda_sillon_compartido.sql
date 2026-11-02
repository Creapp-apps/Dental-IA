-- Migración: flag por tenant para consultorios de un solo sillón (recurso único).
--
-- Por defecto (false) la disponibilidad se calcula por profesional: dos
-- profesionales pueden tener turnos en paralelo a la misma hora (clínica con
-- varios boxes, ej. Curadent).
--
-- Cuando el consultorio lo habilita (true), el sillón es compartido: un turno
-- de CUALQUIER profesional bloquea ese horario para todos. Evita que el
-- asistente web (CinthIA) o el formulario público ofrezcan y reserven un
-- horario que otro profesional ya tiene tomado en la agenda.
--
-- Álvarez: Pedro y Eduardo se turnan en un único sillón, así que va en true.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS agenda_sillon_compartido boolean NOT NULL DEFAULT false;

UPDATE public.tenants
  SET agenda_sillon_compartido = true
  WHERE slug = 'alvarez';

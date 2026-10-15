-- Migración: flag por tenant para compartir la info clínica entre profesionales.
--
-- Por defecto (false) cada profesional ve/edita sólo la ficha clínica de sus
-- pacientes (los asignados + los de su agenda), como hasta ahora. Cuando el
-- consultorio lo habilita (true), cualquier profesional ve y edita la ficha
-- clínica (alergias, medicación, antecedentes, motivo y notas internas) de
-- TODOS los pacientes del tenant. La AGENDA sigue acotada por profesional en
-- ambos casos.
--
-- El contacto (teléfono, email, DNI, dirección) NUNCA se comparte con el
-- profesional: sigue siendo sólo del admin.
--
-- Pedido de Curadent (clínica con varios profesionales). Álvarez no usa el rol
-- profesional, así que no se ve afectado.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS compartir_clinica_entre_profesionales boolean NOT NULL DEFAULT false;

UPDATE public.tenants
  SET compartir_clinica_entre_profesionales = true
  WHERE slug = 'curadent';

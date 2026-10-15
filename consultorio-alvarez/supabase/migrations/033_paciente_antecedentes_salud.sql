-- Migración: anamnesis odontológica ("Antecedentes de Salud") por paciente.
--
-- Foto editable (no historial por visita): respuestas Sí/No con su detalle,
-- afecciones marcadas y el consentimiento. La estructura del cuestionario vive
-- en código (src/lib/pacientes/antecedentes-salud.ts), por eso JSONB.
--
-- La anamnesis es la única fuente de escritura de alergias / medicacion_actual /
-- antecedentes: al guardarla se derivan esos campos (ver guardarAntecedentesSalud).

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS antecedentes_salud jsonb;

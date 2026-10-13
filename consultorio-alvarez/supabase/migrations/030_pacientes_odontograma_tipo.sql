-- 030 — Tipo de odontograma por paciente (dentición).
-- ADULTO = dientes permanentes (FDI 11-48).
-- NINO   = dientes temporarios / de leche (FDI 51-85).
-- MIXTO  = ambos (dentición mixta, chico en transición).
-- Las marcas (odontograma_piezas) no cambian: conviven por su número FDI.

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS odontograma_tipo TEXT NOT NULL DEFAULT 'ADULTO'
  CHECK (odontograma_tipo IN ('ADULTO', 'NINO', 'MIXTO'));

-- ============================================================
-- 018: updated_at en historial_clinico (Evoluciones)
-- ============================================================
-- El tab "Evoluciones" pasa a ser local-first: se escribe primero en
-- IndexedDB y luego sube por el outbox (sync_outbox). El push de UPDATE
-- escribe updated_at, y la reconciliación local necesita saber qué fila
-- es más nueva. historial_clinico sólo tenía created_at.
--
-- Columna aditiva con DEFAULT: no rompe inserts ni selects existentes.

ALTER TABLE historial_clinico
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Las filas históricas quedan con su fecha de creación como updated_at,
-- en vez del NOW() del momento de la migración.
UPDATE historial_clinico
SET updated_at = created_at
WHERE updated_at > created_at;

-- Soporta el pull incremental (.gt('updated_at', since)) por tenant.
CREATE INDEX IF NOT EXISTS idx_historial_clinico_updated_at
  ON historial_clinico (tenant_id, updated_at DESC);

-- El listado del tab siempre filtra por paciente y ordena por fecha.
CREATE INDEX IF NOT EXISTS idx_historial_clinico_paciente_fecha
  ON historial_clinico (paciente_id, fecha DESC);

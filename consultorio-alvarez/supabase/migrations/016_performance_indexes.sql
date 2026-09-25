-- ============================================================
-- MIGRACIÓN 016: ÍNDICES DE ALTO RENDIMIENTO (PERFORMANCE BOOST)
-- Optimiza navegación semanal en Agenda y búsqueda instantánea de pacientes
-- ============================================================

-- 1. Habilitar extensión pg_trgm para acelerar búsquedas ILIKE / subcadenas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices Trigram GIN para búsqueda de pacientes en < 15ms (nombre, apellido, DNI, historia clínica)
CREATE INDEX IF NOT EXISTS idx_pacientes_trgm_nombre ON public.pacientes USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pacientes_trgm_apellido ON public.pacientes USING gin (apellido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pacientes_trgm_dni ON public.pacientes USING gin (dni gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pacientes_trgm_hc ON public.pacientes USING gin (nro_historia_clinica gin_trgm_ops);

-- 3. Índices compuestos para navegación semanal y filtrado de turnos
CREATE INDEX IF NOT EXISTS idx_turnos_tenant_fecha_prof ON public.turnos(tenant_id, fecha_inicio, profesional_id);
CREATE INDEX IF NOT EXISTS idx_turnos_tenant_prof_fecha ON public.turnos(tenant_id, profesional_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_turnos_tenant_tipo ON public.turnos(tenant_id, tipo_tratamiento_id);

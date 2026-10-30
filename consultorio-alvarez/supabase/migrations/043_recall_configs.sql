-- ============================================================
-- MIGRACIÓN 043: RECORDATORIOS DE RECALL POR TRATAMIENTO
-- (recordatorios a largo plazo: control cada N meses por tratamiento)
-- Diseño: docs/superpowers/specs/2026-10-13-recordatorios-recall-por-tratamiento-design.md
-- ============================================================

-- 1. CONFIGURACIÓN DE RECALL (una fila por paciente + tratamiento)
CREATE TABLE IF NOT EXISTS public.recall_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id         UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    tipo_tratamiento_id UUID NOT NULL REFERENCES public.tipos_tratamiento(id) ON DELETE CASCADE,
    intervalo_meses     INT  NOT NULL CHECK (intervalo_meses >= 1 AND intervalo_meses <= 120),
    plantilla           TEXT NOT NULL DEFAULT 'recall_control_tratamiento',
    activo              BOOLEAN NOT NULL DEFAULT true,
    ultimo_envio_at     TIMESTAMPTZ,            -- NULL hasta el primer envío; dedupe por ciclo
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT recall_configs_unico UNIQUE (paciente_id, tipo_tratamiento_id)
);

CREATE INDEX IF NOT EXISTS idx_recall_configs_tenant_activo ON public.recall_configs(tenant_id, activo);
CREATE INDEX IF NOT EXISTS idx_recall_configs_paciente ON public.recall_configs(paciente_id);

-- Mantener updated_at al día (función ya existente en el proyecto).
DROP TRIGGER IF EXISTS trg_recall_configs_updated_at ON public.recall_configs;
CREATE TRIGGER trg_recall_configs_updated_at
    BEFORE UPDATE ON public.recall_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. LOG / AUDITORÍA DE ENVÍOS DE RECALL (no exige turno asociado)
CREATE TABLE IF NOT EXISTS public.recall_envios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    recall_config_id    UUID NOT NULL REFERENCES public.recall_configs(id) ON DELETE CASCADE,
    paciente_id         UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    tipo_tratamiento_id UUID NOT NULL REFERENCES public.tipos_tratamiento(id) ON DELETE CASCADE,
    canal               TEXT NOT NULL DEFAULT 'WHATSAPP_RECALL',
    estado_envio        TEXT NOT NULL CHECK (estado_envio IN ('ENVIADO', 'FALLIDO')),
    telefono            TEXT,
    ancla_at            TIMESTAMPTZ,            -- fecha del turno ATENDIDO usado como ancla
    error_detalle       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recall_envios_config ON public.recall_envios(recall_config_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recall_envios_tenant ON public.recall_envios(tenant_id, created_at DESC);

-- 3. RLS: aislamiento multi-tenant (mismo patrón que el resto del esquema).
ALTER TABLE public.recall_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_envios  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_recall_configs" ON public.recall_configs;
CREATE POLICY "tenant_isolation_recall_configs" ON public.recall_configs
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_recall_envios" ON public.recall_envios;
CREATE POLICY "tenant_isolation_recall_envios" ON public.recall_envios
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

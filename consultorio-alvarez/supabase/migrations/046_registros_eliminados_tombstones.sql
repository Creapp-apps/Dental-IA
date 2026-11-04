-- ============================================================
-- MIGRACIÓN 046: TOMBSTONES DE BAJAS (pacientes y turnos)
-- El pull incremental baja solo filas con `updated_at > since`, así que una
-- baja (DELETE) es invisible: el registro desaparece de la nube pero sobrevive
-- como "fantasma" en el IndexedDB de cada cliente hasta un resync total. Esta
-- tabla deja una lápida por cada baja para que el pull la propague y el cliente
-- borre esa fila de su base local.
-- ============================================================

-- 1. TABLA DE LÁPIDAS
CREATE TABLE IF NOT EXISTS public.registros_eliminados (
    id          BIGSERIAL PRIMARY KEY,
    entidad     TEXT NOT NULL CHECK (entidad IN ('pacientes', 'turnos')),
    registro_id UUID NOT NULL,
    tenant_id   UUID NOT NULL,
    deleted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El pull filtra por tenant + deleted_at: índice que lo cubre.
CREATE INDEX IF NOT EXISTS idx_registros_eliminados_tenant_fecha
    ON public.registros_eliminados(tenant_id, deleted_at);

-- 2. FUNCIÓN QUE REGISTRA LA LÁPIDA
-- SECURITY DEFINER: corre con los privilegios del dueño, así cualquier rol que
-- borre (admin vía RLS, service_role, o un CASCADE) puede dejar la lápida sin
-- chocar con la RLS de la tabla.
CREATE OR REPLACE FUNCTION public.registrar_eliminacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.registros_eliminados (entidad, registro_id, tenant_id)
    VALUES (TG_ARGV[0], OLD.id, OLD.tenant_id);
    RETURN OLD;
END;
$$;

-- 3. TRIGGERS AFTER DELETE
-- Pasan la entidad como argumento para reutilizar una sola función.
DROP TRIGGER IF EXISTS trg_tombstone_pacientes ON public.pacientes;
CREATE TRIGGER trg_tombstone_pacientes
    AFTER DELETE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.registrar_eliminacion('pacientes');

DROP TRIGGER IF EXISTS trg_tombstone_turnos ON public.turnos;
CREATE TRIGGER trg_tombstone_turnos
    AFTER DELETE ON public.turnos
    FOR EACH ROW EXECUTE FUNCTION public.registrar_eliminacion('turnos');

-- 4. RLS (defensa en profundidad: el pull usa service_role, que la saltea)
ALTER TABLE public.registros_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registros_eliminados_select" ON public.registros_eliminados;
CREATE POLICY "registros_eliminados_select" ON public.registros_eliminados
    FOR SELECT USING (tenant_id = get_user_tenant_id());

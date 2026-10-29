-- Migration 042: numeración de historia clínica garantizada en la DB.
--
-- Problema original: getNextNroHistoriaClinica() leía los pacientes con
-- .limit(5000) para hacer max+1 en JS, pero PostgREST corta la respuesta en
-- 1000 filas. Pasado el paciente nº 1000 por tenant, el máximo salía de un
-- subconjunto arbitrario (sin ORDER BY) y era más bajo que el real, así que el
-- candidato "max+1" ya existía y chocaba contra
-- pacientes_tenant_id_nro_historia_clinica_key (error 23505).
--
-- Solución definitiva: la numeración vive en un trigger BEFORE INSERT, no en la
-- app. Tres capas de garantía, a cualquier cantidad de filas y en cualquier
-- tenant:
--   1. El trigger dispara en TODA inserción (app, import, script SQL): ningún
--      camino puede saltearlo y olvidarse de numerar.
--   2. pg_advisory_xact_lock(hashtext(tenant_id)) serializa las altas
--      concurrentes del mismo tenant: dos transacciones nunca eligen el mismo
--      número. El lock se libera solo al cerrar la transacción.
--   3. El MAX se calcula con una agregación en la DB, sin tope de filas.
-- El UNIQUE (tenant_id, nro_historia_clinica) queda como backstop final: aunque
-- algo exótico pasara, la DB rechaza el duplicado en vez de guardarlo.
--
-- Semántica: sólo numera cuando nro_historia_clinica entra NULL o vacío. Si el
-- admin lo carga a mano, se respeta tal cual (y el UNIQUE valida que no choque).

BEGIN;

CREATE OR REPLACE FUNCTION public.asignar_nro_historia_clinica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next BIGINT;
BEGIN
    IF NEW.nro_historia_clinica IS NULL OR btrim(NEW.nro_historia_clinica) = '' THEN
        -- Serializa las altas concurrentes de este tenant.
        PERFORM pg_advisory_xact_lock(hashtext(NEW.tenant_id::text));

        -- [^0-9] (clase de caracteres, sin backslash) en vez de \D: evita el
        -- campo minado de escape de backslash entre archivo/paste/Postgres.
        SELECT COALESCE(
                   MAX(NULLIF(regexp_replace(nro_historia_clinica, '[^0-9]', '', 'g'), '')::BIGINT),
                   999
               ) + 1
        INTO v_next
        FROM public.pacientes
        WHERE tenant_id = NEW.tenant_id;

        -- greatest(4, length) y NO lpad(..., 4, ...) a secas: lpad TRUNCA cuando
        -- el texto supera el largo pedido (lpad('13902',4,'0') -> '1390'), lo que
        -- generaba un HC ya ocupado. Padea a 4 los chicos (574 -> 0574) sin
        -- recortar los de 5+ dígitos.
        NEW.nro_historia_clinica := lpad(v_next::TEXT, greatest(4, length(v_next::TEXT)), '0');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_nro_historia_clinica ON public.pacientes;
CREATE TRIGGER trg_asignar_nro_historia_clinica
    BEFORE INSERT ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.asignar_nro_historia_clinica();

-- Opcional a gran escala (millones de filas por tenant): convierte el MAX en un
-- lookup de índice en vez de un scan. Para consultorios (miles) no hace falta.
-- CREATE INDEX IF NOT EXISTS idx_pacientes_hc_num
--     ON public.pacientes (tenant_id, (regexp_replace(nro_historia_clinica, '\D', '', 'g')::BIGINT));

COMMIT;

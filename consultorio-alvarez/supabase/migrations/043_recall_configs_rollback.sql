-- ROLLBACK MIGRACIÓN 043: RECORDATORIOS DE RECALL POR TRATAMIENTO
DROP TRIGGER IF EXISTS trg_recall_configs_updated_at ON public.recall_configs;
DROP TABLE IF EXISTS public.recall_envios;
DROP TABLE IF EXISTS public.recall_configs;

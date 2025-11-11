-- Tornar tipo_extrato opcional na tabela extrato_status_log
ALTER TABLE public.extrato_status_log 
ALTER COLUMN tipo_extrato DROP NOT NULL;

COMMENT ON COLUMN public.extrato_status_log.tipo_extrato IS 'Tipo do extrato (Consolidado ou Ativos) - Campo opcional';
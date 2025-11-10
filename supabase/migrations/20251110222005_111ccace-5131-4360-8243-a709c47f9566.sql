-- Habilitar extensão pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Função para limpar logs antigos (>7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_extrato_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar registros com mais de 7 dias
  DELETE FROM public.extrato_status_log
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log para monitoramento
  RAISE NOTICE 'Limpeza de logs executada: % registros deletados com created_at < %', 
    deleted_count, NOW() - INTERVAL '7 days';
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.cleanup_old_extrato_logs() IS 
  'Deleta automaticamente logs de extratos com mais de 7 dias. Executa diariamente às 3h UTC via pg_cron.';

-- Agendar execução diária às 3h da manhã (UTC)
SELECT cron.schedule(
  'cleanup-extrato-logs-daily',
  '0 3 * * *',
  $$SELECT public.cleanup_old_extrato_logs();$$
);

-- Executar limpeza imediata para remover dados antigos existentes
SELECT public.cleanup_old_extrato_logs();
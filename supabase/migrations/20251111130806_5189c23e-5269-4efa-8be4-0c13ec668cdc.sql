-- Habilitar REPLICA IDENTITY para capturar dados completos durante updates
ALTER TABLE public.extrato_status_log REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.extrato_status_log;

-- Comentário explicativo
COMMENT ON TABLE public.extrato_status_log IS 
  'Logs de status de extratos - Publicado via Supabase Realtime para notificações em tempo real';
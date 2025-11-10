-- Criar tabela para logs de status de extratos
CREATE TABLE IF NOT EXISTS public.extrato_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Identificação do extrato
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  instituicao TEXT NOT NULL,
  competencia TEXT NOT NULL,
  tipo_extrato TEXT NOT NULL CHECK (tipo_extrato IN ('Consolidado', 'Ativos')),
  
  -- Status e detalhes
  status TEXT NOT NULL CHECK (status IN (
    'Extrato Recebido',
    'Processado', 
    'Ajustado',
    'Classificado',
    'Enviado',
    'Erro'
  )),
  
  -- Informações adicionais
  mensagem TEXT,
  detalhes JSONB,
  sistema_origem TEXT,
  
  -- Metadata
  webhook_timestamp TIMESTAMP WITH TIME ZONE,
  ip_origem TEXT
);

-- Índices para performance
CREATE INDEX idx_extrato_status_log_submission ON extrato_status_log(submission_id);
CREATE INDEX idx_extrato_status_log_cliente ON extrato_status_log(cliente);
CREATE INDEX idx_extrato_status_log_status ON extrato_status_log(status);
CREATE INDEX idx_extrato_status_log_created ON extrato_status_log(created_at DESC);
CREATE INDEX idx_extrato_status_log_competencia ON extrato_status_log(competencia);
CREATE INDEX idx_extrato_status_log_instituicao ON extrato_status_log(instituicao);
CREATE INDEX idx_extrato_status_log_tipo ON extrato_status_log(tipo_extrato);

-- RLS: Permitir leitura pública (para dashboards)
ALTER TABLE extrato_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to extrato_status_log"
ON extrato_status_log FOR SELECT
USING (true);

-- RLS: Apenas o service role pode inserir (webhook)
CREATE POLICY "Allow service role to insert"
ON extrato_status_log FOR INSERT
WITH CHECK (true);

-- Adicionar colunas à tabela submissions para rastrear último status
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS ultimo_status TEXT,
ADD COLUMN IF NOT EXISTS ultimo_status_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_submissions_ultimo_status ON submissions(ultimo_status);
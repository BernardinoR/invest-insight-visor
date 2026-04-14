
CREATE TABLE public.account_split_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cliente text NOT NULL,
  instituicao text NOT NULL,
  nome_conta_origem text NOT NULL DEFAULT '',
  nome_conta_destino text NOT NULL,
  percentual_padrao numeric DEFAULT 0,
  ativos_especificos jsonb DEFAULT '[]',
  ativo boolean DEFAULT true
);

ALTER TABLE public.account_split_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on account_split_configs" ON public.account_split_configs
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER update_account_split_configs_updated_at
  BEFORE UPDATE ON public.account_split_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

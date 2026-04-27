CREATE TABLE public.asset_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  instituicao text NOT NULL,
  ativo_original text NOT NULL,
  ativo_novo text,
  classe_ativo text,
  emissor text,
  taxa text,
  vencimento date,
  liquidez text,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_overrides_unique_key UNIQUE (cliente, instituicao, ativo_original)
);

ALTER TABLE public.asset_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on asset_overrides" ON public.asset_overrides
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_asset_overrides_updated_at
  BEFORE UPDATE ON public.asset_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_asset_overrides_lookup
  ON public.asset_overrides (cliente, instituicao, ativo_original)
  WHERE ativo = true;
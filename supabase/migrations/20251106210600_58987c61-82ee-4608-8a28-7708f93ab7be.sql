-- Criar tabela global de configurações de verificação
CREATE TABLE public.verification_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  correct_threshold NUMERIC(10, 2) DEFAULT 0.01 NOT NULL CHECK (correct_threshold >= 0),
  tolerance_value NUMERIC(10, 2) DEFAULT 2500.00 NOT NULL CHECK (tolerance_value >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT correct_less_than_tolerance CHECK (correct_threshold < tolerance_value)
);

-- Inserir o registro único com os valores padrão
INSERT INTO public.verification_settings (correct_threshold, tolerance_value)
VALUES (0.01, 2500.00);

-- Habilitar RLS
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Anyone can view verification settings"
  ON public.verification_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update verification settings"
  ON public.verification_settings FOR UPDATE
  USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_verification_settings_updated_at
  BEFORE UPDATE ON public.verification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
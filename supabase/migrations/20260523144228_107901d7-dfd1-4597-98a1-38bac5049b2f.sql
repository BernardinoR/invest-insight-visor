-- 1. Novas colunas
ALTER TABLE public.verification_results
  ADD COLUMN IF NOT EXISTS has_missing_liquidity BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_liquidity_count INTEGER NOT NULL DEFAULT 0;

-- 2. Drop da view dependente e da coluna gerada
DROP VIEW IF EXISTS public.verification_summary;
ALTER TABLE public.verification_results DROP COLUMN IF EXISTS all_green;

-- 3. Recriar all_green incluindo o novo check
ALTER TABLE public.verification_results
  ADD COLUMN all_green BOOLEAN GENERATED ALWAYS AS (
    patrimonio_status IN ('match', 'tolerance')
    AND has_unclassified = false
    AND has_missing_yield = false
    AND has_missing_liquidity = false
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_verification_all_green
  ON public.verification_results(client_name, all_green);

-- 4. Recriar a view
CREATE VIEW public.verification_summary
WITH (security_invoker = on)
AS
SELECT
  client_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE all_green = true) as green_count,
  COUNT(*) FILTER (WHERE all_green = false) as issue_count,
  COUNT(*) FILTER (WHERE patrimonio_status = 'no-data') as no_data_count,
  BOOL_AND(all_green) as client_all_green,
  MAX(verified_at) as last_verified
FROM public.verification_results
GROUP BY client_name;

-- 5. RPC com novo check
CREATE OR REPLACE FUNCTION public.calculate_verification(p_client_name text DEFAULT NULL::text, p_competencia text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tolerance NUMERIC;
  v_threshold NUMERIC;
  v_count INTEGER := 0;
  rec RECORD;
  v_soma NUMERIC;
  v_diff NUMERIC;
  v_status TEXT;
  v_total INTEGER;
  v_unclassified INTEGER;
  v_missing_yield INTEGER;
  v_new_assets INTEGER;
  v_missing_liquidity INTEGER;
  valid_classes TEXT[] := ARRAY[
    'CDI - Liquidez', 'CDI - Titulos', 'CDI - Fundos',
    'Inflação - Titulos', 'Inflação - Fundos',
    'Pré Fixado - Titulos', 'Pré Fixado - Fundos',
    'Multimercado',
    'Imobiliário - Ativos', 'Imobiliário - Fundos',
    'Ações - Ativos', 'Ações - ETFs', 'Ações - Fundos', 'Ações - Long Biased',
    'Private Equity/Venture Capital/Special Sits',
    'Exterior - Renda Fixa', 'Exterior - Ações',
    'COE', 'Criptoativos', 'Ouro', 'Alternativo'
  ];
BEGIN
  SELECT tolerance_value, correct_threshold
  INTO v_tolerance, v_threshold
  FROM verification_settings
  LIMIT 1;

  IF v_tolerance IS NULL THEN v_tolerance := 2500; END IF;
  IF v_threshold IS NULL THEN v_threshold := 0.01; END IF;

  FOR rec IN
    SELECT "Nome", "Competencia", "Instituicao", COALESCE("nomeConta", '') as nome_conta, "Moeda", "Patrimonio Final"
    FROM "ConsolidadoPerformance"
    WHERE (p_client_name IS NULL OR "Nome" = p_client_name)
      AND (p_competencia IS NULL OR "Competencia" = p_competencia)
      AND "Nome" IS NOT NULL
      AND "Competencia" IS NOT NULL
      AND "Instituicao" IS NOT NULL
  LOOP
    SELECT COALESCE(SUM("Posicao"), 0), COUNT(*)
    INTO v_soma, v_total
    FROM "DadosPerformance"
    WHERE "Nome" = rec."Nome"
      AND "Competencia" = rec."Competencia"
      AND "Instituicao" = rec."Instituicao"
      AND COALESCE("nomeConta", '') = rec.nome_conta;

    IF v_total = 0 THEN
      v_status := 'no-data';
      v_diff := NULL;
    ELSE
      v_diff := ABS(COALESCE(rec."Patrimonio Final", 0) - v_soma);
      IF v_diff < v_threshold THEN
        v_status := 'match';
      ELSIF v_diff < v_tolerance THEN
        v_status := 'tolerance';
      ELSE
        v_status := 'mismatch';
      END IF;
    END IF;

    SELECT COUNT(*)
    INTO v_unclassified
    FROM "DadosPerformance"
    WHERE "Nome" = rec."Nome"
      AND "Competencia" = rec."Competencia"
      AND "Instituicao" = rec."Instituicao"
      AND COALESCE("nomeConta", '') = rec.nome_conta
      AND ("Classe do ativo" IS NULL OR "Classe do ativo" NOT IN (SELECT unnest(valid_classes)));

    SELECT COUNT(*)
    INTO v_missing_yield
    FROM "DadosPerformance"
    WHERE "Nome" = rec."Nome"
      AND "Competencia" = rec."Competencia"
      AND "Instituicao" = rec."Instituicao"
      AND COALESCE("nomeConta", '') = rec.nome_conta
      AND (COALESCE(ativo_novo, false) = false)
      AND (COALESCE(rentabilidade_validada, false) = false)
      AND ("Ativo" IS NULL OR ("Ativo" NOT ILIKE '%Caixa%' AND "Ativo" NOT ILIKE '%Proventos%' AND "Ativo" NOT ILIKE '%Cash%'))
      AND (COALESCE("Rendimento", 0) = 0);

    SELECT COUNT(*)
    INTO v_new_assets
    FROM "DadosPerformance"
    WHERE "Nome" = rec."Nome"
      AND "Competencia" = rec."Competencia"
      AND "Instituicao" = rec."Instituicao"
      AND COALESCE("nomeConta", '') = rec.nome_conta
      AND COALESCE(ativo_novo, false) = true;

    SELECT COUNT(*)
    INTO v_missing_liquidity
    FROM "DadosPerformance"
    WHERE "Nome" = rec."Nome"
      AND "Competencia" = rec."Competencia"
      AND "Instituicao" = rec."Instituicao"
      AND COALESCE("nomeConta", '') = rec.nome_conta
      AND (
        "Vencimento" IS NULL
        OR "liquidez" IS NULL
        OR TRIM("liquidez") = ''
      );

    INSERT INTO verification_results (
      client_name, competencia, instituicao, nome_conta, moeda,
      patrimonio_status, patrimonio_final, soma_posicoes, diferenca,
      has_unclassified, unclassified_count,
      has_missing_yield, missing_yield_count,
      has_new_assets, new_asset_count,
      has_missing_liquidity, missing_liquidity_count,
      total_detailed_assets, verified_at
    ) VALUES (
      rec."Nome", rec."Competencia", rec."Instituicao", rec.nome_conta, rec."Moeda",
      v_status, rec."Patrimonio Final", v_soma, v_diff,
      v_unclassified > 0, v_unclassified,
      v_missing_yield > 0, v_missing_yield,
      v_new_assets > 0, v_new_assets,
      v_missing_liquidity > 0, v_missing_liquidity,
      v_total, NOW()
    )
    ON CONFLICT (client_name, competencia, instituicao, nome_conta)
    DO UPDATE SET
      moeda = EXCLUDED.moeda,
      patrimonio_status = EXCLUDED.patrimonio_status,
      patrimonio_final = EXCLUDED.patrimonio_final,
      soma_posicoes = EXCLUDED.soma_posicoes,
      diferenca = EXCLUDED.diferenca,
      has_unclassified = EXCLUDED.has_unclassified,
      unclassified_count = EXCLUDED.unclassified_count,
      has_missing_yield = EXCLUDED.has_missing_yield,
      missing_yield_count = EXCLUDED.missing_yield_count,
      has_new_assets = EXCLUDED.has_new_assets,
      new_asset_count = EXCLUDED.new_asset_count,
      has_missing_liquidity = EXCLUDED.has_missing_liquidity,
      missing_liquidity_count = EXCLUDED.missing_liquidity_count,
      total_detailed_assets = EXCLUDED.total_detailed_assets,
      verified_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 6. Recalcular tudo
SELECT public.calculate_verification(NULL, NULL);
-- Normalizar formato de data para Marco Alexandre Rodrigues Oliveira
-- Adicionar zero à esquerda em datas no formato D/MM/YYYY

-- Corrigir tabela DadosPerformance
UPDATE "DadosPerformance"
SET "Data" = 
  CASE 
    WHEN "Data" ~ '^\d{1}/\d{2}/\d{4}$' THEN '0' || "Data"
    ELSE "Data"
  END
WHERE "Nome" = 'Marco Alexandre Rodrigues Oliveira'
  AND "Data" ~ '^\d{1}/\d{2}/\d{4}$';

-- Corrigir tabela ConsolidadoPerformance
UPDATE "ConsolidadoPerformance"
SET "Data" = 
  CASE 
    WHEN "Data" ~ '^\d{1}/\d{2}/\d{4}$' THEN '0' || "Data"
    ELSE "Data"
  END
WHERE "Nome" = 'Marco Alexandre Rodrigues Oliveira'
  AND "Data" ~ '^\d{1}/\d{2}/\d{4}$';
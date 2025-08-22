-- Primeiro, vamos criar uma política para permitir leitura da tabela PoliticaInvestimentos
ALTER TABLE public."PoliticaInvestimentos" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura de todos os dados
CREATE POLICY "Permitir leitura de politicas de investimento" 
ON public."PoliticaInvestimentos" 
FOR SELECT 
USING (true);

-- Criar função para buscar clientes únicos
CREATE OR REPLACE FUNCTION public.get_unique_clients()
RETURNS TABLE(
  "Cliente" text,
  "Meta de Retorno" text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    p."Cliente",
    p."Meta de Retorno"
  FROM public."PoliticaInvestimentos" p
  WHERE p."Cliente" IS NOT NULL
  ORDER BY p."Cliente";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
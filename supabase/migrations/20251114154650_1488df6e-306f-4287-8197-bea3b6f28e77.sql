-- Add rentabilidade_validada column to DadosPerformance table
ALTER TABLE "DadosPerformance"
ADD COLUMN "rentabilidade_validada" BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN "DadosPerformance"."rentabilidade_validada" IS 
'Indica se um rendimento de 0% foi manualmente validado pelo usuário';
## Objetivo

Adicionar check "Sem Liquidez" à verificação de dados: um ativo é "sem liquidez" se em `DadosPerformance` o campo `Vencimento` **OU** o campo `liquidez` estiver vazio (lógica OR). Persistir contagem e flag em `verification_results` e incluir no `all_green`.

## Descobertas relevantes

- `verification_results.all_green` é uma coluna **GENERATED ALWAYS AS STORED** (não setada via INSERT). Para incluir o novo check é necessário **DROP + ADD** da coluna gerada.
- A definição atual de `all_green` considera apenas `patrimonio_status IN ('match','tolerance') AND NOT has_unclassified AND NOT has_missing_yield`. Não inclui `has_new_assets` (apesar de o pedido sugerir o contrário). Vou **preservar** a lógica atual e apenas **somar** `AND NOT has_missing_liquidity`.
- A função existente é `calculate_verification(p_client_name text, p_competencia text)` (overload com `text, text`). Vou atualizar essa versão e também a versão `(p_client_name text)` para manter consistência.
- Colunas em `DadosPerformance` usadas pelos outros checks: `"Nome"`, `"Competencia"`, `"Instituicao"`, `"nomeConta"`. `Vencimento` é `date` (não precisa de TRIM, basta `IS NULL`); `liquidez` é `text` (usar `IS NULL OR TRIM(...) = ''`).
- O escopo de contagem usado pelos outros checks (missing_yield, unclassified, new_assets) é por **conta** (Nome+Competencia+Instituicao+nomeConta). Vou seguir o mesmo escopo para `missing_liquidity_count` — mais consistente com a estrutura da tabela e com como o CRM exibe os resultados (uma linha por conta). O snippet do pedido filtra só por cliente+competência, mas a tabela é granular por conta; aplicar o mesmo escopo evita inflar contagens.

## Migração SQL

```sql
-- 1. Novas colunas
ALTER TABLE public.verification_results
  ADD COLUMN has_missing_liquidity BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN missing_liquidity_count INTEGER NOT NULL DEFAULT 0;

-- 2. Recriar all_green incluindo o novo check
ALTER TABLE public.verification_results DROP COLUMN all_green;
ALTER TABLE public.verification_results
  ADD COLUMN all_green BOOLEAN GENERATED ALWAYS AS (
    patrimonio_status IN ('match', 'tolerance')
    AND has_unclassified = false
    AND has_missing_yield = false
    AND has_missing_liquidity = false
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_verification_all_green
  ON public.verification_results(client_name, all_green);
```

## Atualização da RPC `calculate_verification`

Em ambas as assinaturas (`(text)` e `(text, text)`), dentro do loop por conta, adicionar:

```sql
SELECT COUNT(*) INTO v_missing_liquidity
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
```

E incluir no `INSERT ... ON CONFLICT DO UPDATE`:
- colunas: `has_missing_liquidity`, `missing_liquidity_count`
- valores: `v_missing_liquidity > 0`, `v_missing_liquidity`
- no `DO UPDATE SET`: atualizar ambas

`all_green` não entra no INSERT (é gerada).

## Compatibilidade

- Nenhuma coluna existente é removida ou renomeada.
- `all_green` mantém o mesmo nome/tipo — só ganha uma condição a mais. CRM continua funcionando.
- `src/integrations/supabase/types.ts` será regenerado automaticamente após a migração; nenhum código TS muda.

## Critério de aceite

```sql
SELECT client_name, competencia, missing_liquidity_count,
       has_missing_liquidity, all_green
FROM verification_results
LIMIT 10;
```
Contas com ao menos um ativo sem `Vencimento` ou sem `liquidez` devem ter `missing_liquidity_count > 0` e `has_missing_liquidity = true`. `all_green` passa a ser `false` quando esse novo check falha.

## Execução

Tudo via uma única migração Supabase (DDL + `CREATE OR REPLACE FUNCTION` para as duas assinaturas). Depois rodar `SELECT calculate_verification(NULL, NULL);` (ou equivalente) para repopular os resultados.

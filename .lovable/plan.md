## Bug

Na função `public.calculate_verification(p_client_name text, p_competencia text)`, o contador `v_missing_liquidity` não considera `liquidez_fechada`. Fundos legitimamente fechados (FIP/VC/PE) marcados com `liquidez_fechada = true` seguem contando como "sem liquidez" — 94 linhas em produção afetando 6 clientes (evidência: Bianca Monique, 06/2026, XP, "XP Balanceado FMP-FGTS", posição R$ 17.810,82, único ativo sem campos → `missing_liquidity_count = 1`).

## Correção

Migration com **um único `CREATE OR REPLACE FUNCTION`** da assinatura de 2 argumentos, copiado **byte a byte** do `pg_get_functiondef` atual (verificado nesta sessão — oid 224884), alterando **apenas** o bloco do SELECT em `v_missing_liquidity` (linhas 218–224 do texto atual) para adicionar uma condição:

```sql
AND COALESCE(liquidez_fechada, false) = false
```

Nada mais muda:
- Assinatura preservada: `(p_client_name text DEFAULT NULL, p_competencia text DEFAULT NULL)`.
- `SECURITY DEFINER`, `SET search_path = 'public'`, `LANGUAGE plpgsql` preservados.
- `valid_classes`, thresholds, `v_unclassified`, `v_missing_yield`, `v_new_assets`, cálculo de `v_status`/`v_diff`, INSERT e ON CONFLICT permanecem idênticos.
- A versão de 1 argumento (`calculate_verification(text)`, oid 224878) **não é tocada**.
- Nenhuma migration de tabela — `liquidez_fechada boolean` já existe em `DadosPerformance`.

## Pós-aplicação

1. Recalcular só o afetado (não mexer no resto):
   ```sql
   SELECT public.calculate_verification(NULL::text, NULL::text);
   ```
2. Validar caso positivo:
   ```sql
   SELECT competencia, instituicao, missing_liquidity_count, all_green
   FROM verification_results
   WHERE client_name = 'Bianca Monique Soares Marcellini' AND competencia = '06/2026';
   ```
   Esperado: `missing_liquidity_count = 0`, `all_green = true`.
3. Contra-prova: contar em 06/2026 ativos com todos os campos de liquidez vazios E `liquidez_fechada` falsa/nula — precisa continuar em 47.

## Fora do escopo

Contadores `unclassified_count`, `missing_yield_count`, `new_asset_count`, `patrimonio_status`, versão 1-arg da função, schema de qualquer tabela, código do frontend.

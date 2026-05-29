## Fix `calculate_verification` — lógica do check "Sem Liquidez"

### Problema
Na função `calculate_verification(p_client_name, p_competencia)`, o count `v_missing_liquidity` usa `OR` entre falta de `Vencimento` e falta de `liquidez`, marcando praticamente 100% dos ativos como problema (ações/fundos nunca têm vencimento).

### Correção
Trocar `OR` por `AND`: só conta quando faltam **os dois** (sem vencimento E sem liquidez).

```sql
AND "Vencimento" IS NULL
AND ("liquidez" IS NULL OR TRIM("liquidez") = '')
```

### Passos
1. **Migration** — `CREATE OR REPLACE FUNCTION public.calculate_verification(text, text)` com o bloco de liquidez corrigido. Nenhuma outra contagem é alterada (patrimônio, não classificados, sem rendimento, ativos novos ficam iguais). A versão de 1 argumento não é tocada.
2. **Recalcular dados existentes** rodando `SELECT public.calculate_verification(NULL::text, NULL::text);` após a migration ser aplicada, para atualizar todas as linhas de `verification_results` com a nova lógica.

### Validação
Após recálculo, em 04/2026 `missing_liquidity_count` agregado deve cair de 836 → 343 (os 274 ativos com vencimento mas sem liquidez deixam de contar).

### Sem mudanças de frontend
Nenhum arquivo TS/TSX é tocado — colunas de `verification_results` permanecem idênticas.

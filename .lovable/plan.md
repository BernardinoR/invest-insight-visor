## Bug

O predicado "cash-like" usa `includes('caixa'|'cash'|'proventos')` no front e `ILIKE '%…%'` no `v_missing_yield` da RPC. Isso pega 20 ativos reais (fundos V8/Trend/AMW Cash, ação CXSE3, LCIs da Caixa) como se fossem linhas sintéticas. Efeito medido: 15 pendências de liquidez em 12 clientes (desde 04/2026) contadas pela RPC e invisíveis na tela — impossíveis de resolver. Só 3 linhas são realmente sintéticas: `Caixa`, `Proventos`, `Cash` (match exato do nome normalizado).

## Fix

Um único predicado, match exato, aplicado nos dois lados.

### Parte 1 — `src/pages/DataManagement.tsx`

Adicionar helper no topo do módulo:

```ts
const LINHAS_SINTETICAS = ['caixa', 'proventos', 'cash'];
const isLinhaSintetica = (ativo: unknown): boolean =>
  LINHAS_SINTETICAS.includes(String(ativo ?? '').trim().toLowerCase());
```

Substituir as 6 ocorrências de `isCashLike` (linhas aprox. 2767, 2925, 3064, 5208, 6067 e a condicional de render em 6164) por `isLinhaSintetica(item.Ativo)` (ou o campo local equivalente). Nada mais muda na lógica ao redor — inclusive a mensagem "Ativo de caixa — não exige liquidez/vencimento" continua, apenas passa a aparecer só nas 3 linhas certas.

Verificação prévia: `rg "isCashLike|ativoNorm\.includes" src/pages/DataManagement.tsx` para confirmar as ocorrências reais antes de trocar; se o front usar outra variável normalizada, adaptar o call site preservando o mesmo predicado.

### Parte 2 — RPC `calculate_verification(text, text)`

Base **obrigatória**: `pg_get_functiondef` da versão de produção (2 args), NÃO a migration do repo (que está desatualizada e ainda lê apenas a coluna legada `liquidez`). Preservar tudo — assinatura, `SECURITY DEFINER`, `SET search_path = 'public'`, `valid_classes`, thresholds, blocos de `v_unclassified`/`v_new_assets`, leitura de `liquidez_corridos`/`liquidez_uteis`/`liquidez_fechada`, INSERT e ON CONFLICT.

Alterar somente dois predicados:

(a) No `SELECT ... INTO v_missing_liquidity`, adicionar linha:
```sql
AND lower(btrim("Ativo")) NOT IN ('caixa', 'proventos', 'cash')
```

(b) No `SELECT ... INTO v_missing_yield`, trocar
```sql
AND ("Ativo" IS NULL OR ("Ativo" NOT ILIKE '%Caixa%' AND "Ativo" NOT ILIKE '%Proventos%' AND "Ativo" NOT ILIKE '%Cash%'))
```
por
```sql
AND ("Ativo" IS NULL OR lower(btrim("Ativo")) NOT IN ('caixa', 'proventos', 'cash'))
```

A versão de 1 argumento da função não é tocada.

## Pós-aplicação

1. Rodar `SELECT public.calculate_verification(NULL::text, NULL::text);` para reprocessar (o cron não recalcula verificação sozinho).
2. Validar caso-âncora: Luciano Kleindinsk Gama / XP / `Monica` / 06/2026 deve mostrar `V8 Cash FIC FIRF` como pendente na tela E manter `missing_liquidity_count >= 1`.
3. Contra-provas em competências ≥ 04/2026:
   - total de `missing_liquidity_count` ≈ 323 (era 326 — as 3 linhas `Cash` puras saem);
   - `missing_yield_count` ganha ~0 pendências novas (na base inteira, ~2);
   - tela e `verification_results` batem por combinação cliente/instituição/nomeConta/competência.

## Fora do escopo

Preencher liquidez dos 12 fundos afetados no `RAG_Processador` (inclusive `V8 Cash FIC FIRF`, id 2325) — trabalho de dados, feito pelo usuário depois do deploy. `v_unclassified`, `v_new_assets`, `patrimonio_status`, schema de tabelas, versão de 1-arg da RPC, política/RLS: nada disso muda.

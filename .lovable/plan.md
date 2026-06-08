## Integração com a API Mais Retorno

Adicionar um novo modo de cálculo de rentabilidade que consulta a [API Mais Retorno](https://developers.maisretorno.com/) (`https://data.maisretorno.com/mr-data/v4/api`) para fundos de investimento e títulos públicos / Tesouro Direto. Útil principalmente quando o ativo é novo (`ativo_novo = true`) ou o `Rendimento` veio zerado/errado do extrato.

### 1. Segredo

- Guardar `MAISRETORNO_API_KEY` via secret. Header usado server-side: `X-Api-Key: <key>`.
- Nunca expor no frontend — toda chamada passa por edge function.

### 2. Identificador do ativo (`mr_identifier`)

A API usa identifiers `ativo:mercado`:
- Fundos: `<cnpj>:fi` (ou `<cnpj>-<subclasse>:fi`)
- Tesouro Direto: `<slug>:td` (ex.: `tesouro-selic-18-06-2008:td`)
- Títulos públicos: `<slug>:tp`

**Persistência**: nova coluna `mr_identifier text` em `RAG_Processador` (chave do ativo já cadastrada lá) — assim o identifier fica vinculado ao ativo e é reutilizado em todas as competências. Sem alteração em `DadosPerformance`.

### 3. Edge function `get-maisretorno-return`

Nova função em `supabase/functions/get-maisretorno-return/index.ts`, espelhando o padrão de `get-treasury-return`:

Entrada (POST JSON):
```
{ identifier: string, competencia: "MM/YYYY" }
```

Fluxo:
1. Valida input + auth (verify_jwt=false, CORS padrão).
2. Calcula `start_date` = primeiro dia do mês, `end_date` = último dia do mês.
3. `GET /quotes/{identifier}?start_date=...&end_date=...` com `X-Api-Key`.
4. Ordena cotações por data, pega primeira (`c0`) e última (`cN`).
5. Retorna `{ identifier, nicename, competencia, rentabilidadeMensal: (cN-c0)/c0*100, cotacaoInicial, cotacaoFinal, dias: quotes.length }`.
6. Erros tratados com mensagens claras (sem quotes no período, 401/403, etc.).

Observação: para fundos com cota PL diária a fórmula de retorno mensal via `c` (cota de fechamento) funciona direto. Para títulos públicos a API também devolve `c` por dia — mesmo cálculo.

### 4. UI — `src/pages/DataManagement.tsx`

**Novo modo no calculador** (junto de `auto | manual | custom | market | treasury`):
- Acrescenta `'maisretorno'` em `calculatorMode`.
- Botão "Mais Retorno" só fica habilitado quando a classe do ativo for compatível (qualquer `*Fundos*`, `Multimercado`, `Pré Fixado - Titulos`, `Inflação - Titulos`, `CDI - Titulos`, etc.).

**Painel do modo**:
- Campo `Identificador Mais Retorno` (pré-preenche com `mr_identifier` do RAG; placeholder mostra o formato esperado por classe).
- Em modo `single`, com `cnpj` já presente no RAG, sugere `<cnpj>:fi` automaticamente.
- Botão "Buscar rentabilidade" → chama a edge function.
- Mostra resultado: cotação inicial, cotação final, rentabilidade mensal calculada, e botão "Aplicar" que grava em `DadosPerformance.Rendimento` (+ marca `rentabilidade_validada = true`).
- Checkbox "Salvar identificador no RAG" (default ligado) — atualiza `RAG_Processador.mr_identifier` para reuso.

**Bulk**: aplica para todos os selecionados que tenham `mr_identifier` (no RAG ou explícito). Ativos sem identifier ficam como "skipped" com mensagem.

**Modo `auto` (fallback)**: se o ativo for fundo/título e tiver `mr_identifier` salvo, `auto` tenta Mais Retorno antes do mercado/treasury já existentes. Mantém comportamento atual quando não houver identifier.

### 5. Migração

```sql
ALTER TABLE public."RAG_Processador" ADD COLUMN IF NOT EXISTS mr_identifier text;
```

(sem alterar `calculate_verification` — esta feature não muda a contagem de alertas.)

### 6. Memória

Atualizar `mem://features/calculator/market-mode-logic` ou criar `mem://features/calculator/maisretorno-mode` documentando: endpoint, identifier por classe, fórmula (primeira × última cota do mês), persistência do identifier no RAG, e que o modo é o preferido quando o ativo é novo.

### Fora de escopo

- Endpoints `stats`, `wallet-detail`, `search` (podem entrar depois — `search` seria útil para auto-descobrir identifier por nome do ativo, mas fica para um próximo passo).
- Cálculo via PL/quotas para subclasses específicas (usa identifier direto que o usuário cola).
- Mudança no n8n / fluxos externos.

### Perguntas de validação

1. Confirma usar `Quotes` (primeira × última do mês) como fórmula? Alternativa seria `Stats` com `start_date`/`end_date` cobrindo o mês — mais simples mas depende do que a API retorna como `profitability` mensal.
2. O identifier deve mesmo morar em `RAG_Processador` (vinculado ao ativo), ou prefere uma coluna `mr_identifier` também em `DadosPerformance` para casos pontuais?

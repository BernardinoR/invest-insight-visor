## Correções Mais Retorno

1. **Edge function** `supabase/functions/get-maisretorno-return/index.ts`:
   - **Normalizar identifier**: aceitar CNPJ formatado (`26.491.419/0001-87`) removendo `.`, `/`, `-` → `26491419000187:fi`; 14 dígitos puros → `:fi`; slug → `:td`; já com `:mercado` → manter.
   - **Janela de datas**: começar no **último dia do mês anterior** (não no dia 1º do mês) para usar a cota de fechamento anterior como base, e terminar no último dia do mês da competência. Mesmo padrão de `get-stock-return`.
   - Logar `{rawIdentifier, identifierFinal, startDate, endDate}` para debug.
   - Mensagens de erro mais descritivas (incluir o valor recebido).

2. **Frontend** `src/pages/DataManagement.tsx` (`handleFetchMaisRetornoData`): trocar `supabase.functions.invoke` por `fetch` direto com header `apikey`, para ler o JSON `{error}` mesmo em 4xx/5xx e exibir a mensagem real no toast.

3. **Redeploy** + teste via curl com CNPJ formatado.

## Detalhes técnicos

- Cálculo continua `(cotaFinal - cotaInicial) / cotaInicial * 100`, mas agora `cotaInicial` é a cotação do último dia útil do mês anterior (primeira cotação válida retornada no range estendido).
- Atualizar memória `mem://features/calculator/maisretorno-mode` com a nova lógica de janela.
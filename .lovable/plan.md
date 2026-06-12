## Fallback de sufixo no `get-stock-return` para tickers de Londres/Amsterdam

A maioria dos ativos (VWRA, AGGU, IGLN, SXRV, etc.) é de bolsas europeias e o Yahoo só responde com sufixo. Vamos tentar sufixos automaticamente quando o ticker puro der 404.

### Comportamento
1. Tenta primeiro o ticker como veio (ex.: `VWRA`).
2. Se vier **404** ("symbol may be delisted"), tenta na ordem:
   - `<ticker>.L` (London Stock Exchange)
   - `<ticker>.AS` (Euronext Amsterdam — é o que o Yahoo usa para AL/Amsterdam)
3. Primeira tentativa que voltar 200 com dados é usada para o cálculo.
4. Se todas falharem, retorna o erro original (404 / sem dados).
5. Outros status (429, 5xx) **não** disparam fallback — propagam o erro como hoje (limite de rate, etc.).

### Resposta
Adicionar `resolvedTicker` no JSON de resposta (ex.: `VWRA.L`) para o frontend poder mostrar/logar qual variação funcionou. Sem mudança no frontend agora — só o cálculo já beneficia.

### Técnico
- Em `supabase/functions/get-stock-return/index.ts`, extrair a chamada Yahoo para uma função `tryFetch(symbol)` que retorna `{ ok, status, data }`.
- Loop sobre `[ticker, ticker + '.L', ticker + '.AS']`, pulando duplicatas se o ticker já tiver sufixo (`.` no nome).
- Manter logs por tentativa para facilitar debug.
- Sem alterações no schema, no RAG ou no `RolloverDialog`. O passo de gravar o ticker resolvido no RAG fica para depois, como o usuário sinalizou.

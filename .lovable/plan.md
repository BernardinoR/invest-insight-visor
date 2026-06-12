## Adicionar fallback de Frankfurt no `get-stock-return`

Estender a lista de sufixos tentados quando o Yahoo retorna 404, incluindo as bolsas alemãs.

### Sufixos do Yahoo para Frankfurt
- `.DE` → **Xetra** (é onde a maioria dos ETFs alemães negocia; iShares, Xtrackers, etc.)
- `.F` → **Frankfurt (Börse Frankfurt)** — alguns ativos só aparecem aqui.

### Nova ordem de fallback
1. `<ticker>` (como veio)
2. `<ticker>.L` (Londres)
3. `<ticker>.AS` (Amsterdam)
4. `<ticker>.DE` (Xetra)
5. `<ticker>.F` (Frankfurt)

Mantém a regra: se o ticker já tiver `.` no nome, não acrescenta sufixos. Só 404 dispara fallback; 429/5xx continuam propagando como hoje.

### Técnico
- Em `supabase/functions/get-stock-return/index.ts`, alterar o array `candidates` para incluir `.DE` e `.F` depois de `.AS`.
- Nenhuma mudança no frontend nem no RAG.

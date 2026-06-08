## Problema

O erro de CORS no preflight (`Response to preflight request doesn't pass access control check: It does not have HTTP ok status`) acontece quando o navegador faz OPTIONS e a função **não responde 200**. Verifiquei os logs de `get-maisretorno-return` e **não há nenhum log** — ou seja, a função nunca foi de fato deployada/iniciada no Supabase, apesar do código existir em `supabase/functions/get-maisretorno-return/index.ts` e o secret `MAISRETORNO_API_KEY` já estar configurado.

## Plano

1. **Forçar deploy** de `get-maisretorno-return` via `supabase--deploy_edge_functions`.
2. **Testar com curl** (OPTIONS e POST) usando `supabase--curl_edge_functions` para confirmar que a função responde 200 no preflight e processa o corpo.
3. **Checar logs** após o teste para garantir que está chamando a API Mais Retorno corretamente.
4. Se o teste falhar por outro motivo (ex.: 401 da API, identifier inválido), ajustar a função; mas o erro de CORS atual será resolvido apenas com o deploy.

## Detalhes técnicos

- O código atual já trata OPTIONS retornando `{ headers: corsHeaders }` com status 200 — não precisa de mudança no código.
- `supabase/config.toml` já tem `[functions.get-maisretorno-return] verify_jwt = false`.
- Sem mudanças de schema. Sem mudanças no frontend.

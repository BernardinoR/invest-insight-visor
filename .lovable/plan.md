## Modo Yahoo no RolloverDialog ("Avançar")

Adicionar um novo modo de cálculo **Yahoo** que busca o rendimento mensal do ativo direto pela API do Yahoo Finance (edge function `get-stock-return`) para a nova competência.

### Comportamento
- Disponível tanto no **"Aplicar a todos"** quanto no seletor **por ativo**.
- Para cada ativo afetado:
  - Usa o campo `Ativo` como ticker, **sem nenhum sufixo** (não acrescenta `.SA`). O usuário confirmou que o ticker já vem certo (BR como `PETR4.SA` se for o caso, exterior como `AAPL` puro).
  - Chama `supabase.functions.invoke('get-stock-return', { body: { ticker, competencia: novaCompetencia } })`.
  - Usa `monthlyReturn` (em %) como `rendimento` e calcula `novaPosicao = Posicao * (1 + monthlyReturn/100)`.
- **Loading**: enquanto busca, mostra indicador no(s) ativo(s) e desabilita Salvar.
- **Erro / sem dado / 429**: toast de aviso por ativo que falhou, mantém `rendimento = 0` e troca o modo daquele ativo para `Manual` para o usuário ajustar.
- O parâmetro do modo Yahoo não tem input (igual ao CDI puro) — `renderParameterInput` retorna `null`.

### Técnico
- `CalcMode` ganha `'Yahoo'`; adicionar em `MODE_LABELS` como `'Yahoo'`.
- Adicionar `<SelectItem value="Yahoo">Yahoo</SelectItem>` no `renderModeSelect`.
- Nova função `fetchYahooRendimento(ticker, competencia)` que invoca a edge function e retorna `{ rendimento, error }`.
- `recalcAtivo`, `handleUpdateAtivo` e `handleApplyAll` passam a ser **async** quando o modo é Yahoo (fluxo separado: busca → atualiza estado → reaplica resgate).
- Estado de loading por ativo: `Set<number>` de ids em busca; bloqueia o botão Salvar enquanto houver pendência.
- Nenhuma mudança na edge function, no schema, nem no fluxo de salvamento.

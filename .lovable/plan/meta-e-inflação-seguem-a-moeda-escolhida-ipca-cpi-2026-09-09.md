# Meta e inflação seguem a moeda escolhida (IPCA ↔ CPI)

Hoje, mesmo trocando o botão de R$ para US$, a inflação usada em todo o painel continua a brasileira (IPCA) e a meta continua "IPCA+6%". A ideia é que, no modo dólar, a referência passe a ser a inflação americana (CPI) e a meta apareça como "CPI+6%", mantendo o mesmo prêmio anual.

## O que muda para o usuário

- Ao trocar para US$, tudo que hoje diz IPCA passa a dizer CPI: a linha do gráfico de performance, a caixinha de seleção do indicador, o texto do tooltip e o cartão "vs inflação".
- A meta do cliente (ex.: IPCA+6%) passa a ser exibida e calculada como CPI+6% — o percentual de 6% ao ano continua o mesmo.
- As comparações de risco (retornos acima/abaixo da meta, Sortino, classificações de desempenho) passam a usar a meta em dólar quando o painel está em dólar.
- Ao voltar para R$, tudo volta ao IPCA, exatamente como hoje.
- O relatório em PDF continua em reais com IPCA (sem mudança nesta etapa).

## Como funciona

- A inflação americana vem do órgão oficial de estatísticas do trabalho dos EUA (CPI de todos os itens urbanos), buscada mês a mês, sem necessidade de cadastro ou chave.
- Se essa busca falhar, o painel simplesmente não mostra a linha de inflação nem a meta no modo dólar (em vez de mostrar número errado), e o modo em reais segue intacto.

## Detalhes técnicos

1. Nova edge function `get-us-cpi`
   - Proxy para a API pública do BLS (`https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0`), evitando problemas de CORS e limite por IP do navegador.
   - Recebe `startYear`/`endYear`, devolve `{ "MM/YYYY": variacaoMensalDecimal }` calculada a partir do índice (índice do mês / índice do mês anterior − 1).
   - Registrar em `supabase/config.toml` com `verify_jwt = false` (padrão das funções existentes).

2. `src/hooks/useMarketIndicators.tsx`
   - Passa a consumir `useCurrency()` e a refazer a carga quando `currency` muda (adicionar `currency` ao `useEffect`).
   - Quando `currency === 'USD'`: busca a série de CPI pela edge function em vez do IPCA do BCB; a mesma estrutura de retorno é mantida (`ipca`, `accumulatedIpca`, `clientTarget`, `accumulatedClientTarget`) para não quebrar consumidores.
   - `fetchClientTarget`: além do valor numérico, expor `inflationLabel` ('IPCA' | 'CPI') e um `metaLabel` derivado (troca o prefixo IPCA por CPI no texto da meta quando em USD). Ampliar o regex de extração para aceitar `IPCA+X`, `IPCA + X` e também `CPI+X`.
   - `calculateMonthlyTarget` permanece igual — só a série de inflação de entrada muda.

3. `src/components/charts/PerformanceChart.tsx`
   - Trocar os textos fixos "IPCA" (checkbox linha ~639, tooltip ~1034, cartão "vs IPCA" ~1464) pelo label dinâmico do hook.
   - Usar `metaLabel` no lugar de `clientTarget.meta` nos textos de meta (~624 e ~1426).

4. `src/components/InvestmentDashboard.tsx`
   - Trocar o texto fixo `'± IPCA'` (linha ~1420) pelo label dinâmico.

5. Sem mudanças de schema, sem mudanças no `ClientReportPDF`/`GenerateReportButton`, e sem alterar a lógica de conversão de valores do `CurrencyContext`.

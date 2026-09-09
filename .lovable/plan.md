# Inflação americana (CPI) via FRED

## Contexto

O Yahoo Finance só publica preços de ativos (ações, índices, moedas) — ele não tem
índices de inflação. Então CPI não sai do Yahoo.

O FRED (banco central de St. Louis) publica o CPI americano e é uma fonte melhor que
a atual: os últimos meses aparecem lá antes, e é mais estável que a API do BLS que
hoje está falhando em out/nov de 2025.

## O que muda

A busca da inflação em dólar passa a tentar o FRED primeiro. Se o FRED não responder,
continua usando o BLS como reserva — nada de tela em branco.

Resultado prático: o gráfico e os cartões em dólar passam a mostrar os meses mais
recentes de inflação (incluindo os que hoje ficam vazios), e a meta continua sendo
CPI + o mesmo percentual já cadastrado.

## Detalhes técnicos

- `supabase/functions/get-us-cpi/index.ts`:
  - Fonte primária: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS`
    (série CPI-U, all items, not seasonally adjusted — mesma base do `CUUR0000SA0`
    usado hoje). Endpoint CSV público, sem chave de API.
  - Parse do CSV: linhas `observation_date,CPIAUCNS`, valor `.` = mês sem publicação
    (descartar). Montar `indexByKey` (`YYYY-MM` -> índice) e reaproveitar o cálculo
    de variação mensal já existente (`valor / valor_anterior - 1`).
  - Filtrar pelo intervalo `startYear`/`endYear` recebido, buscando um ano extra para
    trás para ter o índice anterior do primeiro mês.
  - Se o fetch do FRED falhar (rede, HTTP != 200, CSV sem linhas válidas), cair no
    fluxo BLS atual sem alterar o contrato de resposta.
  - Resposta mantém o formato `{ series, monthly }` mais um campo `source`
    (`"FRED"` ou `"BLS"`) para diagnóstico; o front ignora campos extras.
  - Validação de intervalo, CORS e logs permanecem como estão.
- Nenhuma mudança em `useMarketIndicators.tsx`, `PerformanceChart.tsx` ou
  `InvestmentDashboard.tsx` — o contrato da função não muda.
- Redeploy da edge function e teste com 2022–2026 e 2025–2026, conferindo que
  out/2025 e nov/2025 agora vêm preenchidos.

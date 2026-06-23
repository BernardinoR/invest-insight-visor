## Corrigir Movimentações/Impostos no PDF + linha de Impostos separada + check de conferência

### Bugs encontrados

1. **Sinal de Impostos é inconsistente** entre instituições no `ConsolidadoPerformance`. Ex: XP guarda `-9.775,51`, BTG guarda `+979,97`. O atual `mov - impostos` ora subtrai, ora soma. Solução: sempre usar `abs(impostos)`.

2. **Impostos estão somados dentro de Movimentações** — o usuário quer ver as duas linhas separadas no PDF.

3. **Sem verificação**: PI + Mov + GF − |Imp| precisa bater com PF; se não bater, é erro nos dados e precisa avisar.

### Layout novo da tabela "O Mês"

```
O MÊS

Patrimônio em 30/04/2026                       R$ 3.690.907,88
Movimentações                                  R$    49.909,81
Impostos                                       R$    -10.755,48
Rendimento (30/04 → 31/05)         +0,94%      R$    34.535,10
──────────────────────────────────────────────────────────────
Patrimônio em 31/05/2026                       R$ 3.764.510,03
```

Onde:
- **Movimentações** = `SUM(Movimentação)` (aportes − resgates brutos, sem mexer em imposto)
- **Impostos** = `−SUM(|Impostos|)` (sempre mostrado negativo, sem ambiguidade de sinal)
- **Rendimento** = `SUM(Ganho Financeiro)` (continua como hoje)
- **PF** = soma direta de `SUM(Patrimonio Final)` da `ConsolidadoPerformance` (verdade absoluta)

### Verificação de consistência

Após calcular, checar:
`abs(PF − (PI + Movimentações + Rendimento + Impostos)) ≤ max(R$ 50, 0,01% × PF)`

- Se passar: sem aviso.
- Se falhar: rodapé do PDF ganha uma linha discreta tipo *"Atenção: diferença de R$ X,XX entre o patrimônio final e os componentes do mês. Verifique os dados de [instituições com maior delta]."* E um `console.warn` no app pra debug.

### Mudanças concretas

1. **`src/components/GenerateReportButton.tsx`**
   - Acumular `impostos` por competência usando `Math.abs(Number(r["Impostos"]) || 0)` (resolve sinal misto).
   - Acumular `mov` puro (sem subtrair impostos).
   - Calcular `diferencaCheck = pf − (pi + mov + gf − impostos_abs)`.
   - Passar quatro campos pro PDF: `patrimonioInicial`, `movimentacao`, `impostos` (negativo), `ganho`, `patrimonioFinal`, `diferencaCheck`.
   - Rendimento % = `gf / (pi + max(0, mov))` (mantido).

2. **`src/components/ClientReportPDF.tsx`**
   - Adicionar campo `impostos: number` (sempre ≤ 0) e `diferencaCheck: number` no `ReportData.mes`.
   - Inserir linha "Impostos" entre "Movimentações" e "Rendimento", em cor neutra/cinza (não vermelho — imposto não é rendimento ruim, é só dedução).
   - Se `|diferencaCheck| > tolerância`, mostrar nota fina logo abaixo da tabela do mês: *"Diferença de R$ X,XX em relação aos componentes."*

### Fora do escopo

- Corrigir o sinal de Impostos no banco (responsabilidade do pipeline n8n, não do app).
- Mudar `useMarketIndicators` ou o cálculo do acumulado (já está OK).
- Layout dos outros blocos.

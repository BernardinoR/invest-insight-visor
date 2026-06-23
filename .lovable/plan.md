## PDF como duas tabelinhas limpas — com datas e dois totalizadores no acumulado

### Layout

```
Clenilton Martins Lopes
Junho de 2026


O MÊS

Patrimônio em 31/05/2026                       R$ 1.234.567,89
Movimentações                                  R$    50.000,00
Rendimento (31/05 → 30/06)          +1,21%     R$    14.500,00
──────────────────────────────────────────────────────────────
Patrimônio em 30/06/2026                       R$ 1.299.067,89


DESDE O INÍCIO  ·  Janeiro/2025 · 18 meses

Carteira                                                12,45%
IPCA                                                     8,12%
Meta (IPCA + 4%)                                        13,30%
──────────────────────────────────────────────────────────────
Acima da meta                                           -0,85%
Acima da inflação                                       +4,33%
```

### Regras de data

- **Data inicial** = último dia do mês anterior à competência → "Patrimônio em DD/MM/AAAA".
- **Data final** = último dia do mês da competência → "Patrimônio em DD/MM/AAAA".
- **Rendimento** mostra o intervalo curto: "Rendimento (DD/MM → DD/MM)" (sem ano).

### Mudanças concretas

- **"Aportes" → "Movimentações"** (já é aportes − resgates − impostos).
- **Remove blocos grandes e frase-conclusão**. Tudo vira linha de tabela.
- **"Desde o início"** ganha **duas linhas totalizadoras** após o divisor: "Acima da meta" (rentabilidade − meta) e "Acima da inflação" (rentabilidade − IPCA), nessa ordem. Ambas em negrito, coloridas (verde/vermelho).
- **Sem caixas, sem fundos coloridos.** Só divisor fino antes dos totalizadores.
- **Cor**: cinza pra rótulos, preto pros valores, verde/vermelho só nas linhas-chave (Rendimento, Acima da meta, Acima da inflação).
- **Tipografia**: rótulos 11pt regular, valores 11pt; linhas-totalizador em negrito.

### Arquivos

1. **`src/components/ClientReportPDF.tsx`** — reescrever:
   - Eliminar estilos antigos (`eyebrow`, `bigNumber`, `sentence`, `rendeuRow`, `conclusion`).
   - Novos estilos: `tableTitle`, `tableRow`, `tableLabel`, `tableMidValue`, `tableValue`, `tableTotalDivider`, `tableTotalRow`.
   - Helpers `lastDayOfCompetencia` / `lastDayOfPreviousMonth` + versão curta `DD/MM` pro Rendimento.

2. **`src/components/GenerateReportButton.tsx`** — sem mudanças (cálculos `vsMetaPct` e `acimaInflacaoPct` já existem).

### Fora do escopo

- Cálculos, gráfico, logo, identidade visual.

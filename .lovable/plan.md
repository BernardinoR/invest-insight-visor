## Redesenhar PDF: layout em datas + remover gráfico

### Novo layout da seção "O Mês"

```
─────────────────────────────────────────────
31/05/2026
Patrimônio                          R$ 1.234.567,89
─────────────────────────────────────────────
Aportes – Resgates no mês           R$ 50.000,00
Resultado financeiro
de 31/05/2026 até 30/06/2026        +1,21%   (R$ 14.500,00)
─────────────────────────────────────────────
30/06/2026
Patrimônio                          R$ 1.299.067,89
─────────────────────────────────────────────
```

- Datas calculadas a partir da `Competencia` (`MM/YYYY`):
  - **Data inicial** = último dia do mês anterior (representa o saldo de abertura).
  - **Data final** = último dia do mês da competência.
- "Aportes – Resgates" mostra o valor líquido (`movimentacao`); rótulo dinâmico se for 0 → "Sem movimentação".
- "Resultado financeiro" mostra **% e valor em R$** lado a lado, colorido (verde positivo / vermelho negativo).
- Tipografia generosa: datas em destaque (Helvetica-Bold, 14pt, cor accent), valores grandes (16pt), espaço respirando entre blocos.

### Seção "Desde o início" (mantida, levemente polida)

Mantém Rentabilidade acumulada, Meta acumulada, IPCA acumulado e o destaque "Acima da inflação" / "Vs. meta". Sem mudanças de cálculo.

### Removido

- Bloco "Evolução do Patrimônio" (gráfico SVG) — removido por completo.
- Imports `Svg`, `Polyline`, `SvgLine` e o componente `ChartPatrimonio`.
- Campo `serie` do `ReportData` (e geração de `serie` no `GenerateReportButton`).

### Arquivos

1. **`src/components/ClientReportPDF.tsx`**
   - Reescrever a seção "O Mês" no novo formato com datas.
   - Adicionar helpers `lastDayOfCompetencia(c)` e `lastDayOfPreviousMonth(c)` formatando `DD/MM/AAAA`.
   - Remover gráfico e imports SVG. Remover `serie` do tipo.
   - Ajustar estilos: novos `dateHeader`, `patrimonioRow`, `resultRow`; manter paleta atual (sem novas cores hardcoded).

2. **`src/components/GenerateReportButton.tsx`**
   - Remover construção de `serie` (linhas 136-137 e campo `serie` no objeto `data`).
   - Resto do pipeline (IPCA, meta, acumulado) permanece igual.

### Fora do escopo

- Mudar fonte do IPCA (já discutido).
- Múltiplas moedas / CDI / customização do usuário.
- Adicionar logo ou identidade visual além do que já existe.

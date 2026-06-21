## Relatório PDF Mensal — Simples e Transparente

Botão "Gerar Relatório PDF" no topo do Dashboard do cliente. Gera um PDF de 1 página (A4), 100% client-side, com os dados do último mês disponível + acumulado desde o início.

### O que aparece no PDF

**Cabeçalho**
- Nome do cliente
- Compet̂encia do relatório (ex: "Novembro/2025")
- Data de emissão

**Bloco 1 — O mês**
Tabela vertical bem grande e limpa, uma linha por item:
- Patrimônio inicial
- Aporte / Resgate no mês (se houver; mostra "Sem movimentação" quando zero)
- Ganho financeiro do mês (R$ + %)
- Patrimônio final

**Bloco 2 — Desde o início**
- Rentabilidade acumulada (%) desde o primeiro mês disponível
- Meta acumulada no mesmo período (vinda de `PoliticaInvestimentos."Meta de Retorno"`)
- IPCA acumulado no mesmo período
- **Acima da inflação:** rentabilidade − IPCA (destaque visual, verde se positivo)
- **Vs. meta:** rentabilidade − meta (destaque)

**Bloco 3 — Gráfico único**
Linha simples de evolução do patrimônio mês a mês (sem múltiplas séries, sem benchmark sobreposto). Eixo X = competências, eixo Y = patrimônio final.

**Rodapé**
- "Relatório gerado automaticamente. Valores em R$."

### Visual

- Tipografia grande, muito espaço em branco, estilo "extrato premium"
- Cores do dashboard (primary/muted), sem gradientes
- Números em destaque (32–48pt), labels pequenos em cinza
- Sem logos/marcas adicionais (manter neutro)

### Onde fica o botão

No `src/pages/Dashboard.tsx`, ao lado de "Gerenciar Dados": botão **"Gerar Relatório PDF"** com ícone de download. Ao clicar, gera e baixa direto (`relatorio-{cliente}-{competencia}.pdf`).

### Detalhes técnicos

```text
Dashboard.tsx
  └─ Botão "Gerar Relatório PDF"
       └─ ClientReportPDF.tsx (novo)
            ├─ usa useClientData(clientName)
            ├─ busca Meta de Retorno em PoliticaInvestimentos
            ├─ usa useMarketIndicators (IPCA acumulado)
            └─ renderiza com @react-pdf/renderer
```

- **Lib:** `@react-pdf/renderer` (instalação via `bun add`) — gera PDF no browser, sem edge function.
- **Componente novo:** `src/components/ClientReportPDF.tsx` define o documento PDF (Document, Page, View, Text, com styles).
- **Hook auxiliar:** pequena função `useClientReportData(clientName)` que retorna `{ ultimoMes, acumulado, serieMensal }` consolidando `ConsolidadoPerformance` (somando todas as contas/instituições do último mês) + meta + IPCA.
- **Gráfico no PDF:** linha desenhada em SVG dentro do `@react-pdf/renderer` (sem dependência de recharts no PDF — recharts não renderiza dentro de react-pdf).
- **Cálculos:**
  - Patrimônio inicial/final/movimentação/ganho do mês: somar campos de `ConsolidadoPerformance` filtrado pela última `Competencia`.
  - Rentabilidade acumulada: produto composto `Π(1 + Rendimento_i) − 1` em todas as competências.
  - Meta acumulada: aplicar a Meta de Retorno (% a.a.) composta ao número de meses do histórico — `(1 + meta_aa)^(meses/12) − 1`.
  - IPCA acumulado: somar/compor IPCA mensal de `useMarketIndicators` no mesmo intervalo.
- **Moeda:** apenas BRL na v1 (relatório voltado para transparência simples; multi-moeda fica para depois).
- **Sem mudanças no banco** — apenas leitura.

### Fora do escopo

- Histórico mensal em tabela (só o mês corrente + acumulado)
- Comparação com CDI
- Customização visual pelo usuário
- Envio por email / armazenamento do PDF no Supabase

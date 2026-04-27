# Plano: Exportar Relatório do Dashboard em PDF

## Resumo
Adicionar um botão "Exportar PDF" no header do Dashboard que captura todos os gráficos e tabelas atualmente visíveis (respeitando filtros de competência, contas selecionadas, moeda e modo de visualização) e gera um PDF multi-página para download.

## Abordagem técnica

Como o dashboard é totalmente client-side com gráficos do Recharts (SVG) + tabelas HTML, a melhor abordagem é **captura visual via `html2canvas` + montagem do PDF via `jsPDF`**. Essa combinação:
- Preserva exatamente o que o usuário vê (cores, tema, moeda, filtros aplicados)
- Funciona com SVG do Recharts sem precisar reimplementar gráficos
- Não exige backend nem edge function

### Bibliotecas a adicionar
- `html2canvas` — captura DOM/SVG em canvas
- `jspdf` — monta o PDF a partir das imagens

## Alterações

### 1. Novo utilitário `src/lib/pdfExport.ts`
- Função `exportDashboardToPDF(options)` que:
  - Recebe lista de seletores/refs das seções a capturar (resumo, gráficos, tabelas)
  - Para cada seção: roda `html2canvas` com `scale: 2`, `backgroundColor` do tema, `useCORS: true`
  - Monta PDF A4 paisagem, inserindo cada seção em uma nova página, com cabeçalho (nome do cliente + competência + data de geração) e numeração de página
  - Faz download via `jsPDF.save(\`Relatorio_${cliente}_${competencia}.pdf\`)`
- Trata caso de seção mais alta que a página dividindo em múltiplas páginas

### 2. Marcar seções no `InvestmentDashboard.tsx`
- Adicionar `data-pdf-section="..."` (ou refs) nos blocos a exportar:
  - Resumo do cliente / cards de patrimônio e rendimento
  - Gráfico de Performance (PerformanceChart)
  - StrategyBreakdown
  - StrategyScatterChart
  - MaturityTimeline
  - IssuerExposure
  - InvestmentPolicyCompliance
  - RiskManagement (somente se viewMode='risk' estiver visível, ou forçar render)
  - Tabela "Retorno por Ativo" (InvestmentDetailsTable)
  - PortfolioTable (lista de instituições/contas)

### 3. Botão no header do `Dashboard.tsx` (`src/pages/Dashboard.tsx`)
- Adicionar botão `<Button>` com ícone `FileDown` ao lado de `ThemeToggle`
- Estado `isExporting` para mostrar spinner e desabilitar durante geração
- Toast de sucesso/erro via `sonner`
- Ao clicar:
  1. Toast "Gerando PDF…"
  2. Aguardar 1 frame para garantir render
  3. Chamar `exportDashboardToPDF({ clientName, competencia: filteredRange.fim })`
  4. Toast de sucesso

### 4. Detalhes de qualidade
- Forçar tema/cores fixas durante captura (ler `bg-background` resolvido) para não sair branco em dark mode
- Ocultar elementos interativos (dropdowns abertos, tooltips) antes de capturar
- Garantir que tabelas grandes (Retorno por Ativo) sejam capturadas inteiras, expandindo `overflow` temporariamente
- Usar largura A4 paisagem (297mm) e calcular altura proporcional

## Fora do escopo
- Geração server-side / edge function (não necessária)
- Personalização do conteúdo do PDF pelo usuário (escolher quais seções)
- Exportação em Excel/CSV

## Arquivos afetados
- `package.json` — adicionar `html2canvas` e `jspdf`
- `src/lib/pdfExport.ts` — novo
- `src/pages/Dashboard.tsx` — botão + handler
- `src/components/InvestmentDashboard.tsx` — atributos `data-pdf-section` nas seções

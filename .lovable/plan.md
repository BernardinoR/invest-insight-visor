

# Plano: Corrigir cálculo ponderado + conectar filtro ao gráfico consolidado

## Problema
1. O cálculo do `filteredPortfolioReturns` já pondera por `Posicao` (valor alocado) — parece correto na lógica. Preciso verificar se o valor usado é o da estratégia e não da classe individual.
2. O filtro de classes não afeta o gráfico de performance consolidado (PerformanceChart) que fica acima.

## Arquitetura

```text
InvestmentDashboard (state owner)
├── selectedStrategies: Set<string>  ← lifted from InvestmentDetailsTable
├── syntheticConsolidadoData ← useMemo: recalcula a partir de dadosData filtrados
│
├── ClientDataDisplay
│   └── PerformanceChart(consolidadoData = synthetic quando filtro parcial)
│
└── InvestmentDetailsTable(selectedStrategies, onStrategiesChange)
    └── Footer: retorno recalculado (usa mesma lógica existente, já pondera por Posicao)
```

## Alterações — 2 arquivos

### 1. `src/components/InvestmentDashboard.tsx`

- **Novo state**: `selectedStrategies` (Set\<string\>), inicializado vazio, populado via callback do InvestmentDetailsTable
- **Novo `useMemo`**: `syntheticConsolidadoData`
  - Quando todas as estratégias selecionadas → usa `filteredConsolidadoData` original (sem recalcular)
  - Quando filtro parcial → filtra `filteredDadosData` pelas classes selecionadas, agrupa por competência:
    - `Patrimonio Final = Σ Posicao` (convertido)
    - `Rendimento = Σ(Rendimento_i × Posicao_i) / Σ(Posicao_i)` (média ponderada pelo valor alocado)
    - `Ganho Financeiro = Σ(Rendimento_i × Posicao_i)`
  - Reconstrói o formato `ConsolidadoPerformance[]` para o PerformanceChart
- **Passa** `syntheticConsolidadoData` ao `ClientDataDisplay` no lugar de `filteredConsolidadoData`
- **Passa** `selectedStrategies` + `onStrategiesChange` como props ao `InvestmentDetailsTable`

### 2. `src/components/InvestmentDetailsTable.tsx`

- **Props novas**: `selectedStrategies`, `onStrategiesChange` (componente controlado)
- **Remove** state local `selectedStrategies` e funções `selectAll`/`clearAll`/`toggleStrategy`
- **Usa** props recebidas para controlar checkboxes e cálculos
- O cálculo `filteredPortfolioReturns` permanece igual — já pondera corretamente por `Posicao` (valor alocado de cada ativo individual dentro da estratégia)

### Lógica core do synthetic consolidado

Para cada competência nos dadosData filtrados:
- Filtra ativos onde `groupStrategy(classe)` está em `selectedStrategies`
- Exclui "Caixa" e "Proventos" da ponderação de rendimento
- `Patrimonio Final = Σ Posicao`
- `Rendimento = Σ(rend_i × pos_i) / Σ(pos_i)` — ponderado pelo valor alocado
- Monta objeto compatível com `ConsolidadoPerformance` para alimentar o gráfico

### Sem mudanças em banco de dados.


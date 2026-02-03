
# Plano: Benchmark Carteira Antiga (% do CDI)

## Objetivo
Adicionar um benchmark "Carteira Antiga" que exibe uma linha no gráfico representando o retorno de X% do CDI, permitindo comparação com a carteira atual. Um card mostrará apenas a diferença em dinheiro entre os dois resultados.

## Alterações no Arquivo

**Arquivo:** `src/components/charts/PerformanceChart.tsx`

### 1. Adicionar Estados (após linha 58)

```typescript
const [showOldPortfolio, setShowOldPortfolio] = useState(false);
const [oldPortfolioCDI, setOldPortfolioCDI] = useState(100); // Percentual do CDI
```

### 2. Adicionar Opção no Popover de Indicadores (após linha 624)

Dentro do Popover de indicadores, após o checkbox do IPCA, adicionar:

```typescript
<div className="border-t pt-3 mt-3">
  <div className="flex items-center space-x-2 mb-2">
    <Checkbox 
      id="oldPortfolio" 
      checked={showOldPortfolio}
      onCheckedChange={(checked) => 
        setShowOldPortfolio(checked as boolean)
      }
    />
    <label htmlFor="oldPortfolio" className="text-sm font-medium">Carteira Antiga</label>
  </div>
  {showOldPortfolio && (
    <div className="flex items-center gap-2 ml-6">
      <Input 
        type="number"
        value={oldPortfolioCDI}
        onChange={(e) => setOldPortfolioCDI(Number(e.target.value))}
        className="w-20 h-8 text-sm"
        min={0}
        max={200}
      />
      <span className="text-sm text-muted-foreground">% do CDI</span>
    </div>
  )}
</div>
```

### 3. Calcular Retorno da Carteira Antiga no chartDataWithIndicators (linha ~480)

Adicionar cálculo no mapeamento:

```typescript
// Carteira Antiga - baseada no percentual do CDI
let oldPortfolioRetorno = null;
if (cdiRetorno !== null) {
  oldPortfolioRetorno = cdiRetorno * (oldPortfolioCDI / 100);
}

return {
  ...point,
  cdiRetorno,
  targetRetorno,
  ipcaRetorno,
  oldPortfolioRetorno // Nova propriedade
};
```

### 4. Incluir Valores no Cálculo do Y Axis (linha ~498)

```typescript
const oldPortfolioValues = chartDataWithIndicators.map(item => item.oldPortfolioRetorno).filter(v => v !== null) as number[];

// Adicionar ao allValues
if (showOldPortfolio) allValues = [...allValues, ...oldPortfolioValues];
```

### 5. Adicionar Linha no Gráfico (após linha 1082)

```typescript
{showOldPortfolio && (
  <Line 
    type="monotone" 
    dataKey="oldPortfolioRetorno" 
    stroke="hsl(38 92% 50%)" // Laranja/dourado
    strokeWidth={2}
    strokeDasharray="5 5" // Linha tracejada
    connectNulls={false}
    dot={{ 
      fill: 'hsl(38 92% 50%)', 
      strokeWidth: 1, 
      stroke: 'hsl(var(--background))',
      r: 3
    }}
    activeDot={{ 
      r: 5, 
      fill: 'hsl(38 92% 50%)', 
      strokeWidth: 2, 
      stroke: 'hsl(var(--background))'
    }}
  />
)}
```

### 6. Atualizar Tooltip (linha ~980)

Adicionar formatação para a nova linha:

```typescript
if (name === 'oldPortfolioRetorno') {
  return [`${value.toFixed(2)}%`, `Carteira Antiga (${oldPortfolioCDI}% CDI)`];
}
```

### 7. Adicionar Card de Diferença em Dinheiro (linha ~1369)

Após os cards existentes no modo rentabilidade, adicionar:

```typescript
{showOldPortfolio && filteredData.length > 0 && (() => {
  const lastDataPoint = chartDataWithIndicators[chartDataWithIndicators.length - 1];
  const portfolioReturn = lastDataPoint.retornoAcumulado / 100; // Converter de % para decimal
  const oldPortfolioReturn = (lastDataPoint.oldPortfolioRetorno || 0) / 100;
  
  // Patrimônio inicial do período
  const patrimonioInicial = filteredData[0]["Patrimonio Inicial"] || 0;
  
  // Patrimônio final de cada cenário
  const patrimonioCarteira = patrimonioInicial * (1 + portfolioReturn);
  const patrimonioCarteiraAntiga = patrimonioInicial * (1 + oldPortfolioReturn);
  
  // Diferença
  const diferenca = patrimonioCarteira - patrimonioCarteiraAntiga;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">vs Carteira Antiga ({oldPortfolioCDI}% CDI)</p>
          <p className="text-2xl font-semibold text-foreground">
            {diferenca >= 0 ? '+' : ''}R$ {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`text-sm px-2 py-1 rounded ${
          diferenca >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {diferenca >= 0 ? '↑' : '↓'}
        </div>
      </div>
    </div>
  );
})()}
```

### 8. Adicionar Import do Input (linha 1)

```typescript
import { Input } from "@/components/ui/input";
```

## Fluxo de Uso

```text
1. Usuário acessa gráfico "Retorno Acumulado"
2. Clica em "Indicadores"
3. Marca checkbox "Carteira Antiga"
4. Define percentual do CDI (ex: 100%)
5. Linha tracejada laranja aparece no gráfico
6. Card abaixo mostra diferença em R$ (ex: "+R$ 45.230,00")
```

## Resumo Visual

```text
Gráfico de Rentabilidade
+----------------------------------------+
|                              .___.     |
|   Carteira ━━━━━━━━━━━━━━━━━/    \    |
|                             /      \   |
|   Carteira Antiga ┅┅┅┅┅┅┅┅/        \  |
|                          /           \ |
+----------------------------------------+

Cards:
┌─────────────┐ ┌─────────────┐ ┌───────────────────────┐
│ vs Meta     │ │ vs CDI      │ │ vs Carteira Antiga    │
│ +2.50pp     │ │ 115.3%      │ │ +R$ 45.230,00         │
└─────────────┘ └─────────────┘ └───────────────────────┘
```

## Resumo de Alterações

| Seção | Alteração |
|-------|-----------|
| Estados | Adicionar `showOldPortfolio` e `oldPortfolioCDI` |
| Popover Indicadores | Adicionar checkbox + input para % CDI |
| Dados do Gráfico | Calcular `oldPortfolioRetorno` baseado no CDI |
| Y Axis | Incluir valores da carteira antiga no cálculo |
| Gráfico | Adicionar Line tracejada laranja |
| Tooltip | Formatar nome da carteira antiga |
| Cards | Adicionar card com diferença em R$ |
| Imports | Adicionar Input component |

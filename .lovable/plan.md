
# Plano: Auto-preencher ".SA" no ticker da calculadora de Mercado

## Problema
Ao abrir a calculadora de Mercado para ativos de classes como Imobiliário - Ativos, Exterior - Ações, etc., o ticker não inclui o sufixo ".SA" necessário para a API Yahoo Finance.

## Solução
Nos dois locais onde `setMarketCalcData` é chamado (linhas ~5365 e ~5558), verificar a classe do ativo (`editingItem["Classe do ativo"]`) e, se for uma das classes listadas, anexar `.SA` ao ticker — apenas se ele ainda não terminar com `.SA`.

### Classes que recebem ".SA"
- `Imobiliário - Ativos`
- `Exterior - Ações`
- `Exterior - Renda Fixa`
- `Ações - Ativos`
- `Ações - ETFs`

### Alteração em `src/pages/DataManagement.tsx`

Criar helper function:
```typescript
const shouldAppendSA = (classeAtivo: string): boolean => {
  const classes = [
    'imobiliário - ativos',
    'exterior - ações',
    'exterior - renda fixa',
    'ações - ativos',
    'ações - etfs',
  ];
  return classes.includes((classeAtivo || '').toLowerCase());
};

const getTickerWithSuffix = (ativo: string, classeAtivo: string): string => {
  const ticker = ativo || '';
  if (shouldAppendSA(classeAtivo) && !ticker.toUpperCase().endsWith('.SA')) {
    return ticker ? `${ticker}.SA` : '';
  }
  return ticker;
};
```

Nos dois `setMarketCalcData` (linhas 5365-5368 e 5558-5561), trocar:
```typescript
ticker: editingItem.Ativo || ''
```
por:
```typescript
ticker: getTickerWithSuffix(editingItem.Ativo || '', editingItem["Classe do ativo"] || '')
```

Apenas 1 arquivo alterado, ~15 linhas adicionadas.

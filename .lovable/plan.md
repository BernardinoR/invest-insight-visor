

# Plano: Corrigir CDI para intervalos longos

## Problema
O hook `useCDIData` (linha 28) busca apenas **2 anos** de dados do CDI (`startDate.setFullYear(endDate.getFullYear() - 2)`). Quando o usuário seleciona "Ótimo" ou períodos maiores que 2 anos, os meses anteriores não têm dados do CDI, fazendo a linha não aparecer.

## Solução
Aumentar o período de busca de 2 para **6 anos** no `useCDIData.tsx`, garantindo cobertura para todos os períodos possíveis.

**Arquivo:** `src/hooks/useCDIData.tsx`

**Linha 25-28:**

De:
```typescript
// Buscar dados dos últimos 2 anos para garantir cobertura
const endDate = new Date();
const startDate = new Date();
startDate.setFullYear(endDate.getFullYear() - 2);
```

Para:
```typescript
// Buscar dados dos últimos 6 anos para garantir cobertura em todos os períodos
const endDate = new Date();
const startDate = new Date();
startDate.setFullYear(endDate.getFullYear() - 6);
```

Alteração de uma única linha. A API do Banco Central suporta consultas longas sem problema (como visto nos network requests).


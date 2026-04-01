

# Plano: Corrigir ordenação de competências em Gerenciar Dados

## Problema
A lista de competências usa `.sort().reverse()` (lexicográfico), fazendo `12/2025` aparecer antes de `02/2026` porque `"12"` > `"02"` como string — o ano é ignorado na comparação.

## Solução

Alterar **1 arquivo**: `src/pages/DataManagement.tsx`

### 1. Criar helper de comparação de competências (usar `parseCompetenciaToDate` já existente em `src/lib/utils.ts`)

### 2. Corrigir ordenação do dropdown de competências (linha 553)
```typescript
// ANTES:
.filter(comp => comp && comp.trim() !== '').sort().reverse()

// DEPOIS:
.filter(comp => comp && comp.trim() !== '')
.sort((a, b) => {
  const dateA = parseCompetenciaToDate(a);
  const dateB = parseCompetenciaToDate(b);
  return dateB.getTime() - dateA.getTime(); // mais recente primeiro
})
```

### 3. Corrigir `parseCompetencia` dentro de `applySortingGeneric` (linha 1862-1864)
O `parseCompetencia` interno não trata anos de 2 dígitos. Substituir por `parseCompetenciaToDate`:

```typescript
// ANTES:
const parseCompetencia = (comp: string) => {
  const [month, year] = String(comp).split('/');
  return `${year}${month.padStart(2, '0')}`;
};
const aComp = parseCompetencia(String(aValue));
const bComp = parseCompetencia(String(bValue));
comparison = aComp.localeCompare(bComp);

// DEPOIS:
const aDate = parseCompetenciaToDate(String(aValue));
const bDate = parseCompetenciaToDate(String(bValue));
comparison = aDate.getTime() - bDate.getTime();
```

### 4. Adicionar import de `parseCompetenciaToDate` no topo do arquivo

Alteração mínima: ~10 linhas modificadas.


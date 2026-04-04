

# Plano: Adicionar classe de ativo "Alternativo"

## Resumo
Adicionar "Alternativo" como nova classe de ativo em todos os locais necessários do sistema.

## Alterações necessárias

### 1. `src/pages/DataManagement.tsx`
- Adicionar `'Alternativo'` ao array `VALID_ASSET_CLASSES` (linha 87, antes de `'COE'`)

### 2. `groupStrategy` — 5 arquivos
Adicionar mapeamento para "alternativo" em cada cópia da função `groupStrategy`:
- `src/components/InvestmentDetailsTable.tsx` (~linha 100)
- `src/components/InvestmentDashboard.tsx` (~linha 1060)
- `src/components/charts/StrategyBreakdown.tsx` (~linha 67)
- `src/components/DiversificationDialog.tsx` (~linha 29)
- `src/components/charts/InvestmentPolicyCompliance.tsx` (~linha 84)

Adicionar antes do `return strategy` / `return 'Outros'`:
```typescript
if (strategyLower.includes('alternativo')) return 'Alternativo';
```

### 3. `strategyOrder` — 4 arquivos
Adicionar `'Alternativo'` ao array de ordenação (depois de 'Private Equity'):
- `src/components/InvestmentDetailsTable.tsx`
- `src/components/InvestmentDashboard.tsx`
- `src/components/charts/StrategyBreakdown.tsx`
- `src/components/DiversificationDialog.tsx`

### 4. `COLORS` arrays
Adicionar uma cor extra nos arrays de cores nos mesmos 4 arquivos para que 'Alternativo' tenha cor própria.

### 5. Tabela `PoliticaInvestimentos` (Supabase)
Criar migration para adicionar coluna `"Alternativo"` (numeric, nullable) à tabela `PoliticaInvestimentos`.

### 6. `src/components/charts/InvestmentPolicyCompliance.tsx`
Adicionar mapeamento de 'Alternativo' no `investmentPolicy` que lê da tabela `PoliticaInvestimentos`.

### 7. `src/integrations/supabase/types.ts`
Adicionar `Alternativo` nos tipos Row/Insert/Update da tabela PoliticaInvestimentos.

Total: ~7 arquivos + 1 migration.


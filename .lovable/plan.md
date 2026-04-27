
# Plano: Liquidez/Vencimento no Verificador e Filtro de Qualidade

## Diagnóstico

- A **bolinha laranja** já existe em ambos os lugares:
  - Consolidado: `DataManagement.tsx` linhas 4271-4274 (5ª bolinha condicional)
  - Ativos detalhados: linhas 5377-5391 (condicional, só aparece quando faltando)
- O que **falta**:
  1. No **popover de verificação do consolidado** (linhas 4277-4422), não há uma seção dedicada explicando o status de liquidez/vencimento — só aparecem seções para Integridade, Classificação, Rentabilidade e Ativos Novos.
  2. No popover/tooltip de verificação por linha de **ativos detalhados**, hoje é só um `title` simples no `<div>` (linha 5385). Não há detalhe.
  3. **Filtro de Qualidade** (linhas 4751-4880) não inclui a opção "Sem liquidez e vencimento".

## Alterações em `src/pages/DataManagement.tsx`

### 1. Adicionar seção no popover de verificação do consolidado

Após a seção de "Ativos Novos" (linha ~4420), adicionar nova seção condicional usando `verification.hasMissingLiquidity` e `verification.missingLiquidityCount` (já calculados em `verifyIntegrity`):

```tsx
{verification.hasMissingLiquidity && (
  <>
    <Separator />
    <div>
      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-orange-500" />
        Liquidez / Vencimento
      </h4>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Sem liquidez e sem vencimento:</span>
        <span className="font-medium text-orange-600">{verification.missingLiquidityCount}</span>
      </div>
      <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-xs text-orange-700 dark:text-orange-400">
        💧 {verification.missingLiquidityCount} ativo(s) sem campo "Liquidez" e sem "Vencimento". Preencha um dos dois para que apareçam corretamente nas análises de liquidez.
      </div>
    </div>
  </>
)}
```

### 2. Substituir a bolinha "estática" por um Popover na tabela de ativos detalhados

Hoje cada bolinha por linha (linhas 5347-5392) é só um `<div title="...">`. Vou envolver as 4 bolinhas (classe / rentabilidade / ativo novo / liquidez-vencimento) num `<Popover>` único similar ao do consolidado, mostrando seção por seção (Classe, Rentabilidade, Ativo Novo, Liquidez/Vencimento) com texto explicativo. Isso atende ao pedido "no dialog do verif … de ativos tem que aparecer os sem vencimento e liquidez".

Estrutura:
- `PopoverTrigger`: as 4 bolinhas inline (mantendo a 4ª — laranja — sempre visível, ou apenas quando faltando — preservar comportamento atual: só mostra se faltando).
- `PopoverContent`: seções para cada verificação, com a seção de Liquidez/Vencimento mostrando estado verde quando OK ou vermelho/laranja quando faltando.

### 3. Adicionar bloco "Sem liquidez e vencimento" no card "Alertas de Qualidade dos Dados" (linhas 4687-4740)

- Calcular `missingLiquidityInComparison` (similar a `missingYieldInComparison` na linha 4547):
  ```ts
  const missingLiquidityInComparison = filteredDadosData.filter(item => {
    const ativoNorm = String(item.Ativo || '').toLowerCase();
    const isCashLike = ativoNorm.includes('caixa') || ativoNorm.includes('cash') || ativoNorm.includes('proventos');
    return !isCashLike && !item.Vencimento && !(item as any).liquidez;
  }).length;
  ```
- Adicionar 4º card no grid (laranja) com ícone `XCircle` mostrando o contador.
- Atualizar a condição de exibição da seção para incluir `missingLiquidityInComparison > 0`.

### 4. Adicionar filtro "Sem liquidez e vencimento" no Popover de "Filtros de Qualidade"

- Novo state: `showOnlyMissingLiquidity` (default false).
- Novo memo `missingLiquidityInCurrentView` (espelha `missingYieldInCurrentView` mas com a condição liquidez+vencimento+!cashLike).
- Atualizar o memo `filteredDadosData` (linha 2349) para incluir `showOnlyMissingLiquidity`:
  ```ts
  const isMissingLiquidity = showOnlyMissingLiquidity && (() => {
    const ativoNorm = String(item.Ativo || '').toLowerCase();
    const isCashLike = ativoNorm.includes('caixa') || ativoNorm.includes('cash') || ativoNorm.includes('proventos');
    return !isCashLike && !item.Vencimento && !(item as any).liquidez;
  })();
  return isUnclassified || hasMissingYield || isNewAsset || isMissingLiquidity;
  ```
- Adicionar checkbox no Popover (após "Ativos Novos", linha ~4857):
  ```tsx
  <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
    <Checkbox id="filter-missing-liquidity" checked={showOnlyMissingLiquidity}
      onCheckedChange={(c) => setShowOnlyMissingLiquidity(c as boolean)} />
    <div className="flex-1 space-y-1">
      <label htmlFor="filter-missing-liquidity" className="text-sm font-medium cursor-pointer flex items-center gap-2">
        <XCircle className="h-3.5 w-3.5 text-orange-600" />
        Sem liquidez e vencimento
        {missingLiquidityInCurrentView > 0 && (
          <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[10px] bg-orange-50 border-orange-200 text-orange-700">
            {missingLiquidityInCurrentView}
          </Badge>
        )}
      </label>
      <p className="text-xs text-muted-foreground">Ativos sem ambos os campos preenchidos</p>
    </div>
  </div>
  ```
- Atualizar:
  - Condições do botão `variant` e badge total no PopoverTrigger (linhas 4755, 4761-4767) para incluir `showOnlyMissingLiquidity` e `missingLiquidityInCurrentView`.
  - Botão "Limpar filtros" (linha 4860) para resetar também `setShowOnlyMissingLiquidity(false)`.

## Resumo de arquivos

- `src/pages/DataManagement.tsx` — único arquivo editado. Sem migração, sem novos componentes.

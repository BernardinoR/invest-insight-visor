

# Plano: Adicionar 4a bolinha "Ativos Novos" no verificador do Consolidado

## Contexto
O verificador do consolidado já tem 3 bolinhas:
1. Integridade numérica (patrimônio vs soma)
2. Classificação (classes válidas)
3. Rentabilidade (rendimento preenchido)

O `verifyIntegrity` já calcula `newAssetCount` e `hasNewAssets` — só falta exibir na UI.

## Alterações — 1 arquivo: `src/pages/DataManagement.tsx`

### 1. Adicionar 4a bolinha no botão (após linha ~4068)
Após a terceira bolinha (rentabilidade), adicionar:
```
{verification.hasNewAssets ? (
  <Info className="h-4 w-4 text-blue-500" />
) : null}
```
Só aparece quando há ativos novos (azul informativo), não exibe nada quando não há.

### 2. Adicionar seção no PopoverContent (após linha ~4190)
Novo bloco após "Verificação de Rentabilidade":
- Separator
- Título "Ativos Novos" com ícone Info
- Contador de ativos novos
- Mensagem informativa azul explicando que são ativos sem rentabilidade esperada


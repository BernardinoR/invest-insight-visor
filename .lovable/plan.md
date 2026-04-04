

## Mover "Alternativo" para o final da lista

**Arquivo**: `src/pages/DataManagement.tsx` (linha 83)

Remover `'Alternativo'` da posição atual (após Private Equity, linha 83) e colocá-lo como último item do array, após `'Ouro'`.

```
Antes:                          Depois:
...                             ...
Private Equity/...              Private Equity/...
Alternativo          ←remove    Exterior - Renda Fixa
Exterior - Renda Fixa           Exterior - Ações
Exterior - Ações                COE
COE                             Criptoativos
Criptoativos                    Ouro
Ouro                            Alternativo  ←add
```

1 arquivo, 1 linha movida.


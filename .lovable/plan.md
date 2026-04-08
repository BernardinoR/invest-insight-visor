

# Plano: Simplificar "Gravar Classificação"

## Mudanças

### 1. Identificação — grid 2x2
```text
[Competência]    [Moeda ▾]
[Instituição]    [Conta]
```
Trocar de grid 3 colunas + Moeda separado para grid 2x2 limpo.

### 2. Botão "Gravar Classificação" — simplificar
Substituir o botão grande que ocupa meia linha por um **ícone pequeno** ao lado do select de "Classe do Ativo", inline no mesmo campo. Será um botão `size="icon"` `variant="ghost"` com o ícone `BookmarkPlus`, posicionado à direita do `SelectTrigger` usando `flex`. Tooltip explica a função.

Layout da seção Ativo:
```text
[Nome do Ativo]              [Classe do Ativo ▾ 🔖]
[Posição]
```

O botão fica discreto, contextualizado junto à classe (que é o que ele grava), e a Posição fica sozinha na linha abaixo.

### Arquivo alterado
`src/pages/DataManagement.tsx` — seções Identificação e Ativo (~linhas 5563-5688)


## Objetivo

Permitir marcar ativos sem liquidez (private equity, fundos fechados) via um checkbox no modal de edição, com uma nova coluna boolean em `RAG_Processador`.

## Mudanças

### 1. Banco — migração

Adicionar coluna em `RAG_Processador`:
- `liquidez_fechada boolean not null default false`

### 2. Modal de edição (`src/pages/DataManagement.tsx`)

Na seção "Condições", logo acima dos inputs de Liquidez (corridos/úteis):

- **Checkbox "Sem liquidez (fundo fechado)"** ligado a `editingItem.liquidez_fechada`.
- Quando **marcado**:
  - Limpa `liquidez_corridos = null` e `liquidez_uteis = null`.
  - Desabilita (`disabled`) os dois inputs e o botão X.
  - Mostra placeholder/label visual "Fechado" nos inputs.
- Quando **desmarcado**: volta ao comportamento atual (inputs habilitados, auto-fill `D+0`, X limpa ambos).

### 3. Exibição na tabela

Onde hoje renderiza a liquidez como `D+N / D+N`, adicionar precedência:
- Se `liquidez_fechada === true` → badge cinza "Fechado".
- Senão → comportamento atual.

### 4. Bulk edit / preenchimento via RAG

- Incluir `liquidez_fechada` no bulk edit (mesma lógica do `BulkEditLogic`: pré-preenche só se todos selecionados compartilham o mesmo valor).
- `handleBulkFillLiquidezFromRAG`: se a fonte tem `liquidez_fechada = true`, propaga e zera os outros campos.
- `normalizeLiquidezPair`: se `liquidez_fechada`, força ambos para `null` antes de salvar.

### 5. Memória

Atualizar `mem://features/data-management/liquidity-field` documentando o novo flag `liquidez_fechada` e a precedência sobre `liquidez_corridos/uteis`.

## Arquivos afetados

- Migration nova (coluna em `RAG_Processador`).
- `src/pages/DataManagement.tsx` (modal, tabela, bulk edit, RAG fill, normalizador).
- Memória.

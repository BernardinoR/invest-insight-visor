## Auto-preencher Liquidez via RAG no Bulk Edit

No diálogo de "Editar Registros em Lote" (aba Detalhado de DataManagement), adicionar uma ação que, para cada ativo selecionado, busca a liquidez cadastrada na tabela `RAG_Processador` (por nome de `Ativo`) e aplica esse valor — registro a registro — em `DadosPerformance.liquidez`.

Diferente dos outros campos do bulk edit (que aplicam o mesmo valor a todos), esta ação aplica um valor **diferente por linha**, dependendo do que estiver no RAG.

### Onde
`src/pages/DataManagement.tsx` — dentro do `<Dialog open={isBulkEditOpen}>` (a partir da linha 6435), na seção do tab `detalhado`, próximo ao campo de Taxa/Rendimento.

### UX
- Novo botão: **"Preencher liquidez via RAG"** (com ícone `Database` ou `Sparkles`), largura total, variant `outline`.
- Texto auxiliar: "Busca a liquidez cadastrada no RAG para cada ativo selecionado e aplica individualmente."
- Ao clicar:
  1. Coleta os nomes únicos de `Ativo` dos `selectedItems` (filtrados em `filteredDadosData`).
  2. Faz uma única query: `supabase.from('RAG_Processador').select('Ativo, Liquidez').in('Ativo', nomesUnicos)`.
  3. Monta um mapa `ativo → Liquidez` (ignorando entradas sem `Liquidez`).
  4. Para cada item selecionado, se existir mapeamento e `Liquidez` não vazia, dispara um `update` em `DadosPerformance` pelo `id` com `{ liquidez: <valor RAG> }`.
  5. Roda os updates em paralelo (`Promise.all`).
  6. Toast final com: `X ativos atualizados, Y sem cadastro no RAG, Z já com liquidez igual`.
  7. Fecha o diálogo, limpa `selectedItems`, chama `fetchData()`.

### Detalhes técnicos
- Reaproveita o estado `selectedItems` e `filteredDadosData` já existentes.
- Não mexe em `bulkEditData` nem em `handleBulkSave` — é um fluxo paralelo (botão próprio com seu próprio handler `handleBulkFillLiquidezFromRAG`).
- Considera `Liquidez` válido apenas quando `trim() !== ''`.
- Não sobrescreve liquidez existente do registro se já for igual ao RAG (apenas conta como "já igual"); mas **sobrescreve** se for diferente — mesmo comportamento atual de uma regra "RAG é fonte da verdade" para este botão.
- Só aparece quando `activeTab === 'detalhado'`.

### Sem migrations
Tabela `RAG_Processador` e coluna `DadosPerformance.liquidez` já existem.

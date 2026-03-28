

# Plano: Corrigir exclusão de ativos vinculados ao consolidado

## Problema
Quando `nomeConta` é uma string vazia `''` (existem 58 consolidados e 1226 dados com esse valor), o código trata como falsy e faz `.is('nomeConta', null)`. Porém os registros em DadosPerformance têm `nomeConta = ''`, não `null` — logo o filtro não encontra nada e 0 ativos são deletados.

## Solução
Em `src/pages/DataManagement.tsx`, na função `handleDeleteConsolidado` (~linha 1603-1607), substituir a lógica de filtro do `nomeConta` para cobrir **ambos** os casos (null e string vazia):

```typescript
// ANTES:
if (consolidadoToDelete.nomeConta) {
  deleteQuery = deleteQuery.eq('nomeConta', consolidadoToDelete.nomeConta);
} else {
  deleteQuery = deleteQuery.is('nomeConta', null);
}

// DEPOIS:
const conta = consolidadoToDelete.nomeConta;
if (conta && conta.trim() !== '') {
  deleteQuery = deleteQuery.eq('nomeConta', conta);
} else {
  // Match both null AND empty string
  deleteQuery = deleteQuery.or('nomeConta.is.null,nomeConta.eq.');
}
```

Alteração em 1 arquivo, ~4 linhas modificadas.


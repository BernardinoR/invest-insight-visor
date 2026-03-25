

# Plano: Corrigir exclusão de ativos vinculados ao consolidado

## Problema
Quando `nomeConta` é `null` (consolidados sem nome de conta), a query Supabase usa `.eq('nomeConta', null)` que **não funciona** — SQL requer `IS NULL` para comparações com null. O Supabase exige `.is('nomeConta', null)` nesse caso. Isso faz com que a exclusão dos ativos vinculados não encontre nenhum registro para deletar.

O mesmo bug afeta a **contagem de ativos vinculados** no dialog (linhas 6314-6318) e na função de exclusão (linhas 1498-1502), onde o filtro JavaScript `dado.nomeConta === null` funciona, mas pode não bater se um lado for `undefined` e o outro `null`.

## Solução

**Arquivo:** `src/pages/DataManagement.tsx`

### 1. Corrigir a query de exclusão (linhas 1479-1485)

Usar `.is('nomeConta', null)` quando `nomeConta` for null/undefined, e `.eq()` quando tiver valor:

```typescript
if (deleteRelated) {
  let query = supabase
    .from('DadosPerformance')
    .delete()
    .eq('Competencia', consolidadoToDelete.Competencia)
    .eq('Instituicao', consolidadoToDelete.Instituicao)
    .eq('Nome', consolidadoToDelete.Nome);
  
  if (consolidadoToDelete.nomeConta) {
    query = query.eq('nomeConta', consolidadoToDelete.nomeConta);
  } else {
    query = query.is('nomeConta', null);
  }

  const { error: dadosError } = await query;
  if (dadosError) throw dadosError;
}
```

### 2. Corrigir contagem de ativos no dialog (linhas 6314-6318) e na mensagem de sucesso (linhas 1498-1502)

Normalizar a comparação de `nomeConta` para tratar `null`, `undefined` e `''` como equivalentes:

```typescript
const ativosVinculados = dadosData.filter(dado => 
  dado.Competencia === consolidadoToDelete.Competencia &&
  dado.Instituicao === consolidadoToDelete.Instituicao &&
  (dado.nomeConta || '') === (consolidadoToDelete.nomeConta || '') &&
  dado.Nome === consolidadoToDelete.Nome
).length;
```

Aplicar esta mesma normalização nos dois locais onde essa contagem aparece (dialog e mensagem de sucesso).


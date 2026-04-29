## Problema

Ao clicar em **"Gravar liquidez"** no modal de edição de "Gerenciar Dados", o registro correspondente em `RAG_Processador` está ficando com `Classificacao = NULL`.

Confirmado no banco: 18 dos 20 registros mais recentes do RAG (ex.: `Trend Pré-Fixado XP Seg Prev FIC FIRF RL`, `ARX Denali XP Seg Prev FIC FIRF CP RL`, `Ibiuna ST XP Seg Prev FIC FIM CP`, etc.) têm `Liquidez` preenchida mas `Classificacao = NULL`.

### Causa raiz (`src/pages/DataManagement.tsx`, função `handleSaveLiquidez`, linha 1615)

Quando o ativo ainda não existe na tabela `RAG_Processador`, o código executa:

```ts
.insert({ Ativo: ativo, Liquidez: liquidezNova })
```

Sem incluir `Classificacao`. Resultado: a classe que o usuário acabou de preencher no modal (`editingItem["Classe do ativo"]`) **não é gravada** junto, e o registro nasce sem classificação. Como o RAG é a fonte usada para auto-preencher classes em importações futuras, esses ativos passam a aparecer como "sem classificação".

O caminho `handleSaveClassificacao` tem o mesmo problema em espelho: insere apenas `{ Ativo, Classificacao }` sem `Liquidez`.

## Correção

Atualizar **ambos** os fluxos de gravação no RAG (`handleSaveLiquidez` e `handleSaveClassificacao`) para preservar o outro campo se ele estiver disponível em `editingItem`, sem nunca sobrescrever um valor já existente no RAG por `null`.

### Mudanças em `src/pages/DataManagement.tsx`

**1. `handleSaveLiquidez` (linhas 1615-1665):**
- Quando o registro **não existe** no RAG: incluir `Classificacao: editingItem["Classe do ativo"]?.trim() || null` no `insert`, junto com `Ativo` e `Liquidez`.
- Quando o registro **existe sem Liquidez**: manter o `update` apenas em `Liquidez` (não tocar em `Classificacao`).
- Caminho de conflito (`handleConfirmRagLiquidezUpdate`): segue atualizando só `Liquidez`. Sem mudança.

**2. `handleSaveClassificacao` (linhas 1528-1572):**
- Quando o registro **não existe** no RAG: incluir `Liquidez: editingItem.liquidez?.trim() || null` no `insert`, junto com `Ativo` e `Classificacao`.
- Demais caminhos não mudam.

### Por que é seguro

- Os updates parciais continuam tocando apenas a coluna alvo, então gravar liquidez nunca apaga uma classificação previamente salva no RAG.
- O insert passa a refletir o estado completo do `editingItem`, evitando perda silenciosa de dados.
- Não há mudanças em schema, RLS ou outras tabelas.

### Backfill (opcional, fora desta correção)

Os registros já gravados sem classificação continuam sem ela. Se quiser, depois eu rodo um update para preencher a `Classificacao` desses ativos a partir da classe atual em `DadosPerformance`. Diga se quer que eu inclua esse backfill no mesmo passo.

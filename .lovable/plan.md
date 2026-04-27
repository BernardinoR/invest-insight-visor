# Plano: Persistir Liquidez no RAG + Bolinha de Verificação

## Resumo
1. Adicionar botão "Salvar liquidez" ao lado do campo Liquidez no modal de edição (igual ao botão de Salvar Classe), persistindo o valor numa nova coluna `Liquidez` em `RAG_Processador`.
2. Quando um ativo é cadastrado/editado e já existe no RAG com liquidez, pré-preencher automaticamente.
3. Adicionar uma 3ª bolinha de verificação na tabela de Ativos detalhados (e no consolidado) indicando se o ativo está sem liquidez **e** sem vencimento — só aparece quando há esse problema.

## Alterações

### 1. Migration: Nova coluna `Liquidez` em `RAG_Processador`

```sql
ALTER TABLE public."RAG_Processador"
ADD COLUMN "Liquidez" text;
```

Permite que cada Ativo tenha uma liquidez "padrão" memorizada (ex: D+30) reutilizada em novos registros.

### 2. `DataManagement.tsx` — Botão "Salvar Liquidez" no modal

- Ao lado do campo Liquidez (na seção Condições do modal de edição), adicionar um botão `BookmarkPlus` idêntico ao de Salvar Classe.
- Nova função `handleSaveLiquidez` espelhando `handleSaveClassificacao`:
  - Se Ativo não existe no RAG → INSERT com Ativo + Liquidez (Classificacao fica null)
  - Se existe e Liquidez é igual → toast "já gravada"
  - Se existe e Liquidez é diferente → AlertDialog de conflito (com opção de propagar para todos os `DadosPerformance` com mesmo Ativo, igual ao fluxo de classe)
- Habilitado apenas quando `editingItem.Ativo` e `editingItem.liquidez` estão preenchidos.

### 3. Auto-preenchimento ao detectar Ativo conhecido

Onde já existe lógica de auto-classificação a partir do RAG (busca por Ativo), incluir também `Liquidez` no SELECT e setar `editingItem.liquidez` se vier preenchido e o campo atual estiver vazio.

### 4. Nova bolinha "Liquidez/Vencimento faltante" — Tabela de Ativos detalhados

Em `DataManagement.tsx` (~linha 5252, depois da bolinha de Ativo Novo), adicionar:

```tsx
{!item.Vencimento && !item.liquidez && !isCashLike(item.Ativo) && (
  <div title="Sem liquidez e sem vencimento">
    <XCircle className="h-4 w-4 text-orange-500" />
  </div>
)}
```

Regra: a bolinha aparece **apenas se** `Vencimento` está vazio **E** `liquidez` está vazia. Para evitar ruído, ignorar ativos tipo Caixa/Cash/Proventos (helper `isCashLike` já usado em outras validações).

### 5. Resumo no Consolidado (3ª/4ª bolinha agregada)

Na linha do consolidado (~4116), adicionar nova bolinha entre "Rentabilidade" e "Ativos Novos":
- Calcular `hasMissingLiquidity` no `getVerification`: conta de ativos do consolidado em que `Vencimento IS NULL AND liquidez IS NULL` (excluindo cash-like).
- Se > 0 → ícone laranja `AlertCircle`; senão omitir (igual padrão de "Ativos Novos").
- Adicionar seção correspondente no Popover de detalhes da verificação.

> **Observação**: o cálculo desse novo indicador no consolidado é feito **client-side** no `getVerification` (que já consulta os ativos detalhados). Não é necessário alterar a função `calculate_verification` do banco nesta etapa — fica como melhoria futura caso queira persistir.

## Detalhes técnicos
- Sem alteração na coluna `liquidez` da tabela `DadosPerformance` (já existe).
- A nova coluna `Liquidez` em `RAG_Processador` é nullable (ativos antigos continuam funcionando).
- Reutiliza padrão visual e UX já existentes (BookmarkPlus, AlertDialog de conflito, bolinhas coloridas).
- Cor laranja diferencia do vermelho (erro crítico) e do azul (informativo).

# Botão "puxar do RAG" no diálogo de edição

Adicionar, ao lado de cada botão 🔖 já existente (Classificação, Liquidez, Vencimento) no diálogo de edição de registro, um botão que faz o caminho inverso: lê o `RAG_Processador` do ativo em edição e preenche o campo do formulário.

## Comportamento

Ao abrir o diálogo, busca-se a linha do RAG correspondente ao nome do ativo. Cada botão assume um estado:

- **Âmbar** — campo do registro vazio e RAG com valor. Clique preenche.
- **Azul** — campo preenchido e RAG com valor diferente. Clique substitui.
- **Apagado** (visível, opacidade baixa, não executa ação) — valores equivalentes.
- **Invisível ocupando espaço** (`invisible`, sem desmontar) — RAG sem valor para o campo, ou busca em andamento.

**Vencimento só tem o estado âmbar.** Se o registro já tem vencimento e o RAG discorda, fica apagado — nunca azul.

O clique altera apenas o estado do formulário (`editingItem`). Nada vai ao banco até o Salvar.

## Busca no RAG

Novo estado `ragLookup` (linha do RAG escolhida) + `ragLookupLoading`, e um `useEffect` que:

1. Dispara quando o diálogo abre e quando `editingItem.Ativo` muda, com debounce de ~400ms.
2. **Limpa `ragLookup` imediatamente** (síncrono, antes do debounce) a cada mudança de nome, para nunca oferecer o valor do ativo anterior.
3. Consulta seguindo o mesmo padrão do "aplicar a todos os clientes" (≈linha 1944): `escapeLikeAtivo` + `.ilike('Ativo', pattern)` como **pré-filtro**, e depois filtro em JavaScript por igualdade exata de `trim().toLowerCase()`. O `ilike` nunca é o predicado final.
4. Seleciona **uma linha inteira** de forma determinística: primeiro a de casing idêntico ao digitado; senão a de `id` mais alto (mais recente). Sem misturar campos de linhas diferentes.
5. Ignora respostas fora de ordem (guard por nome do ativo/contador de request).
6. Em erro, falha em silêncio: `ragLookup = null`, botões invisíveis, nenhum toast.

## Regras por campo

- **Classificação**: só propõe valores presentes em `VALID_ASSET_CLASSES`. Valor fora da lista é tratado como "RAG não sabe" (botão invisível).
- **Liquidez**: atômica. O clique aplica `liquidez_corridos`, `liquidez_uteis` e `liquidez_fechada` juntos. A coluna legada `Liquidez` do RAG entra como corridos quando as novas estão vazias (`finalCorridos = corridos || legacy`, igual ao preenchimento em lote da linha ≈2395). Com `liquidez_fechada = true`, os dias vão vazios. Comparação feita sobre os dois lados normalizados pela mesma função.
- **Vencimento**: comparação após `trim` e usando a mesma normalização de formato de data já usada por `handleSaveVencimento`.

## Visual

Mesmo molde dos 🔖 vizinhos: `Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"` (na Classe do Ativo, onde os vizinhos são `h-10 w-10`, acompanha o tamanho do vizinho para manter o alinhamento), envolto em `TooltipProvider/Tooltip/TooltipTrigger/TooltipContent`. Ícone `ArrowDownToLine` (lucide-react), com cor âmbar ou azul via tokens de tema. O botão novo entra **antes** do 🔖 na mesma linha de controles.

Tooltips:
- âmbar: `Preencher com o RAG: {valor}`
- azul: `Substituir pelo RAG: {valor} (atual: {valor do registro})`
- apagado: `Igual ao RAG`

O estado apagado usa `aria-disabled` (não `disabled`), mantendo foco por teclado e tooltip; o handler simplesmente não executa a ação.

## Fora de escopo

- Nenhuma gravação no banco pelo clique.
- Botões 🔖, "aplicar a todos os clientes" e preenchimento em lote das linhas selecionadas ficam intactos.
- Nenhuma alteração na tabela `RAG_Processador` nem no schema.

## Detalhes técnicos

Arquivo único: `src/pages/DataManagement.tsx`. Novos helpers locais: `pickRagRow`, `ragClasseProposta`, `ragLiquidezProposta`, `ragVencimentoProposto` e um `getPullState(field)` que devolve `'amber' | 'blue' | 'muted' | 'hidden'`, mais um pequeno componente interno `PullFromRagButton` para não repetir o bloco de tooltip três vezes. Import de `ArrowDownToLine` adicionado à linha 7.

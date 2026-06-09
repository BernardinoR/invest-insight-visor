# Simplificar calculadora: só Mais Retorno para Tesouro

## Objetivo
Eliminar o modo **Tesouro** isolado (que usa CSV do Tesouro Transparente / XLS Azure) e deixar a busca de rentabilidade de títulos públicos apenas pelo modo **Mais Retorno**, que já trata fundos e TD. Além disso, permitir colar o nome do título no formato usado nos relatórios (ex.: `LTN - 01/01/2032`, `NTN-B Principal - 15/05/2035`, `LFT - 01/03/2030`) e o app converte automaticamente para o slug aceito pela API Mais Retorno (`tesouro-prefixado-01-01-2032:td`).

## Mudanças em `src/pages/DataManagement.tsx`

1. **Remover modo `treasury`** do tipo do estado `calculatorMode` e todos os blocos relacionados:
   - Estados `treasuryCalcData`, `treasuryCalcLoading`, `treasuryCalcResult`.
   - Função `handleFetchTreasuryData` e a chamada para a edge `get-treasury-return`.
   - Botão "Tesouro" da barra de modos da calculadora.
   - Bloco de UI `{calculatorMode === 'treasury' && (...)}` (formulário, select de tipo, campo de vencimento, botão buscar, card de resultado).
   - Ramo `else if (calculatorMode === 'treasury')` na confirmação que aplica o `calculatedReturn`.
   - Bloco em `handleEditClick` (linha ~6372) que pré-preenchia `treasuryCalcData` ao abrir o item.

2. **Aceitar nome do TD no input "Identifier Mais Retorno"**:
   - Helper `parseTreasuryNameToSlug(input)`:
     - Aceita já-slug (`...-...-DD-MM-YYYY:td`) e retorna sem mudança.
     - Reconhece padrões `^<sigla>\s*-\s*DD/MM/YYYY$` (case-insensitive), onde `<sigla>` é uma das:
       - `LTN` → `tesouro-prefixado`
       - `NTN-F` → `tesouro-prefixado-com-juros-semestrais`
       - `NTN-B Principal` (ou `NTNB Principal`) → `tesouro-ipca`
       - `NTN-B` → `tesouro-ipca-com-juros-semestrais`
       - `LFT` → `tesouro-selic`
       - `NTN-B1 Educa` / `Educa+` → `tesouro-educa-mais`
       - `NTN-B1 Renda` / `Renda+` → `tesouro-renda-mais-aposentadoria-extra`
     - Converte `DD/MM/YYYY` → `DD-MM-YYYY` e devolve `<slug-base>-DD-MM-YYYY:td`.
   - Atualizar `handleFetchMaisRetornoData` para passar o input pelo helper antes de enviar para a edge function. Se o helper detectou um nome de TD e converteu, mostrar o slug resolvido no campo (substituindo o texto pelo identifier final) para o usuário ver/confirmar.
   - Manter o comportamento de salvar `mr_identifier` no `RAG_Processador` (ele guardará o slug normalizado).
   - Atualizar `placeholder` e a dica abaixo do input para incluir o exemplo `LTN - 01/01/2032`.

3. **Pré-preenchimento do identifier**: quando abrir a calculadora para um ativo cujo nome bate no padrão `SIGLA - DD/MM/YYYY` e não houver `mr_identifier` salvo no RAG, propor o slug automaticamente no campo (apenas se o estado atual estiver vazio).

## Sem mudanças
- A edge function `get-maisretorno-return` continua igual (já aceita `slug:td`).
- A edge function `get-treasury-return` permanece no projeto por enquanto (não é deletada, apenas deixa de ser chamada pela UI).
- Nenhuma migração de banco.

## Validação
- Abrir calculadora → confirmar que só existem os modos Auto / Manual / Custom / Mercado / Mais Retorno (sem botão "Tesouro").
- No modo Mais Retorno, digitar `LTN - 01/01/2032` + competência `03/2025` → o campo passa a mostrar `tesouro-prefixado-01-01-2032:td` e a busca retorna a rentabilidade.
- Repetir para `NTN-B Principal - 15/05/2035` e `LFT - 01/03/2030`.
- Confirmar que o valor é aplicado ao item ao clicar em Confirmar.

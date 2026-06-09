## Comportamento desejado nos inputs de Liquidez (modal de edição)

1. **Auto-preencher o outro lado com `D+0` ao digitar**
   - Ao digitar em **Dias corridos**, se **Dias úteis** estiver vazio, preenche `liquidez_uteis = "D+0"` automaticamente.
   - Ao digitar em **Dias úteis**, se **Dias corridos** estiver vazio, preenche `liquidez_corridos = "D+0"`.
   - Se o usuário apagar o conteúdo do input (`num === ''`), o campo volta a `null` — mas o auto-preencher do outro lado só dispara enquanto houver digitação válida (não força `D+0` ao limpar).
   - Se o outro lado já tiver valor (inclusive `D+0` que o usuário trocou), preserva o valor.

2. **Botão X agora limpa os dois campos**
   - Mostrar um único X (ainda renderizado ao lado de cada input para manter a UI atual), mas ambos passam a chamar a mesma ação: `setEditingItem({...editingItem, liquidez_corridos: null, liquidez_uteis: null})`.
   - O X continua aparecendo quando qualquer um dos dois estiver preenchido (`liquidez_corridos || liquidez_uteis`), em vez de só quando o seu próprio campo tiver valor.

## Arquivo afetado

- `src/pages/DataManagement.tsx`, bloco dos inputs de liquidez (linhas ~6557-6608).

## Detalhes

- A função de limpar passa a ser um único helper inline `clearLiquidez = () => setEditingItem({...editingItem, liquidez_corridos: null, liquidez_uteis: null})`.
- A lógica do `onChange` vira algo como:
  ```ts
  const num = e.target.value.replace(/\D/g, '');
  setEditingItem({
    ...editingItem,
    liquidez_corridos: num ? `D+${num}` : null,
    liquidez_uteis: num && !editingItem.liquidez_uteis ? 'D+0' : editingItem.liquidez_uteis,
  });
  ```
  (espelhado para o input de úteis).
- Nenhum impacto na lógica de gravação no banco: o `normalizeLiquidezPair` já existente continua válido como rede de segurança.

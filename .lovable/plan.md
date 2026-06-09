## Objetivo

Ao gravar liquidez no banco (DadosPerformance e RAG_Processador), aplicar a regra:

- Os dois campos vazios → ambos `null`
- Apenas `liquidez_corridos` preenchido → `liquidez_uteis = "D+0"` (não `null`)
- Apenas `liquidez_uteis` preenchido → `liquidez_corridos = "D+0"` (não `null`)
- Ambos preenchidos → mantém os valores informados

Hoje o campo "vazio" é gravado como `null`, o que dificulta diferenciar "não informado" de "liquidez imediata". A regra acima garante que, sempre que um dos dois for informado, o outro vire `0` explícito.

## Alterações em `src/pages/DataManagement.tsx`

1. **Helper único** `normalizeLiquidezPair(corridos, uteis)` no topo do arquivo (junto dos outros helpers de liquidez):
   - Faz trim e ignora strings vazias.
   - Retorna `{ corridos: null, uteis: null }` se ambos vazios.
   - Caso apenas um esteja preenchido, completa o outro com `"D+0"`.
   - Caso ambos preenchidos, devolve como estão.

2. **`handleSave`** (linha ~1863, salvamento principal do item editado em DadosPerformance):
   - Antes de montar `cleanedData`, aplicar `normalizeLiquidezPair` em `editingItem.liquidez_corridos` / `liquidez_uteis`.
   - Como o `cleanedData` atual remove valores `''` mas mantém `null`, garantir que os campos normalizados sejam atribuídos explicitamente (inclusive `null` quando ambos vazios) para sobrescrever no banco.

3. **`handleSaveLiquidez`** (linha ~1759) e **`handleConfirmRagLiquidezUpdate`** (linha ~1825):
   - Aplicar `normalizeLiquidezPair` em `corridosNovo` / `uteisNovo` antes de inserir/atualizar `RAG_Processador` e antes do update em massa em `DadosPerformance`.
   - Atualizar `editingItem` no estado com os mesmos valores normalizados.
   - Validação atual ("precisa pelo menos um campo") permanece — só dispara quando ao menos um foi informado.

4. **`handleBulkFillLiquidezFromRAG`** (linha ~2138, patch a partir do RAG):
   - Após decidir quais campos copiar do RAG para o item, passar o par final por `normalizeLiquidezPair` antes do update em `DadosPerformance`, mantendo a regra: se o item terminar com apenas um lado preenchido, o outro vira `"D+0"`.

## Observações

- Não há alteração de schema; as colunas continuam `text` aceitando `"D+0"`.
- A leitura/exibição (`formatLiquidezDisplay`, `getLiquidezOrderValue`) já trata `"D+0"` corretamente como valor válido — nenhum ajuste necessário ali.
- O comportamento de "limpar" (botão X em cada input) continua zerando o campo individual; a regra de preencher o outro com `D+0` só vale no momento da gravação no banco.

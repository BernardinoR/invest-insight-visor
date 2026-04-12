

# Plano: Auto-preencher indexador e taxa no Calcular Manual pela classe do ativo

## Problema
Ao abrir a calculadora no modo Manual, o indexador sempre começa em "CDI" com 100%. O usuário precisa mudar manualmente para Pré ou IPCA+ mesmo quando a classe do ativo já indica o tipo.

## Solução
Criar uma função `inferIndexadorFromClasse` que mapeia a classe do ativo para o indexador correto e parsear o campo `Taxa` do ativo para pré-preencher o percentual.

### Mapeamento de classes:
- `CDI - *` → indexador `CDI`, operação `%`, taxa do campo Taxa (ex: "110" → 110% do CDI)
- `Inflação - *` → indexador `IPCA`, operação `+`, taxa do campo Taxa (ex: "6" → IPCA+6%)
- `Pré Fixado - *` → indexador `PRE`, taxa do campo Taxa (ex: "14" → 14% a.a.)
- Demais classes → mantém CDI 100% como padrão

### Arquivo: `src/pages/DataManagement.tsx`

**Nova função `inferManualCalcFromAtivo(editingItem)`:**
- Lê `editingItem["Classe do ativo"]` para determinar o indexador
- Lê `editingItem.Taxa` (string) e extrai o número para preencher o percentual
- Para CDI: detecta se taxa contém "+" para definir `cdiOperacao`
- Retorna `{ indexador, percentual, cdiOperacao, ipcaOperacao }`

**Alteração nos 2 locais onde `setManualCalcData` é chamado (linhas ~5571 e ~5826):**
De:
```js
setManualCalcData({...manualCalcData, competencia: editingItem.Competencia || ''});
```
Para:
```js
const inferred = inferManualCalcFromAtivo(editingItem);
setManualCalcData({...manualCalcData, competencia: editingItem.Competencia || '', ...inferred});
```

Resultado: ao abrir a calculadora, se o ativo é "Pré Fixado - Titulos" com Taxa "14", já aparece indexador PRE com 14% preenchido. Se é "Inflação - Titulos" com Taxa "6", aparece IPCA+ com 6%.


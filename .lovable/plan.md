

# Plano: Corrigir máscara de competência e pré-preencher no modo Manual

## Problemas
1. **Regex quebrado**: `replace(/D/g, '')` deveria ser `replace(/\D/g, '')` — sem o `\`, remove apenas a letra "D" em vez de caracteres não-numéricos, causando barras duplicadas a cada tecla.
2. **Competência não pré-preenchida**: Ao abrir a calculadora no modo Manual, `manualCalcData.competencia` não recebe o valor de `editingItem.Competencia`, obrigando o usuário a digitar novamente.

## Mudanças

### 1. Corrigir regex da máscara (linha ~6169)
`/D/g` → `/\D/g` para remover corretamente caracteres não-numéricos antes de aplicar a barra.

### 2. Pré-preencher competência ao abrir calculadora (linhas ~5790 e ~5540)
Nos dois locais onde `setIsCalculatorOpen(true)` é chamado com contexto `single`, adicionar:
```
setManualCalcData({...manualCalcData, competencia: editingItem.Competencia || ''});
```

### Arquivo alterado
`src/pages/DataManagement.tsx`


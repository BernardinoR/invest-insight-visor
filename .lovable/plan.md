

# Plano: Corrigir bug no parse de número brasileiro no DataManagement

## Problema
Na função `parseBrazilianNumber` (linha 104 de `DataManagement.tsx`), a regex `/./g` não tem o ponto escapado. O `.` em regex significa "qualquer caractere", então `cleaned.replace(/./g, '')` apaga a string inteira, resultando em `parseFloat("")` → `NaN` → `0`.

## Solução
Uma única correção de 1 caractere:

**Linha 104 de `src/pages/DataManagement.tsx`:**
```ts
// De:
cleaned = cleaned.replace(/./g, '');
// Para:
cleaned = cleaned.replace(/\./g, '');
```

Isso faz o regex casar apenas pontos literais (separadores de milhares), mantendo os dígitos e a vírgula intactos para o parse correto.


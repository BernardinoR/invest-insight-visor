

# Plano: Inputs de resgate com formato numérico brasileiro

## Problema
Os campos de resgate usam `type="number"` que aceita ponto como decimal (padrão americano). No Brasil, o separador decimal é vírgula.

## Solução
Trocar os inputs de resgate de `type="number"` para `type="text"` com tratamento manual de formatação brasileira (vírgula como decimal, ponto como milhares).

### Alterações em `src/components/RolloverDialog.tsx`

**1. Função auxiliar `parseBRNumber`:**
Converte string no formato brasileiro ("1.234,56") para número JS (1234.56):
```ts
const parseBRNumber = (str: string): number => {
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};
```

**2. Função auxiliar `formatBRNumber`:**
Formata número para exibição no input:
```ts
const formatBRNumber = (val: number): string => {
  if (val === 0) return '';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
```

**3. Input proporcional (linha ~492-500):**
- Mudar `type="text"`, remover `step`/`min`
- `value={formatBRNumber(resgate)}`
- `onChange`: usar `parseBRNumber` antes de chamar `handleResgateChange`
- Permitir digitação livre (vírgula, ponto como milhares)

**4. Input por ativo (linha ~540-548):**
- Mesma mudança: `type="text"`, `parseBRNumber` no onChange, `formatBRNumber` no value

**5. Abordagem de digitação:**
Para permitir digitação fluida, o value será a string digitada (não formatada em tempo real). A formatação/parse acontece no `onBlur` para não atrapalhar a digitação. Usaremos estados auxiliares de string para os inputs.


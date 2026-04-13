

# Plano: Corrigir campo que zera ao colar número no editar consolidado

## Problema
Quando o usuário cola um valor como "477.714,47", o navegador pode disparar `onChange` e `onBlur` quase simultaneamente. O `onBlur` lê o valor do estado React (`numericFieldsText`), mas o `setState` do `onChange` ainda não foi aplicado — então ele lê o valor antigo (vazio ou "0,00"), faz o parse para 0, e sobrescreve o campo.

## Solução
Nos handlers `onBlur` de todos os campos numéricos do consolidado e detalhado, ler o valor diretamente do elemento DOM (`e.target.value`) em vez de ler do estado React. Isso garante que o valor mais recente (incluindo o texto colado) seja usado no parse.

### Alterações em `src/pages/DataManagement.tsx`

Todos os ~6 campos numéricos do consolidado (Patrimônio Inicial, Movimentação, Impostos, Ganho Financeiro, Patrimônio Final) e o campo Posição do detalhado precisam da mesma mudança:

**De:**
```tsx
onBlur={() => {
  const text = numericFieldsText["Patrimonio Final"];
  const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
  ...
}}
```

**Para:**
```tsx
onBlur={(e) => {
  const text = e.target.value;
  const numericValue = (!text || text.trim() === '') ? 0 : parseBrazilianNumber(text);
  ...
}}
```

São ~6 substituições simples, todas seguindo o mesmo padrão: trocar a leitura de `numericFieldsText[campo]` por `e.target.value` no `onBlur`.


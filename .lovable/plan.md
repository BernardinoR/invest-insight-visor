## Objetivo

Atualizar a função `shouldExcludeFromProfitability` em `src/components/InvestmentDetailsTable.tsx` para reconhecer dois novos ativos de caixa recebidos do BTG: "Valor em trânsito" e "Dinheiro em Garantia".

## Alteração

Arquivo: `src/components/InvestmentDetailsTable.tsx` (linhas 112-115)

Substituir a função atual:

```tsx
const shouldExcludeFromProfitability = (assetName: string): boolean => {
  const normalizedName = assetName.toLowerCase().trim();
  return normalizedName === 'caixa' || normalizedName === 'proventos';
};
```

Por:

```tsx
const shouldExcludeFromProfitability = (assetName: string): boolean => {
  const normalizedName = assetName.toLowerCase().trim();
  return (
    normalizedName === 'caixa' ||
    normalizedName === 'proventos' ||
    normalizedName === 'valor em trânsito' ||
    normalizedName === 'valor em transito' ||
    normalizedName === 'dinheiro em garantia'
  );
};
```

## Critérios mantidos

- Match exato (`===`), nunca `includes` ou `startsWith`, para evitar excluir fundos reais cujo nome contenha essas palavras.
- Incluir a variante sem acento (`valor em transito`) porque o dado pode chegar das duas formas.
- Nenhuma outra alteração no arquivo ou em outro lugar do projeto.

## Validação

- Build TypeScript sem erros.
- Verificar visualmente que os ativos "Valor em trânsito" e "Dinheiro em Garantia" continuam aparecendo na tabela de alocação/patrimônio, mas não entram no cálculo de rentabilidade ponderada das estratégias.
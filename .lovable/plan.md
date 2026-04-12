

# Plano: Campo de Resgate Proporcional no Avançar Competência

## Problema
No rollover multi-ativos, não há como informar um resgate total da competência que seja distribuído proporcionalmente entre os ativos.

## Solução
Adicionar um campo "Resgate" na seção multi-ativos do `RolloverDialog`. O valor digitado será subtraído proporcionalmente (por peso de posição) de cada ativo após o cálculo de rentabilidade. O consolidado gerado terá o resgate registrado no campo `Movimentação` (como valor negativo).

### Arquivo: `src/components/RolloverDialog.tsx`

**1. Novo estado:**
```ts
const [resgate, setResgate] = useState<number>(0);
```
Reset para 0 no `useEffect` de inicialização.

**2. Campo na UI (entre "Aplicar a todos" e a tabela):**
Um input numérico com label "Resgate da competência (R$)". Ao alterar, recalcula as novas posições de todos os ativos subtraindo o resgate proporcional.

**3. Lógica de distribuição proporcional:**
Após calcular `novaPosicao` pela rentabilidade, subtrai de cada ativo:
```
resgateDoAtivo = resgate * (posicaoAtual_i / somaPosicaoAtual)
novaPosicaoFinal = novaPosicaoAposRendimento - resgateDoAtivo
```

Isso será aplicado em:
- `handleApplyAll` — recalcula com resgate
- `recalcAtivo` — ao mudar modo/param individual, aplica resgate proporcional
- `totalNovaPosicao` — já soma as novaPosicao que incluem o resgate

**4. No `handleExecuteRollover`:**
- O campo `Movimentação` do consolidado recebe `-resgate` (negativo)
- `Patrimonio Final` = soma das novas posições (já com resgate descontado)
- `Ganho Financeiro` = `patrimonioFinal - patrimonioInicial + resgate` (pois resgate não é perda de performance)

**5. Resumo visual:**
Adicionar linha "Resgate" no bloco de summary abaixo da tabela, mostrando o valor em vermelho.


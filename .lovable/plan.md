

# Plano: Resgate por ativo específico no Avançar Competência

## Problema
Atualmente o resgate é distribuído proporcionalmente entre todos os ativos. O usuário quer poder escolher em qual(is) ativo(s) aplicar o resgate, podendo ser proporcional (atual) ou direcionado a um ativo específico.

## Solução
Adicionar um seletor de modo de resgate ("Proporcional" vs "Por ativo") e, no modo "Por ativo", uma coluna extra na tabela para informar o resgate individual de cada ativo.

### Alterações em `src/components/RolloverDialog.tsx`

**1. Novo estado:**
```ts
const [resgateMode, setResgateMode] = useState<'proporcional' | 'por_ativo'>('proporcional');
const [resgatesPorAtivo, setResgatesPorAtivo] = useState<Record<string, number>>({});
```

**2. UI do campo de resgate (linhas ~436-448):**
- Adicionar toggle/select entre "Proporcional" e "Por ativo"
- No modo "Proporcional": mantém o input atual de valor total
- No modo "Por ativo": esconde o input total (o total será a soma dos individuais)

**3. Tabela multi-ativos (linhas ~451-493):**
- No modo "Por ativo", adicionar coluna "Resgate" com input numérico por linha
- Ao alterar o resgate de um ativo, subtrair da novaPosicao daquele ativo (posBase - resgateIndividual)
- Exibir total de resgates abaixo da tabela

**4. Lógica `applyResgateToAtivos`:**
- Se modo = "proporcional": distribui proporcionalmente (lógica atual)
- Se modo = "por_ativo": subtrai o valor específico de cada ativo usando `resgatesPorAtivo[ativo.id]`

**5. `handleResgateChange` e `handleResgateAtivoChange`:**
- `handleResgateChange`: modo proporcional (já existe)
- Nova `handleResgateAtivoChange(ativoId, valor)`: atualiza `resgatesPorAtivo` e recalcula novaPosicao daquele ativo

**6. `handleExecuteRollover`:**
- `resgate` total = modo proporcional ? valor do input : soma dos `resgatesPorAtivo`
- Resto da lógica (Movimentação, Ganho Financeiro) permanece igual

**7. Resumo:**
- Mostra o total de resgate (soma) independente do modo escolhido




# Plano: Editar Config Salva + Auto-Cálculo no Split

## Problema
1. Na aba "Configs Salvas" não há botão de editar — só Aplicar e Excluir.
2. Ao aplicar o split, o consolidado novo é criado com Rendimento=0 e sem cálculos; o original também não recalcula.

## Alterações

### 1. Botão "Editar" na aba Configs Salvas (`SplitAccountDialog.tsx`)

Adicionar um botão "Editar" (ícone Edit) ao lado de "Aplicar" em cada config salva. Ao clicar:
- Carrega a config no formulário (mesma lógica do `handleApplyConfig`, mas usando os ativos da conta atual)
- Troca para a aba "form" para edição
- O usuário pode alterar seleções/percentuais e salvar com "Salvar Config"

### 2. Auto-cálculo ao aplicar o split (`SplitAccountDialog.tsx` — `handleApply`)

Após mover os ativos, calcular automaticamente os consolidados (conta original e nova) usando a mesma lógica de média ponderada que já existe no `calculateWeightedReturn`:

Para cada consolidado (original e novo):
1. Buscar os `DadosPerformance` vinculados (mesma competência, instituição, nomeConta)
2. **Patrimônio Final** = soma das Posições
3. **Rendimento** = média ponderada (Σ Posição × Rendimento / Σ Posição)
4. **Patrimônio Inicial** = Patrimônio Final / (1 + Rendimento)
5. **Ganho Financeiro** = Patrimônio Final - Patrimônio Inicial

Isso substitui a lógica atual que simplesmente subtrai `totalTransferido` do original e cria o novo com Rendimento=0.

### Detalhes técnicos

- Extrair uma função `calcularConsolidadoFromAtivos(ativos[])` que recebe os registros de DadosPerformance e retorna `{ patrimonioFinal, patrimonioInicial, ganhoFinanceiro, rendimento }`
- No `handleApply`, após executar as operações de split nos DadosPerformance:
  - Fazer SELECT dos ativos atualizados de cada conta (original e destino)
  - Calcular e fazer UPDATE/INSERT nos consolidados com os valores corretos
- Sem migration necessária — mesmas tabelas


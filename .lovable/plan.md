## O que encontrei (verificado no banco e no código)

No banco, o cliente Ademar João Grieger tem 2 configs ativas para XP / origem "" (`account_split_configs`): **Viagem Europa** (Arx AF Invest Geraes) e **Reserva Carro** (Arx Denali). Ou seja, salvar várias configs já funciona — o problema é o **carregamento** delas.

Três defeitos reais em `src/components/SplitAccountDialog.tsx`:

1. **`loadConfigIntoForm` ignora a competência.** Ele procura em `consolidadoData` o primeiro registro com mesma instituição + conta de origem, sem filtrar pela competência do consolidado que está aberto. Como o Ademar tem XP/origem "" em 12/2023, 01/2024 e 02/2024, ao clicar em "Editar"/"Aplicar" na config de Reserva Carro ele pode montar a lista de ativos de **outro mês**. Os nomes de `ativos_especificos` então não batem com nada → nenhuma linha marcada → botão "Aplicar Split" fica desabilitado. Pior: `handleApply` continua usando o `consolidado` original (outro mês), então aplicaria no lugar errado.

2. **Config já aplicada na competência = tabela sem o ativo.** Confirmado no banco: em 01/2024 o "Arx Denali" já está com `nomeConta = 'Reserva Carro'`. A tabela do dialog só lista ativos da conta de **origem**, então o ativo simplesmente some e nada fica marcado — sem nenhuma mensagem explicando que a config já foi aplicada.

3. **Destino sem `trim` e consolidado destino sempre inserido.** No banco existe `nomeConta = ' Viagem Europa'` (com espaço à esquerda) em 12/2023, criando uma conta duplicada. E `handleApply` faz `insert` incondicional em `ConsolidadoPerformance` para o destino, duplicando a linha se o split for reaplicado.

## Correções

**A. Casar config com a competência atual**
- Em `loadConfigIntoForm`, priorizar o `consolidado` atualmente aberto quando instituição + conta de origem baterem; caso contrário, filtrar `consolidadoData` também por `Competencia === consolidado.Competencia`.
- Se nada bater na competência atual, manter o toast de erro atual (mensagem incluindo a competência).
- Passar o `match` para o estado usado pelo `handleApply`, para nunca aplicar em um consolidado diferente do exibido nos badges.

**B. Mostrar ativos já separados**
- Ao carregar uma config, além dos ativos da origem, buscar em `dadosData` os ativos da mesma competência/instituição que já estão na conta **destino** da config.
- Exibi-los na tabela em linhas com badge "já separado" (checkbox marcado e desabilitado, sem entrar em `totalTransferido`).
- Acima da tabela, quando todos os ativos da config já estão no destino, mostrar aviso: "Esta config já foi aplicada nesta competência" — deixando claro por que "Aplicar Split" está desabilitado.

**C. Higiene do destino**
- Aplicar `nomeContaDestino.trim()` em todos os writes (`buildConfigPayload`, updates de `DadosPerformance`, insert do consolidado destino, comparação de `shouldUpdateExisting`).
- Em `handleApply`, antes de inserir o consolidado do destino, verificar se já existe um (Nome + Competência + Instituição + nomeConta): se existir, fazer `update` dos valores recalculados em vez de `insert`.

## Detalhes técnicos

- Novo estado `activeConsolidado` (default = prop `consolidado`) usado por `handleApply` e pelos badges do topo, atualizado por `handleEditConfig`/`handleApplyConfig`.
- Tipo `SplitAtivo` ganha `jaSeparado?: boolean`; `handleToggle`/`handlePercentChange` ignoram linhas com essa flag, e os totais somam apenas as selecionadas não-separadas.
- Nenhuma mudança de schema. Os dados já gravados com `' Viagem Europa'` continuam como estão — posso limpar esse espaço em uma migração à parte, se você quiser.

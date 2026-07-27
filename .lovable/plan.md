## Problema (confirmado no código)

Em `src/components/SplitAccountDialog.tsx`, ao abrir o dialog para um consolidado, `loadSavedConfig` busca a **primeira** config ativa daquela combinação (cliente + instituição + conta de origem) com `.limit(1)` e joga o `id` dela em `configId`. Como `handleSaveConfig` faz `UPDATE` sempre que `configId` existe, qualquer segunda config criada a partir da mesma conta de origem **sobrescreve** a primeira — mesmo com destino diferente.

Não há restrição no banco impedindo múltiplas linhas (só a PK em `id`), então é puramente lógica de UI.

## Solução

Tratar o formulário como "nova config" por padrão e só entrar em modo edição quando o usuário escolher explicitamente uma config salva.

1. **Não pré-carregar config por origem.** Em `loadSavedConfig`, remover a busca por (cliente, instituição, conta origem); manter apenas o caminho `forceConfigId` (usado por "Editar" na aba Configs Salvas e pelo `preloadConfigId`). Sem `forceConfigId`, o form abre limpo com `configId = null`.

2. **Listar as configs existentes da origem dentro da aba do formulário.** Acima do campo de destino, mostrar as configs já salvas para aquela conta de origem (badges de destino + botão "Editar") para o usuário saber que existem e poder carregar uma delas em vez de recriar.

3. **Indicador de modo no form.** Quando `configId` está setado, mostrar badge "Editando config: {destino}" e um botão "Nova config" que limpa `configId`, destino, flag "outra pessoa" e as seleções — permitindo salvar uma segunda regra sem sair do dialog.

4. **Salvar como nova quando o destino muda.** Em `handleSaveConfig`, se `configId` existe mas o `nome_conta_destino` do form é diferente do destino da config carregada, fazer `INSERT` em vez de `UPDATE` (proteção contra sobrescrita acidental). Mesma proteção no caminho de `handleApply`.

5. **Após salvar**, atualizar `configId` com o id resultante e recarregar a lista (`fetchConfigs`), mantendo o toast atual.

## Detalhes técnicos

- Guardar o destino original carregado em um estado `loadedDestino` para a comparação do item 4.
- A lista da aba "Configs Salvas" já é por cliente e continua igual; ganha naturalmente várias linhas.
- Nenhuma mudança de schema nem migração; nenhum write existente é removido.

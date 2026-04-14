

# Plano: Gerenciamento de Configs de Split Salvas

## Problema
Hoje a config de split só carrega automaticamente ao clicar no botão Scissors de um consolidado específico. Não há uma interface para ver, gerenciar ou reaplicar configs salvas em novas competências.

## Solução
Adicionar uma seção/painel no DataManagement que lista as configs de split salvas para o cliente atual, permitindo visualizar, editar, deletar e reaplicar em qualquer competência.

## Alterações

### 1. Novo componente: `SplitConfigsPanel.tsx`
Um painel/card que mostra as configs salvas do cliente selecionado:

```text
┌─ Configurações de Split Salvas ──────────────────────┐
│                                                       │
│  Warren → Maria Luiza                                │
│  Ativos: CDB X (100%), Fundo ABC (30%)              │
│  [Aplicar na competência atual]  [Editar]  [Excluir] │
│                                                       │
│  BTG → Conta Filho                                   │
│  Ativos: LCI Y (100%)                               │
│  [Aplicar na competência atual]  [Editar]  [Excluir] │
│                                                       │
└───────────────────────────────────────────────────────┘
```

- Busca configs de `account_split_configs` filtradas pelo cliente atual
- Mostra instituição, conta destino, e resumo dos ativos/percentuais
- Botão "Aplicar" abre o SplitAccountDialog pré-populado com a config, apontando para a competência selecionada
- Botão "Editar" abre o mesmo dialog para edição
- Botão "Excluir" remove a config (com confirmação)

### 2. Integração no `DataManagement.tsx`
- Adicionar um botão ou aba "Configs de Split" no header da página (ao lado de outros controles)
- Ou um Collapsible/Accordion abaixo da tabela de consolidados
- Ao clicar "Aplicar", identifica o consolidado correspondente (mesma instituição + competência selecionada) e abre o SplitAccountDialog com a config carregada

### 3. Ajuste no `SplitAccountDialog.tsx`
- Aceitar uma prop opcional `preloadConfigId` para forçar o carregamento de uma config específica (em vez de buscar por cliente/instituição)
- Isso permite abrir o dialog a partir do painel de configs salvas

## Detalhes técnicos
- Query: `SELECT * FROM account_split_configs WHERE cliente = ? AND ativo = true`
- O painel exibe `ativos_especificos` (JSONB) de forma legível
- "Aplicar" encontra o consolidado da competência atual que bate com a instituição/nome_conta_origem da config
- Sem migração necessária — usa a tabela `account_split_configs` existente


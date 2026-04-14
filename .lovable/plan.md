

# Plano: Mover Configs de Split para aba no Dialog

## Problema
O painel de configs salvas está posicionado de forma estranha no layout atual do DataManagement.

## Solução
Remover o `SplitConfigsPanel` como componente separado e criar um sistema de abas dentro do `SplitAccountDialog` com duas abas:

1. **"Separar Conta"** — o formulário atual (seleção de ativos, percentuais, aplicar)
2. **"Configs Salvas"** — lista de configs salvas do cliente, com ações Aplicar/Excluir

## Alterações

### 1. `SplitAccountDialog.tsx`
- Adicionar `Tabs` / `TabsList` / `TabsContent` do shadcn dentro do dialog
- Aba 1: conteúdo atual (formulário de split)
- Aba 2: lógica que hoje está no `SplitConfigsPanel` — lista configs salvas, botões Aplicar (pré-popula a aba 1) e Excluir
- Ao clicar "Aplicar" numa config salva, troca para a aba 1 com os dados carregados

### 2. `DataManagement.tsx`
- Remover `SplitConfigsPanel` e seus estados relacionados (`showSplitConfigs`, `splitConfigsRefreshKey`)
- Manter o botão Scissors no consolidado que abre o dialog
- Adicionar um botão separado (ou manter o Scissors) que abre o dialog direto na aba de configs salvas

### 3. `SplitConfigsPanel.tsx`
- Deletar o arquivo (lógica migrada para dentro do dialog)


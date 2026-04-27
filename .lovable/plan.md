## Objetivo
Substituir a UX atual (digitar manualmente "Ativo Original" na aba "Ajustes de Ativos") por um fluxo direto: na aba **Ativos**, cada linha ganha um botão de ação que abre o dialog de criação de regra de override **já pré-preenchido** com Cliente + Instituição + Ativo Original + (Classe / Emissor / Taxa / Vencimento / Liquidez do registro como sugestão inicial).

## Mudanças

### 1. `src/components/AssetOverridesTab.tsx`
- Expor uma forma imperativa de abrir o dialog de criação com dados pré-preenchidos. Opções:
  - Adicionar prop `prefillRequest?: { instituicao; ativo_original; ativo_novo?; classe_ativo?; emissor?; taxa?; vencimento?; liquidez? } & { nonce: number }`.
  - Em `useEffect([prefillRequest?.nonce])`: setar `form` com os campos recebidos (sem `id`) e `setIsDialogOpen(true)`.
- Manter o botão "Nova regra" existente para criação manual.

### 2. `src/pages/DataManagement.tsx`
- Novo state: `const [overridePrefill, setOverridePrefill] = useState<{...; nonce: number} | null>(null)`.
- Nova função `handleCreateOverrideFromAsset(item)`:
  1. Monta payload: `instituicao = item.Instituicao`, `ativo_original = item.Ativo`, e copia `Classe do ativo → classe_ativo`, `Emissor → emissor`, `Taxa → taxa`, `Vencimento → vencimento`, `liquidez → liquidez`. Deixa `ativo_novo` vazio (usuário preenche se quiser renomear).
  2. `setOverridePrefill({...payload, nonce: Date.now()})`.
  3. `setActiveTab('overrides')` para trocar para a aba de ajustes.
- Na coluna **Ações** da tabela de ativos detalhados (linhas 5659-5693), adicionar um botão `Wand2` (mesma 32px square, cor primária) com tooltip **"Criar ajuste deste ativo"**, posicionado entre "Copiar" e "Editar".
- Passar `prefillRequest={overridePrefill ?? undefined}` para `<AssetOverridesTab>`.

### 3. Comportamento esperado
- Clicar no botão `Wand2` na linha de um ativo:
  1. Abre a aba "Ajustes de Ativos".
  2. Abre automaticamente o dialog "Nova regra de ajuste".
  3. Campos Cliente / Instituição / Ativo Original já preenchidos e bloqueados visualmente (Cliente já é, Instituição via Select, Ativo Original como Input).
  4. Sugestões iniciais de Classe/Emissor/Taxa/Vencimento/Liquidez vindas do registro — o usuário ajusta o que quiser e salva.
- Se já existir override para esse `(cliente, instituicao, ativo_original)`, o botão `Wand2` da linha pode redirecionar para edição: detectar via `overridesIndex` e, em caso de match, chamar um modo "edit" (ou apenas abrir o dialog em modo create — o constraint UNIQUE no banco vai impedir duplicatas e podemos exibir toast). **Decisão proposta:** se já houver regra, em vez de abrir create, navegar para overrides tab e fazer scroll/destacar a linha existente (fase futura) — por ora, abrir o dialog de criação e deixar o erro de UNIQUE apenas como fallback é aceitável; podemos também desabilitar o botão e trocar por um link "Editar regra" quando já existir. **Recomendação:** desabilitar o `Wand2` (ou trocar ícone) quando `overridesIndex.has(${item.Instituicao}|${item.Ativo})` e exibir tooltip "Já existe ajuste — clique no badge Ajustado para gerenciar".

### 4. Sem mudanças de banco
A tabela `asset_overrides` e o componente já estão prontos. Apenas UI/fluxo.

## Resultado
- Criar um ajuste vira 1 clique a partir do ativo real, sem digitação manual de nome/instituição → menor chance de erro de digitação e match garantido com o pipeline.
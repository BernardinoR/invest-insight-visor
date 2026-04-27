# Remover campo "Observação" do formulário de regras de ajuste

Remover o campo "Observação" do diálogo "Nova regra / Editar regra" em `src/components/AssetOverridesTab.tsx`.

## Alterações

Em `src/components/AssetOverridesTab.tsx`:

1. Remover `observacao: string` do tipo `FormState`.
2. Remover `observacao: ""` de `emptyForm`.
3. Remover `observacao: ""` do bloco de prefill (`useEffect` do `prefillRequest`).
4. Remover `observacao: o.observacao || ""` de `openEdit`.
5. Remover `observacao: form.observacao.trim() || null` do `payload` de upsert.
6. Remover do JSX o `<Separator />` e o bloco `<div>` com `<Label>Observação</Label>` + `<Textarea>` (logo antes do bloco "Regra ativa").

## Notas

- A coluna `observacao` da tabela `asset_overrides` permanece no banco. Apenas paramos de gravar/editar pela UI; valores existentes continuam intactos.
- Nenhum outro arquivo é afetado.

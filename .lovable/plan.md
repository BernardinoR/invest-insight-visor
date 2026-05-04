## Objetivo

Quando o usuário cria/edita uma regra em "Ajustes de Ativos" e confirma, além de salvar em `asset_overrides`, aplicar **imediatamente** os valores nos registros existentes em `DadosPerformance` que batem com `Cliente + Instituição + Ativo Original`. Não esperar a próxima ingestão do n8n.

## Padronização de nomenclatura

A coluna no banco se chama **`nome_ajustado`** (em `asset_overrides`). O estado interno do form em `AssetOverridesTab.tsx` ainda usa `ativo_novo` por legado, mas no payload e nos toasts/labels vamos referir como **"nome ajustado"** para ficar consistente com a tabela. O campo do form continua sendo lido como `form.ativo_novo` (mapeado de `nome_ajustado` no fetch), sem renomear nada — apenas o texto de UI e o destino do UPDATE.

## Comportamento

Em `handleSave` (`src/components/AssetOverridesTab.tsx`), após o upsert em `asset_overrides` ter sucesso e antes do `fetchOverrides()`, executar um `UPDATE` em `DadosPerformance` somente para os campos preenchidos na regra:

| Campo da regra (form)       | Coluna em `DadosPerformance` |
|-----------------------------|------------------------------|
| `ativo_novo` (= nome_ajustado) | `Ativo`                   |
| `classe_ativo`              | `Classe do ativo`            |
| `emissor`                   | `Emissor`                    |
| `taxa`                      | `Taxa`                       |
| `vencimento`                | `Vencimento`                 |
| `liquidez`                  | `liquidez`                   |

Regras:
- Só aplica quando `form.ativo === true` (regra ligada).
- Campos vazios da regra **não** sobrescrevem.
- WHERE: `Nome = cliente AND Instituicao = instituicao AND Ativo IN (ativo_original, nome_ajustado_anterior)` — o segundo termo cobre o caso de **edição** quando os registros já foram renomeados anteriormente. Para isso, em `openEdit` guardamos `originalNomeAjustado = o.ativo_novo` num ref/state e usamos no WHERE.
- Toast final inclui contagem: "Regra criada — N registro(s) ajustado(s) imediatamente."
- Se o UPDATE falhar, **não bloquear** o fluxo (a regra já foi salva): mostrar toast separado com o erro.

## Implementação

Arquivo único: `src/components/AssetOverridesTab.tsx`

1. Adicionar state `const [originalNomeAjustado, setOriginalNomeAjustado] = useState<string>("")`.
2. Em `openEdit`, setar `setOriginalNomeAjustado(o.ativo_novo || "")`.
3. Em `openCreate` e ao consumir `prefillRequest`, setar `setOriginalNomeAjustado("")`.
4. Em `handleSave`, após o sucesso do insert/update em `asset_overrides`:

```ts
if (form.ativo) {
  const updates: Record<string, any> = {};
  if (form.ativo_novo.trim())  updates["Ativo"] = form.ativo_novo.trim();
  if (form.classe_ativo)        updates["Classe do ativo"] = form.classe_ativo;
  if (form.emissor.trim())      updates["Emissor"] = form.emissor.trim();
  if (form.taxa.trim())         updates["Taxa"] = form.taxa.trim();
  if (form.vencimento)          updates["Vencimento"] = form.vencimento;
  if (form.liquidez.trim())     updates["liquidez"] = form.liquidez.trim();

  if (Object.keys(updates).length > 0) {
    const ativoMatches = [form.ativo_original.trim(), originalNomeAjustado.trim()]
      .filter(Boolean);
    const { error: updErr, count } = await supabase
      .from("DadosPerformance")
      .update(updates, { count: "exact" })
      .eq("Nome", form.cliente)
      .eq("Instituicao", form.instituicao)
      .in("Ativo", ativoMatches);

    if (updErr) {
      toast({ title: "Regra salva, mas falha ao aplicar nos registros existentes",
              description: updErr.message, variant: "destructive" });
    } else {
      toast({ title: form.id ? "Regra atualizada" : "Regra criada",
              description: `${count ?? 0} registro(s) ajustado(s) imediatamente.` });
    }
  } else {
    toast({ title: form.id ? "Regra atualizada" : "Regra criada" });
  }
} else {
  toast({ title: form.id ? "Regra atualizada" : "Regra criada",
          description: "Regra desativada — registros existentes não foram alterados." });
}
```

Remover o `toast` antigo de "Regra criada/atualizada" para não duplicar.

5. Atualizar memória `mem://features/data-management/asset-overrides` mencionando: "Ao salvar (com `ativo=true`) o app também aplica imediatamente o UPDATE em `DadosPerformance` (match por Cliente+Instituição+Ativo, considerando o nome ajustado anterior em edições)."

## Resultado para o usuário

Confirmou a regra → o ativo na tabela "Detalhamento por Ativo" e em todo o resto do app já aparece com nome/classe/emissor/taxa/vencimento/liquidez ajustados, sem precisar reprocessar pelo n8n.

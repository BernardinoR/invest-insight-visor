## Problema

Erro ao criar regra: `Could not find the 'ativo_novo' column of 'asset_overrides' in the schema cache`.

## Causa

A coluna no banco `asset_overrides` se chama **`nome_ajustado`** (vide schema), mas o payload enviado em `handleSave` (linha 352 de `src/components/AssetOverridesTab.tsx`) usa a chave `ativo_novo`. O Supabase rejeita o insert/update.

O mesmo desalinhamento existe na leitura: o restante do componente trata o campo como `ativo_novo` (estado, filtro de busca, render da tabela, edit form), então o `select("*")` está retornando `nome_ajustado` mas o código espera `ativo_novo` — hoje os valores de "Novo nome" não aparecem na tabela quando uma regra já existe.

## Correção

Mapear nos dois pontos de fronteira com o banco, mantendo o resto do código (estado e UI) usando `ativo_novo` para minimizar o blast radius.

**Arquivo:** `src/components/AssetOverridesTab.tsx`

1. **Payload de gravação (linha 352)** — trocar a chave:
   ```ts
   // de:
   ativo_novo: form.ativo_novo.trim() || null,
   // para:
   nome_ajustado: form.ativo_novo.trim() || null,
   ```

2. **Leitura (`fetchOverrides`, ~linha 243)** — após o `select`, mapear `nome_ajustado → ativo_novo` antes de salvar no estado:
   ```ts
   const mapped = (data || []).map((r: any) => ({
     ...r,
     ativo_novo: r.nome_ajustado ?? null,
   }));
   setOverrides(mapped as unknown as AssetOverride[]);
   ```

## Fora de escopo

- Não altera o schema do banco nem outras tabelas.
- Não toca em pipeline n8n (que já lê `nome_ajustado` direto da tabela).
- Não renomeia a coluna em todo o componente — o mapeamento na fronteira é mais seguro e não quebra usos cruzados.

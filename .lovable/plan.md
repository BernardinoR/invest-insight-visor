## Objetivo

Adicionar **dual-write** para o Journey (via broker no CRM) em cima dos writes locais existentes de classificação (classe/liquidez/vencimento) e de overrides per-cliente. Nunca alterar ou reverter os writes locais; a chamada ao broker é sempre o último passo do caminho feliz e falha em modo fail-soft (toast destrutivo, segue o baile).

## 1) Variáveis de ambiente

Adicionar ao `.env` do projeto (Vite lê `VITE_*` em build):

- `VITE_VISOR_BRIDGE_URL` — base do CRM (ex.: `https://mastodontecrm.com.br`)
- `VITE_VISOR_BRIDGE_SECRET` — segredo compartilhado (header `x-visor-secret`)

Como ambos ficam no bundle do cliente, o segredo é efetivamente público — anotado aqui pra ciência; o broker deve ter mitigação própria (rate-limit, CORS restrito). Não é escopo desta task mudar isso.

## 2) Novo arquivo `src/lib/visorBridge.ts`

Criar com o conteúdo exato fornecido pelo usuário: tipos `Liquidez`, `PostClassificacaoInput`, `OverrideCompositeKey`, `PostOverrideInput`, `DadosPerformanceRow`; funções `postClassificacao`, `postOverride`, `deleteOverride` (POST com `active: false`), `resolveProfileId`. Todas leem `import.meta.env.VITE_VISOR_BRIDGE_URL/SECRET` e lançam erro se faltar env ou `res.ok` for falso.

## 3) `src/pages/DataManagement.tsx` — dual-write de classificação

- `import { postClassificacao } from "@/lib/visorBridge";`
- Adicionar helper fail-soft `syncClassificacaoToJourney` (useCallback com try/catch, toast destrutivo `"não sincronizou com o Journey — tente de novo"` no catch).
- Inserir chamada **depois** do write local ter sucesso completo (após o cascade em `DadosPerformance` quando houver) nos handlers:
  1. `handleSaveClassificacao` — `{ ativo, classePT: classeNova }`
  2. `handleConfirmRagUpdate` — mesma, após cascade
  3. `handleAplicarClasseATodos` — mesma, após o loop
  4. `handleSaveLiquidez` (ambos branches insert/update) — `{ ativo, classePT: editingItem["Classe do ativo"]?.trim() || '', liquidez: { calendarDays, businessDays, closed } }`
  5. `handleConfirmRagLiquidezUpdate` — mesma, após cascade
  6. `handleAplicarLiquidezATodos` — mesma, após o loop
  7. `handleSaveVencimento` (ambos branches, inclusive caminho de conflito/cascade) — `{ ativo, classePT: <atual>||'', vencimento: <YYYY-MM-DD> }`
  8. `handleAplicarVencimentoATodos` — mesma, após o loop
- Não inserir em branches de erro nem onde só abre dialog de conflito.

## 4) `src/components/AssetOverridesTab.tsx` — dual-write de override + guarda profile_id

- Imports: `postOverride`, `deleteOverride`, `resolveProfileId`, `type DadosPerformanceRow` de `@/lib/visorBridge`; `Alert`, `AlertDescription` de `@/components/ui/alert`; ícone `AlertTriangle` de `lucide-react`.
- Nova prop `dadosPerformanceRows: DadosPerformanceRow[]`. Em `DataManagement.tsx`, no ponto onde `<AssetOverridesTab />` é renderizado, passar `dadosPerformanceRows={dadosData}`.
- No topo do componente:
  ```ts
  const profileId = useMemo(
    () => resolveProfileId(dadosPerformanceRows, clientName),
    [dadosPerformanceRows, clientName]
  );
  const overrideEditingBlocked = profileId === null;
  ```
- Se `overrideEditingBlocked`:
  - Renderizar `<Alert variant="destructive">` no topo da aba: "Reconsolide este cliente no motor pra editar overrides."
  - `disabled={overrideEditingBlocked}` em: botão "Nova regra", botões editar/excluir de cada linha, Switch ativo/inativo, botão Salvar do dialog.
  - Early-return em `handleSave`, `handleToggleAtivo`, `handleDelete` com toast "Editor de overrides bloqueado / Reconsolide este cliente no motor pra editar overrides."
- Helpers fail-soft: `syncOverrideToJourney` e `syncDeleteOverrideToJourney` (try/catch com toast destrutivo).
- `handleSave`: após o upsert local + fan-out, chamar `syncOverrideToJourney` com o form completo (campos vazios viram `null` conforme spec).
- `handleToggleAtivo`: após o toggle local, chamar `syncOverrideToJourney({ profileId, institution: o.instituicao, ativoOriginal: o.ativo_original, active: !o.ativo })`.
- `handleDelete`: capturar `const target = overrides.find(o => o.id === deleteId)` **antes** do delete local; após delete local, `syncDeleteOverrideToJourney({ profileId, institution: target.instituicao, ativoOriginal: target.ativo_original })`.

## 5) Fora de escopo (explicitamente NÃO fazer)

- Não remover/alterar writes locais existentes.
- Não usar o `id` local em chamadas ao broker — só a chave composta.
- Não reverter write local em falha; não adicionar retry/fila.
- Guarda de profile_id vale só pro editor de overrides — classe/liquidez/vencimento ficam liberadas.

## Detalhes técnicos

- `syncClassificacaoToJourney` é `useCallback` com dep `[toast]`; o hook `toast` já é usado nesse arquivo (padrão `useToast()`).
- Nos handlers de liquidez/vencimento, `classePT` vai como `editingItem["Classe do ativo"]?.trim() || ''`; string vazia é aceita pelo broker (tratada como ausente, mas o broker exige ≥1 entre classePT/liquidez/vencimento — como sempre mandamos liquidez ou vencimento no payload, o requisito está satisfeito).
- Em bulk (`handleAplicarClasseATodos` etc.), a chamada ao broker é feita uma vez por ativo alterado, no final de cada iteração do loop (após o write local do item), OU uma única vez com o `ativo` alvo se o loop opera sobre linhas do mesmo ativo — seguir o padrão que o loop já usa: um POST por combinação lógica (ativo, valor) igual ao write local. Isso preserva idempotência do broker (mesmo `{ativo, classePT/liquidez/vencimento}` várias vezes tem o mesmo efeito).
- `AlertTriangle` é opcional dentro do `<Alert>` — usar como ícone à esquerda pra consistência visual com outros alerts do projeto.
- Formato de data: os inputs de vencimento já são `<input type="date">` (valor `YYYY-MM-DD`), então o valor cru do input serve direto ao broker.

## Validação

- `tsgo` limpo.
- Editar classe/liquidez/vencimento de um ativo: write local persiste; se o broker estiver offline (ou envs faltando), aparece toast destrutivo mas a UI segue e o dado local está lá.
- Editor de overrides: em cliente sem `profile_id` carimbado em `DadosPerformance`, aparece o alerta e todos os controles ficam desabilitados; nos demais, save/toggle/delete disparam a chamada ao broker no final.
- Nenhum uso do `id` local de `asset_overrides` nas chamadas ao broker.

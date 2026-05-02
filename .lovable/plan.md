## Problema

Ao trocar para a aba **"Ajustes de Ativos"**, o modal de criação de regra abre sozinho (com os dados de um ativo clicado anteriormente em outra aba).

## Causa

`AssetOverridesTab` é montado de forma lazy pelo `<TabsContent value="overrides">` (Radix Tabs só renderiza o painel quando a aba é ativada). O pai (`DataManagement.tsx`) mantém `overridePrefill` no estado mesmo depois do uso. Quando o usuário entra na aba pela primeira vez (ou volta a ela), o componente monta, o `useEffect` que observa `prefillRequest?.nonce` roda pela primeira vez naquele ciclo de vida e — como o nonce existe — dispara `setIsDialogOpen(true)`.

O efeito não distingue entre "novo prefill recebido agora" e "prefill antigo encontrado na montagem".

## Correção

**Arquivo:** `src/components/AssetOverridesTab.tsx`

Usar um `useRef` para guardar o último `nonce` já consumido. O efeito só abre o modal quando o nonce **mudou de fato** desde o último consumo. Na primeira montagem, inicializa o ref com o nonce atual (se existir), tratando-o como "já consumido" — ou seja, montar a aba com um prefill antigo no pai não abre nada.

```ts
const lastConsumedNonceRef = useRef<number | null>(
  prefillRequest?.nonce ?? null
);

useEffect(() => {
  const nonce = prefillRequest?.nonce;
  if (!prefillRequest || nonce == null) return;
  if (lastConsumedNonceRef.current === nonce) return;
  lastConsumedNonceRef.current = nonce;
  setForm({ ...prefill values... });
  setIsDialogOpen(true);
}, [prefillRequest?.nonce]);
```

Isso resolve:
- Trocar para a aba sem clicar em "Criar regra a partir do ativo" → modal **não** abre.
- Clicar em "Criar regra a partir do ativo" em outra aba → pai gera novo `nonce`, efeito vê nonce diferente, abre o modal normalmente.
- Voltar pra aba depois de fechar o modal → nonce permanece o mesmo já consumido, **não** reabre.

## Fora de escopo

- Não muda contrato com `DataManagement.tsx` nem o `prefillRequest`.
- Não toca em DB ou pipeline.

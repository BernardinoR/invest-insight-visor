# Bug: bulk fill de liquidez via RAG não sobrescreve campo "vazio" do RAG

## Causa raiz

Em `handleBulkFillLiquidezFromRAG` (`src/pages/DataManagement.tsx`, linhas 2197-2202), a lógica só preenche o valor do RAG quando o campo atual está vazio:

```ts
const finalCorridos = (ragLiq.corridos && !corridosAtual) ? ragLiq.corridos : corridosAtual;
const finalUteis    = (ragLiq.uteis    && !uteisAtual)    ? ragLiq.uteis    : uteisAtual;
```

Cenário do bug:
- Atual no registro: `corridos = "D+2"`, `uteis = null`
- RAG (correto):     `corridos = null`,  `uteis = "D+2"`
- Resultado errado: mantém `corridos = "D+2"` e ainda seta `uteis = "D+2"` → fica "2 e 2".

O RAG é a fonte de verdade nessa ação ("preencher via RAG"), então o par precisa ser **substituído integralmente**, inclusive zerando lados que o RAG marca como vazios.

## Correção

Substituir o trecho acima para usar o par do RAG diretamente, sem fallback ao valor atual:

```ts
} else {
  const normalized = normalizeLiquidezPair(ragLiq.corridos, ragLiq.uteis);
  patch.liquidez_corridos = normalized.corridos; // sempre envia (pode ser null)
  patch.liquidez_uteis    = normalized.uteis;    // sempre envia (pode ser null)
  patch.liquidez_fechada  = false;
}
```

Pontos importantes:
- Enviar `null` explicitamente garante o `UPDATE` do Supabase a limpar o campo (resolve a ressalva do filtro "remove chaves vazias").
- Manter a checagem de "já igual" anterior (linha 2190) — registros idênticos ao RAG continuam sendo pulados.
- A regra de conflito do modal individual (`handleSaveLiquidez`) não muda: ela continua perguntando antes de sobrescrever; o bulk fill aqui é a ação explícita de "trazer do RAG".

## Arquivos afetados

- `src/pages/DataManagement.tsx` — apenas o bloco `else` em `handleBulkFillLiquidezFromRAG` (linhas ~2196-2203).

Sem migrations, sem mudanças de UI, sem alterações no fluxo de edição individual.

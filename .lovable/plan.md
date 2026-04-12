

# Plano: "Avançar Competência" — com 5 modos de cálculo de rentabilidade

## Resumo
Implementar o botão "Avançar Competência" na tabela de consolidados com suporte a múltiplos ativos e 5 modos de cálculo de rentabilidade por ativo.

## Modos de cálculo

1. **CDI** — aplica 100% do CDI do mês (via `useCDIData` existente)
2. **% do CDI** — campo para digitar percentual (ex: 110% do CDI). Cálculo: `CDI_mensal × (percentual / 100)`
3. **IPCA+** — campo para digitar spread anual (ex: IPCA+6%). Cálculo: `(1 + IPCA_mensal) × (1 + spread_mensal) - 1`, usando IPCA do `useMarketIndicators`
4. **Pré-fixado** — campo para digitar taxa anual (ex: 14% a.a.). Cálculo: `(1 + taxa)^(1/12) - 1`
5. **Manual** — campo para digitar o rendimento % direto do mês

## UI — Versão Simples (1 ativo)

```text
┌──────────────────────────────────────────────────┐
│  ⏩ Avançar Competência                          │
│  BTG — 03/2025 → 04/2025                         │
│                                                  │
│  Ativo: CDB Banco XYZ                            │
│  Posição atual: R$ 150.000,00                    │
│                                                  │
│  Cálculo:                                        │
│  (●) CDI  ( ) % CDI [110%]  ( ) IPCA+ [6%]      │
│  ( ) Pré [14%]  ( ) Manual [1.2%]                │
│                                                  │
│  Nova posição: R$ 152.300,00  (editável)         │
│  Rendimento: 1,53%                               │
│                                                  │
│  [Cancelar]            [Avançar e Criar Tudo]    │
└──────────────────────────────────────────────────┘
```

## UI — Versão Multi-ativos (2+ ativos)

```text
┌────────────────────────────────────────────────────────┐
│  ⏩ Avançar Competência                                │
│  BB — Guilherme — 03/2025 → 04/2025                    │
│                                                        │
│  Aplicar a todos: [CDI ▾] [___]  [Aplicar]             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Ativo           Posição    Modo       Nova Pos.  │   │
│  │ CDB XYZ         50.000    CDI        [51.200]   │   │
│  │ LCI BB           80.000    %CDI 110%  [81.800]   │   │
│  │ Fundo RF          20.000    IPCA+6%    [20.400]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                        │
│  Consolidado: Patrimônio = R$ 153.400,00               │
│  Rendimento ponderado: 1,42%                           │
│                                                        │
│  [Cancelar]                [Avançar e Criar Tudo]      │
└────────────────────────────────────────────────────────┘
```

Cada ativo tem seu próprio select de modo + campo de parâmetro. O "Aplicar a todos" é atalho opcional.

## Detalhes técnicos

### Arquivo: `src/pages/DataManagement.tsx`

**Novos states:**
- `isRolloverOpen`, `rolloverData` com array de ativos, cada um com: `{ ...dadosAtivo, modo: 'CDI'|'pctCDI'|'IPCA'|'PRE'|'Manual', parametro: number, novaPosicao: number, rendimento: number }`

**Funções de cálculo:**
- `calcularRendimentoRollover(modo, parametro, cdiMensal, ipcaMensal)` — retorna o rendimento mensal conforme o modo
- `getNextCompetencia(comp)` — "12/2025" → "01/2026"
- `handleOpenRollover(consolidado)` — busca ativos vinculados, pré-calcula com CDI
- `handleExecuteRollover()` — insere N ativos + 1 consolidado no Supabase

**Dados de mercado:**
- CDI: já disponível via `useCDIData`
- IPCA: já disponível via `useMarketIndicators` (dados mensais do BCB)
- Pré: cálculo local `(1 + taxa_anual)^(1/12) - 1`

**Validações:**
- Verificar duplicatas na competência destino
- Posições > 0
- Toast com resumo


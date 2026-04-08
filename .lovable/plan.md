

# Plano: Melhorar layout do modal "Editar Dado Detalhado"

## Mudanças

### Reorganização de seções

Mover **Emissor** da seção "Ativo" para a seção "Condições", que passa a ter grid 2x2:

```text
┌─────────────────────────────────────────────┐
│  IDENTIFICAÇÃO                              │
│  [Competência]  [Instituição]  [Conta]      │
│  [Moeda ▾]                                  │
├─────────────────────────────────────────────┤
│  ATIVO                                      │
│  [Nome do Ativo]        [Classe do Ativo ▾] │
│  [Posição]    [Gravar Classificação]        │
├─────────────────────────────────────────────┤
│  CONDIÇÕES                                  │
│  [Emissor]         [Taxa]                   │
│  [Vencimento]      [Liquidez D+]            │
├─────────────────────────────────────────────┤
│  RENTABILIDADE                              │
│  [Rendimento %]  [Calcular]                 │
│  [Validar Rent.]  [Marcar Ativo Novo]       │
└─────────────────────────────────────────────┘
```

### Melhorias visuais

- **Seção Ativo**: Grid 2x2 — Ativo + Classe na 1ª linha, Posição + botão Gravar Classificação na 2ª (botão alinhado verticalmente com o campo)
- **Seção Condições**: Grid 2x2 — Emissor + Taxa na 1ª linha, Vencimento + Liquidez na 2ª
- **Seção Rentabilidade**: Rendimento e botão Calcular lado a lado (input + botão inline), toggles abaixo em grid 2 colunas
- Adicionar `py-1` nos separadores para mais respiro entre seções
- Títulos de seção com `mb-2` para espaçamento consistente

### Arquivo alterado
`src/pages/DataManagement.tsx` — linhas ~5562-5860




# Plano: Reorganizar campos do modal "Editar Dado Detalhado"

## Problema atual

Os campos do modal de dados detalhados (linhas ~5562-5851) estão dispostos sem agrupamento lógico claro. A grid de 2 colunas mistura campos de contextos diferentes e os botões de ação (Gravar Classificação, Calcular Rendimento, validações) estão embutidos junto aos campos, criando visual confuso.

## Proposta de layout

Organizar em **seções visuais** com separadores e títulos, usando a seguinte estrutura:

```text
┌─────────────────────────────────────────────┐
│  IDENTIFICAÇÃO                              │
│  [Competência]  [Instituição]  [Conta]      │
│  [Moeda ▾]                                  │
├─────────────────────────────────────────────┤
│  ATIVO                                      │
│  [Nome do Ativo]        [Emissor]           │
│  [Classe do Ativo ▾]    [Posição]           │
│  [Gravar Classificação]                     │
├─────────────────────────────────────────────┤
│  CONDIÇÕES                                  │
│  [Taxa]    [Vencimento]    [Liquidez D+]    │
├─────────────────────────────────────────────┤
│  RENTABILIDADE                              │
│  [Rendimento %]                             │
│  [Calcular]                                 │
│  [Validar Rentabilidade]  [Marcar Ativo Novo]│
└─────────────────────────────────────────────┘
```

## Alterações — 1 arquivo: `src/pages/DataManagement.tsx`

### Seção "Dados Detalhados" do dialog (linhas ~5562-5851)

1. **Seção "Identificação"** — Competência, Instituição e Nome da Conta em grid de 3 colunas; Moeda abaixo em largura parcial.

2. **Separator + Seção "Ativo"** — Ativo e Emissor em grid de 2 colunas; Classe e Posição em grid de 2 colunas; botão "Gravar Classificação" abaixo da Classe.

3. **Separator + Seção "Condições"** — Taxa, Vencimento e Liquidez em grid de 3 colunas na mesma linha (o campo Liquidez sai de dentro da grid de Taxa/Vencimento atual onde ficou desalinhado).

4. **Separator + Seção "Rentabilidade"** — Rendimento com botão Calcular; botões de validação (Rentabilidade Validada e Ativo Novo) lado a lado em grid de 2 colunas em vez de empilhados.

### Detalhes visuais
- Usar `<Separator />` entre seções
- Títulos de seção: `<h4 className="text-sm font-medium text-muted-foreground">IDENTIFICAÇÃO</h4>`
- Grid de 3 colunas para Identificação e Condições: `grid grid-cols-3 gap-4`
- Botões de toggle (Rentabilidade Validada / Ativo Novo) lado a lado: `grid grid-cols-2 gap-2`


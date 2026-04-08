

# Plano: Melhorar visual dos toggles "Ativo Novo" e "Rentabilidade Validada"

## Problema
Os botões de toggle na seção Rentabilidade são `Button` com `w-full` que mudam entre `default`/`outline`, ficando visualmente pesados e desarmônicos.

## Solução
Trocar os botões por **Switch** (toggle) com label ao lado, mais limpo e padrão para flags booleanas:

```text
RENTABILIDADE
[Rendimento %]  [Calcular]
┌──────────────────────────────────────┐
│ ○── Validar Rentabilidade           │
│ ○── Ativo Novo                      │
└──────────────────────────────────────┘
```

Cada toggle será um `<div className="flex items-center justify-between">` com:
- Label (`text-sm`) + descrição curta (`text-xs text-muted-foreground`)
- Componente `<Switch />` do shadcn/ui (já existe no projeto)

O "Validar Rentabilidade" só aparece quando `Rendimento === 0` (mantém lógica atual).

### Arquivo alterado
`src/pages/DataManagement.tsx` — linhas ~5814-5877: substituir grid de botões por switches com labels.


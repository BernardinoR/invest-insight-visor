

# Plano: Coluna "Outra Pessoa" + Separação no Gráfico de Emissores

## Resumo
Adicionar um campo que identifica se uma conta separada pertence a outra pessoa. No gráfico de Exposição por Emissor, os ativos de cada pessoa terão seu próprio limite de R$250k por emissor.

## Alterações

### 1. Migration: Nova coluna em `account_split_configs`

```sql
ALTER TABLE public.account_split_configs
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;
```

### 2. Migration: Nova coluna em `ConsolidadoPerformance`

```sql
ALTER TABLE public."ConsolidadoPerformance"
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;
```

Quando o split for aplicado com `is_outra_pessoa = true`, o consolidado destino recebe essa flag.

### 3. Migration: Nova coluna em `DadosPerformance`

```sql
ALTER TABLE public."DadosPerformance"
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;
```

Quando ativos são movidos para uma conta de outra pessoa, recebem essa flag. Isso permite que o gráfico de emissores saiba a qual "pessoa" o ativo pertence.

### 4. `SplitAccountDialog.tsx` — Checkbox "Outra pessoa"

- Adicionar um checkbox/switch "Esta conta pertence a outra pessoa?" no formulário de split
- Salvar o valor em `account_split_configs.is_outra_pessoa`
- No `handleApply`, ao mover ativos e criar/atualizar consolidados, propagar `is_outra_pessoa = true` nos registros de `DadosPerformance` e `ConsolidadoPerformance` destino

### 5. `IssuerExposure.tsx` — Separação por pessoa

Lógica atual: agrupa todos os ativos por emissor e compara com R$250k.

Nova lógica:
- Agrupar ativos por **pessoa** (titular vs cada `nomeConta` com `is_outra_pessoa = true`)
- Para cada pessoa, calcular exposição por emissor separadamente
- No gráfico, mostrar barras agrupadas ou empilhadas diferenciando cada pessoa
- Cada pessoa tem seu próprio limite de R$250k por emissor
- Legendas identificam qual pessoa é qual

```text
Exemplo visual:
  Emissor X
  ┌─────────┐ Titular: R$180k (OK)
  ├─────────┤ Maria Luiza: R$200k (OK)
  
  Sem separação seria R$380k (ACIMA) — com separação, ambos OK.
```

### 6. Propagação no Rollover

Quando dados são avançados de competência (rollover), a flag `is_outra_pessoa` deve ser preservada nos novos registros de `DadosPerformance` e `ConsolidadoPerformance`.

## Detalhes técnicos

- A interface `IssuerExposure` receberá os dados já com o campo `is_outra_pessoa`
- O agrupamento será: `{ pessoa: string, emissor: string }` como chave composta
- A "pessoa" do titular será o nome do cliente; a de outra pessoa será o `nomeConta` da conta destino
- O filtro de conta existente continuará funcionando normalmente
- 3 migrations + edição de 2 componentes (`SplitAccountDialog.tsx`, `IssuerExposure.tsx`) + possível ajuste no `RolloverDialog.tsx`


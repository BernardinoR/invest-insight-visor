

# Plano: Nova bolinha de verificação para "Ativo Novo (sem rentabilidade esperada)"

## Contexto atual
A coluna "Verificação" na tabela de ativos detalhados já exibe 2 bolinhas:
1. **Classe** — verde/vermelha conforme classe válida ou não
2. **Rentabilidade** — verde/vermelha conforme rendimento preenchido ou não

## O que será adicionado
Uma **3a bolinha** (azul/amarela) indicando que o ativo é novo e por isso não possui rentabilidade — diferente de "faltando rentabilidade" (vermelho).

## Flag recomendada para o n8n

Adicionar um campo booleano na tabela `DadosPerformance`:

```
ativo_novo  (boolean, default: false)
```

**No n8n**, ao enviar dados para o banco, incluir `ativo_novo: true` quando o ativo:
- Aparece pela primeira vez naquela competência (não existia na competência anterior)
- Ou foi adquirido naquele mês e portanto não tem histórico de rentabilidade

Isso é mais semântico que reutilizar `rentabilidade_validada`, pois distingue:
- `ativo_novo = true` → "é novo, não tem rentabilidade e está tudo bem" (bolinha azul)
- `rentabilidade_validada = true` → "tem 0% mas foi validado manualmente" (bolinha verde)
- Nenhum dos dois e sem rendimento → "faltando rentabilidade" (bolinha vermelha)

## Alterações

### 1. Migration — nova coluna
```sql
ALTER TABLE public."DadosPerformance" ADD COLUMN "ativo_novo" boolean DEFAULT false;
```

### 2. `src/integrations/supabase/types.ts`
Adicionar `ativo_novo` nos tipos Row/Insert/Update de DadosPerformance.

### 3. `src/pages/DataManagement.tsx`
- Adicionar `'ativo_novo'` ao array de campos da interface e fetch
- Atualizar `hasValidYield` para considerar `ativo_novo === true` como válido (não é erro)
- Adicionar a 3a bolinha na coluna Verificação:
  - **Azul** (`AlertCircle` ou `Info` icon) quando `ativo_novo === true` — tooltip "Ativo novo sem rentabilidade anterior"
  - **Não exibida** quando `ativo_novo === false`
- Adicionar filtro opcional "Mostrar apenas ativos novos"
- No editor, adicionar toggle para marcar/desmarcar `ativo_novo`

### 4. Contadores no cabeçalho
Adicionar contador de ativos novos ao lado dos contadores existentes (não classificados / sem rentabilidade).

## Resumo da flag para o n8n

| Campo | Tipo | Valor | Significado |
|-------|------|-------|-------------|
| `ativo_novo` | boolean | `true` | Ativo entrou na carteira nesta competência, sem rentabilidade esperada |
| `ativo_novo` | boolean | `false` (default) | Ativo normal, rentabilidade esperada |

No payload JSON do n8n para o Supabase, basta incluir:
```json
{ "ativo_novo": true }
```
nos registros de ativos identificados como novos.


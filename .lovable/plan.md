

# Plano: Persistir verificações no Supabase

## Resumo

Criar tabela `verification_results`, view `verification_summary`, função RPC `calculate_verification` no banco, e integrar no frontend para gravar automaticamente os resultados das 4 bolinhas de verificação.

## Alterações

### 1. Migration — Tabela, View, Índices e Função RPC

Uma única migration com:

**Tabela `verification_results`**:
- Colunas conforme especificado (patrimonio_status, has_unclassified, has_missing_yield, has_new_assets, contadores, all_green computed, etc.)
- UNIQUE constraint em (client_name, competencia, instituicao, nome_conta)
- Índices em client_name e (client_name, all_green)
- RLS habilitado com policy de leitura pública

**View `verification_summary`**:
- Agregação por client_name com contadores green/issue/no_data e flag client_all_green
- `WITH (security_invoker=on)`

**Função RPC `calculate_verification(p_client_name TEXT DEFAULT NULL)`**:
- Itera sobre `ConsolidadoPerformance` (filtrado por p_client_name se fornecido)
- Para cada registro, busca ativos correspondentes em `DadosPerformance` pela chave (Competencia, Instituicao, nomeConta)
- Calcula:
  - `soma_posicoes` = SUM(Posicao)
  - `diferenca` = ABS("Patrimonio Final" - soma_posicoes)
  - `patrimonio_status`: no-data / match (< 0.01) / tolerance (< tolerance_value da tabela verification_settings) / mismatch
  - `unclassified_count`: ativos com classe fora da lista de 21 classes válidas
  - `missing_yield_count`: ativos sem rendimento válido (excluindo ativo_novo, rentabilidade_validada, e nomes contendo 'caixa'/'proventos')
  - `new_asset_count`: ativos com ativo_novo = true
- Faz UPSERT na verification_results
- Lê `correct_threshold` e `tolerance_value` da tabela `verification_settings`
- Retorna contagem de registros processados

### 2. RLS Policies

- SELECT público para `verification_results` (para CRM e outros sistemas)
- INSERT/UPDATE/DELETE restrito (apenas a função RPC opera via SECURITY DEFINER)

### 3. Frontend — `src/pages/DataManagement.tsx`

- Após carregar dados do cliente, chamar `supabase.rpc('calculate_verification', { p_client_name: clientName })`
- Adicionar botão "Recalcular verificações" que chama a mesma RPC
- Toast de confirmação após execução

### 4. pg_cron — Recálculo diário

Usar o insert tool para agendar:
```sql
SELECT cron.schedule('daily-verification', '0 9 * * *', $$SELECT calculate_verification(NULL)$$);
```
Roda diariamente às 9h UTC (6h Brasília).

## Detalhes técnicos da função RPC

A função usará um cursor sobre ConsolidadoPerformance e para cada registro fará uma sub-query agregada em DadosPerformance. A lista de classes válidas será hardcoded na função (as 21 classes). Os thresholds serão lidos de `verification_settings` para manter consistência com o frontend.


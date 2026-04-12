

# Plano: Auto-validar rentabilidade de Caixa, Cash e Proventos com 0%

## Problema
Ativos com nome "Caixa", "Cash" ou "Proventos" e rentabilidade 0% precisam ser marcados automaticamente como `rentabilidade_validada = true`, sem intervenção manual. Hoje o `hasValidYield` já trata "Caixa" e "Proventos" como válidos visualmente, mas não inclui "Cash" e não persiste no banco.

## Alterações

### 1. Atualizar `hasValidYield` (linha ~691)
Adicionar `'cash'` à lista de nomes auto-validados:
```ts
if (nomeNormalizado.includes('caixa') || nomeNormalizado.includes('proventos') || nomeNormalizado.includes('cash')) {
  return true;
}
```

### 2. Auto-setar `rentabilidade_validada` ao salvar/inserir dados
Nos locais onde ativos são salvos no banco (edição individual, bulk edit, importação), adicionar lógica:
```ts
// Se o ativo é Caixa/Cash/Proventos e Rendimento é 0, auto-validar
const nomeNorm = (item.Ativo || '').toLowerCase();
if ((nomeNorm.includes('caixa') || nomeNorm.includes('cash') || nomeNorm.includes('proventos')) && (item.Rendimento === 0 || item.Rendimento == null)) {
  item.rentabilidade_validada = true;
}
```

Isso será aplicado em:
- Função de salvar edição individual (`handleSaveItem` ou equivalente)
- Função de salvar edição em massa (bulk edit)
- Qualquer local de insert de novos ativos (importação, rollover)

### 3. Resultado
Ativos com nome contendo "Caixa", "Cash" ou "Proventos" com rendimento 0% serão automaticamente considerados validados tanto na UI quanto persistidos no banco.


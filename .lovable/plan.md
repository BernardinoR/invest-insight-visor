
# Plano: Ajustes no Benchmark Carteira Antiga

## Objetivo
Corrigir dois problemas identificados no benchmark "Carteira Antiga":
1. A linha não começa em zero como as outras linhas
2. O nome no card mostra o percentual do CDI (deve ser removido)

## Problema 1: Linha não começa em zero

### Análise
No código atual (linhas 376-384), o primeiro ponto do gráfico (index === 0) inicializa `cdiRetorno`, `targetRetorno`, e `ipcaRetorno` com valor 0 para que todas as linhas comecem do zero. Porém, `oldPortfolioRetorno` não está incluído nessa inicialização:

```typescript
// Código atual (linha 376-384)
if (index === 0) {
  return {
    ...point,
    cdiRetorno: 0,
    targetRetorno: 0,
    ipcaRetorno: 0
    // oldPortfolioRetorno NÃO está aqui!
  };
}
```

### Solução
Adicionar `oldPortfolioRetorno: 0` na inicialização do primeiro ponto.

---

## Problema 2: Nome do card com percentual

### Análise
O card atual mostra "vs Carteira Antiga (100% CDI)" mas o usuário quer apenas "vs Carteira Antiga".

- **Linha 1493**: `vs Carteira Antiga ({oldPortfolioCDI}% CDI)`
- **Linha 1036 (tooltip)**: `Carteira Antiga (${oldPortfolioCDI}% CDI)`

### Solução
Remover o percentual do CDI de ambos os textos.

---

## Alterações no Arquivo

**Arquivo:** `src/components/charts/PerformanceChart.tsx`

### 1. Inicialização do primeiro ponto (linha 383)

De:
```typescript
return {
  ...point,
  cdiRetorno: 0,
  targetRetorno: 0,
  ipcaRetorno: 0
};
```

Para:
```typescript
return {
  ...point,
  cdiRetorno: 0,
  targetRetorno: 0,
  ipcaRetorno: 0,
  oldPortfolioRetorno: 0
};
```

### 2. Tooltip do gráfico (linha 1036)

De:
```typescript
return [`${value.toFixed(2)}%`, `Carteira Antiga (${oldPortfolioCDI}% CDI)`];
```

Para:
```typescript
return [`${value.toFixed(2)}%`, 'Carteira Antiga'];
```

### 3. Label do card (linha 1493)

De:
```typescript
<p className="text-sm text-muted-foreground">vs Carteira Antiga ({oldPortfolioCDI}% CDI)</p>
```

Para:
```typescript
<p className="text-sm text-muted-foreground">vs Carteira Antiga</p>
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Linha começa no primeiro valor do CDI | Linha começa em 0% junto com as outras |
| Card: "vs Carteira Antiga (100% CDI)" | Card: "vs Carteira Antiga" |
| Tooltip: "Carteira Antiga (100% CDI)" | Tooltip: "Carteira Antiga" |

---

## Resumo de Alterações

| Linha | Alteração |
|-------|-----------|
| 383 | Adicionar `oldPortfolioRetorno: 0` |
| 1036 | Remover percentual do tooltip |
| 1493 | Remover percentual do card |

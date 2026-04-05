

# Plano: Filtro de classes no Detalhamento dos Investimentos com retorno consolidado recalculado

## Objetivo
Adicionar checkboxes nas estratégias do "Detalhamento dos Investimentos" para selecionar/deselecionar classes. Uma linha "Total Carteira" no rodapé exibe o retorno ponderado consolidado recalculado apenas com as classes selecionadas.

## Arquitetura

```text
InvestmentDetailsTable
├── State: selectedStrategies (Set<string>) — todas selecionadas por padrão
├── Header: botão "Selecionar Classes" com dropdown de checkboxes
├── Tabela: checkbox em cada linha de estratégia
├── Cálculo: useMemo recalcula retorno ponderado por competência
│   └── Para cada competência: média ponderada apenas dos ativos das classes selecionadas
│   └── Aplica juros compostos mês a mês → retorno Mês/Ano/6M/12M/Início
└── Footer row: "Total Carteira (filtrado)" com os retornos recalculados
```

## Alterações — 1 arquivo: `src/components/InvestmentDetailsTable.tsx`

### 1. Novo state para classes selecionadas
```typescript
const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());
```
Inicializado com todas as estratégias disponíveis via `useEffect`.

### 2. Header com controles de seleção
- Botão "Filtrar Classes" ao lado do título do card
- Dropdown com checkboxes para cada estratégia presente nos dados
- Botões "Selecionar Todas" / "Limpar"

### 3. Checkbox inline em cada linha da tabela
- Checkbox à esquerda do nome da estratégia (antes da bolinha colorida)
- Toggle individual por estratégia

### 4. Cálculo do retorno consolidado filtrado (lógica core)
Um `useMemo` que:
1. Filtra `dadosData` para manter apenas ativos cujo `groupStrategy(classe)` está em `selectedStrategies`
2. Para cada competência, calcula a média ponderada (retorno × posição / total posição)
3. Ordena cronologicamente e aplica juros compostos
4. Retorna: `{ monthReturn, yearReturn, sixMonthReturn, twelveMonthReturn, inceptionReturn }`

Reutiliza as funções existentes `groupStrategy`, `shouldExcludeFromProfitability`, `convertValue`, `adjustReturnWithFX`.

### 5. Linha "Total Carteira" no footer
- `TableFooter` com linha destacada (bg diferenciado, font-bold)
- Mostra os retornos consolidados recalculados nas mesmas colunas (Mês, Ano, 6M, 12M, Início)
- Label dinâmico: "Total Carteira" quando todas selecionadas, "Total Filtrado (X de Y classes)" quando parcial

### Sem alterações em banco de dados ou outros arquivos.


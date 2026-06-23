## PDF mais simples, em tom narrativo

Trocar o layout atual (caixas, blocos coloridos, divisores) por uma página quase em formato de carta — frases curtas, números grandes, muito espaço em branco. O cliente lê de cima a baixo como uma história curta do mês.

### Estrutura nova (uma página A4)

```
[Nome do Cliente]
Junho de 2026


VOCÊ COMEÇOU O MÊS COM
R$ 1.234.567,89

Teve R$ 50.000,00 de aportes
(já descontando resgates e impostos)

Rendeu  +1,21%   ·   R$ 14.500,00

E FECHOU O MÊS COM
R$ 1.299.067,89


─────────────────────────────────────


DESDE O INÍCIO (Janeiro/2025, 18 meses)

Sua carteira rendeu             12,45%
A inflação (IPCA) foi            8,12%
Sua meta era (IPCA + 4%)        13,30%

VOCÊ ESTÁ +4,33% ACIMA DA INFLAÇÃO
```

### Princípios

- **Tom**: frases diretas em 2ª pessoa ("você começou", "rendeu", "fechou"). Sem rótulos secos ("Patrimônio inicial:").
- **Hierarquia**: rótulos pequenos em caixa-alta, números enormes (28-32pt) embaixo. Tudo alinhado à esquerda.
- **Sem caixas, sem fundos coloridos, sem ícones**. Apenas tipografia + um único divisor fino entre o mês e o acumulado.
- **Cor**: só dois usos — preto/cinza pra texto, verde pra rendimento positivo (vermelho se negativo). Sem azul accent.
- **Datas**: removidas do corpo principal (ficaram pesadas). O mês já está no topo; quem quiser detalhe técnico tem o rodapé.
- **Destaque único**: "acima da inflação" como conclusão final do relatório — é a dor que o cliente quer ver resolvida.

### Arquivos

1. **`src/components/ClientReportPDF.tsx`** — reescrever do zero:
   - Remover seções `anchor`, `middle`, `highlight`, `row` antigas.
   - Novos estilos: `eyebrow` (rótulo pequeno caixa-alta), `bigNumber` (28pt bold), `sentence` (12pt regular), `divider` (linha fina central).
   - 4 blocos verticais: header → começo do mês → movimentação + rendimento (uma frase cada) → fim do mês → divisor → acumulado → conclusão de destaque.

2. **`src/components/GenerateReportButton.tsx`** — sem mudanças de cálculo, só remover `metaLabel`/`mesesContados`/`primeiraCompetencia` se não forem mais usados (vão ser, na linha "Desde o início").

### Fora do escopo

- Mudar cálculos (movimentação líquida com impostos continua igual).
- Adicionar gráfico de volta, logo, identidade visual, múltiplas páginas.
- Mexer no botão ou no fluxo de download.

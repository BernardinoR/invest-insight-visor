import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { investmentData } from "@/data/investmentData";

const STRATEGY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
];

export function StrategyScatterChart() {
  // Group investments by strategy
  const strategyData = investmentData.reduce((acc, investment) => {
    if (!investment.strategy) return acc;
    
    if (!acc[investment.strategy]) {
      acc[investment.strategy] = [];
    }
    
    acc[investment.strategy].push({
      name: investment.asset,
      value: investment.value,
      performance: investment.performance,
      strategy: investment.strategy,
      rate: investment.rate || 'N/A',
      issuer: investment.issuer || 'N/A',
      maturity: investment.maturity || 'N/A'
    });
    
    return acc;
  }, {} as Record<string, Array<{
    name: string;
    value: number;
    performance: number;
    strategy: string;
    rate: string;
    issuer: string;
    maturity: string;
  }>>);

  const strategies = Object.keys(strategyData);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md max-w-xs">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">Valor: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Performance: {data.performance >= 0 ? '+' : ''}{data.performance.toFixed(2)}%</p>
          <p className="text-sm text-muted-foreground">Taxa: {data.rate}</p>
          <p className="text-sm text-muted-foreground">Emissor: {data.issuer}</p>
          {data.maturity !== 'N/A' && (
            <p className="text-sm text-muted-foreground">Vencimento: {data.maturity}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Distribuição de Investimentos por Estratégia</CardTitle>
        <p className="text-sm text-muted-foreground">Valor vs Performance por ativo</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="value" 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              name="Valor"
            />
            <YAxis 
              dataKey="performance" 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              name="Performance"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {strategies.map((strategy, index) => (
              <Scatter
                key={strategy}
                name={strategy}
                data={strategyData[strategy]}
                fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
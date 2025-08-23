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
  // Filter investments to only include those with maturity and group by strategy
  const strategyData = investmentData
    .filter(investment => investment.maturity && investment.strategy)
    .reduce((acc, investment) => {
      if (!investment.strategy || !investment.maturity) return acc;
      
      if (!acc[investment.strategy]) {
        acc[investment.strategy] = [];
      }
      
      // Parse rate to get numeric value for average calculation
      const parseRate = (rate: string) => {
        if (!rate || rate === 'N/A') return 0;
        const match = rate.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      };
      
      acc[investment.strategy].push({
        name: investment.asset,
        value: investment.value,
        performance: investment.performance,
        strategy: investment.strategy,
        rate: parseRate(investment.rate || ''),
        rateDisplay: investment.rate || 'N/A',
        issuer: investment.issuer || 'N/A',
        maturity: investment.maturity,
        maturitySort: new Date(investment.maturity.split('/').reverse().join('-')).getTime()
      });
      
      return acc;
    }, {} as Record<string, Array<{
      name: string;
      value: number;
      performance: number;
      strategy: string;
      rate: number;
      rateDisplay: string;
      issuer: string;
      maturity: string;
      maturitySort: number;
    }>>);

  const strategies = Object.keys(strategyData);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md max-w-xs">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">Valor: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Taxa: {data.rateDisplay}</p>
          <p className="text-sm text-muted-foreground">Emissor: {data.issuer}</p>
          <p className="text-sm text-muted-foreground">Vencimento: {data.maturity}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Taxa de Retorno por Vencimento</CardTitle>
        <p className="text-sm text-muted-foreground">Taxa média por data de vencimento</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="maturitySort" 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
              }}
              name="Vencimento"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              dataKey="rate" 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              name="Taxa"
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
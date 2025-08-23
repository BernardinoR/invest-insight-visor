import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  const targetStrategies = ['Pós Fixado', 'Inflação', 'Pré Fixado'];

  // Create data for each strategy
  const getStrategyData = (targetStrategy: string) => {
    const maturityData = investmentData
      .filter(investment => investment.maturity && investment.strategy === targetStrategy)
      .reduce((acc, investment) => {
        if (!investment.maturity) return acc;
        
        const maturityDate = investment.maturity;
        
        if (!acc[maturityDate]) {
          acc[maturityDate] = {
            maturity: maturityDate,
            value: 0,
            rates: [],
            count: 0
          };
        }
        
        // Parse rate to get numeric value
        const parseRate = (rate: string) => {
          if (!rate || rate === 'N/A') return 0;
          const match = rate.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        acc[maturityDate].value += investment.value;
        acc[maturityDate].rates.push(parseRate(investment.rate || ''));
        acc[maturityDate].count += 1;
        
        return acc;
      }, {} as Record<string, { maturity: string; value: number; rates: number[]; count: number }>);

    // Convert to chart data format
    return Object.values(maturityData)
      .map(item => ({
        maturity: item.maturity,
        value: item.value,
        avgRate: item.rates.length > 0 ? 
          item.rates.reduce((sum, rate) => sum + rate, 0) / item.rates.length : 0,
        count: item.count
      }))
      .sort((a, b) => {
        const dateA = new Date(a.maturity.split('/').reverse().join('-'));
        const dateB = new Date(b.maturity.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md max-w-xs">
          <p className="text-foreground font-medium">Vencimento: {data.maturity}</p>
          <p className="text-primary">Valor: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Taxa Média: {data.avgRate.toFixed(2)}%</p>
          <p className="text-sm text-muted-foreground">Investimentos: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {targetStrategies.map((strategy, strategyIndex) => {
        const chartData = getStrategyData(strategy);
        
        if (chartData.length === 0) return null;
        
        return (
          <Card key={strategy} className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader>
              <CardTitle className="text-foreground">{strategy}</CardTitle>
              <p className="text-sm text-muted-foreground">Valor aplicado e taxa média por vencimento</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="maturity"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Valor Investido"
                    fill={STRATEGY_COLORS[strategyIndex % STRATEGY_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
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
  // Filter investments to only include those with maturity and group by maturity date
  const maturityData = investmentData
    .filter(investment => investment.maturity && investment.strategy)
    .reduce((acc, investment) => {
      if (!investment.strategy || !investment.maturity) return acc;
      
      const maturityDate = investment.maturity;
      
      if (!acc[maturityDate]) {
        acc[maturityDate] = {
          maturity: maturityDate,
          maturitySort: new Date(maturityDate.split('/').reverse().join('-')).getTime(),
          strategies: {}
        };
      }
      
      if (!acc[maturityDate].strategies[investment.strategy]) {
        acc[maturityDate].strategies[investment.strategy] = {
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
      
      acc[maturityDate].strategies[investment.strategy].value += investment.value;
      acc[maturityDate].strategies[investment.strategy].rates.push(parseRate(investment.rate || ''));
      acc[maturityDate].strategies[investment.strategy].count += 1;
      
      return acc;
    }, {} as Record<string, {
      maturity: string;
      maturitySort: number;
      strategies: Record<string, { value: number; rates: number[]; count: number }>;
    }>);

  // Convert to chart data format
  const chartData = Object.values(maturityData)
    .map(item => {
      const result: any = {
        maturity: item.maturity,
        maturitySort: item.maturitySort
      };
      
      // Add each strategy as a separate property with value and average rate
      Object.entries(item.strategies).forEach(([strategy, data]) => {
        const avgRate = data.rates.length > 0 ? 
          data.rates.reduce((sum, rate) => sum + rate, 0) / data.rates.length : 0;
        
        result[strategy] = data.value;
        result[`${strategy}_rate`] = avgRate;
      });
      
      return result;
    })
    .sort((a, b) => a.maturitySort - b.maturitySort);

  // Get all unique strategies
  const strategies = [...new Set(
    Object.values(maturityData).flatMap(item => Object.keys(item.strategies))
  )];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const strategy = payload[0].dataKey;
      const avgRate = data[`${strategy}_rate`];
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md max-w-xs">
          <p className="text-foreground font-medium">Vencimento: {data.maturity}</p>
          <p className="text-primary">Estratégia: {strategy}</p>
          <p className="text-muted-foreground">Valor: R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-sm text-muted-foreground">Taxa Média: {avgRate ? `${avgRate.toFixed(2)}%` : 'N/A'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Investimentos por Estratégia e Vencimento</CardTitle>
        <p className="text-sm text-muted-foreground">Valor aplicado e taxa média por vencimento</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
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
            <Legend />
            
            {strategies.map((strategy, index) => (
              <Bar
                key={strategy}
                dataKey={strategy}
                name={strategy}
                fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
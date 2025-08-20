import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { investmentData } from "@/data/investmentData";

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))', 
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
  'hsl(170 40% 45%)',
  'hsl(200 60% 55%)',
  'hsl(290 70% 60%)',
  'hsl(340 75% 65%)'
];

export function StrategyBreakdown() {
  // Group investments by strategy and calculate totals
  const strategyData = investmentData.reduce((acc, investment) => {
    const strategy = investment.strategy;
    if (!acc[strategy]) {
      acc[strategy] = { name: strategy, value: 0, count: 0 };
    }
    acc[strategy].value += investment.value;
    acc[strategy].count += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number }>);

  const chartData = Object.values(strategyData).map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">Valor: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Ativos: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Retorno por Estratégia</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição do patrimônio</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { investmentData } from "@/data/investmentData";

export function MaturityTimeline() {
  // Group investments by maturity year and calculate totals
  const maturityData = investmentData
    .filter(investment => investment.maturity)
    .reduce((acc, investment) => {
      if (!investment.maturity) return acc;
      
      const year = new Date(investment.maturity.split('/').reverse().join('-')).getFullYear();
      const yearStr = year.toString();
      
      if (!acc[yearStr]) {
        acc[yearStr] = { year: yearStr, amount: 0, count: 0 };
      }
      acc[yearStr].amount += investment.value;
      acc[yearStr].count += 1;
      return acc;
    }, {} as Record<string, { year: string; amount: number; count: number }>);

  const chartData = Object.values(maturityData)
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">Ano: {data.year}</p>
          <p className="text-primary">Valor: R$ {data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Vencimentos: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Vencimentos Acumulados</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição por ano</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="year" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amount" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
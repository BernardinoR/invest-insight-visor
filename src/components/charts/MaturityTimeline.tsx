import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { investmentData } from "@/data/investmentData";

export function MaturityTimeline() {
  // Group investments by maturity date and strategy
  const maturityData = investmentData
    .filter(investment => investment.maturity && investment.strategy)
    .reduce((acc, investment) => {
      if (!investment.maturity || !investment.strategy) return acc;
      
      const maturityDate = investment.maturity;
      const strategy = investment.strategy;
      
      if (!acc[maturityDate]) {
        acc[maturityDate] = { 
          date: maturityDate, 
          strategies: {},
          totalAmount: 0,
          avgRate: "",
          totalInvestments: 0
        };
      }
      
      if (!acc[maturityDate].strategies[strategy]) {
        acc[maturityDate].strategies[strategy] = {
          amount: 0,
          count: 0,
          rates: [] as string[]
        };
      }
      
      acc[maturityDate].strategies[strategy].amount += investment.value;
      acc[maturityDate].strategies[strategy].count += 1;
      if (investment.rate) {
        acc[maturityDate].strategies[strategy].rates.push(investment.rate);
      }
      
      acc[maturityDate].totalAmount += investment.value;
      acc[maturityDate].totalInvestments += 1;
      
      return acc;
    }, {} as Record<string, { 
      date: string; 
      strategies: Record<string, { amount: number; count: number; rates: string[] }>;
      totalAmount: number;
      avgRate: string;
      totalInvestments: number;
    }>);

  // Calculate average rates and prepare chart data
  const chartData = Object.values(maturityData)
    .map(item => {
      // Get the most common rate for this maturity date
      const allRates = Object.values(item.strategies).flatMap(strategy => strategy.rates);
      const rateCount = allRates.reduce((acc, rate) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonRate = Object.entries(rateCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "";
      
      item.avgRate = mostCommonRate;
      return item;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">Data: {data.date}</p>
          <p className="text-primary">Valor Total: R$ {data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Taxa Média: {data.avgRate}</p>
          <div className="mt-2">
            <p className="text-sm font-medium text-foreground">Por Estratégia:</p>
            {Object.entries(data.strategies).map(([strategy, strategyData]: [string, any]) => (
              <div key={strategy} className="text-xs text-muted-foreground ml-2">
                {strategy}: R$ {strategyData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Vencimentos por Estratégia</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição por data de vencimento</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Nenhum dado de vencimento disponível</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
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
                dataKey="totalAmount" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
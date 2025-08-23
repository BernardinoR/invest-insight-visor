import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { investmentData } from "@/data/investmentData";

export function MaturityTimeline() {
  // Group investments by strategy and calculate average rates
  const strategyData = investmentData.reduce((acc, investment) => {
    const strategy = investment.strategy;
    
    if (!acc[strategy]) {
      acc[strategy] = {
        investments: [],
        totalValue: 0,
        rates: [] as string[],
        avgRate: "",
        count: 0
      };
    }
    
    acc[strategy].investments.push({
      value: investment.value,
      performance: investment.performance,
      asset: investment.asset,
      rate: investment.rate || "",
      client: investment.client
    });
    
    acc[strategy].totalValue += investment.value;
    acc[strategy].count += 1;
    
    if (investment.rate) {
      acc[strategy].rates.push(investment.rate);
    }
    
    return acc;
  }, {} as Record<string, { 
    investments: Array<{value: number; performance: number; asset: string; rate: string; client: string}>;
    totalValue: number;
    rates: string[];
    avgRate: string;
    count: number;
  }>);

  // Calculate average rates for each strategy
  Object.keys(strategyData).forEach(strategy => {
    const rates = strategyData[strategy].rates;
    if (rates.length > 0) {
      const rateCount = rates.reduce((acc, rate) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      strategyData[strategy].avgRate = Object.entries(rateCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "";
    }
  });

  // Prepare scatter data with sections for each strategy
  const scatterData = Object.entries(strategyData).flatMap(([strategy, data], strategyIndex) => 
    data.investments.map((investment, index) => ({
      x: strategyIndex + (index * 0.05) - 0.2 + Math.random() * 0.4, // Spread points within strategy section
      y: investment.performance,
      value: investment.value,
      strategy,
      asset: investment.asset,
      rate: investment.rate,
      client: investment.client,
      avgRate: data.avgRate,
      strategyIndex
    }))
  );

  const strategies = Object.keys(strategyData);
  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">{data.asset}</p>
          <p className="text-primary">Valor: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Performance: {data.y.toFixed(2)}%</p>
          <p className="text-muted-foreground">Estratégia: {data.strategy}</p>
          {data.rate && <p className="text-muted-foreground">Taxa: {data.rate}</p>}
          <p className="text-muted-foreground">Taxa Média da Estratégia: {data.avgRate}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Distribuição por Estratégia</CardTitle>
        <p className="text-sm text-muted-foreground">Performance vs. Valor por estratégia com taxa média</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {strategies.map((strategy, index) => (
            <div key={strategy} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-muted-foreground">
                {strategy} (Taxa: {strategyData[strategy].avgRate || 'N/A'})
              </span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              dataKey="x"
              domain={[-0.5, strategies.length - 0.5]}
              ticks={strategies.map((_, index) => index)}
              tickFormatter={(value) => strategies[value] || ''}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              dataKey="y"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[entry.strategyIndex % colors.length]}
                  opacity={0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
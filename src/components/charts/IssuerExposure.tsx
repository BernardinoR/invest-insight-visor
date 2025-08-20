import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { investmentData } from "@/data/investmentData";

export function IssuerExposure() {
  // Group investments by issuer and calculate totals
  const issuerData = investmentData
    .filter(investment => investment.issuer)
    .reduce((acc, investment) => {
      if (!investment.issuer) return acc;
      
      const issuer = investment.issuer;
      if (!acc[issuer]) {
        acc[issuer] = { name: issuer, exposure: 0, count: 0 };
      }
      acc[issuer].exposure += investment.value;
      acc[issuer].count += 1;
      return acc;
    }, {} as Record<string, { name: string; exposure: number; count: number }>);

  const chartData = Object.values(issuerData)
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 10); // Top 10 issuers

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">Exposição: R$ {data.exposure.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Ativos: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Exposição por Emissor</CardTitle>
        <p className="text-sm text-muted-foreground">Top 10 emissores</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData} 
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="exposure" 
              fill="hsl(var(--accent))"
              radius={[0, 4, 4, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
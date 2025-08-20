import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { benchmarkData } from "@/data/investmentData";

export function PerformanceChart() {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Retorno Total vs Benchmarks</CardTitle>
        <p className="text-sm text-muted-foreground">Comparação com IPCA+5% e CDI</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={benchmarkData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value) => [`${value}%`, '']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Portfolio"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="ipca5" 
              stroke="hsl(var(--info))" 
              strokeWidth={2}
              name="IPCA+5%"
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="cdi" 
              stroke="hsl(var(--warning))" 
              strokeWidth={2}
              name="CDI"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
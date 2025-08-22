import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from "lucide-react";

interface PerformanceChartProps {
  consolidadoData: Array<{
    Data: string;
    "Patrimonio Final": number;
    "Patrimonio Inicial": number;
    "Movimentação": number;
    "Ganho Financeiro": number;
    Rendimento: number;
    Impostos: number;
    Competencia: string;
  }>;
}

export function PerformanceChart({ consolidadoData }: PerformanceChartProps) {
  // Transform consolidado data for chart - convert to percentage using Competencia field
  const chartData = consolidadoData.map((item, index) => {
    // Parse competencia format (MM/YYYY) to create proper date
    const [month, year] = item.Competencia.split('/');
    const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    return {
      name: competenciaDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      rentabilidade: (Number(item.Rendimento) || 0) * 100, // Convert to percentage
    };
  });

  // Add zero point one month before the first competencia
  if (consolidadoData.length > 0) {
    const [month, year] = consolidadoData[0].Competencia.split('/');
    const firstDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const previousMonth = new Date(firstDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    
    const zeroPoint = {
      name: previousMonth.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      rentabilidade: 0
    };
    
    chartData.unshift(zeroPoint);
  }

  // Calculate max value for Y axis
  const maxValue = Math.max(...chartData.map(item => item.rentabilidade));
  const yAxisMax = Math.max(maxValue + 1, 5); // At least 5% on Y axis

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-foreground text-xl font-semibold">Performance de Rentabilidade</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Evolução mensal da carteira</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium text-primary">Rentabilidade</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="rentabilidadeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tick={{ dy: 10 }}
                interval={0}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, yAxisMax]}
                width={60}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                  fontSize: '13px',
                  padding: '12px'
                }}
                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Rentabilidade']}
                labelStyle={{ 
                  color: 'hsl(var(--foreground))', 
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
                cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="rentabilidade" 
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#rentabilidadeGradient)"
                dot={{ 
                  fill: 'hsl(var(--primary))', 
                  strokeWidth: 2, 
                  stroke: 'hsl(var(--card))',
                  r: 4
                }}
                activeDot={{ 
                  r: 6, 
                  fill: 'hsl(var(--primary))', 
                  strokeWidth: 3, 
                  stroke: 'hsl(var(--card))',
                  filter: 'drop-shadow(0 4px 8px hsl(var(--primary) / 0.3))'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance Summary */}
        <div className="mt-6 pt-6 border-t border-border/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {consolidadoData.slice(-4).map((item, index) => (
              <div key={index} className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">
                  {item.Competencia}
                </div>
                <div className={`text-sm font-semibold ${Number(item.Rendimento) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(Number(item.Rendimento || 0) * 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
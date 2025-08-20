import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { benchmarkData } from "@/data/investmentData";

export function PerformanceChart() {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground text-xl">Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Performance nos Últimos 12 Meses</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-foreground"></div>
              <span className="text-muted-foreground">Rentabilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-muted-foreground">IPCA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-muted-foreground">CDI</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={benchmarkData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ dy: 10 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[-2, 14]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px'
              }}
              formatter={(value, name) => [
                `${value}%`, 
                name === 'portfolio' ? 'Rentabilidade' : 
                name === 'ipca5' ? 'IPCA' : 'CDI'
              ]}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="hsl(var(--foreground))" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="ipca5" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            <Line 
              type="monotone" 
              dataKey="cdi" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Performance Summary Table */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-7 gap-4 text-sm">
            <div className="font-medium text-muted-foreground">Período</div>
            <div className="font-medium text-muted-foreground">Patrimônio Inicial</div>
            <div className="font-medium text-muted-foreground">Movimentação</div>
            <div className="font-medium text-muted-foreground">Impostos</div>
            <div className="font-medium text-muted-foreground">Rendimento</div>
            <div className="font-medium text-muted-foreground">Patrimônio Final</div>
            <div className="font-medium text-muted-foreground">Rentabilidade</div>
            
            <div className="text-foreground">12 Meses</div>
            <div className="text-foreground">R$ 802.839,65</div>
            <div className="text-foreground">R$ 40.800,00</div>
            <div className="text-foreground">R$ 0,00</div>
            <div className="text-foreground">R$ 4.873,08</div>
            <div className="text-foreground">R$ 848.512,74</div>
            <div className="text-success">0,58%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
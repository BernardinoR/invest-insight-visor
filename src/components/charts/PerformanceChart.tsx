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
          <div className="grid grid-cols-10 gap-2 text-xs">
            <div className="font-medium text-muted-foreground">Período</div>
            <div className="font-medium text-muted-foreground">Patrimônio Inicial</div>
            <div className="font-medium text-muted-foreground">Movimentação</div>
            <div className="font-medium text-muted-foreground">Taxas</div>
            <div className="font-medium text-muted-foreground">Impostos</div>
            <div className="font-medium text-muted-foreground">Rendimento</div>
            <div className="font-medium text-muted-foreground">Patrimônio Final</div>
            <div className="font-medium text-muted-foreground">Rentabilidade</div>
            <div className="font-medium text-muted-foreground">% IPCA</div>
            <div className="font-medium text-muted-foreground">% CDI</div>
            
            <div className="text-foreground">12 Meses</div>
            <div className="text-foreground">1.976.765,57</div>
            <div className="text-foreground">-402.480,13</div>
            <div className="text-foreground">-3.556,75</div>
            <div className="text-foreground">-25.797,28</div>
            <div className="text-foreground">229.418,03</div>
            <div className="text-foreground">1.774.349,44</div>
            <div className="text-success">12,58%</div>
            <div className="text-foreground">7,26%</div>
            <div className="text-foreground">106,63%</div>

            <div className="text-foreground">Mai/25</div>
            <div className="text-foreground">1.870.215,75</div>
            <div className="text-foreground">-116.074,83</div>
            <div className="text-foreground">-13,48</div>
            <div className="text-foreground">-10.059,89</div>
            <div className="text-foreground">30.281,89</div>
            <div className="text-foreground">1.774.349,44</div>
            <div className="text-success">1,71%</div>
            <div className="text-foreground">1,45%</div>
            <div className="text-foreground">150,52%</div>

            <div className="text-foreground">Abr/25</div>
            <div className="text-foreground">1.853.300,78</div>
            <div className="text-foreground">-18.935,44</div>
            <div className="text-foreground">-354,12</div>
            <div className="text-foreground">-253,91</div>
            <div className="text-foreground">36.458,44</div>
            <div className="text-foreground">1.870.215,75</div>
            <div className="text-success">1,98%</div>
            <div className="text-foreground">1,55%</div>
            <div className="text-foreground">187,41%</div>

            <div className="text-foreground">Mar/25</div>
            <div className="text-foreground">2.005.772,60</div>
            <div className="text-foreground">-170.145,42</div>
            <div className="text-foreground">-1.279,04</div>
            <div className="text-foreground">-1.513,48</div>
            <div className="text-foreground">20.466,12</div>
            <div className="text-foreground">1.853.300,78</div>
            <div className="text-success">1,04%</div>
            <div className="text-foreground">0,48%</div>
            <div className="text-foreground">107,99%</div>

            <div className="text-foreground">Fev/25</div>
            <div className="text-foreground">2.017.158,92</div>
            <div className="text-foreground">-1.347,51</div>
            <div className="text-foreground">-1,65</div>
            <div className="text-foreground">-</div>
            <div className="text-foreground">-9.437,16</div>
            <div className="text-foreground">2.005.772,60</div>
            <div className="text-destructive">-0,47%</div>
            <div className="text-foreground">-1,78%</div>
            <div className="text-foreground">-47,51%</div>

            <div className="text-foreground">Jan/25</div>
            <div className="text-foreground">2.015.031,38</div>
            <div className="text-foreground">25,30</div>
            <div className="text-foreground">-122,69</div>
            <div className="text-foreground">-2.628,64</div>
            <div className="text-foreground">4.853,57</div>
            <div className="text-foreground">2.017.158,92</div>
            <div className="text-success">0,23%</div>
            <div className="text-foreground">0,07%</div>
            <div className="text-foreground">22,62%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { benchmarkData } from "@/data/investmentData";

export function PerformanceChart() {
  return (
    <Card className="bg-card border-border/20 shadow-lg lg:col-span-2">
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-foreground text-2xl font-normal mb-1">Performance</CardTitle>
            <div className="flex items-center gap-8 mt-4 text-sm text-muted-foreground">
              <span>Período</span>
              <span>16/08/25</span>
              <span>03/01/2022</span>
              <span>30/05/2025</span>
              <span className="text-foreground font-medium">Real (R$)</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">Performance nos Últimos 12 Meses</h3>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-slate-800"></div>
              <span className="text-muted-foreground">Rentabilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-600"></div>
              <span className="text-muted-foreground">IPCA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span className="text-muted-foreground">CDI</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={benchmarkData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="1 1" stroke="#e2e8f0" opacity={0.4} />
            <XAxis 
              dataKey="name" 
              stroke="#64748b"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ dy: 15 }}
              interval={0}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[-2, 14]}
              ticks={[-2, 0, 2, 5, 8, 11, 14]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              formatter={(value, name) => [
                `${value}%`, 
                name === 'portfolio' ? 'Rentabilidade' : 
                name === 'ipca5' ? 'IPCA' : 'CDI'
              ]}
              labelStyle={{ color: '#64748b', fontWeight: '500' }}
            />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="#1e293b" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#1e293b', strokeWidth: 2, stroke: '#fff' }}
            />
            <Line 
              type="monotone" 
              dataKey="ipca5" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            />
            <Line 
              type="monotone" 
              dataKey="cdi" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Performance Summary Table */}
        <div className="mt-8 pt-6 border-t border-border/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left py-3 text-muted-foreground font-medium">Período</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Patrimônio Inicial</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Movimentação</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Taxas</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Impostos</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Rendimento</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Patrimônio Final</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Rentabilidade</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">% IPCA</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">% CDI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/10">
                  <td className="py-3 text-foreground font-medium">12 Meses</td>
                  <td className="py-3 text-right text-foreground">1.976.765,57</td>
                  <td className="py-3 text-right text-foreground">-402.480,13</td>
                  <td className="py-3 text-right text-foreground">-3.556,75</td>
                  <td className="py-3 text-right text-foreground">-25.797,28</td>
                  <td className="py-3 text-right text-foreground">229.418,03</td>
                  <td className="py-3 text-right text-foreground">1.774.349,44</td>
                  <td className="py-3 text-right text-emerald-600 font-medium">12,58%</td>
                  <td className="py-3 text-right text-foreground">7,26%</td>
                  <td className="py-3 text-right text-foreground">106,63%</td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-3 text-foreground">Mai/25</td>
                  <td className="py-3 text-right text-foreground">1.870.215,75</td>
                  <td className="py-3 text-right text-foreground">-116.074,83</td>
                  <td className="py-3 text-right text-foreground">-13,48</td>
                  <td className="py-3 text-right text-foreground">-10.059,89</td>
                  <td className="py-3 text-right text-foreground">30.281,89</td>
                  <td className="py-3 text-right text-foreground">1.774.349,44</td>
                  <td className="py-3 text-right text-emerald-600">1,71%</td>
                  <td className="py-3 text-right text-foreground">1,45%</td>
                  <td className="py-3 text-right text-foreground">150,52%</td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-3 text-foreground">Abr/25</td>
                  <td className="py-3 text-right text-foreground">1.853.300,78</td>
                  <td className="py-3 text-right text-foreground">-18.935,44</td>
                  <td className="py-3 text-right text-foreground">-354,12</td>
                  <td className="py-3 text-right text-foreground">-253,91</td>
                  <td className="py-3 text-right text-foreground">36.458,44</td>
                  <td className="py-3 text-right text-foreground">1.870.215,75</td>
                  <td className="py-3 text-right text-emerald-600">1,98%</td>
                  <td className="py-3 text-right text-foreground">1,55%</td>
                  <td className="py-3 text-right text-foreground">187,41%</td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-3 text-foreground">Mar/25</td>
                  <td className="py-3 text-right text-foreground">2.005.772,60</td>
                  <td className="py-3 text-right text-foreground">-170.145,42</td>
                  <td className="py-3 text-right text-foreground">-1.279,04</td>
                  <td className="py-3 text-right text-foreground">-1.513,48</td>
                  <td className="py-3 text-right text-foreground">20.466,12</td>
                  <td className="py-3 text-right text-foreground">1.853.300,78</td>
                  <td className="py-3 text-right text-emerald-600">1,04%</td>
                  <td className="py-3 text-right text-foreground">0,48%</td>
                  <td className="py-3 text-right text-foreground">107,99%</td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-3 text-foreground">Fev/25</td>
                  <td className="py-3 text-right text-foreground">2.017.158,92</td>
                  <td className="py-3 text-right text-foreground">-1.347,51</td>
                  <td className="py-3 text-right text-foreground">-1,65</td>
                  <td className="py-3 text-right text-foreground">-</td>
                  <td className="py-3 text-right text-foreground">-9.437,16</td>
                  <td className="py-3 text-right text-foreground">2.005.772,60</td>
                  <td className="py-3 text-right text-red-600">-0,47%</td>
                  <td className="py-3 text-right text-foreground">-1,78%</td>
                  <td className="py-3 text-right text-foreground">-47,51%</td>
                </tr>
                <tr>
                  <td className="py-3 text-foreground">Jan/25</td>
                  <td className="py-3 text-right text-foreground">2.015.031,38</td>
                  <td className="py-3 text-right text-foreground">25,30</td>
                  <td className="py-3 text-right text-foreground">-122,69</td>
                  <td className="py-3 text-right text-foreground">-2.628,64</td>
                  <td className="py-3 text-right text-foreground">4.853,57</td>
                  <td className="py-3 text-right text-foreground">2.017.158,92</td>
                  <td className="py-3 text-right text-emerald-600">0,23%</td>
                  <td className="py-3 text-right text-foreground">0,07%</td>
                  <td className="py-3 text-right text-foreground">22,62%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
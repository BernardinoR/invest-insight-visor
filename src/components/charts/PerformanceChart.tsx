import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  // Transform consolidado data for chart
  const chartData = consolidadoData.map((item, index) => ({
    name: new Date(item.Data).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    portfolio: Number(item.Rendimento) || 0,
    ipca5: 4.5, // Static benchmark data - would be dynamic in real app
    cdi: 3.8   // Static benchmark data - would be dynamic in real app
  }));
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
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
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
                {consolidadoData.map((item, index) => (
                  <tr key={index} className={index < consolidadoData.length - 1 ? "border-b border-border/10" : ""}>
                    <td className="py-3 text-foreground font-medium">
                      {new Date(item.Data).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {Number(item["Patrimonio Inicial"] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {Number(item["Movimentação"] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-foreground">-</td>
                    <td className="py-3 text-right text-foreground">
                      {Number(item.Impostos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {Number(item["Ganho Financeiro"] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {Number(item["Patrimonio Final"] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 text-right font-medium ${Number(item.Rendimento) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(item.Rendimento || 0).toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-foreground">4,5%</td>
                    <td className="py-3 text-right text-foreground">110%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useClientData } from "@/hooks/useClientData";

interface IssuerData {
  name: string;
  exposure: number;
  count: number;
  exceedsLimit: boolean;
}

export function IssuerExposure({ clientName }: { clientName?: string }) {
  const { dadosData, loading } = useClientData(clientName || "");
  
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
        <CardHeader>
          <CardTitle className="text-foreground">Exposição por Emissor</CardTitle>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Carregando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group investments by issuer and calculate totals
  const issuerData = dadosData
    .filter(investment => investment.Emissor && investment.Posicao)
    .reduce((acc, investment) => {
      const issuer = investment.Emissor!;
      const position = Number(investment.Posicao) || 0;
      
      if (!acc[issuer]) {
        acc[issuer] = { 
          name: issuer, 
          exposure: 0, 
          count: 0,
          exceedsLimit: false
        };
      }
      acc[issuer].exposure += position;
      acc[issuer].count += 1;
      return acc;
    }, {} as Record<string, IssuerData>);

  const LIMIT = 250000; // R$ 250.000

  // Mark issuers that exceed the limit and sort by exposure
  const chartData = Object.values(issuerData)
    .map(item => ({
      ...item,
      exceedsLimit: item.exposure > LIMIT
    }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 15); // Top 15 issuers

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const exceedsLimit = data.exposure > LIMIT;
      const excess = data.exposure - LIMIT;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">
            Exposição: R$ {data.exposure.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted-foreground">Ativos: {data.count}</p>
          {exceedsLimit && (
            <p className="text-destructive font-medium">
              Acima do limite em: R$ {excess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Color function for bars based on limit
  const getBarColor = (value: number) => {
    return value > LIMIT ? 'hsl(var(--destructive))' : 'hsl(var(--accent))';
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Exposição por Emissor</CardTitle>
        <p className="text-sm text-muted-foreground">
          Limite de concentração: R$ 250.000 por emissor
        </p>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--accent))' }}></div>
            <span>Dentro do limite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
            <span>Acima do limite</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={LIMIT} 
              stroke="hsl(var(--destructive))" 
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Limite R$ 250k", position: "right" }}
            />
            <Bar 
              dataKey="exposure" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.exposure)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
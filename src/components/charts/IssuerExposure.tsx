import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useClientData } from "@/hooks/useClientData";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IssuerData {
  name: string;
  exposure: number;
  count: number;
  exceedsLimit: boolean;
  contas: string[];
}

export function IssuerExposure({ clientName, dadosData: propDadosData }: { 
  clientName?: string;
  dadosData?: Array<{
    Emissor: string;
    Posicao: number;
    Vencimento: string;
    Competencia: string;
    nomeConta?: string;
  }>;
}) {
  const { dadosData: hookDadosData, loading } = useClientData(clientName || "");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  
  // Use provided data if available, otherwise use hook data
  const rawData = propDadosData || hookDadosData;
  
  if (loading && !propDadosData) {
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

  // Filter to get only the most recent competencia within the filtered period (same logic as consolidated performance)
  const getMostRecentData = (data: typeof rawData) => {
    if (data.length === 0) return [];
    
    // Convert competencia string to date for proper comparison
    const competenciaToDate = (competencia: string) => {
      const [month, year] = competencia.split('/');
      return new Date(parseInt(year), parseInt(month) - 1);
    };
    
    // Find the most recent competencia using date comparison
    const mostRecentCompetencia = data.reduce((latest, current) => {
      const latestDate = competenciaToDate(latest.Competencia);
      const currentDate = competenciaToDate(current.Competencia);
      return currentDate > latestDate ? current : latest;
    }).Competencia;
    
    // Return all records with the most recent competencia
    return data.filter(item => item.Competencia === mostRecentCompetencia);
  };

  const filteredData = getMostRecentData(rawData);

  // Extract unique account names from the data
  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>();
    filteredData.forEach(item => {
      if (item.nomeConta) {
        accounts.add(item.nomeConta);
      }
    });
    return Array.from(accounts).sort();
  }, [filteredData]);

  // Apply account filter if selected
  const accountFilteredData = selectedAccount === "all" 
    ? filteredData 
    : filteredData.filter(item => item.nomeConta === selectedAccount);

  // Group investments by issuer and calculate totals
  const issuerData = accountFilteredData
    .filter(investment => investment.Emissor && investment.Posicao)
    .reduce((acc, investment) => {
      const issuer = investment.Emissor!;
      const position = Number(investment.Posicao) || 0;
      const vencimento = investment.Vencimento;
      const nomeConta = investment.nomeConta || "Sem nome";
      
      if (!acc[issuer]) {
        acc[issuer] = { 
          name: issuer, 
          exposure: 0, 
          count: 0,
          exceedsLimit: false,
          vencimentos: [],
          contas: []
        };
      }
      acc[issuer].exposure += position;
      acc[issuer].count += 1;
      
      // Add maturity date if it exists and isn't already in the list
      if (vencimento && !acc[issuer].vencimentos.includes(vencimento)) {
        acc[issuer].vencimentos.push(vencimento);
      }
      
      // Add account name if it exists and isn't already in the list
      if (nomeConta && !acc[issuer].contas.includes(nomeConta)) {
        acc[issuer].contas.push(nomeConta);
      }
      
      return acc;
    }, {} as Record<string, IssuerData & { vencimentos: string[]; contas: string[] }>);

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
      
      // Format maturity dates
      const formatVencimentos = (vencimentos: string[]) => {
        if (!vencimentos || vencimentos.length === 0) return "N/A";
        
        const sortedVencimentos = vencimentos
          .filter(v => v) // Remove null/undefined
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        if (sortedVencimentos.length <= 3) {
          return sortedVencimentos.map(v => {
            const date = new Date(v);
            return date.toLocaleDateString('pt-BR');
          }).join(', ');
        } else {
          const first = new Date(sortedVencimentos[0]).toLocaleDateString('pt-BR');
          const last = new Date(sortedVencimentos[sortedVencimentos.length - 1]).toLocaleDateString('pt-BR');
          return `${first} ... ${last} (+${sortedVencimentos.length - 2} outros)`;
        }
      };
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md max-w-xs">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-primary">
            Exposição: R$ {data.exposure.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted-foreground">Ativos: {data.count}</p>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-medium">Vencimentos:</span><br />
            {formatVencimentos(data.vencimentos)}
          </p>
          {selectedAccount === "all" && data.contas && data.contas.length > 0 && (
            <p className="text-muted-foreground text-sm mt-1">
              <span className="font-medium">Contas:</span> {data.contas.join(', ')}
            </p>
          )}
          {exceedsLimit && (
            <p className="text-destructive font-medium mt-1">
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
        {uniqueAccounts.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar por conta:</span>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="all" className="cursor-pointer">
                    Todas as contas
                  </SelectItem>
                  {uniqueAccounts.map((account) => (
                    <SelectItem 
                      key={account} 
                      value={account}
                      className="cursor-pointer"
                    >
                      {account || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
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
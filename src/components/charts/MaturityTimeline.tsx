import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface MaturityTimelineProps {
  selectedClient?: string;
  dadosData?: Array<{
    "Classe do ativo": string;
    Posicao: number;
    Vencimento: string;
    Taxa: string;
    Competencia: string;
  }>;
}

interface MaturityYearDataItem {
  year: string;
  strategies: Record<string, { amount: number; count: number; rates: string[] }>;
  totalAmount: number;
  avgRate: string;
  totalInvestments: number;
}

export function MaturityTimeline({ selectedClient, dadosData: propDadosData }: MaturityTimelineProps) {
  const [dadosData, setDadosData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('all');

  useEffect(() => {
    if (propDadosData) {
      // Use provided data instead of fetching
      setDadosData(propDadosData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!selectedClient) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('DadosPerformance')
          .select('*')
          .eq('Nome', selectedClient)
          .not('Vencimento', 'is', null);

        if (error) {
          console.error('Error fetching maturity data:', error);
          return;
        }

        setDadosData(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClient, propDadosData]);

  // Filter to get only the most recent competencia within the filtered period (same logic as consolidated performance)
  const getMostRecentData = (data: typeof dadosData) => {
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

  // Use the most recent data within the filtered period
  const filteredData = getMostRecentData(dadosData);

  // Filter by asset class if a specific one is selected
  const assetClassFilteredData = selectedAssetClass === 'all' 
    ? filteredData 
    : filteredData.filter(item => item["Classe do ativo"] === selectedAssetClass);

  // Group investments by maturity year using filtered data
  const maturityData = assetClassFilteredData
    .filter(investment => investment.Vencimento && investment["Classe do ativo"])
    .reduce((acc, investment) => {
      const maturityDate = new Date(investment.Vencimento);
      const maturityYear = maturityDate.getFullYear().toString();
      const strategy = investment["Classe do ativo"];
      
      if (!acc[maturityYear]) {
        acc[maturityYear] = { 
          year: maturityYear, 
          strategies: {},
          totalAmount: 0,
          avgRate: "",
          totalInvestments: 0
        };
      }
      
      if (!acc[maturityYear].strategies[strategy]) {
        acc[maturityYear].strategies[strategy] = {
          amount: 0,
          count: 0,
          rates: [] as string[]
        };
      }
      
      acc[maturityYear].strategies[strategy].amount += Number(investment.Posicao) || 0;
      acc[maturityYear].strategies[strategy].count += 1;
      if (investment.Taxa) {
        acc[maturityYear].strategies[strategy].rates.push(investment.Taxa);
      }
      
      acc[maturityYear].totalAmount += Number(investment.Posicao) || 0;
      acc[maturityYear].totalInvestments += 1;
      
      return acc;
    }, {} as Record<string, MaturityYearDataItem>);

  // Calculate average rates and prepare chart data
  const chartData = Object.values(maturityData)
    .map((item: MaturityYearDataItem) => {
      // Get the most common rate for this maturity year
      const allRates = Object.values(item.strategies).flatMap((strategy: any) => strategy.rates);
      const rateCount = allRates.reduce((acc, rate) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonRate = Object.entries(rateCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "";
      
      item.avgRate = mostCommonRate;
      return item;
    })
    .sort((a: MaturityYearDataItem, b: MaturityYearDataItem) => {
      return parseInt(a.year) - parseInt(b.year);
    });

  // Get unique asset classes for filter buttons
  const assetClasses = [...new Set(filteredData.map(item => item["Classe do ativo"]).filter(Boolean))];
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">Ano: {data.year}</p>
          <p className="text-primary">Valor Total: R$ {data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-muted-foreground">Taxa Média: {data.avgRate}</p>
          <div className="mt-2">
            <p className="text-sm font-medium text-foreground">Por Estratégia:</p>
            {Object.entries(data.strategies).map(([strategy, strategyData]: [string, any]) => (
              <div key={strategy} className="text-xs text-muted-foreground ml-2">
                {strategy}: R$ {strategyData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
        <CardHeader>
          <CardTitle className="text-foreground">Vencimentos por Estratégia</CardTitle>
          <p className="text-sm text-muted-foreground">Distribuição por data de vencimento</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Carregando dados de vencimento...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Vencimentos por Estratégia</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por data de vencimento</p>
          </div>
          
          {/* Asset Class Filter Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={selectedAssetClass === 'all' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedAssetClass('all')}
              className="text-xs px-3 py-1 h-8"
            >
              Todos
            </Button>
            {assetClasses.map((assetClass) => (
              <Button
                key={assetClass}
                variant={selectedAssetClass === assetClass ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedAssetClass(assetClass)}
                className="text-xs px-3 py-1 h-8"
              >
                {assetClass}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Nenhum dado de vencimento disponível {selectedAssetClass !== 'all' ? `para ${selectedAssetClass}` : `para ${selectedClient}`}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="year" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                textAnchor="middle"
                height={40}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalAmount" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
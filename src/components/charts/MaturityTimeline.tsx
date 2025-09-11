import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface MaturityTimelineProps {
  selectedClient?: string;
}

interface MaturityDataItem {
  date: string;
  strategies: Record<string, { amount: number; count: number; rates: string[] }>;
  totalAmount: number;
  avgRate: string;
  totalInvestments: number;
}

export function MaturityTimeline({ selectedClient }: MaturityTimelineProps) {
  const [dadosData, setDadosData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [selectedClient]);

  // Group investments by maturity date
  const maturityData = dadosData
    .filter(investment => investment.Vencimento && investment["Classe do ativo"])
    .reduce((acc, investment) => {
      const maturityDate = investment.Vencimento;
      const strategy = investment["Classe do ativo"];
      
      if (!acc[maturityDate]) {
        acc[maturityDate] = { 
          date: maturityDate, 
          strategies: {},
          totalAmount: 0,
          avgRate: "",
          totalInvestments: 0
        };
      }
      
      if (!acc[maturityDate].strategies[strategy]) {
        acc[maturityDate].strategies[strategy] = {
          amount: 0,
          count: 0,
          rates: [] as string[]
        };
      }
      
      acc[maturityDate].strategies[strategy].amount += Number(investment.Posicao) || 0;
      acc[maturityDate].strategies[strategy].count += 1;
      if (investment.Taxa) {
        acc[maturityDate].strategies[strategy].rates.push(investment.Taxa);
      }
      
      acc[maturityDate].totalAmount += Number(investment.Posicao) || 0;
      acc[maturityDate].totalInvestments += 1;
      
      return acc;
    }, {} as Record<string, MaturityDataItem>);

  // Calculate average rates and prepare chart data
  const chartData = Object.values(maturityData)
    .map((item: MaturityDataItem) => {
      // Get the most common rate for this maturity date
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
    .sort((a: MaturityDataItem, b: MaturityDataItem) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md">
          <p className="text-foreground font-medium">Data: {new Date(data.date).toLocaleDateString('pt-BR')}</p>
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
        <CardTitle className="text-foreground">Vencimentos por Estratégia</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição por data de vencimento</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Nenhum dado de vencimento disponível para {selectedClient}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
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
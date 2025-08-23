import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = [
  'hsl(210 16% 82%)', // Light blue-gray
  'hsl(32 25% 72%)',  // Light beige
  'hsl(45 20% 85%)',  // Very light beige
  'hsl(210 11% 71%)', // Medium gray
  'hsl(210 16% 58%)', // Darker gray
  'hsl(207 26% 50%)', // Blue-gray
  'hsl(158 64% 25%)', // Dark forest green
  'hsl(159 61% 33%)', // Medium forest green
  'hsl(210 29% 24%)', // Dark blue-gray
  'hsl(25 28% 53%)',  // Medium brown
  'hsl(40 23% 77%)',  // Light tan
  'hsl(210 14% 53%)', // Medium blue-gray
  'hsl(35 31% 65%)',  // Warm beige
  'hsl(210 24% 40%)', // Darker blue-gray
];

interface InvestmentDetailsTableProps {
  dadosData?: Array<{
    "Classe do ativo": string;
    Posicao: number;
    Rendimento: number;
    Nome?: string;
  }>;
  selectedClient: string;
}

export function InvestmentDetailsTable({ dadosData = [], selectedClient }: InvestmentDetailsTableProps) {
  const [yearlyAccumulatedData, setYearlyAccumulatedData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Function to group strategy names according to original specification
  const groupStrategy = (strategy: string): string => {
    const strategyLower = strategy.toLowerCase();
    
    if (strategyLower.includes('cdi - liquidez')) {
      return 'Pós Fixado - Liquidez';
    }
    if (strategyLower.includes('cdi - fundos') || strategyLower.includes('cdi - titulos')) {
      return 'Pós Fixado';
    }
    if (strategyLower.includes('inflação - titulos') || strategyLower.includes('inflação - fundos')) {
      return 'Inflação';
    }
    if (strategyLower.includes('pré fixado - titulos') || strategyLower.includes('pré fixado - fundos')) {
      return 'Pré Fixado';
    }
    if (strategyLower.includes('multimercado')) {
      return 'Multimercado';
    }
    if (strategyLower.includes('imobiliário - ativos') || strategyLower.includes('imobiliário - fundos')) {
      return 'Imobiliário';
    }
    if (strategyLower.includes('ações - ativos') || strategyLower.includes('ações - fundos') || strategyLower.includes('ações - etfs')) {
      return 'Ações';
    }
    if (strategyLower.includes('ações - long bias')) {
      return 'Ações - Long Bias';
    }
    if (strategyLower.includes('private equity') || strategyLower.includes('venture capital') || strategyLower.includes('special sits')) {
      return 'Private Equity';
    }
    if (strategyLower.includes('exterior - ações')) {
      return 'Exterior - Ações';
    }
    if (strategyLower.includes('exterior - renda fixa')) {
      return 'Exterior - Renda Fixa';
    }
    if (strategyLower.includes('coe')) {
      return 'COE';
    }
    if (strategyLower.includes('ouro')) {
      return 'Ouro';
    }
    if (strategyLower.includes('criptoativos')) {
      return 'Criptoativos';
    }
    
    return strategy;
  };

  // Fetch yearly accumulated data for current year
  useEffect(() => {
    const fetchYearlyData = async () => {
      if (!selectedClient) return;
      
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear().toString();
        
        const { data, error } = await supabase
          .from('DadosPerformance')
          .select('*')
          .eq('Nome', selectedClient)
          .like('Competencia', `%${currentYear}%`);
        
        if (error) {
          console.error('Error fetching yearly data:', error);
          return;
        }

        // Group and accumulate by strategy for the current year
        const yearlyAccumulated: Record<string, number> = {};
        
        data?.forEach(item => {
          const originalStrategy = item["Classe do ativo"] || "Outros";
          const groupedStrategy = groupStrategy(originalStrategy);
          const rendimento = Number(item.Rendimento) || 0;
          
          if (!yearlyAccumulated[groupedStrategy]) {
            yearlyAccumulated[groupedStrategy] = 0;
          }
          yearlyAccumulated[groupedStrategy] += rendimento;
        });

        setYearlyAccumulatedData(yearlyAccumulated);
      } catch (error) {
        console.error('Error fetching yearly data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchYearlyData();
  }, [selectedClient]);

  // Group investments by grouped asset class and calculate totals
  const strategyData = dadosData.reduce((acc, investment) => {
    const originalStrategy = investment["Classe do ativo"] || "Outros";
    const groupedStrategy = groupStrategy(originalStrategy);
    
    if (!acc[groupedStrategy]) {
      acc[groupedStrategy] = { 
        name: groupedStrategy, 
        value: 0, 
        count: 0,
        totalReturn: 0
      };
    }
    acc[groupedStrategy].value += Number(investment.Posicao) || 0;
    acc[groupedStrategy].totalReturn += (Number(investment.Rendimento) || 0) * (Number(investment.Posicao) || 0);
    acc[groupedStrategy].count += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number; totalReturn: number }>);

  const totalPatrimonio = Object.values(strategyData).reduce((sum, item) => sum + item.value, 0);

  // Define the order for strategies
  const strategyOrder = [
    'Pós Fixado - Liquidez',
    'Pós Fixado',
    'Inflação',
    'Pré Fixado',
    'Multimercado',
    'Imobiliário',
    'Ações',
    'Ações - Long Bias',
    'Private Equity',
    'Exterior - Renda Fixa',
    'Exterior - Ações',
    'COE',
    'Ouro',
    'Criptoativos'
  ];

  // Function to get color for strategy
  const getStrategyColor = (strategyName: string) => {
    const index = strategyOrder.indexOf(strategyName);
    return index !== -1 ? COLORS[index] : COLORS[0];
  };

  const consolidatedData = Object.values(strategyData)
    .map((item) => ({
      ...item,
      percentage: totalPatrimonio > 0 ? (item.value / totalPatrimonio) * 100 : 0,
      avgReturn: item.value > 0 ? (item.totalReturn / item.value) * 100 : 0,
    }))
    .sort((a, b) => {
      const indexA = strategyOrder.indexOf(a.name);
      const indexB = strategyOrder.indexOf(b.name);
      
      // If both strategies are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the array, maintain original order
      return 0;
    });

  const getPerformanceBadge = (performance: number) => {
    if (performance > 2) {
      return <Badge className="bg-success/20 text-success border-success/30">Excelente</Badge>;
    } else if (performance > 0.5) {
      return <Badge className="bg-info/20 text-info border-info/30">Bom</Badge>;
    } else if (performance > 0) {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Regular</Badge>;
    } else {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Negativo</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Detalhamento dos Investimentos</CardTitle>
        <p className="text-sm text-muted-foreground">Posições consolidadas por estratégia</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground">Estratégia</TableHead>
                <TableHead className="text-muted-foreground text-center">Mês</TableHead>
                <TableHead className="text-muted-foreground text-center">Ano</TableHead>
                <TableHead className="text-muted-foreground text-center">6 Meses</TableHead>
                <TableHead className="text-muted-foreground text-center">12 Meses</TableHead>
                <TableHead className="text-muted-foreground text-center">Início</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidatedData.length > 0 ? (
                consolidatedData.map((item) => {
                  // Get benchmark name for each strategy
                  const getBenchmark = (strategyName: string) => {
                    switch (strategyName) {
                      case 'Pós Fixado - Liquidez':
                      case 'Pós Fixado':
                        return '± CDI';
                      case 'Inflação':
                        return '± IPCA';
                      case 'Pré Fixado':
                        return '± IRF-M';
                      case 'Multimercado':
                        return '± CDI';
                      case 'Imobiliário':
                        return '± IFIX';
                      case 'Ações':
                      case 'Ações - Long Bias':
                        return '± IBOV';
                      case 'Private Equity':
                        return '± CDI';
                      case 'Exterior - Renda Fixa':
                        return '± T-Bond';
                      case 'Exterior - Ações':
                        return '± S&P500';
                      case 'COE':
                        return '± CDI';
                      case 'Ouro':
                        return '± Gold';
                      case 'Criptoativos':
                        return '± BTC';
                      default:
                        return '± CDI';
                    }
                  };

                  return (
                    <>
                      <TableRow key={item.name} className="border-border/50">
                        <TableCell className="font-medium text-foreground flex items-center gap-2 py-2">
                          <div 
                            className="w-1 h-4 rounded-sm" 
                            style={{ backgroundColor: getStrategyColor(item.name) }}
                          ></div>
                          {item.name}
                        </TableCell>
                        <TableCell className={`text-center py-2 ${item.avgReturn >= 0 ? "text-success" : "text-destructive"}`}>
                          {item.avgReturn >= 0 ? "+" : ""}{item.avgReturn.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-center py-2 ${(yearlyAccumulatedData[item.name] || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {loading ? "..." : (
                            yearlyAccumulatedData[item.name] !== undefined
                              ? `${yearlyAccumulatedData[item.name] >= 0 ? "+" : ""}${(yearlyAccumulatedData[item.name] * 100).toFixed(2)}%`
                              : (item.avgReturn !== undefined ? `${item.avgReturn >= 0 ? "+" : ""}${item.avgReturn.toFixed(2)}%` : "-")
                          )}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground py-2">-</TableCell>
                        <TableCell className="text-center text-muted-foreground py-2">-</TableCell>
                        <TableCell className={`text-center py-2 ${item.avgReturn >= 0 ? "text-success" : "text-destructive"}`}>
                          {item.avgReturn >= 0 ? "+" : ""}{item.avgReturn.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                      <TableRow key={`${item.name}-benchmark`} className="border-border/50 bg-muted/20">
                        <TableCell className="font-medium text-muted-foreground pl-8 py-1">
                          {getBenchmark(item.name)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground py-1">-</TableCell>
                        <TableCell className="text-center text-muted-foreground py-1">-</TableCell>
                        <TableCell className="text-center text-muted-foreground py-1">-</TableCell>
                        <TableCell className="text-center text-muted-foreground py-1">-</TableCell>
                        <TableCell className="text-center text-muted-foreground py-1">-</TableCell>
                      </TableRow>
                    </>
                  );
                })
              ) : (
                <TableRow className="border-border/50">
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
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
import { useCDIData } from "@/hooks/useCDIData";

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
    Competencia: string;
    Nome?: string;
  }>;
  selectedClient: string;
  filteredRange?: { inicio: string; fim: string };
}

export function InvestmentDetailsTable({ dadosData = [], selectedClient, filteredRange }: InvestmentDetailsTableProps) {
  const [yearlyAccumulatedData, setYearlyAccumulatedData] = useState<Record<string, number>>({});
  const [accumulatedReturnsData, setAccumulatedReturnsData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const { cdiData } = useCDIData();

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

  // Calculate accumulated returns with compound interest for each strategy from filtered data
  const calculateAccumulatedReturnsFromData = (filteredData: Array<{
    "Classe do ativo": string;
    Rendimento: number;
    Competencia: string;
    Nome?: string;
    Posicao: number;
  }>, strategy: string) => {
    if (filteredData.length === 0) return 0;

    // Group by competencia to calculate weighted average for each month
    const competenciaGroups: Record<string, typeof filteredData> = {};
    filteredData.forEach(item => {
      if (!competenciaGroups[item.Competencia]) {
        competenciaGroups[item.Competencia] = [];
      }
      competenciaGroups[item.Competencia].push(item);
    });

    // Calculate weighted average for each competencia
    const monthlyReturns: Array<{ competencia: string; return: number }> = [];
    Object.entries(competenciaGroups).forEach(([competencia, items]) => {
      let totalPosition = 0;
      let totalWeightedReturn = 0;
      
      items.forEach(item => {
        const position = Number(item.Posicao) || 0;
        const monthlyReturn = Number(item.Rendimento) || 0;
        totalPosition += position;
        totalWeightedReturn += monthlyReturn * position;
      });
      
      const weightedAvgReturn = totalPosition > 0 ? totalWeightedReturn / totalPosition : 0;
      monthlyReturns.push({ competencia, return: weightedAvgReturn });
    });

    // Sort by competencia chronologically
    monthlyReturns.sort((a, b) => {
      const [monthA, yearA] = a.competencia.split('/');
      const [monthB, yearB] = b.competencia.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateA.getTime() - dateB.getTime();
    });

    // Apply compound interest across all months
    let accumulatedMultiplier = 1;
    monthlyReturns.forEach(({ competencia, return: monthReturn }) => {
      accumulatedMultiplier *= (1 + monthReturn);
    });

    console.log(`${strategy} - Início calculation:`, monthlyReturns.map(m => `${m.competencia}: ${(m.return * 100).toFixed(2)}%`).join(', '), `= ${((accumulatedMultiplier - 1) * 100).toFixed(2)}%`);
    
    return accumulatedMultiplier - 1;
  };

  // Legacy function for backward compatibility
  const calculateAccumulatedReturns = (allData: Array<{
    "Classe do ativo": string;
    Rendimento: number;
    Competencia: string;
    Nome?: string;
    Posicao: number;
  }>, strategy: string) => {
    return calculateAccumulatedReturnsFromData(allData.filter(item => {
      const originalStrategy = item["Classe do ativo"] || "Outros";
      const groupedStrategy = groupStrategy(originalStrategy);
      return groupedStrategy === strategy;
    }), strategy);
  };

  // Fetch yearly accumulated data for current year and all historical data for accumulated returns
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedClient) return;
      
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear().toString();
        
        // Fetch all historical data for accumulated returns calculation
        const { data: allData, error: allError } = await supabase
          .from('DadosPerformance')
          .select('*')
          .eq('Nome', selectedClient);

        if (allError) {
          console.error('Error fetching all data:', allError);
          return;
        }

        const yearlyAccumulated: Record<string, number> = {};
        const accumulatedReturns: Record<string, number> = {};

        // Calculate accumulated returns for each strategy from the beginning
        const strategies = new Set<string>();
        allData?.forEach(item => {
          const originalStrategy = item["Classe do ativo"] || "Outros";
          const groupedStrategy = groupStrategy(originalStrategy);
          strategies.add(groupedStrategy);
        });

        strategies.forEach(strategy => {
          // Calculate yearly accumulated returns based on filtered range
          let yearFilterData;
          let allFilteredData;
          
          if (filteredRange?.inicio && filteredRange?.fim) {
            // Get all data within the filtered range
            allFilteredData = allData?.filter(item => {
              const originalStrategy = item["Classe do ativo"] || "Outros";
              const groupedStrategy = groupStrategy(originalStrategy);
              return groupedStrategy === strategy && 
                     item.Competencia >= filteredRange.inicio && 
                     item.Competencia <= filteredRange.fim;
            });
            
            // For year calculation: get the year of the last competencia in the filter
            if (allFilteredData && allFilteredData.length > 0) {
              const lastCompetencia = allFilteredData.reduce((latest, current) => {
                return current.Competencia > latest.Competencia ? current : latest;
              }).Competencia;
              
              const lastYear = lastCompetencia.split('/')[1]; // Get year from MM/YYYY
              
              // Filter for only the competencias from that year within the filtered range
              yearFilterData = allFilteredData.filter(item => 
                item.Competencia.includes(lastYear)
              );
              
              console.log(`${strategy} - Year filter (${lastYear}):`, yearFilterData.map(i => i.Competencia));
            }
          } else {
            // Default fallback (shouldn't happen with proper filtering)
            const currentYear = new Date().getFullYear().toString();
            yearFilterData = allData?.filter(item => {
              const originalStrategy = item["Classe do ativo"] || "Outros";
              const groupedStrategy = groupStrategy(originalStrategy);
              return groupedStrategy === strategy && item.Competencia.includes(currentYear);
            });
            allFilteredData = yearFilterData;
          }

          const currentYearData = yearFilterData?.sort((a, b) => {
            const [monthA, yearA] = a.Competencia.split('/');
            const [monthB, yearB] = b.Competencia.split('/');
            const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
            const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
            return dateA.getTime() - dateB.getTime();
          });

          if (currentYearData && currentYearData.length > 0) {
            // Group data by competencia to calculate monthly weighted averages first
            const competenciaGroups: Record<string, typeof currentYearData> = {};
            currentYearData.forEach(item => {
              if (!competenciaGroups[item.Competencia]) {
                competenciaGroups[item.Competencia] = [];
              }
              competenciaGroups[item.Competencia].push(item);
            });

            // Calculate weighted average for each competencia
            const monthlyReturns: Array<{ competencia: string; return: number }> = [];
            Object.entries(competenciaGroups).forEach(([competencia, items]) => {
              let totalPosition = 0;
              let totalWeightedReturn = 0;
              
              items.forEach(item => {
                const position = Number(item.Posicao) || 0;
                const monthlyReturn = Number(item.Rendimento) || 0;
                totalPosition += position;
                totalWeightedReturn += monthlyReturn * position;
              });
              
              const weightedAvgReturn = totalPosition > 0 ? totalWeightedReturn / totalPosition : 0;
              monthlyReturns.push({ competencia, return: weightedAvgReturn });
              console.log(`${strategy} - ${competencia}: ${(weightedAvgReturn * 100).toFixed(2)}%`);
            });

            // Sort by competencia and apply compound interest
            monthlyReturns.sort((a, b) => {
              const [monthA, yearA] = a.competencia.split('/');
              const [monthB, yearB] = b.competencia.split('/');
              const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
              const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
              return dateA.getTime() - dateB.getTime();
            });

            // Apply compound interest across months
            let accumulatedMultiplier = 1;
            monthlyReturns.forEach(({ competencia, return: monthReturn }) => {
              accumulatedMultiplier *= (1 + monthReturn);
              console.log(`${strategy} - ${competencia}: ${(monthReturn * 100).toFixed(2)}%, accumulated: ${((accumulatedMultiplier - 1) * 100).toFixed(2)}%`);
            });

            const finalReturn = accumulatedMultiplier - 1;
            console.log(`${strategy} final accumulated return: ${(finalReturn * 100).toFixed(2)}%`);
            yearlyAccumulated[strategy] = finalReturn;
          }

          // Calculate total accumulated returns using all filtered data (for "Início" column)
          if (allFilteredData && allFilteredData.length > 0) {
            accumulatedReturns[strategy] = calculateAccumulatedReturnsFromData(allFilteredData, strategy);
          }
        });

        setYearlyAccumulatedData(yearlyAccumulated);
        setAccumulatedReturnsData(accumulatedReturns);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClient, filteredRange]);

  // Filter to get only the most recent competencia
  const getMostRecentData = (data: typeof dadosData) => {
    if (data.length === 0) return [];
    
    // Find the most recent competencia
    const mostRecentCompetencia = data.reduce((latest, current) => {
      return current.Competencia > latest.Competencia ? current : latest;
    }).Competencia;
    
    // Return all records with the most recent competencia
    return data.filter(item => item.Competencia === mostRecentCompetencia);
  };

  const filteredDadosData = getMostRecentData(dadosData);

  // Group investments by grouped asset class and calculate totals using filtered data
  const strategyData = filteredDadosData.reduce((acc, investment) => {
    const originalStrategy = investment["Classe do ativo"] || "Outros";
    const groupedStrategy = groupStrategy(originalStrategy);
    
    if (!acc[groupedStrategy]) {
      acc[groupedStrategy] = { 
        name: groupedStrategy, 
        value: 0, 
        count: 0,
        totalReturn: 0,
        avgReturnMonth: 0
      };
    }
    acc[groupedStrategy].value += Number(investment.Posicao) || 0;
    acc[groupedStrategy].totalReturn += (Number(investment.Rendimento) || 0) * (Number(investment.Posicao) || 0);
    acc[groupedStrategy].count += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number; totalReturn: number; avgReturnMonth: number }>);

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
    .map((item) => {
      const avgReturn = item.value > 0 ? (item.totalReturn / item.value) * 100 : 0;
      console.log(`Strategy ${item.name} avgReturn calculation:`, {
        totalReturn: item.totalReturn,
        value: item.value,
        avgReturn: avgReturn
      });
      return {
        ...item,
        percentage: totalPatrimonio > 0 ? (item.value / totalPatrimonio) * 100 : 0,
        avgReturn: avgReturn,
      };
    })
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

                  // Calculate CDI relative performance for strategies that compare to CDI
                  const calculateCDIRelative = (strategyName: string) => {
                    const benchmark = getBenchmark(strategyName);
                    if (benchmark !== '± CDI') return null;

                    const strategyReturn = accumulatedReturnsData[strategyName];
                    if (strategyReturn === undefined) return null;

                    // Calculate CDI return for the same period
                    let cdiReturn = 0;
                    if (filteredRange && cdiData.length > 0) {
                      const [startMonth, startYear] = filteredRange.inicio.split('/');
                      const [endMonth, endYear] = filteredRange.fim.split('/');
                      
                      const relevantCDIData = cdiData.filter(item => {
                        const [month, year] = item.competencia.split('/');
                        const itemDate = new Date(parseInt(year), parseInt(month) - 1);
                        const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1);
                        const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1);
                        return itemDate >= startDate && itemDate <= endDate;
                      });

                      // Calculate accumulated CDI return
                      let accumulatedCDI = 1;
                      relevantCDIData.forEach(item => {
                        accumulatedCDI *= (1 + item.cdiRate);
                      });
                      cdiReturn = accumulatedCDI - 1;
                    }

                    if (cdiReturn === 0) return null;
                    
                    const relativeReturn = strategyReturn / cdiReturn;
                    return relativeReturn;
                  };
                  
                  return (
                    <>
                      <TableRow key={item.name} className="border-border/50">
                        <TableCell className="font-medium text-foreground flex items-center gap-2 py-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getStrategyColor(item.name) }}
                          />
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
                        <TableCell className={`text-center py-2 ${(accumulatedReturnsData[item.name] || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {loading ? "..." : (
                            accumulatedReturnsData[item.name] !== undefined
                              ? `${accumulatedReturnsData[item.name] >= 0 ? "+" : ""}${(accumulatedReturnsData[item.name] * 100).toFixed(2)}%`
                              : "-"
                          )}
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
                        <TableCell className="text-center text-muted-foreground py-1">
                          {(() => {
                            const cdiRelative = calculateCDIRelative(item.name);
                            if (cdiRelative === null) return "-";
                            return `${cdiRelative.toFixed(2)}x CDI`;
                          })()}
                        </TableCell>
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
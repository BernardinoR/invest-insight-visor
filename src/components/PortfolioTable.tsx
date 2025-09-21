import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";

interface PortfolioTableProps {
  selectedClient: string;
  filteredConsolidadoData?: ConsolidadoData[];
  filteredRange?: { inicio: string; fim: string };
  onYearTotalsChange?: (totals: { totalPatrimonio: number; totalRendimento: number } | null) => void;
}

interface ConsolidadoData {
  id: number;
  "Patrimonio Inicial": number;
  "Movimentação": number;
  "Impostos": number;
  "Ganho Financeiro": number;
  "Patrimonio Final": number;
  "Rendimento": number;
  "Competencia": string;
}

interface ConsolidadoDataWithReturns extends ConsolidadoData {
  return3Months?: number;
  return6Months?: number;
  return12Months?: number;
}

export function PortfolioTable({ selectedClient, filteredConsolidadoData, filteredRange, onYearTotalsChange }: PortfolioTableProps) {
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['2025'])); // Start with 2025 expanded
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  
  // Get market indicators including client target
  const { marketData, clientTarget } = useMarketIndicators(selectedClient);

  // Function to calculate compound return over multiple months
  const calculateCompoundReturn = (monthlyReturns: number[]): number => {
    if (monthlyReturns.length === 0) return 0;
    return monthlyReturns.reduce((acc, monthReturn) => {
      return (1 + acc) * (1 + monthReturn) - 1;
    }, 0);
  };

  // Function to get returns for 3, 6, and 12 months
  const calculateMultiMonthReturns = (data: ConsolidadoData[], targetCompetencia: string) => {
    const sortedData = [...data].sort((a, b) => a.Competencia.localeCompare(b.Competencia));
    const targetIndex = sortedData.findIndex(item => item.Competencia === targetCompetencia);
    
    if (targetIndex === -1) return { return3Months: 0, return6Months: 0, return12Months: 0 };

    const get3MonthReturn = () => {
      const start = Math.max(0, targetIndex - 2);
      const returns = sortedData.slice(start, targetIndex + 1).map(item => item.Rendimento || 0);
      return calculateCompoundReturn(returns);
    };

    const get6MonthReturn = () => {
      const start = Math.max(0, targetIndex - 5);
      const returns = sortedData.slice(start, targetIndex + 1).map(item => item.Rendimento || 0);
      return calculateCompoundReturn(returns);
    };

    const get12MonthReturn = () => {
      const start = Math.max(0, targetIndex - 11);
      const returns = sortedData.slice(start, targetIndex + 1).map(item => item.Rendimento || 0);
      return calculateCompoundReturn(returns);
    };

    return {
      return3Months: get3MonthReturn(),
      return6Months: get6MonthReturn(),
      return12Months: get12MonthReturn()
    };
  };

  // Consolidate data by competencia and add multi-month returns
  const consolidateByCompetencia = (data: ConsolidadoData[]): ConsolidadoDataWithReturns[] => {
    const competenciaMap = new Map();
    
    data.forEach(item => {
      const competencia = item.Competencia;
      if (!competenciaMap.has(competencia)) {
        competenciaMap.set(competencia, {
          id: item.id,
          Competencia: competencia,
          "Patrimonio Inicial": 0,
          "Movimentação": 0,
          "Impostos": 0,
          "Ganho Financeiro": 0,
          "Patrimonio Final": 0,
          rendimentoSum: 0,
          patrimonioForWeightedAvg: 0
        });
      }
      
      const consolidated = competenciaMap.get(competencia);
      consolidated["Patrimonio Inicial"] += item["Patrimonio Inicial"] || 0;
      consolidated["Movimentação"] += item["Movimentação"] || 0;
      consolidated["Impostos"] += item.Impostos || 0;
      consolidated["Ganho Financeiro"] += item["Ganho Financeiro"] || 0;
      consolidated["Patrimonio Final"] += item["Patrimonio Final"] || 0;
      
      // For weighted average rendimento
      const patrimonio = item["Patrimonio Final"] || 0;
      const rendimento = item.Rendimento || 0;
      consolidated.rendimentoSum += rendimento * patrimonio;
      consolidated.patrimonioForWeightedAvg += patrimonio;
    });
    
    // Calculate weighted average rendimento and multi-month returns
    const consolidatedData = Array.from(competenciaMap.values()).map(item => ({
      id: item.id,
      Competencia: item.Competencia,
      "Patrimonio Inicial": item["Patrimonio Inicial"],
      "Movimentação": item["Movimentação"],
      "Impostos": item.Impostos,
      "Ganho Financeiro": item["Ganho Financeiro"],
      "Patrimonio Final": item["Patrimonio Final"],
      Rendimento: item.patrimonioForWeightedAvg > 0 ? item.rendimentoSum / item.patrimonioForWeightedAvg : 0
    }));

    // Add multi-month returns to each competencia
    return consolidatedData.map(item => {
      const multiMonthReturns = calculateMultiMonthReturns(consolidatedData, item.Competencia);
      return {
        ...item,
        ...multiMonthReturns
      };
    });
  };

  // Extract years from competencia data and set available years
  useEffect(() => {
    if (consolidadoData.length > 0) {
      const years = [...new Set(consolidadoData.map(item => {
        const year = item.Competencia.split('/')[1];
        return year;
      }))].sort().reverse();
      
      setAvailableYears(years);
    }
  }, [consolidadoData]);

  // Apply filtering based on filteredRange if provided
  const getFilteredData = (data: ConsolidadoData[]) => {
    if (!filteredRange?.inicio || !filteredRange?.fim) return data;
    
    const competenciaToDate = (competencia: string) => {
      const [month, year] = competencia.split('/');
      return new Date(parseInt(year), parseInt(month) - 1);
    };
    
    const startDate = competenciaToDate(filteredRange.inicio);
    const endDate = competenciaToDate(filteredRange.fim);
    
    return data.filter(item => {
      const itemDate = competenciaToDate(item.Competencia);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // Use filtered data if available, otherwise apply filtering to internal data
  const rawData = filteredConsolidadoData && filteredConsolidadoData.length > 0
    ? filteredConsolidadoData
    : getFilteredData(consolidadoData);

  // Consolidate data by competencia
  const consolidatedData = consolidateByCompetencia(rawData);

  // Group data by year
  const dataByYear = consolidatedData.reduce((acc, item) => {
    const year = item.Competencia.split('/')[1];
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(item);
    return acc;
  }, {} as Record<string, ConsolidadoDataWithReturns[]>);

  // Sort months within each year (newest first)
  Object.keys(dataByYear).forEach(year => {
    dataByYear[year].sort((a, b) => {
      const [monthA, yearA] = a.Competencia.split('/');
      const [monthB, yearB] = b.Competencia.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateB.getTime() - dateA.getTime();
    });
  });

  // Calculate year totals and find best month
  const yearSummaries = Object.keys(dataByYear).map(year => {
    const yearData = dataByYear[year];
    const mostRecentMonth = yearData[0]; // First item after sorting (most recent)
    
    // Calculate year totals and find best month
    const yearTotals = {
      "Patrimonio Inicial": yearData.reduce((sum, item) => sum + (item["Patrimonio Inicial"] || 0), 0),
      "Movimentação": yearData.reduce((sum, item) => sum + (item["Movimentação"] || 0), 0),
      "Impostos": yearData.reduce((sum, item) => sum + (item.Impostos || 0), 0),
      "Ganho Financeiro": yearData.reduce((sum, item) => sum + (item["Ganho Financeiro"] || 0), 0),
      "Patrimonio Final": mostRecentMonth["Patrimonio Final"] || 0,
      "Rendimento": yearData.reduce((sum, item) => sum + (item["Ganho Financeiro"] || 0), 0)
    };

    // Calculate year accumulated return (compound monthly returns)
    const yearReturn = calculateCompoundReturn(yearData.map(item => item.Rendimento || 0));

    // Calculate accumulated target for the year
    let accumulatedTarget = 0;
    if (marketData && marketData.length > 0) {
      yearData.forEach(monthData => {
        const marketPoint = marketData.find(point => point.competencia === monthData.Competencia);
        if (marketPoint && marketPoint.clientTarget > 0) {
          accumulatedTarget = (1 + accumulatedTarget) * (1 + marketPoint.clientTarget) - 1;
        }
      });
    }

    // Find best performing month
    const bestMonth = yearData.reduce((best, current) => 
      (current.Rendimento || 0) > (best.Rendimento || 0) ? current : best
    );

    return {
      year,
      data: yearData,
      totals: yearTotals,
      yearReturn,
      accumulatedTarget,
      bestMonth
    };
  });

  // Calculate overall totals
  const allData = Object.values(dataByYear).flat();
  
  // Calculate initial patrimony correctly - get the earliest month's inicial patrimony
  let initialPatrimony = 0;
  if (allData.length > 0) {
    const sortedAllDataByDate = [...allData].sort((a, b) => {
      const [monthA, yearA] = a.Competencia.split('/');
      const [monthB, yearB] = b.Competencia.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateA.getTime() - dateB.getTime(); // Ascending order - earliest first
    });
    initialPatrimony = sortedAllDataByDate[0]["Patrimonio Inicial"] || 0;
  }
  
  const totalTotals = {
    "Patrimonio Inicial": initialPatrimony,
    "Movimentação": allData.reduce((sum, item) => sum + (item["Movimentação"] || 0), 0),
    "Impostos": allData.reduce((sum, item) => sum + (item.Impostos || 0), 0),
    "Ganho Financeiro": allData.reduce((sum, item) => sum + (item["Ganho Financeiro"] || 0), 0),
    "Patrimonio Final": 0,
    "Rendimento": 0
  };

  // Get most recent patrimonio final from all data
  if (allData.length > 0) {
    const sortedAllData = [...allData].sort((a, b) => {
      const [monthA, yearA] = a.Competencia.split('/');
      const [monthB, yearB] = b.Competencia.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateB.getTime() - dateA.getTime();
    });
    totalTotals["Patrimonio Final"] = sortedAllData[0]["Patrimonio Final"] || 0;
  }

  // Calculate total accumulated return (compound all monthly returns)
  const totalReturn = calculateCompoundReturn(consolidatedData.map(item => item.Rendimento || 0));

  // Calculate total accumulated target since inception
  let totalAccumulatedTarget = 0;
  if (marketData && marketData.length > 0) {
    const sortedAllData = [...allData].sort((a, b) => {
      const [monthA, yearA] = a.Competencia.split('/');
      const [monthB, yearB] = b.Competencia.split('/');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
      return dateA.getTime() - dateB.getTime();
    });
    
    sortedAllData.forEach(monthData => {
      const marketPoint = marketData.find(point => point.competencia === monthData.Competencia);
      if (marketPoint && marketPoint.clientTarget > 0) {
        totalAccumulatedTarget = (1 + totalAccumulatedTarget) * (1 + marketPoint.clientTarget) - 1;
      }
    });
  }

  // Calculate correct totals for onYearTotalsChange
  useEffect(() => {
    if (totalTotals && onYearTotalsChange) {
      const yearTotals = {
        totalPatrimonio: totalTotals["Patrimonio Final"] || 0,
        totalRendimento: totalReturn || 0
      };
      onYearTotalsChange(yearTotals);
    } else if (onYearTotalsChange) {
      onYearTotalsChange(null);
    }
  }, [totalTotals, totalReturn, onYearTotalsChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value: number) => {
    const percentage = (value * 100).toFixed(2);
    return value >= 0 ? `+${percentage}%` : `${percentage}%`;
  };

  const formatPointsAboveTarget = (monthlyReturn: number, competencia: string) => {
    if (!clientTarget || !marketData || marketData.length === 0) return "N/A";
    
    // Find the market data for this competencia
    const marketPoint = marketData.find(point => point.competencia === competencia);
    if (!marketPoint) return "N/A";
    
    // Calculate the difference in percentage points
    const portfolioReturnPercent = monthlyReturn * 100;
    const targetReturnPercent = marketPoint.clientTarget * 100;
    const differencePoints = portfolioReturnPercent - targetReturnPercent;
    
    const formattedDifference = Math.abs(differencePoints).toFixed(2);
    if (differencePoints >= 0) {
      return `+${formattedDifference}pp`;
    } else {
      return `-${formattedDifference}pp`;
    }
  };

  const toggleYearExpansion = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  useEffect(() => {
    const fetchConsolidadoData = async () => {
      if (!selectedClient) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ConsolidadoPerformance')
          .select('*')
          .eq('Nome', selectedClient)
          .order('Competencia', { ascending: false });

        if (error) {
          console.error('Erro ao buscar dados consolidados:', error);
          return;
        }

        setConsolidadoData(data || []);
      } catch (error) {
        console.error('Erro ao buscar dados consolidados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsolidadoData();
  }, [selectedClient]);

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <div>
          <CardTitle className="text-foreground">Resumo do Patrimônio</CardTitle>
          <p className="text-sm text-muted-foreground">Evolução patrimonial consolidada com retornos acumulados</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground w-8"></TableHead>
                <TableHead className="text-muted-foreground">Competência</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio Inicial</TableHead>
                <TableHead className="text-muted-foreground">Movimentações</TableHead>
                <TableHead className="text-muted-foreground">IR Pago</TableHead>
                <TableHead className="text-muted-foreground">IOF Pago</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio Final</TableHead>
                <TableHead className="text-muted-foreground">Rendimento</TableHead>
                <TableHead className="text-muted-foreground">Rentabilidade</TableHead>
                <TableHead className="text-muted-foreground">Rentabilidade (pp acima da meta)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Carregando dados...
                  </TableCell>
                </TableRow>
              ) : yearSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum dado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Year rows */}
                  {yearSummaries.sort((a, b) => b.year.localeCompare(a.year)).map((yearSummary) => (
                    <>
                      {/* Year header row */}
                      <TableRow key={yearSummary.year} className="border-border/50 bg-muted/10">
                        <TableCell className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleYearExpansion(yearSummary.year)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedYears.has(yearSummary.year) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {yearSummary.year}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(yearSummary.totals["Patrimonio Inicial"])}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(yearSummary.totals["Movimentação"])}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(yearSummary.totals.Impostos)}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          R$ 0,00
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(yearSummary.totals["Patrimonio Final"])}
                        </TableCell>
                        <TableCell className="text-success font-medium">
                          {formatCurrency(yearSummary.totals["Ganho Financeiro"])}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            yearSummary.yearReturn >= 0 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {formatPercentage(yearSummary.yearReturn)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            yearSummary.accumulatedTarget > 0 && yearSummary.yearReturn >= yearSummary.accumulatedTarget
                              ? 'bg-success/20 text-success' 
                              : yearSummary.accumulatedTarget > 0 && yearSummary.yearReturn < yearSummary.accumulatedTarget
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-muted/20 text-muted-foreground'
                          }`}>
                            {yearSummary.accumulatedTarget > 0 ? 
                              `${((yearSummary.yearReturn - yearSummary.accumulatedTarget) * 100).toFixed(2)}pp` : 
                              "N/A"}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* Month rows (when expanded) */}
                      {expandedYears.has(yearSummary.year) && yearSummary.data.map((item) => {
                        const monthPart = item.Competencia.split('/')[0];
                        const monthName = {
                          '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
                          '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
                          '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
                        }[monthPart] || monthPart;
                        
                        const isBestMonth = item.Competencia === yearSummary.bestMonth.Competencia;
                        
                        return (
                          <TableRow key={item.id} className="border-border/50">
                            <TableCell className="flex items-center gap-2 pl-8">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              {isBestMonth && <Trophy className="h-4 w-4 text-yellow-600" />}
                            </TableCell>
                            <TableCell className="font-medium text-foreground pl-8">
                              {monthName}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {formatCurrency(item["Patrimonio Inicial"])}
                            </TableCell>
                            <TableCell className="text-destructive font-medium">
                              {formatCurrency(item["Movimentação"])}
                            </TableCell>
                            <TableCell className="text-destructive font-medium">
                              {formatCurrency(item.Impostos)}
                            </TableCell>
                            <TableCell className="text-destructive font-medium">
                              R$ 0,00
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {formatCurrency(item["Patrimonio Final"])}
                            </TableCell>
                            <TableCell className="text-success font-medium">
                              {formatCurrency(item["Ganho Financeiro"])}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                (item.Rendimento || 0) >= 0 
                                  ? 'bg-success/20 text-success' 
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {formatPercentage(item.Rendimento || 0)}
                              </span>
                            </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            formatPointsAboveTarget(item.Rendimento || 0, item.Competencia).startsWith('+')
                              ? 'bg-success/20 text-success' 
                              : formatPointsAboveTarget(item.Rendimento || 0, item.Competencia).startsWith('-')
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-muted/20 text-muted-foreground'
                          }`}>
                            {formatPointsAboveTarget(item.Rendimento || 0, item.Competencia)}
                          </span>
                        </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  ))}

                  {/* Total row */}
                  <TableRow className="border-border/50 bg-muted/10 font-bold">
                    <TableCell className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      Total
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(totalTotals["Patrimonio Inicial"])}
                    </TableCell>
                    <TableCell className="text-destructive font-bold">
                      {formatCurrency(totalTotals["Movimentação"])}
                    </TableCell>
                    <TableCell className="text-destructive font-bold">
                      {formatCurrency(totalTotals.Impostos)}
                    </TableCell>
                    <TableCell className="text-destructive font-bold">
                      R$ 0,00
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(totalTotals["Patrimonio Final"])}
                    </TableCell>
                    <TableCell className="text-success font-bold">
                      {formatCurrency(totalTotals["Ganho Financeiro"])}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                        totalReturn >= 0 
                          ? 'bg-success/20 text-success' 
                          : 'bg-destructive/20 text-destructive'
                      }`}>
                        {formatPercentage(totalReturn)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                        totalAccumulatedTarget > 0 && totalReturn >= totalAccumulatedTarget
                          ? 'bg-success/20 text-success' 
                          : totalAccumulatedTarget > 0 && totalReturn < totalAccumulatedTarget
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted/20 text-muted-foreground'
                      }`}>
                        {totalAccumulatedTarget > 0 ? 
                          `${((totalReturn - totalAccumulatedTarget) * 100).toFixed(2)}pp` : 
                          "N/A"}
                      </span>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Best month section */}
        {yearSummaries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Mês com melhor rentabilidade do ano</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
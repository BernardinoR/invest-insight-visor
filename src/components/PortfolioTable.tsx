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
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
      console.log('Raw consolidado data:', consolidadoData.map(item => ({ competencia: item.Competencia, id: item.id })));
      
      const years = [...new Set(consolidadoData.map(item => {
        const year = item.Competencia.split('/')[1];
        console.log(`Competencia: ${item.Competencia}, extracted year: ${year}`);
        return year;
      }))].sort().reverse();
      
      console.log('Available years:', years);
      setAvailableYears(years);
      
      if (!selectedYear && years.length > 0) {
        console.log('Setting default year to:', years[0]);
        setSelectedYear(years[0]); // Default to most recent year
      }
    }
  }, [consolidadoData, selectedYear]);

  // Use filtered data if available, otherwise use internal data
  const rawData = filteredConsolidadoData && filteredConsolidadoData.length > 0
    ? filteredConsolidadoData
    : consolidadoData;
    
  console.log('=== RAW DATA DEBUG ===');
  console.log('filteredConsolidadoData length:', filteredConsolidadoData?.length || 0);
  console.log('consolidadoData length:', consolidadoData.length);
  console.log('Using filtered data:', filteredConsolidadoData && filteredConsolidadoData.length > 0);
  console.log('Raw data length:', rawData.length);
  console.log('Raw data competencias:', rawData.map(item => item.Competencia));

  // Filter by selected year
  const yearFilteredData = selectedYear 
    ? rawData.filter(item => {
        const itemYear = item.Competencia.split('/')[1];
        const matches = itemYear === selectedYear;
        console.log(`Filtering: ${item.Competencia} (year: ${itemYear}) against selected year: ${selectedYear} = ${matches}`);
        return matches;
      })
    : rawData;
  
  console.log('Selected year:', selectedYear);
  console.log('Raw data length:', rawData.length);
  console.log('Year filtered data length:', yearFilteredData.length);
  console.log('Year filtered data:', yearFilteredData.map(item => item.Competencia));
  
  // Consolidate and sort data
  const displayData = consolidateByCompetencia(yearFilteredData).sort((a, b) => b.Competencia.localeCompare(a.Competencia));

  // Calculate correct totals for the selected year (from most recent month only)
  useEffect(() => {
    if (displayData.length > 0 && onYearTotalsChange) {
      // Sort by competencia to get the most recent month (chronologically latest)
      const sortedData = [...displayData].sort((a, b) => a.Competencia.localeCompare(b.Competencia));
      const mostRecentMonth = sortedData[sortedData.length - 1];
      
      console.log('=== YEAR TOTALS CALCULATION ===');
      console.log('Selected year:', selectedYear);
      console.log('Display data for year:', displayData.map(item => ({ competencia: item.Competencia, patrimonio: item["Patrimonio Final"] })));
      console.log('Most recent month identified:', mostRecentMonth?.Competencia);
      console.log('Most recent month patrimonio:', mostRecentMonth?.["Patrimonio Final"]);
      console.log('Most recent month rendimento:', mostRecentMonth?.Rendimento);
      
      const yearTotals = {
        totalPatrimonio: mostRecentMonth["Patrimonio Final"] || 0,
        totalRendimento: mostRecentMonth.Rendimento || 0
      };
      
      console.log('Sending year totals:', yearTotals);
      onYearTotalsChange(yearTotals);
    } else if (onYearTotalsChange) {
      console.log('No data for selected year, sending null');
      onYearTotalsChange(null);
    }
  }, [displayData, selectedYear, onYearTotalsChange]);

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

  const toggleRowExpansion = (competencia: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(competencia)) {
      newExpanded.delete(competencia);
    } else {
      newExpanded.add(competencia);
    }
    setExpandedRows(newExpanded);
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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-foreground">Resumo do Patrimônio</CardTitle>
            <p className="text-sm text-muted-foreground">Evolução patrimonial consolidada com retornos acumulados</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              ) : displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum dado encontrado para {selectedYear}
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item) => (
                  <>
                    <TableRow key={item.id} className="border-border/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(item.Competencia)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(item.Competencia) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {item.Competencia}
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
                    {expandedRows.has(item.Competencia) && (
                      <TableRow className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="text-sm text-muted-foreground">
                          <div className="flex gap-6">
                            <div>3 Meses: <span className={`font-medium ${(item.return3Months || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatPercentage(item.return3Months || 0)}
                            </span></div>
                            <div>6 Meses: <span className={`font-medium ${(item.return6Months || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatPercentage(item.return6Months || 0)}
                            </span></div>
                            <div>12 Meses: <span className={`font-medium ${(item.return12Months || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatPercentage(item.return12Months || 0)}
                            </span></div>
                          </div>
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
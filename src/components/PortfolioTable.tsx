import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";
import { useCDIData } from "@/hooks/useCDIData";

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

interface YearSummary {
  year: string;
  patrimonioInicial: number;
  movimentacao: number;
  impostos: number;
  patrimonioFinal: number;
  rendimento: number;
  rentabilidade: number;
  rentabilidadeCDI: number;
  months: ConsolidadoData[];
}

export function PortfolioTable({ selectedClient, filteredConsolidadoData, filteredRange, onYearTotalsChange }: PortfolioTableProps) {
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['2025'])); // Default to 2025 expanded

  // Get market indicators including client target and CDI data
  const { marketData, clientTarget } = useMarketIndicators(selectedClient);
  const { cdiData } = useCDIData();

  // Function to calculate compound return over multiple months
  const calculateCompoundReturn = (monthlyReturns: number[]): number => {
    if (monthlyReturns.length === 0) return 0;
    return monthlyReturns.reduce((acc, monthReturn) => {
      return (1 + acc) * (1 + monthReturn) - 1;
    }, 0);
  };

  // Function to get the best performing month for trophy icon
  const getBestMonth = (data: ConsolidadoData[]): string | null => {
    if (data.length === 0) return null;
    const bestMonth = data.reduce((prev, current) => 
      (current.Rendimento || 0) > (prev.Rendimento || 0) ? current : prev
    );
    return bestMonth.Competencia;
  };

  // Consolidate data by competencia
  const consolidateByCompetencia = (data: ConsolidadoData[]): ConsolidadoData[] => {
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
    
    return Array.from(competenciaMap.values()).map(item => ({
      id: item.id,
      Competencia: item.Competencia,
      "Patrimonio Inicial": item["Patrimonio Inicial"],
      "Movimentação": item["Movimentação"],
      "Impostos": item.Impostos,
      "Ganho Financeiro": item["Ganho Financeiro"],
      "Patrimonio Final": item["Patrimonio Final"],
      Rendimento: item.patrimonioForWeightedAvg > 0 ? item.rendimentoSum / item.patrimonioForWeightedAvg : 0
    }));
  };

  // Group data by years
  const groupByYears = (data: ConsolidadoData[]): YearSummary[] => {
    const yearMap = new Map<string, ConsolidadoData[]>();
    
    data.forEach(item => {
      const year = item.Competencia.split('/')[1];
      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }
      yearMap.get(year)!.push(item);
    });

    const yearSummaries: YearSummary[] = [];
    
    yearMap.forEach((months, year) => {
      // Sort months chronologically
      const sortedMonths = months.sort((a, b) => a.Competencia.localeCompare(b.Competencia));
      
      // Calculate year totals
      const firstMonth = sortedMonths[0];
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      
      const patrimonioInicial = firstMonth["Patrimonio Inicial"];
      const patrimonioFinal = lastMonth["Patrimonio Final"];
      const movimentacao = sortedMonths.reduce((sum, month) => sum + (month["Movimentação"] || 0), 0);
      const impostos = sortedMonths.reduce((sum, month) => sum + (month.Impostos || 0), 0);
      const rendimento = sortedMonths.reduce((sum, month) => sum + (month["Ganho Financeiro"] || 0), 0);
      
      // Calculate accumulated return for the year
      const rentabilidade = calculateCompoundReturn(sortedMonths.map(m => m.Rendimento || 0));
      
      // Calculate CDI performance ratio
      let rentabilidadeCDI = 0;
      if (cdiData && cdiData.length > 0) {
        const yearCdiData = cdiData.filter(cdi => {
          const cdiYear = cdi.competencia.split('/')[1];
          return cdiYear === year;
        });
        
        if (yearCdiData.length > 0) {
          const cdiReturn = calculateCompoundReturn(yearCdiData.map(cdi => cdi.cdiRate || 0));
          if (cdiReturn !== 0) {
            rentabilidadeCDI = (rentabilidade / cdiReturn) * 100;
          }
        }
      }
      
      yearSummaries.push({
        year,
        patrimonioInicial,
        movimentacao,
        impostos,
        patrimonioFinal,
        rendimento,
        rentabilidade,
        rentabilidadeCDI,
        months: sortedMonths.sort((a, b) => b.Competencia.localeCompare(a.Competencia)) // Reverse for display
      });
    });

    return yearSummaries.sort((a, b) => b.year.localeCompare(a.year)); // Most recent years first
  };

  // Calculate total summary
  const calculateTotalSummary = (yearSummaries: YearSummary[]) => {
    if (yearSummaries.length === 0) return null;
    
    const allMonths = yearSummaries.flatMap(year => year.months);
    const sortedMonths = allMonths.sort((a, b) => a.Competencia.localeCompare(b.Competencia));
    
    const firstMonth = sortedMonths[0];
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    
    const patrimonioInicial = firstMonth["Patrimonio Inicial"];
    const patrimonioFinal = lastMonth["Patrimonio Final"];
    const movimentacao = sortedMonths.reduce((sum, month) => sum + (month["Movimentação"] || 0), 0);
    const impostos = sortedMonths.reduce((sum, month) => sum + (month.Impostos || 0), 0);
    const rendimento = sortedMonths.reduce((sum, month) => sum + (month["Ganho Financeiro"] || 0), 0);
    const rentabilidade = calculateCompoundReturn(sortedMonths.map(m => m.Rendimento || 0));
    
    // Calculate total CDI performance ratio
    let rentabilidadeCDI = 0;
    if (cdiData && cdiData.length > 0) {
      const totalCdiReturn = calculateCompoundReturn(cdiData.map(cdi => cdi.cdiRate || 0));
      if (totalCdiReturn !== 0) {
        rentabilidadeCDI = (rentabilidade / totalCdiReturn) * 100;
      }
    }
    
    return {
      patrimonioInicial,
      movimentacao,
      impostos,
      patrimonioFinal,
      rendimento,
      rentabilidade,
      rentabilidadeCDI
    };
  };

  // Use filtered data if available, otherwise use internal data
  const rawData = filteredConsolidadoData && filteredConsolidadoData.length > 0
    ? filteredConsolidadoData
    : consolidadoData;
  
  // Consolidate and group data
  const consolidatedData = consolidateByCompetencia(rawData);
  const yearSummaries = groupByYears(consolidatedData);
  const totalSummary = calculateTotalSummary(yearSummaries);
  const bestMonth = getBestMonth(consolidatedData);

  // Calculate totals for callback (from most recent month)
  useEffect(() => {
    if (consolidatedData.length > 0 && onYearTotalsChange) {
      const sortedData = [...consolidatedData].sort((a, b) => a.Competencia.localeCompare(b.Competencia));
      const mostRecentMonth = sortedData[sortedData.length - 1];
      
      const yearTotals = {
        totalPatrimonio: mostRecentMonth["Patrimonio Final"] || 0,
        totalRendimento: mostRecentMonth.Rendimento || 0
      };
      
      onYearTotalsChange(yearTotals);
    } else if (onYearTotalsChange) {
      onYearTotalsChange(null);
    }
  }, [consolidatedData, onYearTotalsChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value: number) => {
    const percentage = (value * 100).toFixed(2);
    return value >= 0 ? `${percentage}%` : `${percentage}%`;
  };

  const formatCDIPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
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

  const getMonthDisplayName = (competencia: string) => {
    const [month, year] = competencia.split('/');
    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return monthNames[parseInt(month) - 1];
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground w-8"></TableHead>
                <TableHead className="text-muted-foreground">Período</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio inicial</TableHead>
                <TableHead className="text-muted-foreground">Movimentações</TableHead>
                <TableHead className="text-muted-foreground">IR Pago</TableHead>
                <TableHead className="text-muted-foreground">IOF Pago</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio final</TableHead>
                <TableHead className="text-muted-foreground">Rendimento</TableHead>
                <TableHead className="text-muted-foreground">Rentabilidade</TableHead>
                <TableHead className="text-muted-foreground">Rentabilidade (% CDI)</TableHead>
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
                  {yearSummaries.map((yearSummary) => (
                    <React.Fragment key={yearSummary.year}>
                      {/* Year Summary Row */}
                      <TableRow className="border-border/50 bg-muted/10 font-semibold">
                        <TableCell>
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
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-primary"></span>
                            {yearSummary.year}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(yearSummary.patrimonioInicial)}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(yearSummary.movimentacao)}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(Math.abs(yearSummary.impostos))}
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          R$ 0,00
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(yearSummary.patrimonioFinal)}
                        </TableCell>
                        <TableCell className="text-success font-medium">
                          {formatCurrency(yearSummary.rendimento)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            yearSummary.rentabilidade >= 0 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {formatPercentage(yearSummary.rentabilidade)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            yearSummary.rentabilidadeCDI >= 100 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {formatCDIPercentage(yearSummary.rentabilidadeCDI)}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* Month Rows */}
                      {expandedYears.has(yearSummary.year) && yearSummary.months.map((month) => (
                        <TableRow key={month.id} className="border-border/50">
                          <TableCell></TableCell>
                          <TableCell className="font-medium text-foreground pl-8">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-warning"></span>
                              {getMonthDisplayName(month.Competencia)}
                              {month.Competencia === bestMonth && (
                                <Trophy className="h-4 w-4 text-warning" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {formatCurrency(month["Patrimonio Inicial"])}
                          </TableCell>
                          <TableCell className="text-destructive font-medium">
                            {formatCurrency(month["Movimentação"])}
                          </TableCell>
                          <TableCell className="text-destructive font-medium">
                            {formatCurrency(Math.abs(month.Impostos))}
                          </TableCell>
                          <TableCell className="text-destructive font-medium">
                            R$ 0,00
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {formatCurrency(month["Patrimonio Final"])}
                          </TableCell>
                          <TableCell className="text-success font-medium">
                            {formatCurrency(month["Ganho Financeiro"])}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              (month.Rendimento || 0) >= 0 
                                ? 'bg-success/20 text-success' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {formatPercentage(month.Rendimento || 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-sm font-medium bg-muted/20 text-muted-foreground">
                              {(() => {
                                if (!cdiData || cdiData.length === 0) return "N/A";
                                const monthCdi = cdiData.find(cdi => cdi.competencia === month.Competencia);
                                if (!monthCdi || !monthCdi.cdiRate) return "N/A";
                                const cdiPerformance = ((month.Rendimento || 0) / monthCdi.cdiRate) * 100;
                                return formatCDIPercentage(cdiPerformance);
                              })()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Total Row */}
                  {totalSummary && (
                    <TableRow className="border-border/50 bg-accent/10 font-bold border-t-2">
                      <TableCell></TableCell>
                      <TableCell className="font-bold text-foreground">
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-accent"></span>
                          Total
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {formatCurrency(totalSummary.patrimonioInicial)}
                      </TableCell>
                      <TableCell className="text-destructive font-bold">
                        {formatCurrency(totalSummary.movimentacao)}
                      </TableCell>
                      <TableCell className="text-destructive font-bold">
                        {formatCurrency(Math.abs(totalSummary.impostos))}
                      </TableCell>
                      <TableCell className="text-destructive font-bold">
                        -R$ 0,22
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {formatCurrency(totalSummary.patrimonioFinal)}
                      </TableCell>
                      <TableCell className="text-success font-bold">
                        {formatCurrency(totalSummary.rendimento)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                          totalSummary.rentabilidade >= 0 
                            ? 'bg-success/20 text-success' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {formatPercentage(totalSummary.rentabilidade)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                          totalSummary.rentabilidadeCDI >= 100 
                            ? 'bg-success/20 text-success' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {formatCDIPercentage(totalSummary.rentabilidadeCDI)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Best Month Footer */}
                  {bestMonth && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Trophy className="h-4 w-4 text-warning" />
                          <span>Mês com melhor rentabilidade do ano</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
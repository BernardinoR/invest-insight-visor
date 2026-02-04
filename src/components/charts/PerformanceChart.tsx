import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, LabelList } from 'recharts';
import { TrendingUp, Calendar as CalendarIcon, Settings, ArrowLeftRight, Wallet, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCDIData } from "@/hooks/useCDIData";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";
import { useCurrency } from "@/contexts/CurrencyContext";

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
    Moeda?: string;
  }>;
  clientName?: string;
  marketData?: any;
  clientTarget?: any;
}

function decodeClientName(clientName?: string): string | undefined {
  if (!clientName) return undefined;
  return decodeURIComponent(clientName);
}

// Helper function to convert competencia to Date
const competenciaToDate = (competencia: string): Date => {
  const [month, year] = competencia.split('/').map(Number);
  return new Date(year, month - 1); // month-1 because Date uses 0-11 for months
};

export function PerformanceChart({ consolidadoData, clientName, marketData: propMarketData, clientTarget: propClientTarget }: PerformanceChartProps) {
  const { convertValue, adjustReturnWithFX } = useCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | '12months' | 'all' | 'custom'>('12months');
  const [customStartCompetencia, setCustomStartCompetencia] = useState<string>('');
  const [customEndCompetencia, setCustomEndCompetencia] = useState<string>('');
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [viewMode, setViewMode] = useState<'rentabilidade' | 'patrimonio' | 'crescimento'>('rentabilidade');
  const [showOnlyRendaGerada, setShowOnlyRendaGerada] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState({
    cdi: false,
    target: true,
    ipca: true
  });
  
  // Carteira Antiga benchmark states
  const [showOldPortfolio, setShowOldPortfolio] = useState(false);
  const [oldPortfolioCDI, setOldPortfolioCDI] = useState(100);
  
  const { cdiData, loading: cdiLoading, error: cdiError } = useCDIData();
  
  // Use props if provided, otherwise fetch from hook
  const decodedClientName = decodeClientName(clientName);
  const hookData = useMarketIndicators(propMarketData || propClientTarget ? undefined : decodedClientName);
  const marketData = propMarketData || hookData.marketData;
  const clientTarget = propClientTarget || hookData.clientTarget;
  const marketLoading = propMarketData ? false : hookData.loading;
  const marketError = propMarketData ? null : hookData.error;

  // Consolidate data by competencia (sum patrimônio, weighted average rendimento)
  const consolidateByCompetencia = (data: typeof consolidadoData) => {
    const competenciaMap = new Map();
    
    data.forEach(item => {
      const competencia = item.Competencia;
      if (!competenciaMap.has(competencia)) {
        competenciaMap.set(competencia, {
          Data: item.Data,
          Competencia: competencia,
          "Patrimonio Final": 0,
          "Patrimonio Inicial": 0,
          "Movimentação": 0,
          "Ganho Financeiro": 0,
          Impostos: 0,
          rendimentoSum: 0,
          patrimonioForWeightedAvg: 0
        });
      }
      
      const consolidated = competenciaMap.get(competencia);
      
      // Convert values to BRL before consolidating
      const moedaOriginal = item.Moeda === 'Dolar' ? 'USD' : 'BRL';
      const patrimonioFinalConvertido = convertValue(
        item["Patrimonio Final"] || 0,
        item.Competencia,
        moedaOriginal
      );
      const patrimonioInicialConvertido = convertValue(
        item["Patrimonio Inicial"] || 0,
        item.Competencia,
        moedaOriginal
      );
      const movimentacaoConvertida = convertValue(
        item["Movimentação"] || 0,
        item.Competencia,
        moedaOriginal
      );
      const ganhoFinanceiroConvertido = convertValue(
        item["Ganho Financeiro"] || 0,
        item.Competencia,
        moedaOriginal
      );
      const impostosConvertidos = convertValue(
        item.Impostos || 0,
        item.Competencia,
        moedaOriginal
      );
      
      consolidated["Patrimonio Final"] += patrimonioFinalConvertido;
      consolidated["Patrimonio Inicial"] += patrimonioInicialConvertido;
      consolidated["Movimentação"] += movimentacaoConvertida;
      consolidated["Ganho Financeiro"] += ganhoFinanceiroConvertido;
      consolidated.Impostos += impostosConvertidos;
      
      // For weighted average rendimento - with FX adjustment
      const rendimentoAjustado = adjustReturnWithFX(
        item.Rendimento || 0, 
        item.Competencia, 
        moedaOriginal
      );
      
      consolidated.rendimentoSum += rendimentoAjustado * patrimonioFinalConvertido;
      consolidated.patrimonioForWeightedAvg += patrimonioFinalConvertido;
    });
    
    // Calculate weighted average rendimento and convert to final format
    return Array.from(competenciaMap.values()).map(item => ({
      Data: item.Data,
      Competencia: item.Competencia,
      "Patrimonio Final": item["Patrimonio Final"],
      "Patrimonio Inicial": item["Patrimonio Inicial"],
      "Movimentação": item["Movimentação"],
      "Ganho Financeiro": item["Ganho Financeiro"],
      Impostos: item.Impostos,
      Rendimento: item.patrimonioForWeightedAvg > 0 ? item.rendimentoSum / item.patrimonioForWeightedAvg : 0
    }));
  };

  // Consolidate and sort data by competencia date using helper function
  const consolidatedData = consolidateByCompetencia(consolidadoData);
  const sortedData = [...consolidatedData].sort((a, b) => {
    const dateA = competenciaToDate(a.Competencia);
    const dateB = competenciaToDate(b.Competencia);
    return dateA.getTime() - dateB.getTime();
  });

  // Get available competencias for custom selector - sorted chronologically
  const availableCompetencias = useMemo(() => {
    return [...new Set(consolidatedData.map(item => item.Competencia))]
      .sort((a, b) => {
        const dateA = competenciaToDate(a);
        const dateB = competenciaToDate(b);
        return dateA.getTime() - dateB.getTime();
      });
  }, [consolidatedData]);

  // Format competencia display like in CompetenciaSeletor
  const formatCompetenciaDisplay = (competencia: string) => {
    const [month, year] = competencia.split('/');
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  // Filter data based on selected period
  const getFilteredData = () => {
    if (sortedData.length === 0) return [];
    
    const now = new Date();
    let filteredData = sortedData;

    switch (selectedPeriod) {
      case 'month':
        filteredData = sortedData.slice(-1);
        break;
      case 'year':
        // Pegar todas as competências do ano da competência mais recente
        if (sortedData.length > 0) {
          const mostRecentCompetencia = sortedData[sortedData.length - 1].Competencia;
          const mostRecentYear = mostRecentCompetencia.split('/')[1];
          filteredData = sortedData.filter(item => {
            const itemYear = item.Competencia.split('/')[1];
            return itemYear === mostRecentYear;
          });
        }
        break;
      case '12months':
        filteredData = sortedData.slice(-12);
        break;
      case 'all':
        filteredData = sortedData; // Show all available data
        break;
      case 'custom':
        if (customStartCompetencia && customEndCompetencia) {
          filteredData = sortedData.filter(item => {
            const itemDate = competenciaToDate(item.Competencia);
            const startDate = competenciaToDate(customStartCompetencia);
            const endDate = competenciaToDate(customEndCompetencia);
            
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        break;
    }

    return filteredData;
  };

  const filteredData = getFilteredData();

  // Calculate accumulated returns with compound interest
  const calculateAccumulatedReturns = (data: typeof filteredData) => {
    if (data.length === 0) return [];
    
    const result = [];
    let accumulated = 0; // Start at 0%
    
    // Add zero point one month before the first competencia
    const [firstMonth, firstYear] = data[0].Competencia.split('/');
    const firstDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, 1);
    const previousMonth = new Date(firstDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    
    // Add the zero starting point
    result.push({
      name: `${previousMonth.toLocaleDateString('pt-BR', { month: '2-digit' })}/${previousMonth.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
      retornoAcumulado: 0,
      retornoMensal: 0,
      competencia: previousMonth.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    });
    
    // Calculate compound accumulated returns
    data.forEach((item, index) => {
      const [month, year] = item.Competencia.split('/');
      const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthlyReturn = Number(item.Rendimento) || 0;
      
      // Compound interest formula: (1 + accumulated) * (1 + monthly_return) - 1
      accumulated = (1 + accumulated) * (1 + monthlyReturn) - 1;
      
      result.push({
        name: `${competenciaDate.toLocaleDateString('pt-BR', { month: '2-digit' })}/${competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
        retornoAcumulado: accumulated * 100,
        retornoMensal: monthlyReturn * 100,
        competencia: item.Competencia
      });
    });
    
    return result;
  };

  const chartData = calculateAccumulatedReturns(filteredData);

  // Calculate patrimônio data (patrimônio aplicado e patrimônio atual)
  const calculatePatrimonioData = (data: typeof filteredData) => {
    if (data.length === 0) return [];
    
    const result = [];
    let cumulativeMovimentacao = 0;
    
    // Add zero point one month before the first competencia
    const [firstMonth, firstYear] = data[0].Competencia.split('/');
    const firstDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, 1);
    const previousMonth = new Date(firstDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    
    const initialPatrimonio = data[0]["Patrimonio Inicial"] || 0;
    
    // Add the zero starting point
    result.push({
      name: `${previousMonth.toLocaleDateString('pt-BR', { month: '2-digit' })}/${previousMonth.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
      patrimonioAplicado: initialPatrimonio,
      patrimonioAtual: initialPatrimonio,
      competencia: previousMonth.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    });
    
    // Calculate patrimônio for each month
    data.forEach((item, index) => {
      const [month, year] = item.Competencia.split('/');
      const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      // Patrimônio Aplicado = Patrimônio Inicial + acumulação de todas as movimentações
      cumulativeMovimentacao += item["Movimentação"] || 0;
      const patrimonioAplicado = initialPatrimonio + cumulativeMovimentacao;
      const patrimonioAtual = item["Patrimonio Final"] || 0;
      
      result.push({
        name: `${competenciaDate.toLocaleDateString('pt-BR', { month: '2-digit' })}/${competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
        patrimonioAplicado,
        patrimonioAtual,
        competencia: item.Competencia
      });
    });
    
    return result;
  };

  const patrimonioData = calculatePatrimonioData(filteredData);

  // Calculate growth data showing patrimônio volume with total growth (movimentação + ganho financeiro)
  const calculateGrowthData = (data: typeof filteredData) => {
    if (data.length === 0) return [];
    
    // Calcular meta mensalizada do componente pré-fixado
    let monthlyTargetRate = 0;
    if (clientTarget?.meta) {
      // Extrair o número da meta (exemplo: "IPCA+5%" -> 5)
      const metaMatch = clientTarget.meta.match(/\+(\d+(?:\.\d+)?)/);
      if (metaMatch) {
      const preFixedComponent = parseFloat(metaMatch[1]) / 100;
        monthlyTargetRate = Math.pow(1 + preFixedComponent, 1/12) - 1;
      }
    }
    
    const result = [];
    
    data.forEach((item, index) => {
      const [month, year] = item.Competencia.split('/');
      const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      const patrimonioInicial = item["Patrimonio Inicial"] || 0;
      const patrimonioFinal = item["Patrimonio Final"] || 0;
      const movimentacao = item["Movimentação"] || 0;
      const ganhoFinanceiro = item["Ganho Financeiro"] || 0;
      
      // Renda gerada = patrimônio do mês * meta mensalizada
      const rendaGerada = patrimonioInicial * monthlyTargetRate;
      
      // Total growth = movimentação + ganho financeiro = patrimônio final - patrimônio inicial
      const totalGrowth = patrimonioFinal - patrimonioInicial;
      const growthPercentage = patrimonioInicial > 0 ? (totalGrowth / patrimonioInicial) * 100 : 0;
      
      const patrimonioBaseAdjusted = Math.max(0, patrimonioInicial - rendaGerada);
      
      result.push({
        name: `${competenciaDate.toLocaleDateString('pt-BR', { month: '2-digit' })}/${competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
        rendaGerada: rendaGerada,
        patrimonioBase: patrimonioBaseAdjusted,
        growth: totalGrowth >= 0 ? totalGrowth : 0, // Positive growth for stacking
        negativeGrowth: totalGrowth < 0 ? totalGrowth : 0, // Negative growth
        totalGrowth,
        growthPercentage,
        patrimonioFinal,
        patrimonioInicial,
        movimentacao,
        ganhoFinanceiro,
        competencia: item.Competencia
      });
    });
    
    return result;
  };

  const growthData = calculateGrowthData(filteredData);

  // Add all indicators data to chart data
  const chartDataWithIndicators = chartData.map((point, index) => {
    if (index === 0) {
      // First point (previous month) should be 0 for all indicators
      return {
        ...point,
        cdiRetorno: 0,
        targetRetorno: 0,
        ipcaRetorno: 0,
        oldPortfolioRetorno: 0
      };
    } else {
      const firstCompetencia = chartData[1]?.competencia;
      
      // Calculate zero competencia properly - one month before firstCompetencia
      let zeroCompetencia: string;
      if (firstCompetencia) {
        const [firstMonth, firstYear] = firstCompetencia.split('/').map(Number);
        let zeroMonth = firstMonth - 1;
        let zeroYear = firstYear;
        if (zeroMonth === 0) {
          zeroMonth = 12;
          zeroYear -= 1;
        }
        zeroCompetencia = `${String(zeroMonth).padStart(2, '0')}/${zeroYear}`;
      } else {
        zeroCompetencia = chartData[0]?.competencia; // Fallback
      }
      
      const currentCompetencia = point.competencia;
      
      // CDI data - composição mensal correta
      let cdiRetorno = null;
      
      // Get all CDI data from first competencia to current competencia
      const startCompetenciaIndex = cdiData.findIndex(cdi => cdi.competencia === firstCompetencia);
      const currentCompetenciaIndex = cdiData.findIndex(cdi => cdi.competencia === currentCompetencia);
      
      if (startCompetenciaIndex !== -1 && currentCompetenciaIndex !== -1) {
        if (currentCompetencia === firstCompetencia) {
          cdiRetorno = cdiData[currentCompetenciaIndex].cdiRate * 100;
        } else {
          // Composição mensal: 1.0110 * 1.0128 * ... para cada mês no período
          let accumulatedCDI = 1;
          for (let i = startCompetenciaIndex; i <= currentCompetenciaIndex; i++) {
            accumulatedCDI *= (1 + cdiData[i].cdiRate);
          }
          cdiRetorno = (accumulatedCDI - 1) * 100;
        }
      }
      
      // Target data (calculate properly using market indicators which already include the correct calculation)
      let targetRetorno = null;
      
      // Market indicators - only show if data exists
      let ipcaRetorno = null;
      
      const currentMarketPoint = marketData.find(m => m.competencia === currentCompetencia);
      
      // Para Target: calcular a partir de firstCompetencia
      if (currentMarketPoint && firstCompetencia && clientTarget) {
        if (currentCompetencia === firstCompetencia) {
          // Primeira competência real: retornar apenas o valor mensal
          targetRetorno = currentMarketPoint.clientTarget * 100;
        } else {
          // Competências posteriores: acumular desde firstCompetencia
          const periodMonths = marketData
            .filter(m => {
              const mDate = competenciaToDate(m.competencia);
              const startDate = competenciaToDate(firstCompetencia);
              const currentDate = competenciaToDate(currentCompetencia);
              return mDate >= startDate && mDate <= currentDate;
            })
            .sort((a, b) => competenciaToDate(a.competencia).getTime() - competenciaToDate(b.competencia).getTime());
          
          let composedTarget = 0;
          periodMonths.forEach(month => {
            if (month.clientTarget !== 0) {
              composedTarget = (1 + composedTarget) * (1 + month.clientTarget) - 1;
            }
          });
          
          targetRetorno = composedTarget * 100;
        }
      }
      
      // Para IPCA: calcular a partir de firstCompetencia
      if (currentMarketPoint && firstCompetencia) {
        if (currentCompetencia === firstCompetencia) {
          // Primeira competência real: retornar apenas o valor mensal
          ipcaRetorno = currentMarketPoint.ipca * 100;
        } else {
          // Competências posteriores: acumular desde firstCompetencia
          const periodMonths = marketData
            .filter(m => {
              const mDate = competenciaToDate(m.competencia);
              const startDate = competenciaToDate(firstCompetencia);
              const currentDate = competenciaToDate(currentCompetencia);
              return mDate >= startDate && mDate <= currentDate;
            })
            .sort((a, b) => competenciaToDate(a.competencia).getTime() - competenciaToDate(b.competencia).getTime());
          
          let accumulatedIPCA = 1;
          periodMonths.forEach(month => {
            accumulatedIPCA *= (1 + month.ipca);
          });
          
          ipcaRetorno = (accumulatedIPCA - 1) * 100;
        }
      }
      
      // Carteira Antiga - baseada no percentual do CDI
      let oldPortfolioRetorno = null;
      if (cdiRetorno !== null) {
        oldPortfolioRetorno = cdiRetorno * (oldPortfolioCDI / 100);
      }
      
      return {
        ...point,
        cdiRetorno,
        targetRetorno,
        ipcaRetorno,
        oldPortfolioRetorno
      };
    }
  });

  console.log('Chart data with indicators:', chartDataWithIndicators);

  // Calculate optimal Y axis scale with better padding
  const portfolioValues = chartDataWithIndicators.map(item => item.retornoAcumulado);
  const cdiValues = chartDataWithIndicators.map(item => item.cdiRetorno).filter(v => v !== null) as number[];
  const targetValues = chartDataWithIndicators.map(item => item.targetRetorno).filter(v => v !== null) as number[];
  const ipcaValues = chartDataWithIndicators.map(item => item.ipcaRetorno).filter(v => v !== null) as number[];
  
  const oldPortfolioValues = chartDataWithIndicators.map(item => item.oldPortfolioRetorno).filter(v => v !== null) as number[];
  
  // Only include values from selected indicators
  let allValues = [...portfolioValues];
  if (selectedIndicators.cdi) allValues = [...allValues, ...cdiValues];
  if (selectedIndicators.target) allValues = [...allValues, ...targetValues];
  if (selectedIndicators.ipca) allValues = [...allValues, ...ipcaValues];
  if (showOldPortfolio) allValues = [...allValues, ...oldPortfolioValues];
  
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues);
  
  const range = maxValue - minValue;
  const buffer = Math.max(range * 0.1, 0.5); // Reduced buffer for tighter scale
  
  const yAxisMin = Math.floor((minValue - buffer) * 2) / 2; // Round to nearest 0.5
  const yAxisMax = Math.ceil((maxValue + buffer) * 2) / 2;  // Round to nearest 0.5
  
  const generateTicks = (min: number, max: number) => {
    const range = max - min;
    let step;
    
    if (range <= 2) step = 0.25;
    else if (range <= 5) step = 0.5;
    else if (range <= 10) step = 1;
    else if (range <= 20) step = 2;
    else step = Math.ceil(range / 10);
    
    const ticks = [];
    for (let i = Math.floor(min / step) * step; i <= max; i += step) {
      ticks.push(Number(i.toFixed(2)));
    }
    return ticks;
  };
  
  const yAxisTicks = generateTicks(yAxisMin, yAxisMax);

  const periodButtons = [
    { id: 'month', label: 'Mês' },
    { id: 'year', label: 'Ano' },
    { id: '12months', label: '12M' },
    { id: 'all', label: 'Ótimo' },
    { id: 'custom', label: 'Personalizado' }
  ];

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group px-4 py-2 -ml-4 rounded-lg hover:bg-accent/50 transition-all"
            onClick={() => {
              if (viewMode === 'rentabilidade') setViewMode('patrimonio');
              else if (viewMode === 'patrimonio') setViewMode('crescimento');
              else setViewMode('rentabilidade');
            }}
          >
            <div className="h-10 w-10 rounded-lg bg-gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              {viewMode === 'rentabilidade' ? (
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              ) : viewMode === 'patrimonio' ? (
                <Wallet className="h-5 w-5 text-primary-foreground" />
              ) : (
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-foreground text-xl font-semibold">
                {viewMode === 'rentabilidade' ? 'Retorno Acumulado' : viewMode === 'patrimonio' ? 'Seu patrimônio' : 'Crescimento'}
              </CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            {(cdiLoading || marketLoading) && <p className="text-xs text-muted-foreground ml-2">Carregando...</p>}
            {(cdiError || marketError) && <p className="text-xs text-destructive ml-2">Erro</p>}
          </div>
          
          {/* Period Selection and Indicators */}
          <div className="flex items-center gap-2">
            {/* Indicators Selector - only show in rentabilidade mode */}
            {viewMode === 'rentabilidade' && (
              <Popover open={showIndicators} onOpenChange={setShowIndicators}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Indicadores
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 bg-background border-border z-50" align="end">
                  <div className="space-y-3 p-2">
                    <h4 className="font-medium text-sm">Selecionar Indicadores</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="cdi" 
                          checked={selectedIndicators.cdi}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, cdi: checked as boolean }))
                          }
                        />
                        <label htmlFor="cdi" className="text-sm">CDI</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="target" 
                          checked={selectedIndicators.target}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, target: checked as boolean }))
                          }
                        />
                         <label htmlFor="target" className="text-sm">
                           Meta {(() => {
                             console.log('Debug clientTarget:', clientTarget, 'marketLoading:', marketLoading);
                             if (marketLoading) return '(Carregando...)';
                             if (clientTarget && clientTarget.meta) return `(${clientTarget.meta})`;
                             return '(Não disponível)';
                           })()}
                         </label>
                      </div>
                      
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="ipca" 
                          checked={selectedIndicators.ipca}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, ipca: checked as boolean }))
                          }
                        />
                        <label htmlFor="ipca" className="text-sm">IPCA</label>
                      </div>
                      
                      {/* Carteira Antiga benchmark */}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox 
                            id="oldPortfolio" 
                            checked={showOldPortfolio}
                            onCheckedChange={(checked) => 
                              setShowOldPortfolio(checked as boolean)
                            }
                          />
                          <label htmlFor="oldPortfolio" className="text-sm font-medium">Carteira Antiga</label>
                        </div>
                        {showOldPortfolio && (
                          <div className="flex items-center gap-2 ml-6">
                            <Input 
                              type="number"
                              value={oldPortfolioCDI}
                              onChange={(e) => setOldPortfolioCDI(Number(e.target.value))}
                              className="w-20 h-8 text-sm"
                              min={0}
                              max={200}
                            />
                            <span className="text-sm text-muted-foreground">% do CDI</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <div className="flex items-center gap-1">
            {viewMode === 'crescimento' && (
              <Button
                variant={showOnlyRendaGerada ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyRendaGerada(!showOnlyRendaGerada)}
                className="gap-2 text-xs px-3 py-1 h-8 mr-2"
              >
                <Wallet className="h-4 w-4" />
                {showOnlyRendaGerada ? "Ver Tudo" : "Renda Gerada"}
              </Button>
            )}
            
            {periodButtons.map((button) => (
              <Button
                key={button.id}
                variant={selectedPeriod === button.id ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSelectedPeriod(button.id as any);
                  if (button.id === 'custom') {
                    setShowCustomSelector(true);
                  }
                }}
                className="text-xs px-3 py-1 h-8"
              >
                {button.label}
              </Button>
            ))}
            
            {selectedPeriod === 'custom' && (
              <Popover open={showCustomSelector} onOpenChange={setShowCustomSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Competência Inicial</label>
                      <Select value={customStartCompetencia} onValueChange={setCustomStartCompetencia}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a competência inicial" />
                        </SelectTrigger>
                        <SelectContent>
                           {availableCompetencias.map((competencia) => (
                             <SelectItem key={competencia} value={competencia}>
                               {formatCompetenciaDisplay(competencia)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Competência Final</label>
                      <Select value={customEndCompetencia} onValueChange={setCustomEndCompetencia}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a competência final" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCompetencias.map((competencia) => (
                            <SelectItem key={competencia} value={competencia}>
                              {formatCompetenciaDisplay(competencia)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-6">
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'crescimento' ? (
              <BarChart 
                data={growthData} 
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                barGap={8}
              >
                <defs>
                  <linearGradient id="barRendaGerada" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(47 100% 65%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(47 95% 55%)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="barPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 50% 50%)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="hsl(142 45% 42%)" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="barNegative" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(0 72% 50%)" stopOpacity={0.85} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.2}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tick={{ dy: 10 }}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                    return `R$ ${value}`;
                  }}
                  width={70}
                  domain={[0, (dataMax: number) => dataMax * 1.08]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                    fontSize: '13px',
                    padding: '14px'
                  }}
                  content={(props) => {
                    const { active, payload } = props;
                    if (!active || !payload || !payload.length) return null;
                    
                    const data = payload[0].payload;
                    const isPositive = data.totalGrowth >= 0;
                    
                    return (
                      <div style={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                        fontSize: '13px',
                        padding: '14px',
                        minWidth: '260px'
                      }}>
                        <div style={{ 
                          color: 'hsl(var(--foreground))', 
                          fontWeight: '600',
                          marginBottom: '12px',
                          fontSize: '14px',
                          borderBottom: '1px solid hsl(var(--border))',
                          paddingBottom: '8px'
                        }}>
                          {data.name}
                        </div>
                        <div style={{ 
                          marginBottom: '10px', 
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: 'hsl(var(--muted) / 0.3)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Patrimônio Inicial</span>
                            <strong style={{ fontSize: '12px' }}>R$ {data.patrimonioInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          {data.rendaGerada > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'hsl(47 90% 45%)' }}>Renda Gerada</span>
                              <strong style={{ fontSize: '12px', color: 'hsl(47 90% 40%)' }}>R$ {data.rendaGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          marginBottom: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isPositive ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                          border: `1px solid ${isPositive ? 'hsl(142 71% 45% / 0.3)' : 'hsl(0 84% 60% / 0.3)'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: isPositive ? 'hsl(142 71% 35%)' : 'hsl(0 72% 45%)' }}>
                              Crescimento Total
                            </span>
                            <strong style={{ 
                              fontSize: '14px',
                              color: isPositive ? 'hsl(142 71% 35%)' : 'hsl(0 72% 45%)'
                            }}>
                              {isPositive ? '+' : ''}R$ {data.totalGrowth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <div style={{ 
                            fontSize: '13px', 
                            color: isPositive ? 'hsl(142 71% 35%)' : 'hsl(0 72% 45%)',
                            fontWeight: '700',
                            textAlign: 'right'
                          }}>
                            {isPositive ? '+' : ''}{data.growthPercentage.toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: 'hsl(var(--muted-foreground))', 
                          paddingTop: '10px', 
                          borderTop: '1px solid hsl(var(--border))',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Movimentação:</span>
                            <span style={{ fontWeight: '600', color: data.movimentacao >= 0 ? 'hsl(var(--foreground))' : 'hsl(var(--destructive))' }}>
                              {data.movimentacao > 0 ? '+' : ''}R$ {data.movimentacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Ganho Financeiro:</span>
                            <span style={{ fontWeight: '600', color: data.ganhoFinanceiro >= 0 ? 'hsl(142 71% 35%)' : 'hsl(0 72% 45%)' }}>
                              {data.ganhoFinanceiro > 0 ? '+' : ''}R$ {data.ganhoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ 
                            marginTop: '6px', 
                            paddingTop: '8px', 
                            borderTop: '1px solid hsl(var(--border))',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <strong style={{ color: 'hsl(var(--foreground))' }}>Patrimônio Final:</strong>
                            <strong style={{ color: 'hsl(var(--primary))' }}>R$ {data.patrimonioFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)', radius: 4 }}
                />
                <Bar 
                  dataKey="rendaGerada" 
                  stackId="a"
                  fill="url(#barRendaGerada)"
                  radius={[0, 0, 6, 6]}
                  maxBarSize={60}
                  hide={showOnlyRendaGerada ? false : false}
                >
                  {showOnlyRendaGerada && (
                    <LabelList
                      dataKey="rendaGerada"
                      position="top"
                      formatter={(value: number) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value.toFixed(0);
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        fill: 'hsl(var(--foreground))'
                      }}
                      offset={8}
                    />
                  )}
                </Bar>
                <Bar 
                  dataKey="patrimonioBase" 
                  stackId="a"
                  fill="url(#barBase)"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={60}
                  hide={showOnlyRendaGerada}
                />
                <Bar 
                  dataKey="growth" 
                  stackId="a"
                  fill="url(#barPositive)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  hide={showOnlyRendaGerada}
                />
                <Bar 
                  dataKey="negativeGrowth" 
                  stackId="a"
                  fill="url(#barNegative)"
                  radius={[0, 0, 6, 6]}
                  maxBarSize={60}
                  hide={showOnlyRendaGerada}
                />
              </BarChart>
            ) : viewMode === 'rentabilidade' ? (
              <LineChart
                data={chartDataWithIndicators} 
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tick={{ dy: 10 }}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  domain={[yAxisMin, yAxisMax]}
                  ticks={yAxisTicks}
                  width={70}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                    fontSize: '13px',
                    padding: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'retornoAcumulado') {
                      return [`${value.toFixed(2)}%`, 'Portfolio'];
                    }
                    if (name === 'cdiRetorno') {
                      return [`${value.toFixed(2)}%`, 'CDI'];
                    }
                    if (name === 'targetRetorno') {
                      return [`${value.toFixed(2)}%`, 'Meta'];
                    }
                    if (name === 'ipcaRetorno') {
                      return [`${value.toFixed(2)}%`, 'IPCA'];
                    }
                    if (name === 'oldPortfolioRetorno') {
                      return [`${value.toFixed(2)}%`, 'Carteira Antiga'];
                    }
                    return [`${value.toFixed(2)}%`, name];
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                />
                {/* Portfolio Line - Main line with emphasis */}
                <Line 
                  type="monotone" 
                  dataKey="retornoAcumulado" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))',
                    r: 4
                  }}
                  activeDot={{ 
                    r: 6, 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 3, 
                    stroke: 'hsl(var(--background))'
                  }}
                />
                {selectedIndicators.cdi && (
                  <Line 
                    type="monotone" 
                    dataKey="cdiRetorno" 
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={{ 
                      fill: 'hsl(var(--muted-foreground))', 
                      strokeWidth: 1, 
                      stroke: 'hsl(var(--background))',
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      fill: 'hsl(var(--muted-foreground))', 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))'
                    }}
                  />
                )}
                {selectedIndicators.target && (
                  <Line 
                    type="monotone" 
                    dataKey="targetRetorno" 
                    stroke="hsl(0 84% 60%)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ 
                      fill: "hsl(0 84% 60%)", 
                      strokeWidth: 1, 
                      stroke: 'hsl(var(--background))',
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      fill: "hsl(0 84% 60%)", 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))'
                    }}
                  />
                )}
                {selectedIndicators.ipca && (
                  <Line 
                    type="monotone" 
                    dataKey="ipcaRetorno" 
                    stroke="hsl(var(--info))"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ 
                      fill: 'hsl(var(--info))', 
                      strokeWidth: 1, 
                      stroke: 'hsl(var(--background))',
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      fill: 'hsl(var(--info))', 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))'
                    }}
                  />
                )}
                {showOldPortfolio && (
                  <Line 
                    type="monotone" 
                    dataKey="oldPortfolioRetorno" 
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={false}
                    dot={{ 
                      fill: 'hsl(38 92% 50%)', 
                      strokeWidth: 1, 
                      stroke: 'hsl(var(--background))',
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      fill: 'hsl(38 92% 50%)', 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))'
                    }}
                  />
                )}
              </LineChart>
            ) : (
              <LineChart 
                data={patrimonioData} 
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tick={{ dy: 10 }}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
                  width={90}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                    fontSize: '13px',
                    padding: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'patrimonioAplicado') {
                      return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Patrimônio Aplicado'];
                    }
                    if (name === 'patrimonioAtual') {
                      return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Patrimônio'];
                    }
                    return [value, name];
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                />
                {/* Patrimônio Aplicado Line */}
                <Line 
                  type="monotone" 
                  dataKey="patrimonioAplicado" 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2.5}
                  dot={{ 
                    fill: 'hsl(var(--muted-foreground))', 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))',
                    r: 4
                  }}
                  activeDot={{ 
                    r: 5, 
                    fill: 'hsl(var(--muted-foreground))', 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))'
                  }}
                />
                {/* Patrimônio Atual Line */}
                <Line 
                  type="monotone" 
                  dataKey="patrimonioAtual" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))',
                    r: 4
                  }}
                  activeDot={{ 
                    r: 6, 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 3, 
                    stroke: 'hsl(var(--background))'
                  }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Performance Metrics */}
        {viewMode === 'patrimonio' ? (
          // Modo "Seu patrimônio" - apenas "Efeito bola de neve"
          patrimonioData.length > 1 && (() => {
            const lastDataPoint = patrimonioData[patrimonioData.length - 1];
            const patrimonioAtual = lastDataPoint.patrimonioAtual;
            const patrimonioAplicado = lastDataPoint.patrimonioAplicado;
            
            // Efeito bola de neve = Patrimônio Atual / Patrimônio Aplicado
            const snowballEffect = patrimonioAplicado > 0 ? 
              (patrimonioAtual / patrimonioAplicado) : 1;
            
            const percentageGain = (snowballEffect - 1) * 100;
            
            return (
              <div className="mt-6 grid grid-cols-1 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Efeito bola de neve</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {snowballEffect.toFixed(2)}x
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentageGain >= 0 ? '+' : ''}{percentageGain.toFixed(2)}% sobre o patrimônio aplicado
                      </p>
                    </div>
                    <div className={`text-sm px-2 py-1 rounded ${
                      percentageGain >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {percentageGain >= 0 ? '↑' : '↓'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : viewMode === 'crescimento' ? (
          // Modo "Crescimento" - crescimento médio e total + renda gerada
          growthData.length > 0 && (() => {
            // Calcular crescimento percentual médio
            const averageGrowthPercentage = growthData.reduce((sum, item) => sum + item.growthPercentage, 0) / growthData.length;
            
            // Calcular crescimento total do período
            const firstPatrimonio = growthData[0]?.patrimonioBase || 0;
            const lastPatrimonio = growthData[growthData.length - 1]?.patrimonioFinal || 0;
            const periodGrowth = lastPatrimonio - firstPatrimonio;
            const periodGrowthPercentage = firstPatrimonio > 0 ? (periodGrowth / firstPatrimonio) * 100 : 0;
            
            // Última renda gerada
            const lastRendaGerada = growthData[growthData.length - 1]?.rendaGerada || 0;
            const lastPatrimonioInicial = growthData[growthData.length - 1]?.patrimonioInicial || 0;
            const rendaPercentage = lastPatrimonioInicial > 0 ? (lastRendaGerada / lastPatrimonioInicial) * 100 : 0;
            
            // Renda média dos últimos 12 meses
            const last12MonthsData = growthData.slice(-12);
            const averageRenda12M = last12MonthsData.reduce((sum, item) => sum + (item.rendaGerada || 0), 0) / last12MonthsData.length;
            const totalRenda12M = last12MonthsData.reduce((sum, item) => sum + (item.rendaGerada || 0), 0);
            
            return (
              <>
                {!showOnlyRendaGerada && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Crescimento médio</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {averageGrowthPercentage >= 0 ? '+' : ''}{averageGrowthPercentage.toFixed(2)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por período
                          </p>
                        </div>
                        <div className={`text-sm px-2 py-1 rounded ${
                          averageGrowthPercentage >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {averageGrowthPercentage >= 0 ? '↑' : '↓'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Crescimento total no período</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {periodGrowthPercentage >= 0 ? '+' : ''}{periodGrowthPercentage.toFixed(2)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            R$ {periodGrowth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className={`text-sm px-2 py-1 rounded ${
                          periodGrowthPercentage >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {periodGrowthPercentage >= 0 ? '↑' : '↓'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {showOnlyRendaGerada && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Última renda gerada</p>
                          <p className="text-2xl font-semibold text-foreground">
                            R$ {lastRendaGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rendaPercentage.toFixed(2)}% do patrimônio
                          </p>
                        </div>
                        <div className="text-sm px-2 py-1 rounded bg-[hsl(47_100%_65%)]/10" style={{ color: 'hsl(47 90% 40%)' }}>
                          <Wallet className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Renda média (12M)</p>
                          <p className="text-2xl font-semibold text-foreground">
                            R$ {averageRenda12M.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total: R$ {totalRenda12M.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-sm px-2 py-1 rounded bg-[hsl(47_100%_65%)]/10" style={{ color: 'hsl(47 90% 40%)' }}>
                          <Wallet className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()
        ) : (
          // Modos "Retorno Acumulado" - todos os bullets
          chartDataWithIndicators.length > 1 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const lastDataPoint = chartDataWithIndicators[chartDataWithIndicators.length - 1];
                const portfolioReturn = lastDataPoint.retornoAcumulado;
                const cdiReturn = lastDataPoint.cdiRetorno;
                const ipcaReturn = lastDataPoint.ipcaRetorno;
                
                // Relação Portfolio vs CDI
                const cdiRelative = cdiReturn && cdiReturn !== 0 ? 
                  ((portfolioReturn / cdiReturn) * 100) : null;
                
                // Diferença vs IPCA em pontos percentuais
                const ipcaDifference = ipcaReturn !== null ? 
                  (portfolioReturn - ipcaReturn) : null;
                
                return (
                  <>
                    {clientTarget && (() => {
                      // Calculate difference from target
                      const targetReturn = lastDataPoint?.targetRetorno || 0;
                      const targetDifference = portfolioReturn - targetReturn;
                      
                      return (
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">vs Meta</p>
                              <p className="text-2xl font-semibold text-foreground">
                                {targetDifference >= 0 ? '+' : ''}{targetDifference.toFixed(2)}pp
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {targetDifference >= 0 ? 'acima' : 'abaixo'} da meta ({clientTarget.meta})
                              </p>
                            </div>
                            <div className={`text-sm px-2 py-1 rounded ${
                              targetDifference >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {targetDifference >= 0 ? '↑' : '↓'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {cdiRelative !== null && selectedIndicators.cdi && (
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">vs CDI</p>
                            <p className="text-2xl font-semibold text-foreground">
                              {cdiRelative.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              do retorno do CDI
                            </p>
                          </div>
                          <div className={`text-sm px-2 py-1 rounded ${
                            cdiRelative >= 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {cdiRelative >= 100 ? '↑' : '↓'} {Math.abs(cdiRelative - 100).toFixed(1)}pp
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {ipcaDifference !== null && selectedIndicators.ipca && (
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">vs IPCA</p>
                            <p className="text-2xl font-semibold text-foreground">
                              {ipcaDifference >= 0 ? '+' : ''}{ipcaDifference.toFixed(2)}pp
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ipcaDifference >= 0 ? 'acima' : 'abaixo'} da inflação
                            </p>
                          </div>
                          <div className={`text-sm px-2 py-1 rounded ${
                            ipcaDifference >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {ipcaDifference >= 0 ? '↑' : '↓'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {showOldPortfolio && filteredData.length > 0 && (() => {
                      const portfolioReturnDecimal = portfolioReturn / 100;
                      const oldPortfolioReturn = (lastDataPoint.oldPortfolioRetorno || 0) / 100;
                      
                      const patrimonioInicial = filteredData[0]["Patrimonio Inicial"] || 0;
                      const patrimonioCarteira = patrimonioInicial * (1 + portfolioReturnDecimal);
                      const patrimonioCarteiraAntiga = patrimonioInicial * (1 + oldPortfolioReturn);
                      const diferenca = patrimonioCarteira - patrimonioCarteiraAntiga;
                      
                      return (
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">vs Carteira Antiga</p>
                              <p className="text-2xl font-semibold text-foreground">
                                {diferenca >= 0 ? '+' : ''}R$ {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className={`text-sm px-2 py-1 rounded ${
                              diferenca >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {diferenca >= 0 ? '↑' : '↓'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
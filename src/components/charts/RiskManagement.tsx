import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie, Area, AreaChart, ComposedChart, ReferenceLine } from 'recharts';
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Activity, AlertTriangle, Target, Calendar, Settings, Rocket, Check, X, TrendingUp as TrendingUpIcon, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface MarketIndicatorData {
  competencia: string;
  ibovespa: number;
  ifix: number;
  ipca: number;
  clientTarget: number;
  accumulatedIbovespa: number;
  accumulatedIfix: number;
  accumulatedIpca: number;
  accumulatedClientTarget: number;
}

interface RiskManagementProps {
  consolidadoData: Array<{
    Data: string;
    "Patrimonio Final": number;
    "Patrimonio Inicial": number;
    "Movimentação": number;
    "Ganho Financeiro": number;
    Rendimento: number;
    Impostos: number;
    Competencia: string;
  }>;
  clientTarget?: number;
  marketData?: MarketIndicatorData[];
  dadosData?: Array<{
    id: number;
    Ativo: string;
    "Classe do ativo": string;
    Posicao: number;
    Rendimento: number;
    Competencia: string;
  }>;
}

export function RiskManagement({ consolidadoData, clientTarget = 0.7, marketData = [], dadosData = [] }: RiskManagementProps) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | '12months' | 'all' | 'custom'>('12months');
  const [customStartCompetencia, setCustomStartCompetencia] = useState<string>('');
  const [customEndCompetencia, setCustomEndCompetencia] = useState<string>('');
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState({
    portfolio: true,
    media: true,
    sd1: true,
    sd2: true
  });
  const [desviosPadraoTipo, setDesviosPadraoTipo] = useState<1 | 2>(1); // Novo estado para controlar 1 ou 2 desvios
  const [riskBudgetPeriod, setRiskBudgetPeriod] = useState<'month' | 'year' | '12months' | 'all' | 'custom'>('all');

  // Consolidar dados por competência
  const consolidateByCompetencia = (data: typeof consolidadoData) => {
    console.log('🔍 CONSOLIDAÇÃO - Dados brutos recebidos:', data.length);
    
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
      consolidated["Patrimonio Final"] += item["Patrimonio Final"] || 0;
      consolidated["Patrimonio Inicial"] += item["Patrimonio Inicial"] || 0;
      consolidated["Movimentação"] += item["Movimentação"] || 0;
      consolidated["Ganho Financeiro"] += item["Ganho Financeiro"] || 0;
      consolidated.Impostos += item.Impostos || 0;
      
      const patrimonio = item["Patrimonio Final"] || 0;
      const rendimento = item.Rendimento || 0;
      consolidated.rendimentoSum += rendimento * patrimonio;
      consolidated.patrimonioForWeightedAvg += patrimonio;
    });
    
    const result = Array.from(competenciaMap.values()).map(item => ({
      Data: item.Data,
      Competencia: item.Competencia,
      "Patrimonio Final": item["Patrimonio Final"],
      "Patrimonio Inicial": item["Patrimonio Inicial"],
      "Movimentação": item["Movimentação"],
      "Ganho Financeiro": item["Ganho Financeiro"],
      Impostos: item.Impostos,
      Rendimento: item.patrimonioForWeightedAvg > 0 
        ? item.rendimentoSum / item.patrimonioForWeightedAvg 
        : 0
    })).sort((a, b) => {
      const [monthA, yearA] = a.Competencia.split('/').map(Number);
      const [monthB, yearB] = b.Competencia.split('/').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
    
    console.log('✅ CONSOLIDAÇÃO - Competências únicas:', result.length);
    console.log('📊 CONSOLIDAÇÃO - Primeiros 3 meses:', result.slice(0, 3).map(r => ({
      competencia: r.Competencia,
      rendimento: (r.Rendimento * 100).toFixed(2) + '%'
    })));
    
    return result;
  };

  const consolidatedData = useMemo(() => consolidateByCompetencia(consolidadoData), [consolidadoData]);

  // Get available competencias for custom selector - sorted chronologically
  const availableCompetencias = useMemo(() => {
    return [...new Set(consolidatedData.map(item => item.Competencia))]
      .sort((a, b) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
        return dateA.getTime() - dateB.getTime();
      });
  }, [consolidatedData]);

  // Format competencia display
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
    if (consolidatedData.length === 0) return [];
    
    let filteredData = consolidatedData;

    switch (selectedPeriod) {
      case 'month':
        filteredData = consolidatedData.slice(-1);
        break;
      case 'year':
        if (consolidatedData.length > 0) {
          const mostRecentCompetencia = consolidatedData[consolidatedData.length - 1].Competencia;
          const mostRecentYear = mostRecentCompetencia.split('/')[1];
          filteredData = consolidatedData.filter(item => {
            const itemYear = item.Competencia.split('/')[1];
            return itemYear === mostRecentYear;
          });
        }
        break;
      case '12months':
        filteredData = consolidatedData.slice(-12);
        break;
      case 'all':
        filteredData = consolidatedData;
        break;
      case 'custom':
        if (customStartCompetencia && customEndCompetencia) {
          filteredData = consolidatedData.filter(item => {
            const [itemMonth, itemYear] = item.Competencia.split('/');
            const [startMonth, startYear] = customStartCompetencia.split('/');
            const [endMonth, endYear] = customEndCompetencia.split('/');
            
            const itemDate = new Date(parseInt(itemYear), parseInt(itemMonth) - 1);
            const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1);
            const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1);
            
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        break;
    }

    return filteredData;
  };

  const filteredConsolidatedData = getFilteredData();

  // Calcular métricas de risco usando dados filtrados
  const riskMetrics = useMemo(() => {
    if (filteredConsolidatedData.length === 0) {
      return {
        sharpe: 0,
        sortino: 0,
        volatility: 0,
        maxDrawdown: 0,
        avgReturn: 0,
        downwardVolatility: 0,
        monthsAboveTarget: 0,
        monthsBelowTarget: 0,
        bestMonth: { return: 0, competencia: '' },
        worstMonth: { return: 0, competencia: '' },
        hitRate: {
          homeRun: 0,
          acerto: 0,
          quaseLa: 0,
          miss: 0,
          hitRatePercent: 0,
          positivePercent: 0
        },
        targetMetrics: {
          avgTarget: 0,
          targetVolatility: 0
        }
      };
    }

    const returns = filteredConsolidatedData.map(item => item.Rendimento * 100);
    
    // Média ARITMÉTICA (para cálculos estatísticos de volatilidade)
    const avgReturnArithmetic = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Média GEOMÉTRICA (para retorno composto real)
    const compoundedReturn = returns.reduce((product, r) => {
      return product * (1 + r / 100); // Converter % para decimal
    }, 1);
    const avgReturnGeometric = (Math.pow(compoundedReturn, 1 / returns.length) - 1) * 100;
    
    // Volatilidade (desvio padrão) - calculada com base na média ARITMÉTICA
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturnArithmetic, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Sharpe Ratio - usando média GEOMÉTRICA (performance real) e volatilidade (risco estatístico)
    const riskFreeRate = 0.5;
    const sharpe = volatility !== 0 ? (avgReturnGeometric - riskFreeRate) / volatility : 0;
    
    // Sortino Ratio - usando média GEOMÉTRICA (performance real)
    const negativeReturns = returns.filter(r => r < clientTarget * 100);
    const downwardVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - clientTarget * 100, 2), 0) / negativeReturns.length
      : 0;
    const downwardVolatility = Math.sqrt(downwardVariance);
    const sortino = downwardVolatility !== 0 ? (avgReturnGeometric - clientTarget * 100) / downwardVolatility : 0;
    
    // Volatilidade Assimétrica (Upside vs Downside) - usando média ARITMÉTICA
    const positiveReturns = returns.filter(r => r > avgReturnArithmetic);
    const negativeReturnsFromAvg = returns.filter(r => r < avgReturnArithmetic);
    
    const upsideVariance = positiveReturns.length > 0
      ? positiveReturns.reduce((sum, r) => sum + Math.pow(r - avgReturnArithmetic, 2), 0) / positiveReturns.length
      : 0;
    const upsideVolatility = Math.sqrt(upsideVariance);
    
    const downsideVariance = negativeReturnsFromAvg.length > 0
      ? negativeReturnsFromAvg.reduce((sum, r) => sum + Math.pow(r - avgReturnArithmetic, 2), 0) / negativeReturnsFromAvg.length
      : 0;
    const downsideVolatility = Math.sqrt(downsideVariance);
    
    const volatilityRatio = downsideVolatility !== 0 ? upsideVolatility / downsideVolatility : 0;
    
    // Drawdown máximo
    let maxDrawdown = 0;
    let peak = filteredConsolidatedData[0]["Patrimonio Final"];
    filteredConsolidatedData.forEach(item => {
      const current = item["Patrimonio Final"];
      if (current > peak) peak = current;
      const drawdown = ((peak - current) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    // Meses acima e abaixo da meta (usando meta mensal correta)
    let monthsAboveTarget = 0;
    let monthsBelowTarget = 0;

    returns.forEach((returnValue, index) => {
      const competencia = filteredConsolidatedData[index]?.Competencia;
      
      // Buscar a meta mensal correta para esta competência nos marketData
      const marketDataForCompetencia = marketData?.find(m => m.competencia === competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || 0;
      const targetPercent = monthlyTarget * 100; // Converter para %
      
      // Comparar retorno mensal com meta mensal
      if (returnValue >= targetPercent) {
        monthsAboveTarget++;
      } else {
        monthsBelowTarget++;
      }
    });
    
    // Calcular volatilidade da meta ANTES do hit rate analysis
    const allTargets: number[] = [];
    filteredConsolidatedData.forEach((item) => {
      const mData = marketData.find(m => m.competencia === item.Competencia);
      const target = mData?.clientTarget || clientTarget;
      allTargets.push(target * 100); // Em %
    });
    
    const avgTarget = allTargets.length > 0
      ? allTargets.reduce((sum, t) => sum + t, 0) / allTargets.length
      : 0;
    
    const targetVariance = allTargets.length > 0
      ? allTargets.reduce((sum, t) => sum + Math.pow(t - avgTarget, 2), 0) / allTargets.length
      : 0;
    const targetVolatility = Math.sqrt(targetVariance);
    
    // Melhor e pior mês
    const maxReturn = Math.max(...returns);
    const minReturn = Math.min(...returns);
    const bestMonthIndex = returns.indexOf(maxReturn);
    const worstMonthIndex = returns.indexOf(minReturn);
    
    // Hit Rate Analysis - usando a meta MENSAL correta de cada competência
    let homeRun = 0;
    let acerto = 0;
    let quaseLa = 0;
    let miss = 0;
    
    console.log('🎯 === HIT RATE ANÁLISE DETALHADA (META MENSAL) ===');
    console.log('📊 Total de períodos únicos consolidados:', returns.length);
    console.log('📈 Volatilidade da meta (σ):', targetVolatility.toFixed(4) + '%');
    console.log('📈 Volatilidade da carteira:', volatility.toFixed(4) + '%');
    console.log('');
    console.log('📅 Análise mês a mês (usando meta mensal de cada competência):');
    
    returns.forEach((returnValue, index) => {
      const competencia = filteredConsolidatedData[index]?.Competencia;
      
      // Buscar a meta mensal correta para esta competência nos marketData
      const marketDataForCompetencia = marketData.find(m => m.competencia === competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || 0;
      const targetPercent = monthlyTarget * 100; // Converter para %
      const homeRunThreshold = targetPercent + targetVolatility; // Meta mensal + 1σ da meta
      
      let category = '';
      let emoji = '';
      
      if (returnValue >= homeRunThreshold) {
        homeRun++;
        category = 'HOME RUN';
        emoji = '🚀';
      } else if (returnValue >= targetPercent) {
        acerto++;
        category = 'ACERTO';
        emoji = '✅';
      } else if (returnValue > 0) {
        quaseLa++;
        category = 'QUASE LÁ';
        emoji = '⚠️';
      } else {
        miss++;
        category = 'MISS';
        emoji = '❌';
      }
      
      console.log(`  ${emoji} ${competencia}: Retorno ${returnValue.toFixed(2)}% | Meta ${targetPercent.toFixed(2)}% | Threshold ${homeRunThreshold.toFixed(2)}% → ${category}`);
    });
    
    console.log('');
    console.log('📊 === RESULTADO FINAL ===');
    console.log('  🚀 Home Run:', homeRun, 'meses');
    console.log('  ✅ Acerto:', acerto, 'meses');
    console.log('  ⚠️  Quase Lá:', quaseLa, 'meses');
    console.log('  ❌ Miss:', miss, 'meses');
    console.log('  📈 Total:', homeRun + acerto + quaseLa + miss, 'meses');
    console.log('  🎯 Hit Rate (Home Run + Acerto):', homeRun + acerto, '/', returns.length, '=', Math.round(((homeRun + acerto) / returns.length) * 100) + '%');
    console.log('=================================');
    
    const hitRatePercent = returns.length > 0 
      ? Math.round(((homeRun + acerto) / returns.length) * 100)
      : 0;
    
    const positiveMonths = returns.filter(r => r > 0).length;
    const positivePercent = returns.length > 0
      ? Math.round((positiveMonths / returns.length) * 100)
      : 0;
    
    return {
      sharpe,
      sortino,
      volatility,
      maxDrawdown,
      avgReturn: avgReturnGeometric, // Exibir média geométrica nos cards
      avgReturnArithmetic, // Disponível para análises estatísticas
      downwardVolatility,
      upsideVolatility,
      downsideVolatility,
      volatilityRatio,
      monthsAboveTarget,
      monthsBelowTarget,
      bestMonth: {
        return: maxReturn,
        competencia: filteredConsolidatedData[bestMonthIndex]?.Competencia || ''
      },
      worstMonth: {
        return: minReturn,
        competencia: filteredConsolidatedData[worstMonthIndex]?.Competencia || ''
      },
      hitRate: {
        homeRun,
        acerto,
        quaseLa,
        miss,
        hitRatePercent,
        positivePercent
      },
      targetMetrics: {
        avgTarget,
        targetVolatility
      }
    };
  }, [filteredConsolidatedData, clientTarget, marketData]);

  // Dados para o gráfico de Risco x Retorno - Estratégias + Carteira
  const riskReturnData = useMemo(() => {
    if (consolidadoData.length === 0 || !dadosData || dadosData.length === 0) return [];

    // 1. Calcular Risco x Retorno por Classe de Ativo (desde o início)
    const classeMap = new Map<string, { rendimentos: number[], posicoes: number[] }>();
    
    dadosData.forEach(item => {
      const classe = item["Classe do ativo"] || "Outros";
      if (!classeMap.has(classe)) {
        classeMap.set(classe, { rendimentos: [], posicoes: [] });
      }
      const data = classeMap.get(classe)!;
      data.rendimentos.push(item.Rendimento); // em decimal
      data.posicoes.push(item.Posicao);
    });

    const strategiesData = Array.from(classeMap.entries()).map(([classe, data]) => {
      // Retorno total acumulado (composto)
      let totalReturn = 1;
      data.rendimentos.forEach(r => {
        totalReturn *= (1 + r);
      });
      totalReturn = (totalReturn - 1) * 100; // em %
      
      // Volatilidade (desvio padrão dos retornos mensais em %)
      const returnsInPercent = data.rendimentos.map(r => r * 100);
      const avgReturn = returnsInPercent.reduce((sum, r) => sum + r, 0) / returnsInPercent.length;
      const variance = returnsInPercent.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returnsInPercent.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        name: classe,
        retorno: totalReturn,
        risco: stdDev,
        tipo: 'estrategia' as const
      };
    });

    // 2. Calcular Risco x Retorno da Carteira Total
    // Retorno total acumulado da carteira
    let portfolioTotalReturn = 1;
    consolidadoData.forEach(item => {
      portfolioTotalReturn *= (1 + item.Rendimento);
    });
    portfolioTotalReturn = (portfolioTotalReturn - 1) * 100; // em %
    
    // Volatilidade da carteira
    const portfolioReturns = consolidadoData.map(item => item.Rendimento * 100);
    const avgPortfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const portfolioVariance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - avgPortfolioReturn, 2), 0) / portfolioReturns.length;
    const portfolioStdDev = Math.sqrt(portfolioVariance);

    const portfolioData = {
      name: 'Carteira Total',
      retorno: portfolioTotalReturn,
      risco: portfolioStdDev,
      tipo: 'carteira' as const
    };

    return [...strategiesData, portfolioData];
  }, [consolidadoData, dadosData]);

  // Dados para correlação interativa (simulação de correlação entre meses)
  const correlationData = useMemo(() => {
    if (filteredConsolidatedData.length < 2) return [];
    
    return filteredConsolidatedData.slice(0, -1).map((item, index) => {
      const nextItem = filteredConsolidatedData[index + 1];
      return {
        current: item.Rendimento * 100,
        next: nextItem.Rendimento * 100,
        competencia: item.Competencia
      };
    });
  }, [filteredConsolidatedData]);

  // Dados para meses acima/abaixo da meta com meta mensal correta
  const targetComparisonData = useMemo(() => {
    return filteredConsolidatedData.map(item => {
      // Buscar a meta mensal correta para esta competência
      const marketDataForCompetencia = marketData?.find(m => m.competencia === item.Competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || clientTarget;
      
      return {
        competencia: item.Competencia,
        retorno: item.Rendimento * 100,
        meta: monthlyTarget * 100, // Meta específica do mês
        acimaMeta: item.Rendimento * 100 >= monthlyTarget * 100
      };
    });
  }, [filteredConsolidatedData, clientTarget, marketData]);

  // Métricas avançadas para insights analíticos
  const advancedMetrics = useMemo(() => {
    if (filteredConsolidatedData.length === 0) {
      return {
        longestPositiveStreak: 0,
        longestAboveTargetStreak: 0,
        last3MonthsHitRate: 0,
        last6MonthsHitRate: 0,
        targetDeviation: 0
      };
    }

    // Calcular sequências
    let currentPositiveStreak = 0;
    let longestPositiveStreak = 0;
    let currentAboveTargetStreak = 0;
    let longestAboveTargetStreak = 0;

    filteredConsolidatedData.forEach(item => {
      const marketDataForCompetencia = marketData?.find(m => m.competencia === item.Competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || clientTarget;

      // Sequência positiva
      if (item.Rendimento > 0) {
        currentPositiveStreak++;
        longestPositiveStreak = Math.max(longestPositiveStreak, currentPositiveStreak);
      } else {
        currentPositiveStreak = 0;
      }

      // Sequência acima da meta
      if (item.Rendimento >= monthlyTarget) {
        currentAboveTargetStreak++;
        longestAboveTargetStreak = Math.max(longestAboveTargetStreak, currentAboveTargetStreak);
      } else {
        currentAboveTargetStreak = 0;
      }
    });

    // Hit rate dos últimos 3 e 6 meses
    const last3Months = filteredConsolidatedData.slice(-3);
    const last6Months = filteredConsolidatedData.slice(-6);

    const last3MonthsAboveTarget = last3Months.filter(item => {
      const marketDataForCompetencia = marketData?.find(m => m.competencia === item.Competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || clientTarget;
      return item.Rendimento >= monthlyTarget;
    }).length;

    const last6MonthsAboveTarget = last6Months.filter(item => {
      const marketDataForCompetencia = marketData?.find(m => m.competencia === item.Competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || clientTarget;
      return item.Rendimento >= monthlyTarget;
    }).length;

    const last3MonthsHitRate = last3Months.length > 0 ? (last3MonthsAboveTarget / last3Months.length) * 100 : 0;
    const last6MonthsHitRate = last6Months.length > 0 ? (last6MonthsAboveTarget / last6Months.length) * 100 : 0;

    // Desvio padrão em relação à meta
    const deviations = filteredConsolidatedData.map(item => {
      const marketDataForCompetencia = marketData?.find(m => m.competencia === item.Competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || clientTarget;
      return (item.Rendimento - monthlyTarget) * 100;
    });

    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    const varianceDeviation = deviations.reduce((sum, d) => sum + Math.pow(d - avgDeviation, 2), 0) / deviations.length;
    const targetDeviation = Math.sqrt(varianceDeviation);

    return {
      longestPositiveStreak,
      longestAboveTargetStreak,
      last3MonthsHitRate,
      last6MonthsHitRate,
      targetDeviation
    };
  }, [filteredConsolidatedData, marketData, clientTarget]);

  // Cálculo de Drawdown com Pain Index baseado em retornos percentuais
  const drawdownAnalysis = useMemo(() => {
    if (filteredConsolidatedData.length === 0) return { drawdowns: [], maxPainIndex: 0, chartData: [] };
    
    // Calcular retorno acumulado (base 100)
    let cumulativeReturn = 100;
    const returnData = filteredConsolidatedData.map(item => {
      cumulativeReturn *= (1 + item.Rendimento);
      return {
        competencia: item.Competencia,
        patrimonio: item["Patrimonio Final"],
        rendimento: item.Rendimento,
        cumulativeReturn: cumulativeReturn
      };
    });
    
    // Detectar drawdowns baseado em retorno acumulado
    let peak = returnData[0].cumulativeReturn;
    let peakIndex = 0;
    const drawdowns: Array<{
      startCompetencia: string;
      endCompetencia: string;
      recoveryCompetencia: string | null;
      depth: number;
      durationMonths: number;
      recoveryMonths: number | null;
      painIndex: number;
    }> = [];
    
    let currentDrawdownStart: number | null = null;
    let currentDrawdownDepth = 0;
    let currentDrawdownEnd: number | null = null;
    const MIN_DRAWDOWN_DEPTH = 0.5; // Filtrar drawdowns menores que 0.5%
    
    returnData.forEach((item, index) => {
      const current = item.cumulativeReturn;
      
      if (current >= peak) {
        // Novo pico ou recuperação
        if (currentDrawdownStart !== null && currentDrawdownEnd !== null && currentDrawdownDepth >= MIN_DRAWDOWN_DEPTH) {
          const durationMonths = currentDrawdownEnd - currentDrawdownStart;
          const recoveryMonths = index - currentDrawdownEnd;
          const painIndex = (currentDrawdownDepth * durationMonths) / 100;
          
          drawdowns.push({
            startCompetencia: returnData[currentDrawdownStart].competencia,
            endCompetencia: returnData[currentDrawdownEnd].competencia,
            recoveryCompetencia: returnData[index].competencia,
            depth: currentDrawdownDepth,
            durationMonths: durationMonths,
            recoveryMonths: recoveryMonths,
            painIndex: painIndex
          });
        }
        
        peak = current;
        peakIndex = index;
        currentDrawdownStart = null;
        currentDrawdownDepth = 0;
        currentDrawdownEnd = null;
      } else {
        // Em drawdown
        if (currentDrawdownStart === null) {
          currentDrawdownStart = peakIndex;
        }
        
        const drawdownPercent = ((peak - current) / peak) * 100;
        if (drawdownPercent > currentDrawdownDepth) {
          currentDrawdownDepth = drawdownPercent;
          currentDrawdownEnd = index;
        }
      }
    });
    
    // Drawdown em andamento
    if (currentDrawdownStart !== null && currentDrawdownEnd !== null && currentDrawdownDepth >= MIN_DRAWDOWN_DEPTH) {
      const durationMonths = currentDrawdownEnd - currentDrawdownStart;
      const painIndex = (currentDrawdownDepth * durationMonths) / 100;
      
      drawdowns.push({
        startCompetencia: returnData[currentDrawdownStart].competencia,
        endCompetencia: returnData[currentDrawdownEnd].competencia,
        recoveryCompetencia: null,
        depth: currentDrawdownDepth,
        durationMonths: durationMonths,
        recoveryMonths: null,
        painIndex: painIndex
      });
    }
    
    // Calcular drawdown para o gráfico baseado em retorno acumulado
    let chartPeak = returnData[0].cumulativeReturn;
    const chartData = returnData.map(item => {
      if (item.cumulativeReturn > chartPeak) {
        chartPeak = item.cumulativeReturn;
      }
      const drawdownPercent = item.cumulativeReturn < chartPeak 
        ? ((chartPeak - item.cumulativeReturn) / chartPeak) * 100 
        : 0;
      
      return {
        competencia: item.competencia,
        patrimonio: item.patrimonio,
        rendimento: item.rendimento * 100,
        drawdownPercent: drawdownPercent
      };
    });
    
    const maxPainIndex = drawdowns.length > 0 
      ? Math.max(...drawdowns.map(d => d.painIndex))
      : 0;
    
    return { drawdowns, maxPainIndex, chartData };
  }, [filteredConsolidatedData]);

  const periodButtons = [
    { id: 'month', label: 'Mês' },
    { id: 'year', label: 'Ano' },
    { id: '12months', label: '12M' },
    { id: 'all', label: 'Ótimo' },
    { id: 'custom', label: 'Personalizado' }
  ];

  return (
    <div className="space-y-6">
      {/* Hit Rate Analysis - Novo Layout */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Target className="h-5 w-5" />
                Hit Rate Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Performance vs Meta</p>
            </div>
            
            {/* Period Selection */}
            <div className="flex items-center gap-1">
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
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="end">
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Competência Inicial</label>
                        <Select value={customStartCompetencia} onValueChange={setCustomStartCompetencia}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a competência inicial" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border z-50">
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
                          <SelectContent className="bg-background border-border z-50">
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
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Linha Superior - 3 Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Coluna 1: Hit Rate Geral */}
              <div className="flex items-center justify-center">
                <div className="relative text-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 rounded-2xl p-8 w-full shadow-xl hover:shadow-2xl transition-all duration-300">
                  {/* Ícone decorativo no topo */}
                  <div className="flex justify-center mb-3">
                    <div className="bg-primary/20 p-3 rounded-full">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium tracking-wider uppercase">Hit Rate Geral</p>
                  <p className="text-7xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-4 tracking-tight">
                    {riskMetrics.hitRate.hitRatePercent}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground text-lg">{riskMetrics.hitRate.homeRun + riskMetrics.hitRate.acerto}</span>
                    {' '}de{' '}
                    <span className="font-semibold text-foreground text-lg">{filteredConsolidatedData.length}</span>
                    {' '}meses atingiram a meta
                  </p>
                </div>
              </div>

              {/* Coluna 2: Distribuição de Performance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-foreground/70" />
                  <h3 className="text-sm font-bold text-foreground">Distribuição de Performance</h3>
                </div>
                
                {/* Home Run */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success/10 to-transparent border border-success/20 rounded-xl hover:from-success/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-success/20 p-2 rounded-lg">
                      <Rocket className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Home Run</p>
                      <p className="text-xs text-muted-foreground">Acima da meta</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">{riskMetrics.hitRate.homeRun}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredConsolidatedData.length > 0 
                        ? Math.round((riskMetrics.hitRate.homeRun / filteredConsolidatedData.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Acerto */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl hover:from-primary/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Acerto</p>
                      <p className="text-xs text-muted-foreground">Dentro da meta</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{riskMetrics.hitRate.acerto}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredConsolidatedData.length > 0 
                        ? Math.round((riskMetrics.hitRate.acerto / filteredConsolidatedData.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Quase lá */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/10 to-transparent border border-warning/20 rounded-xl hover:from-warning/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-warning/20 p-2 rounded-lg">
                      <TrendingUpIcon className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Quase lá</p>
                      <p className="text-xs text-muted-foreground">Próximo da meta</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-warning">{riskMetrics.hitRate.quaseLa}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredConsolidatedData.length > 0 
                        ? Math.round((riskMetrics.hitRate.quaseLa / filteredConsolidatedData.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Miss */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-destructive/10 to-transparent border border-destructive/20 rounded-xl hover:from-destructive/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-destructive/20 p-2 rounded-lg">
                      <X className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Miss</p>
                      <p className="text-xs text-muted-foreground">Abaixo da meta</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-destructive">{riskMetrics.hitRate.miss}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredConsolidatedData.length > 0 
                        ? Math.round((riskMetrics.hitRate.miss / filteredConsolidatedData.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Métricas Adicionais */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-foreground/70" />
                  <h3 className="text-sm font-bold text-foreground">Métricas Adicionais</h3>
                </div>
                
                {/* Melhor Mês */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success/10 to-transparent border border-success/20 rounded-xl hover:from-success/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-success/20 p-2 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Melhor Mês</p>
                      <p className="text-xs text-muted-foreground">{riskMetrics.bestMonth.competencia}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">+{riskMetrics.bestMonth.return.toFixed(2)}%</p>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-success/40 text-success font-semibold tracking-wide">RECORDE</Badge>
                  </div>
                </div>
                
                {/* Pior Mês */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-destructive/10 to-transparent border border-destructive/20 rounded-xl hover:from-destructive/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-destructive/20 p-2 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pior Mês</p>
                      <p className="text-xs text-muted-foreground">{riskMetrics.worstMonth.competencia}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-destructive">{riskMetrics.worstMonth.return.toFixed(2)}%</p>
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold tracking-wide">PISO</Badge>
                  </div>
                </div>
                
                {/* Consistência */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/10 to-transparent border border-warning/20 rounded-xl hover:from-warning/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-warning/20 p-2 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Consistência</p>
                      <p className="text-xs text-muted-foreground">meses positivos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-warning">{riskMetrics.hitRate.positivePercent}%</p>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-warning/40 text-warning font-semibold tracking-wide">ESTÁVEL</Badge>
                  </div>
                </div>
                
                {/* Acima da Meta */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl hover:from-primary/15 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Acima da Meta</p>
                      <p className="text-xs text-muted-foreground">{riskMetrics.hitRate.hitRatePercent}% do período</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{riskMetrics.hitRate.homeRun + riskMetrics.hitRate.acerto}</p>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold tracking-wide">META</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico Central - Performance Mensal */}
            <div className="bg-background/50 rounded-xl p-8 border-2 border-border/40 shadow-lg">
              <h3 className="text-base font-semibold text-foreground mb-6">Performance Mensal vs Meta</h3>
              <ResponsiveContainer width="100%" height={550}>
                <ComposedChart 
                  data={(() => {
                    return targetComparisonData.map(entry => {
                      const marketDataForCompetencia = marketData?.find(m => m.competencia === entry.competencia);
                      const monthlyTarget = (marketDataForCompetencia?.clientTarget || clientTarget) * 100;
                      const volatility = riskMetrics.targetMetrics.targetVolatility;
                      const homeRunThreshold = monthlyTarget + volatility;
                      
                      let categoria: 'homeRun' | 'acerto' | 'quaseLa' | 'miss';
                      
                      if (entry.retorno >= homeRunThreshold) {
                        categoria = 'homeRun';
                      } else if (entry.retorno >= monthlyTarget) {
                        categoria = 'acerto';
                      } else if (entry.retorno > 0) {
                        categoria = 'quaseLa';
                      } else {
                        categoria = 'miss';
                      }
                      
                      return {
                        competencia: entry.competencia,
                        metaValue: monthlyTarget,
                        realizadoValue: entry.retorno,
                        categoria: categoria
                      };
                    });
                  })()} 
                  margin={{ top: 20, right: 20, left: 0, bottom: 80 }}
                  barGap={-50}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="competencia" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      
                      const data = payload[0].payload;
                      const diferenca = data.realizadoValue - data.metaValue;
                      
                      return (
                        <div className="bg-background/95 backdrop-blur-md border-2 border-border rounded-xl p-4 shadow-xl">
                          <p className="font-bold text-foreground mb-2">{label}</p>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">Meta:</span>
                              <span className="font-semibold text-[hsl(45,60%,50%)]">
                                {data.metaValue.toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">Realizado:</span>
                              <span className={`font-semibold ${
                                data.categoria === 'homeRun' ? 'text-[hsl(142,60%,45%)]' :
                                data.categoria === 'acerto' ? 'text-[hsl(215,65%,55%)]' :
                                data.categoria === 'quaseLa' ? 'text-[hsl(40,75%,50%)]' :
                                'text-[hsl(0,65%,55%)]'
                              }`}>
                                {data.realizadoValue.toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                              <span className="text-sm text-muted-foreground">Diferença:</span>
                              <span className={`font-bold ${diferenca >= 0 ? 'text-[hsl(142,60%,45%)]' : 'text-[hsl(0,65%,55%)]'}`}>
                                {diferenca >= 0 ? '+' : ''}{diferenca.toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <Badge variant={
                                data.categoria === 'homeRun' ? 'default' :
                                data.categoria === 'acerto' ? 'secondary' :
                                data.categoria === 'quaseLa' ? 'outline' :
                                'destructive'
                              } className="text-xs">
                                {data.categoria === 'homeRun' ? '🚀 Home Run' :
                                 data.categoria === 'acerto' ? '✓ Acerto' :
                                 data.categoria === 'quaseLa' ? '⚠ Quase lá' :
                                 '✗ Miss'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  
                  <ReferenceLine 
                    y={0}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1.5}
                  />
                  
              <Bar 
                dataKey="metaValue"
                fill="hsl(45, 60%, 75%)"
                radius={[8, 8, 8, 8]}
                maxBarSize={60}
                opacity={0.5}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              />
                  
              <Bar 
                dataKey="realizadoValue"
                radius={[8, 8, 8, 8]}
                maxBarSize={60}
                animationBegin={200}
                animationDuration={800}
                animationEasing="ease-out"
              >
                    {targetComparisonData.map((entry, index) => {
                      const marketDataForCompetencia = marketData?.find(m => m.competencia === entry.competencia);
                      const monthlyTarget = marketDataForCompetencia?.clientTarget 
                        ? (marketDataForCompetencia.clientTarget * 100)
                        : clientTarget 
                          ? (clientTarget * 100) 
                          : 0;
                      const volatility = riskMetrics.targetMetrics.targetVolatility;
                      const homeRunThreshold = monthlyTarget + volatility;
                      
                      let color;
                      
                      if (entry.retorno >= homeRunThreshold) {
                        color = 'hsl(142, 60%, 55%)';
                      } else if (entry.retorno >= monthlyTarget) {
                        color = 'hsl(215, 65%, 65%)';
                      } else if (entry.retorno > 0) {
                        color = 'hsl(40, 75%, 65%)';
                      } else {
                        color = 'hsl(0, 65%, 65%)';
                      }
                      
                      return (
                        <Cell 
                          key={`realizado-${index}`} 
                          fill={color}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              
              {/* Legenda Visual */}
              <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[hsl(45,60%,75%)] border border-[hsl(45,60%,60%)]"></div>
                  <span className="text-xs text-muted-foreground font-medium">Meta</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[hsl(142,60%,55%)]"></div>
                  <span className="text-xs text-muted-foreground font-medium">🚀 Home Run</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[hsl(215,65%,65%)]"></div>
                  <span className="text-xs text-muted-foreground font-medium">✓ Acerto</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[hsl(40,75%,65%)]"></div>
                  <span className="text-xs text-muted-foreground font-medium">⚠ Quase lá</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[hsl(0,65%,65%)]"></div>
                  <span className="text-xs text-muted-foreground font-medium">✗ Miss</span>
                </div>
              </div>
            </div>

            {/* Bloco Inferior - Métricas em Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="group bg-gradient-to-br from-success/5 to-success/10 border-2 border-success/20 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-success/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-success/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <Badge variant="outline" className="border-success/30 text-success text-[10px] uppercase tracking-wider">
                    Recorde
                  </Badge>
                </div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Melhor Mês
                </h3>
                <p className="text-4xl font-bold text-success mb-1 tabular-nums">
                  +{riskMetrics.bestMonth.return.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {riskMetrics.bestMonth.competencia}
                </p>
              </div>
              
              <div className="group bg-gradient-to-br from-destructive/5 to-destructive/10 border-2 border-destructive/20 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-destructive/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-destructive/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                  <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] uppercase tracking-wider">
                    Piso
                  </Badge>
                </div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Pior Mês
                </h3>
                <p className="text-4xl font-bold text-destructive mb-1 tabular-nums">
                  {riskMetrics.worstMonth.return.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {riskMetrics.worstMonth.competencia}
                </p>
              </div>
              
              <div className="group bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase tracking-wider">
                    Estável
                  </Badge>
                </div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Consistência
                </h3>
                <p className="text-4xl font-bold text-foreground mb-1 tabular-nums">
                  {riskMetrics.hitRate.positivePercent}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  meses positivos
                </p>
              </div>
              
              <div className="group bg-gradient-to-br from-success/5 to-success/10 border-2 border-success/20 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-success/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-success/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-6 w-6 text-success" />
                  </div>
                  <Badge variant="outline" className="border-success/30 text-success text-[10px] uppercase tracking-wider">
                    Meta
                  </Badge>
                </div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Acima da Meta
                </h3>
                <p className="text-4xl font-bold text-success mb-1 tabular-nums">
                  {riskMetrics.monthsAboveTarget}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {filteredConsolidatedData.length > 0 
                    ? Math.round((riskMetrics.monthsAboveTarget / filteredConsolidatedData.length) * 100)
                    : 0}% do período
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Volatilidade */}
      <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="text-foreground text-xl font-semibold">
                Volatilidade da Carteira
              </CardTitle>
            </div>
            
            {/* Period Selection and Indicators */}
            <div className="flex items-center gap-2">
              {/* Indicators Selector */}
              <Popover open={showIndicators} onOpenChange={setShowIndicators}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Indicadores
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 bg-background border-border z-50" align="end">
                  <div className="space-y-3 p-2">
                    <h4 className="font-medium text-sm">Selecionar Curvas</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="portfolio" 
                          checked={selectedIndicators.portfolio}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, portfolio: checked as boolean }))
                          }
                        />
                        <label htmlFor="portfolio" className="text-sm">Retorno Acumulado</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="media" 
                          checked={selectedIndicators.media}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, media: checked as boolean }))
                          }
                        />
                        <label htmlFor="media" className="text-sm">Meta Acumulada</label>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <h4 className="font-medium text-sm">Desvios Padrão</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={desviosPadraoTipo === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDesviosPadraoTipo(1)}
                          className="text-xs flex-1"
                        >
                          ±1σ
                        </Button>
                        <Button
                          variant={desviosPadraoTipo === 2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDesviosPadraoTipo(2)}
                          className="text-xs flex-1"
                        >
                          ±2σ
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-1">
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
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="end">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Competência Inicial</label>
                          <Select value={customStartCompetencia} onValueChange={setCustomStartCompetencia}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a competência inicial" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border z-50">
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
                            <SelectContent className="bg-background border-border z-50">
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
              <ComposedChart
                data={(() => {
                  // Add zero starting point
                  if (filteredConsolidatedData.length === 0) return [];
                  
                  const [firstMonth, firstYear] = filteredConsolidatedData[0].Competencia.split('/');
                  const firstDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, 1);
                  const previousMonth = new Date(firstDate);
                  previousMonth.setMonth(previousMonth.getMonth() - 1);
                  
                  const startPoint = {
                    name: `${previousMonth.toLocaleDateString('pt-BR', { month: '2-digit' })}/${previousMonth.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
                    retornoAcumulado: 0,
                    mediaAcumulada: 0,
                    plus1sd: 0,
                    minus1sd: 0,
                    plus2sd: 0,
                    minus2sd: 0,
                    assimetriaVariacao: 0
                  };
                  
                  let accumulatedReturn = 0;
                  let accumulatedUpsideVol = 0;
                  let accumulatedDownsideVol = 0;
                  const monthReturns: number[] = [];
                  let previousAssimetria = 0; // Para calcular variação
                  
                  const dataPoints = filteredConsolidatedData.map((item, index) => {
                    const monthReturn = item.Rendimento * 100;
                    
                    // Retorno acumulado composto
                    accumulatedReturn = (1 + accumulatedReturn / 100) * (1 + monthReturn / 100) - 1;
                    accumulatedReturn = accumulatedReturn * 100;
                    
                    monthReturns.push(monthReturn);
                    
                    // === CÁLCULO BASEADO NA META DE RETORNO ===
                    
                    // Coletar todas as metas até o período atual
                    const allTargets: number[] = [];
                    for (let i = 0; i <= index; i++) {
                      const comp = filteredConsolidatedData[i].Competencia;
                      const mData = marketData.find(m => m.competencia === comp);
                      const target = mData?.clientTarget || clientTarget;
                      allTargets.push(target * 100); // Em %
                    }
                    
                    // 1. MÉDIA DAS METAS DE RETORNO
                    const avgTarget = allTargets.reduce((sum, t) => sum + t, 0) / allTargets.length;
                    
                    // 2. DESVIO PADRÃO DAS METAS DE RETORNO
                    const targetVariance = allTargets.reduce((sum, t) => sum + Math.pow(t - avgTarget, 2), 0) / allTargets.length;
                    const targetStdDev = Math.sqrt(targetVariance);
                    
                    // 3. META ACUMULADA (composta) - linha de referência
                    let targetAccumulated = 0;
                    for (let i = 0; i <= index; i++) {
                      const comp = filteredConsolidatedData[i].Competencia;
                      const mData = marketData.find(m => m.competencia === comp);
                      const target = mData?.clientTarget || clientTarget;
                      targetAccumulated = (1 + targetAccumulated / 100) * (1 + target * 100 / 100) - 1;
                      targetAccumulated = targetAccumulated * 100;
                    }
                    
                    // 4. BANDAS DE DESVIO PADRÃO BASEADAS NA META
                    // Usar o desvio padrão das metas multiplicado pelo número de períodos (para escala acumulada)
                    const scaledStdDev = targetStdDev * Math.sqrt(index + 1);
                    
                    const sigma_alta = scaledStdDev;
                    const sigma_baixa = scaledStdDev * 1.2; // Assimetria: downside mais amplo
                    
                    // 5. ÍNDICE DE ASSIMETRIA E SUA VARIAÇÃO
                    const assimetria = ((sigma_baixa - sigma_alta) / sigma_alta) * 100; // % de assimetria
                    const assimetriaVariacao = index === 0 ? 0 : assimetria - previousAssimetria; // Variação período a período
                    previousAssimetria = assimetria;
                    
                    const [month, year] = item.Competencia.split('/');
                    const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    
                    return {
                      name: `${competenciaDate.toLocaleDateString('pt-BR', { month: '2-digit' })}/${competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
                      retornoAcumulado: accumulatedReturn,
                      mediaAcumulada: targetAccumulated,
                      // Bandas baseadas nos desvios da meta
                      plus1sd: targetAccumulated + sigma_alta,
                      minus1sd: targetAccumulated - sigma_baixa,
                      plus2sd: targetAccumulated + (2 * sigma_alta),
                      minus2sd: targetAccumulated - (2 * sigma_baixa),
                      // Métricas adicionais para análise
                      sigma_alta,
                      sigma_baixa,
                      assimetria,
                      assimetriaVariacao,
                      avgTarget,
                      targetStdDev
                    };
                  });
                  
                  return [startPoint, ...dataPoints];
                })()}
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
                    const labels: Record<string, string> = {
                      'retornoAcumulado': 'Retorno Acumulado',
                      'mediaAcumulada': 'Meta Acumulada',
                      'plus1sd': 'Meta + 1σ',
                      'minus1sd': 'Meta - 1σ',
                      'plus2sd': 'Meta + 2σ',
                      'minus2sd': 'Meta - 2σ',
                      'sigma_alta': 'σ da Meta (upside)',
                      'sigma_baixa': 'σ da Meta (downside)',
                      'assimetria': 'Índice de Assimetria',
                      'assimetriaVariacao': 'Variação de Assimetria',
                      'avgTarget': 'Média da Meta',
                      'targetStdDev': 'Desvio Padrão da Meta'
                    };
                    
                    if (name === 'assimetria' || name === 'assimetriaVariacao') {
                      return [`${Number(value).toFixed(1)}%`, labels[name]];
                    }
                    return [`${Number(value).toFixed(2)}%`, labels[name] || name];
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                />
                
                {/* Área entre os desvios padrão - pintada de cinza */}
                {desviosPadraoTipo === 1 && (
                  <Area
                    type="monotone"
                    dataKey="plus1sd"
                    stroke="none"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.1}
                  />
                )}
                {desviosPadraoTipo === 1 && (
                  <Area
                    type="monotone"
                    dataKey="minus1sd"
                    stroke="none"
                    fill="hsl(var(--background))"
                    fillOpacity={1}
                  />
                )}
                {desviosPadraoTipo === 2 && (
                  <Area
                    type="monotone"
                    dataKey="plus2sd"
                    stroke="none"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.1}
                  />
                )}
                {desviosPadraoTipo === 2 && (
                  <Area
                    type="monotone"
                    dataKey="minus2sd"
                    stroke="none"
                    fill="hsl(var(--background))"
                    fillOpacity={1}
                  />
                )}
                
                {/* Linhas de desvio padrão - mostrar apenas o selecionado */}
                {desviosPadraoTipo === 1 && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="plus1sd" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Meta + 1σ"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minus1sd" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Meta - 1σ"
                    />
                  </>
                )}
                {desviosPadraoTipo === 2 && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="plus2sd" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Meta + 2σ"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minus2sd" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Meta - 2σ"
                    />
                  </>
                )}
                
                {selectedIndicators.media && (
                  <Line 
                    type="monotone" 
                    dataKey="mediaAcumulada" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    dot={false}
                    name="Meta Acumulada"
                  />
                )}
                
                {/* Linha de retorno acumulado da carteira - linha principal com ênfase */}
                {selectedIndicators.portfolio && (
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
                    name="Retorno Acumulado"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Cards de métricas integrados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Coluna 1: Retornos */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Retorno Médio</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{riskMetrics.avgReturn.toFixed(2)}%</p>
                <Badge 
                  variant="outline" 
                  className={
                    riskMetrics.avgReturn >= 1 
                      ? "bg-success/10 text-success border-success/20 text-xs" 
                      : "bg-muted/10 text-muted-foreground border-muted/20 text-xs"
                  }
                >
                  {riskMetrics.avgReturn >= 1 ? '↑' : '↓'}
                </Badge>
              </div>
            </div>
            
            {/* Coluna 2: Volatilidade Total */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{riskMetrics.volatility.toFixed(2)}%</p>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                  Mensal
                </Badge>
              </div>
            </div>
            
            {/* Coluna 3: Volatilidade Positiva */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Positiva (Upside)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {riskMetrics.upsideVolatility.toFixed(2)}%
                </p>
                <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            {/* Linha 2 - Coluna 1: Retorno Médio da Meta */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Retorno Médio da Meta</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{riskMetrics.targetMetrics.avgTarget.toFixed(2)}%</p>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Linha 2 - Coluna 2: Volatilidade da Meta */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade da Meta</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{riskMetrics.targetMetrics.targetVolatility.toFixed(2)}%</p>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Linha 2 - Coluna 3: Volatilidade Negativa */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Negativa (Downside)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-destructive">
                  {riskMetrics.downsideVolatility.toFixed(2)}%
                </p>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </div>
          
          {/* Volatilidade Assimétrica - Análise */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 border border-border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Análise de Volatilidade Assimétrica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Razão Upside/Downside</p>
                      <p className="text-xl font-bold text-foreground">{riskMetrics.volatilityRatio.toFixed(2)}x</p>
                    </div>
                    <Badge 
                      variant={riskMetrics.volatilityRatio > 1 ? "default" : "secondary"}
                      className={riskMetrics.volatilityRatio > 1 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
                        : ""}
                    >
                      {riskMetrics.volatilityRatio > 1 ? 'Positivo' : 'Cauteloso'}
                    </Badge>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-card/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium">Quando ganha</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive"></div>
                      <span className="text-xs font-medium">Quando perde</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-sm text-foreground">
                    {riskMetrics.volatilityRatio > 1.2 ? (
                      <>
                        Sua volatilidade positiva é <strong>{riskMetrics.upsideVolatility.toFixed(2)}%</strong> e 
                        negativa é <strong>{riskMetrics.downsideVolatility.toFixed(2)}%</strong>. 
                        <span className="text-green-600 dark:text-green-400 font-medium"> Isso significa que quando ganha, 
                        ganha forte, mas quando perde, perde controlado.</span> Um perfil ideal para crescimento com risco gerenciado.
                      </>
                    ) : riskMetrics.volatilityRatio > 0.8 ? (
                      <>
                        Sua volatilidade positiva é <strong>{riskMetrics.upsideVolatility.toFixed(2)}%</strong> e 
                        negativa é <strong>{riskMetrics.downsideVolatility.toFixed(2)}%</strong>. 
                        Sua carteira apresenta um perfil <strong>equilibrado</strong>, com ganhos e perdas em magnitudes similares.
                      </>
                    ) : (
                      <>
                        Sua volatilidade positiva é <strong>{riskMetrics.upsideVolatility.toFixed(2)}%</strong> e 
                        negativa é <strong>{riskMetrics.downsideVolatility.toFixed(2)}%</strong>. 
                        <span className="text-amber-600 dark:text-amber-400 font-medium"> Quando ganha, ganha moderado, 
                        mas quando perde, a queda é mais acentuada.</span> Considere estratégias de proteção de capital.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Risco x Retorno - Estratégias */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div>
            <CardTitle className="text-foreground">Risco x Retorno das Estratégias</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Análise desde o início por classe de ativo</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground font-medium">Carteira Total</span>
            </div>
            {riskReturnData.filter(d => d.tipo === 'estrategia').slice(0, 8).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    backgroundColor: `hsl(${(idx * 360) / 8}, 70%, 55%)` 
                  }}
                ></div>
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
          
          <ResponsiveContainer width="100%" height={450}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                type="number" 
                dataKey="risco" 
                name="Risco" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ 
                  value: 'Risco (Volatilidade) %', 
                  position: 'insideBottom', 
                  offset: -15, 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 13,
                  fontWeight: 600
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="number" 
                dataKey="retorno" 
                name="Retorno" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ 
                  value: 'Retorno Total %', 
                  angle: -90, 
                  position: 'insideLeft', 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 13,
                  fontWeight: 600,
                  offset: -10
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ fontWeight: 600, marginBottom: '8px', color: 'hsl(var(--foreground))' }}
                formatter={(value: any, name: string) => {
                  if (name === 'risco') return [`${Number(value).toFixed(2)}%`, 'Volatilidade'];
                  if (name === 'retorno') return [`${Number(value).toFixed(2)}%`, 'Retorno Total'];
                  return [value, name];
                }}
              />
              
              {/* Scatter das Estratégias */}
              {riskReturnData.filter(d => d.tipo === 'estrategia').map((strategy, idx) => (
                <Scatter 
                  key={strategy.name}
                  name={strategy.name}
                  data={[strategy]}
                  fill={`hsl(${(idx * 360) / riskReturnData.filter(d => d.tipo === 'estrategia').length}, 70%, 55%)`}
                  shape="circle"
                >
                  <Cell 
                    fill={`hsl(${(idx * 360) / riskReturnData.filter(d => d.tipo === 'estrategia').length}, 70%, 55%)`}
                    r={8}
                  />
                </Scatter>
              ))}
              
              {/* Scatter da Carteira - Destaque */}
              <Scatter 
                name="Carteira Total"
                data={riskReturnData.filter(d => d.tipo === 'carteira')}
                fill="hsl(var(--primary))"
                shape="diamond"
              >
                <Cell fill="hsl(var(--primary))" r={12} stroke="hsl(var(--background))" strokeWidth={3} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Meses Acima/Abaixo da Meta */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Retornos vs Meta de {(clientTarget * 100).toFixed(2)}%</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={targetComparisonData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="competencia" 
                stroke="hsl(var(--muted-foreground))"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" unit="%" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`]}
              />
              <Bar dataKey="retorno" radius={[8, 8, 0, 0]}>
                {targetComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.acimaMeta ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="meta" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Analysis Chart */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Análise de Drawdown
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Quedas máximas e tempo de recuperação</p>
            </div>
            
            {/* Period Selection */}
            <div className="flex items-center gap-1">
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
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="end">
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Competência Inicial</label>
                        <Select value={customStartCompetencia} onValueChange={setCustomStartCompetencia}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a competência inicial" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border z-50">
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
                          <SelectContent className="bg-background border-border z-50">
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
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Drawdown Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownAnalysis.chartData}>
                  <defs>
                    <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="competencia" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    reversed={true}
                    domain={[0, 'dataMax']}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    label={{ 
                      value: 'Drawdown (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'drawdownPercent' && Number(value) > 0) {
                        return [`-${Number(value).toFixed(2)}%`, 'Queda no Mês'];
                      }
                      if (name === 'rendimento') {
                        return [`${Number(value).toFixed(2)}%`, 'Rendimento'];
                      }
                      return [value, name];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="drawdownPercent" 
                    stroke="hsl(var(--destructive))" 
                    fill="url(#drawdownGradient)"
                    strokeWidth={2.5}
                    name="Drawdown"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Drawdown Events Table */}
            {drawdownAnalysis.drawdowns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground">Eventos de Drawdown</h4>
                <div className="space-y-3">
                  {drawdownAnalysis.drawdowns
                    .sort((a, b) => {
                      // Sort by start date, most recent first
                      const [monthA, yearA] = a.startCompetencia.split('/').map(Number);
                      const [monthB, yearB] = b.startCompetencia.split('/').map(Number);
                      const dateA = new Date(2000 + yearA, monthA - 1);
                      const dateB = new Date(2000 + yearB, monthB - 1);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((dd, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {dd.depth.toFixed(2)}% Queda
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Pain Index: {dd.painIndex.toFixed(2)}
                          </Badge>
                        </div>
                        {dd.recoveryCompetencia ? (
                          <Badge variant="default" className="text-xs bg-green-500/20 text-green-600 dark:text-green-400">
                            Recuperado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Em andamento
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Início</p>
                          <p className="font-medium">{formatCompetenciaDisplay(dd.startCompetencia)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Fundo</p>
                          <p className="font-medium">{formatCompetenciaDisplay(dd.endCompetencia)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Duração</p>
                          <p className="font-medium">{dd.durationMonths} {dd.durationMonths === 1 ? 'mês' : 'meses'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Recuperação</p>
                          <p className="font-medium">
                            {dd.recoveryMonths !== null 
                              ? `${dd.recoveryMonths} ${dd.recoveryMonths === 1 ? 'mês' : 'meses'}`
                              : 'Aguardando'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {dd.recoveryCompetencia && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            Recuperado em: <span className="font-medium text-foreground">{formatCompetenciaDisplay(dd.recoveryCompetencia)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {drawdownAnalysis.drawdowns.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Mostrando {drawdownAnalysis.drawdowns.length} {drawdownAnalysis.drawdowns.length === 1 ? 'evento' : 'eventos'} de drawdown
                  </p>
                )}
              </div>
            )}

            {/* Pain Index Explanation */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">Pain Index</h4>
                  <p className="text-xs text-muted-foreground">
                    Métrica que combina a profundidade da queda com o tempo total (duração + recuperação). 
                    Fórmula: (Profundidade % × Meses Totais) / 100
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Quanto maior o Pain Index, mais severo foi o drawdown. Um drawdown de -15% que recupera em 3 meses 
                    tem Pain Index menor que um de -10% que leva 18 meses para recuperar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Correlação Interativa */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Correlação Mensal (Mês Atual vs Próximo Mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="current" 
                name="Retorno Atual" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Retorno Mês Atual (%)', position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="number" 
                dataKey="next" 
                name="Próximo Retorno" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Retorno Próximo Mês (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`]}
              />
              <Scatter 
                name="Correlação" 
                data={correlationData} 
                fill="hsl(var(--accent))"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Beta & Alpha Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" />
            Beta & Alpha Acumulado
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Volatilidade relativa e retorno excedente desde o início
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            // Usar todos os dados consolidados (acumulado desde o início)
            const portfolioReturns = consolidatedData.map(item => item.Rendimento * 100);
            const targetReturns: number[] = [];
            
            consolidatedData.forEach((item) => {
              const mData = marketData.find(m => m.competencia === item.Competencia);
              const target = mData?.clientTarget || clientTarget;
              targetReturns.push(target * 100);
            });

            if (portfolioReturns.length < 2) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  Dados insuficientes para cálculo de Beta e Alpha
                </div>
              );
            }

            // Cálculo de médias
            const avgPortfolio = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
            const avgTarget = targetReturns.reduce((a, b) => a + b, 0) / targetReturns.length;

            // Volatilidade (desvio padrão) da carteira
            const portfolioVariance = portfolioReturns.reduce((sum, r) => 
              sum + Math.pow(r - avgPortfolio, 2), 0) / portfolioReturns.length;
            const portfolioVolatility = Math.sqrt(portfolioVariance);

            // Volatilidade (desvio padrão) da meta
            const targetVariance = targetReturns.reduce((sum, r) => 
              sum + Math.pow(r - avgTarget, 2), 0) / targetReturns.length;
            const targetVolatility = Math.sqrt(targetVariance);

            // Beta = Volatilidade da Carteira / Volatilidade da Meta
            const beta = targetVolatility !== 0 ? portfolioVolatility / targetVolatility : 0;

            // Alpha = Retorno Médio da Carteira - Retorno Médio da Meta
            const alpha = avgPortfolio - avgTarget;

            // Retorno acumulado total
            const totalPortfolioReturn = portfolioReturns.reduce((product, r) => 
              product * (1 + r / 100), 1) - 1;
            const totalTargetReturn = targetReturns.reduce((product, r) => 
              product * (1 + r / 100), 1) - 1;
            const totalExcess = totalPortfolioReturn - totalTargetReturn;

            return (
              <div className="space-y-6">
                {/* Métricas Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 rounded-lg border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold text-foreground">Beta (β)</h4>
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-5xl font-bold text-foreground mb-4">
                      {beta.toFixed(3)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Volatilidade Carteira</span>
                        <span className="font-semibold text-foreground">{portfolioVolatility.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Volatilidade Meta</span>
                        <span className="font-semibold text-foreground">{targetVolatility.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Relação (β)</span>
                        <span className="font-bold text-blue-600">{beta.toFixed(3)}x</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        {beta > 1.2 && '⚠️ Carteira significativamente mais volátil que a meta'}
                        {beta >= 0.8 && beta <= 1.2 && '✓ Volatilidade similar à meta'}
                        {beta < 0.8 && '✓ Carteira mais estável que a meta'}
                      </p>
                      {beta > 1 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          A carteira amplifica os movimentos da meta em {((beta - 1) * 100).toFixed(0)}%
                        </p>
                      )}
                      {beta < 1 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          A carteira amortece os movimentos da meta em {((1 - beta) * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`p-8 rounded-lg border-2 ${
                    alpha >= 0 
                      ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5' 
                      : 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold text-foreground">Alpha (α)</h4>
                      <Rocket className={`w-6 h-6 ${alpha >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div className={`text-5xl font-bold mb-4 ${alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Retorno Médio Carteira</span>
                        <span className="font-semibold text-foreground">{avgPortfolio.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Retorno Médio Meta</span>
                        <span className="font-semibold text-foreground">{avgTarget.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Diferença (α)</span>
                        <span className={`font-bold ${alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        {alpha >= 1 && '✓ Excelente geração de valor acima da meta'}
                        {alpha >= 0 && alpha < 1 && '✓ Performance positiva acima da meta'}
                        {alpha < 0 && alpha >= -1 && '○ Leve underperformance vs meta'}
                        {alpha < -1 && '⚠️ Underperformance significativa'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Retorno excedente médio de {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}% por período
                      </p>
                    </div>
                  </div>
                </div>

                {/* Retorno Acumulado Total */}
                <div className="p-6 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Retorno Acumulado Total ({consolidatedData.length} períodos)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Carteira</p>
                      <p className="text-2xl font-bold text-foreground">
                        {(totalPortfolioReturn * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meta</p>
                      <p className="text-2xl font-bold text-foreground">
                        {(totalTargetReturn * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Excesso Acumulado</p>
                      <p className={`text-2xl font-bold ${totalExcess >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalExcess >= 0 ? '+' : ''}{(totalExcess * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Explicações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">O que é Beta?</h5>
                    <p className="text-xs text-muted-foreground">
                      Beta mede a volatilidade relativa da carteira em relação à meta. 
                      É calculado como: <strong>β = σ_carteira / σ_meta</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>β = 1: mesma volatilidade da meta</li>
                      <li>β {'>'} 1: mais volátil que a meta</li>
                      <li>β {'<'} 1: menos volátil que a meta</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">O que é Alpha?</h5>
                    <p className="text-xs text-muted-foreground">
                      Alpha representa o retorno excedente médio da carteira em relação à meta. 
                      É calculado como: <strong>α = Retorno_médio_carteira - Retorno_médio_meta</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>α {'>'} 0: superando a meta</li>
                      <li>α = 0: performance igual à meta</li>
                      <li>α {'<'} 0: abaixo da meta</li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Card 11: Correlação Entre Estratégias */}
      <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Activity className="w-6 h-6 text-primary" />
            Correlação Entre Estratégias
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {(() => {
            if (!dadosData || dadosData.length === 0) {
              return <p className="text-muted-foreground">Dados insuficientes para análise de correlação entre estratégias</p>;
            }

            // Estado local para seleção interativa
            const [selectedStrategy1, setSelectedStrategy1] = useState<string>('');
            const [selectedStrategy2, setSelectedStrategy2] = useState<string>('');
            const [minCorrelation, setMinCorrelation] = useState<number>(-1);
            const [maxCorrelation, setMaxCorrelation] = useState<number>(1);

            // Obter lista de estratégias únicas dos dados
            const strategies = Array.from(new Set(dadosData.map(d => d["Classe do ativo"]))).sort();

            // Calcular retornos por estratégia e competência
            const strategyReturns = new Map<string, Map<string, number>>();
            
            dadosData.forEach(item => {
              const strategy = item["Classe do ativo"];
              const competencia = item.Competencia;
              const rendimento = item.Rendimento;

              if (!strategyReturns.has(strategy)) {
                strategyReturns.set(strategy, new Map());
              }
              
              const currentMap = strategyReturns.get(strategy)!;
              if (!currentMap.has(competencia)) {
                currentMap.set(competencia, 0);
              }
              
              // Acumular rendimento ponderado pela posição
              const currentValue = currentMap.get(competencia)!;
              currentMap.set(competencia, currentValue + (rendimento * item.Posicao));
            });

            // Normalizar por posição total
            const strategyData = new Map<string, number[]>();
            const competencias = Array.from(new Set(dadosData.map(d => d.Competencia))).sort();

            strategies.forEach(strategy => {
              const returns: number[] = [];
              const stratMap = strategyReturns.get(strategy);
              
              if (stratMap) {
                competencias.forEach(comp => {
                  // Calcular posição total para esta estratégia nesta competência
                  const totalPosition = dadosData
                    .filter(d => d["Classe do ativo"] === strategy && d.Competencia === comp)
                    .reduce((sum, d) => sum + d.Posicao, 0);
                  
                  const weightedReturn = stratMap.get(comp) || 0;
                  const avgReturn = totalPosition > 0 ? (weightedReturn / totalPosition) * 100 : 0;
                  returns.push(avgReturn);
                });
              }
              
              strategyData.set(strategy, returns);
            });

            // Função para calcular correlação de Pearson
            const calculateCorrelation = (returns1: number[], returns2: number[]) => {
              if (returns1.length !== returns2.length || returns1.length === 0) return 0;

              const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
              const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

              const numerator = returns1.reduce((sum, val1, i) => {
                return sum + (val1 - mean1) * (returns2[i] - mean2);
              }, 0);

              const denominator1 = Math.sqrt(returns1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0));
              const denominator2 = Math.sqrt(returns2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0));

              if (denominator1 === 0 || denominator2 === 0) return 0;
              return numerator / (denominator1 * denominator2);
            };

            // Calcular matriz de correlação
            const correlationMatrix: { strategy1: string; strategy2: string; correlation: number }[] = [];
            
            strategies.forEach((strat1, i) => {
              strategies.forEach((strat2, j) => {
                if (i < j) { // Evitar duplicatas
                  const returns1 = strategyData.get(strat1) || [];
                  const returns2 = strategyData.get(strat2) || [];
                  const correlation = calculateCorrelation(returns1, returns2);
                  correlationMatrix.push({ strategy1: strat1, strategy2: strat2, correlation });
                }
              });
            });

            // Filtrar por correlação mínima/máxima
            const filteredMatrix = correlationMatrix.filter(
              c => c.correlation >= minCorrelation && c.correlation <= maxCorrelation
            );

            // Ordenar por correlação absoluta (maior primeiro)
            const sortedMatrix = [...filteredMatrix].sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

            // Calcular correlação para par selecionado
            let selectedCorrelation = 0;
            let scatterData: { x: number; y: number; competencia: string }[] = [];
            
            if (selectedStrategy1 && selectedStrategy2 && selectedStrategy1 !== selectedStrategy2) {
              const returns1 = strategyData.get(selectedStrategy1) || [];
              const returns2 = strategyData.get(selectedStrategy2) || [];
              selectedCorrelation = calculateCorrelation(returns1, returns2);
              
              scatterData = returns1.map((val, i) => ({
                x: val,
                y: returns2[i],
                competencia: competencias[i]
              }));
            }

            // Interpretação da correlação
            const getCorrelationInterpretation = (corr: number) => {
              const abs = Math.abs(corr);
              if (abs >= 0.9) return 'Muito Forte';
              if (abs >= 0.7) return 'Forte';
              if (abs >= 0.5) return 'Moderada';
              if (abs >= 0.3) return 'Fraca';
              return 'Muito Fraca';
            };

            const getDiversificationBenefit = (corr: number) => {
              if (corr < -0.3) return '✓ Excelente - Estratégias tendem a se mover em direções opostas';
              if (corr < 0.3) return '✓ Ótimo - Baixa correlação proporciona boa diversificação';
              if (corr < 0.7) return '○ Moderado - Algum benefício de diversificação';
              return '⚠️ Limitado - Estratégias tendem a se mover juntas';
            };

            return (
              <div className="space-y-6">
                {/* Controles Interativos */}
                <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
                  <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Controles Interativos - Explore a Correlação
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Estratégia 1</label>
                      <Select value={selectedStrategy1} onValueChange={setSelectedStrategy1}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione estratégia" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Estratégia 2</label>
                      <Select value={selectedStrategy2} onValueChange={setSelectedStrategy2}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione estratégia" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">
                        Correlação Mínima: {minCorrelation.toFixed(2)}
                      </label>
                      <input 
                        type="range" 
                        min="-1" 
                        max="1" 
                        step="0.1" 
                        value={minCorrelation}
                        onChange={(e) => setMinCorrelation(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">
                        Correlação Máxima: {maxCorrelation.toFixed(2)}
                      </label>
                      <input 
                        type="range" 
                        min="-1" 
                        max="1" 
                        step="0.1" 
                        value={maxCorrelation}
                        onChange={(e) => setMaxCorrelation(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Análise do Par Selecionado */}
                {selectedStrategy1 && selectedStrategy2 && selectedStrategy1 !== selectedStrategy2 && (
                  <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-foreground">
                        {selectedStrategy1} vs {selectedStrategy2}
                      </h4>
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-xs text-muted-foreground mb-1">Correlação</p>
                        <p className={`text-3xl font-bold ${
                          Math.abs(selectedCorrelation) >= 0.7 ? 'text-red-600' :
                          Math.abs(selectedCorrelation) >= 0.3 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {selectedCorrelation.toFixed(3)}
                        </p>
                      </div>

                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-xs text-muted-foreground mb-1">Intensidade</p>
                        <p className="text-lg font-semibold text-foreground">
                          {getCorrelationInterpretation(selectedCorrelation)}
                        </p>
                      </div>

                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-xs text-muted-foreground mb-1">Direção</p>
                        <p className="text-lg font-semibold text-foreground">
                          {selectedCorrelation > 0.1 ? 'Positiva' : selectedCorrelation < -0.1 ? 'Negativa' : 'Neutra'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 p-4 rounded-lg bg-muted/50">
                      <p className="text-sm font-semibold mb-2 text-foreground">Benefício de Diversificação:</p>
                      <p className="text-sm text-muted-foreground">
                        {getDiversificationBenefit(selectedCorrelation)}
                      </p>
                    </div>

                    {/* Scatter Plot */}
                    {scatterData.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold mb-3 text-foreground">
                          Dispersão de Retornos
                        </h5>
                        <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              type="number" 
                              dataKey="x" 
                              name={selectedStrategy1}
                              stroke="hsl(var(--foreground))"
                              label={{ 
                                value: `${selectedStrategy1} (%)`, 
                                position: 'insideBottom', 
                                offset: -15,
                                style: { fill: 'hsl(var(--foreground))' }
                              }}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="y" 
                              name={selectedStrategy2}
                              stroke="hsl(var(--foreground))"
                              label={{ 
                                value: `${selectedStrategy2} (%)`, 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { fill: 'hsl(var(--foreground))' }
                              }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                                      <p className="text-xs font-semibold mb-1">{data.competencia}</p>
                                      <p className="text-xs text-muted-foreground">{selectedStrategy1}: {data.x.toFixed(2)}%</p>
                                      <p className="text-xs text-muted-foreground">{selectedStrategy2}: {data.y.toFixed(2)}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter data={scatterData} fill="hsl(var(--chart-1))" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Matriz de Correlação (Top Pares) */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    Matriz de Correlação ({sortedMatrix.length} pares filtrados)
                  </h4>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {sortedMatrix.slice(0, 20).map((item, idx) => {
                      const absCorr = Math.abs(item.correlation);
                      return (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg border border-border bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedStrategy1(item.strategy1);
                            setSelectedStrategy2(item.strategy2);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground">{item.strategy1}</p>
                              <p className="text-xs text-muted-foreground">vs</p>
                              <p className="text-xs font-medium text-foreground">{item.strategy2}</p>
                            </div>
                            
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${
                                absCorr >= 0.7 ? 'text-red-600' :
                                absCorr >= 0.3 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {item.correlation.toFixed(3)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getCorrelationInterpretation(item.correlation)}
                              </p>
                            </div>
                          </div>
                          
                          <Progress 
                            value={(item.correlation + 1) * 50} 
                            className="h-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explicação Educacional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">O que é Correlação?</h5>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mede como duas estratégias se movem em relação uma à outra. Varia de -1 a +1:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>+1:</strong> Movem-se perfeitamente juntas</li>
                      <li><strong>0:</strong> Independentes (ideal para diversificação)</li>
                      <li><strong>-1:</strong> Movem-se em direções opostas</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">Por que é importante?</h5>
                    <p className="text-xs text-muted-foreground mb-2">
                      Correlação baixa entre estratégias reduz risco da carteira:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Quando uma cai, outra pode subir</li>
                      <li>Suaviza a volatilidade total</li>
                      <li>Melhora relação risco-retorno</li>
                    </ul>
                  </div>
                </div>

                {/* Fórmula */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h5 className="text-sm font-semibold mb-2 text-foreground">Fórmula da Correlação de Pearson</h5>
                  <div className="bg-background/50 p-3 rounded font-mono text-xs text-foreground">
                    ρ(X,Y) = Cov(X,Y) / (σ_X × σ_Y)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Onde Cov é a covariância e σ é o desvio padrão de cada estratégia
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Card 12: Stress Test */}
      <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <AlertTriangle className="w-6 h-6 text-primary" />
            Stress Test
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {(() => {
            if (filteredConsolidatedData.length === 0) {
              return <p className="text-muted-foreground">Dados insuficientes para stress test</p>;
            }

            const returns = filteredConsolidatedData.map(item => item.Rendimento * 100);
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance);

            // Cenários de stress
            const scenarios = [
              {
                name: 'Cenário Leve',
                description: 'Queda de 1 desvio padrão',
                shock: -1 * volatility,
                severity: 'low',
                color: 'text-yellow-600'
              },
              {
                name: 'Cenário Moderado',
                description: 'Queda de 2 desvios padrão',
                shock: -2 * volatility,
                severity: 'medium',
                color: 'text-orange-600'
              },
              {
                name: 'Cenário Severo',
                description: 'Queda de 3 desvios padrão',
                shock: -3 * volatility,
                severity: 'high',
                color: 'text-red-600'
              },
              {
                name: 'Pior Mês Histórico',
                description: 'Repetição do pior mês registrado',
                shock: riskMetrics.worstMonth.return,
                severity: 'historical',
                color: 'text-red-700'
              }
            ];

            const currentPatrimonio = filteredConsolidatedData[filteredConsolidatedData.length - 1]["Patrimonio Final"];

            return (
              <div className="space-y-6">
                {/* Patrimônio Atual */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Patrimônio Atual</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {currentPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Cenários de Stress */}
                <div className="space-y-4">
                  {scenarios.map((scenario, index) => {
                    const impactedPatrimonio = currentPatrimonio * (1 + scenario.shock / 100);
                    const loss = currentPatrimonio - impactedPatrimonio;
                    const lossPercent = (loss / currentPatrimonio) * 100;

                    return (
                      <div key={index} className="p-5 rounded-lg border-2 border-border bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{scenario.name}</h4>
                            <p className="text-xs text-muted-foreground">{scenario.description}</p>
                          </div>
                          <Badge variant={scenario.severity === 'high' || scenario.severity === 'historical' ? 'destructive' : 'secondary'}>
                            {scenario.shock.toFixed(2)}%
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Patrimônio Após Stress</p>
                            <p className={`text-lg font-bold ${scenario.color}`}>
                              R$ {impactedPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Perda Potencial</p>
                            <p className={`text-lg font-bold ${scenario.color}`}>
                              R$ {loss.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <Progress value={100 - lossPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          Retenção: {(100 - lossPercent).toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo Estatístico */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h5 className="text-sm font-semibold mb-3 text-foreground">Estatísticas Base</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Volatilidade Mensal</p>
                      <p className="text-lg font-semibold text-foreground">{volatility.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Retorno Médio</p>
                      <p className="text-lg font-semibold text-foreground">{avgReturn.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* Explicação */}
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <h5 className="text-sm font-semibold mb-2 text-foreground">O que é Stress Test?</h5>
                  <p className="text-xs text-muted-foreground">
                    Simula o impacto de cenários adversos extremos no patrimônio. 
                    Utiliza múltiplos de desvio padrão e eventos históricos para estimar perdas potenciais 
                    e avaliar a resiliência da carteira em crises.
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Card 13: Índices de Performance (Sharpe, Sortino, Calmar) */}
      <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Target className="w-6 h-6 text-primary" />
            Índices de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {(() => {
            if (filteredConsolidatedData.length === 0) {
              return <p className="text-muted-foreground">Dados insuficientes para cálculo de índices</p>;
            }

            const returns = filteredConsolidatedData.map(item => item.Rendimento * 100);
            
            // Média geométrica (retorno composto real)
            const compoundedReturn = returns.reduce((product, r) => product * (1 + r / 100), 1);
            const avgReturn = (Math.pow(compoundedReturn, 1 / returns.length) - 1) * 100;
            
            // Volatilidade
            const avgArithmetic = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgArithmetic, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance);
            
            // Taxa livre de risco (CDI mensal aproximado)
            const riskFreeRate = 0.5;
            
            // Sharpe Ratio
            const sharpe = volatility !== 0 ? (avgReturn - riskFreeRate) / volatility : 0;
            
            // Sortino Ratio (downside deviation)
            const negativeReturns = returns.filter(r => r < riskFreeRate);
            const downwardVariance = negativeReturns.length > 0
              ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeRate, 2), 0) / negativeReturns.length
              : 0;
            const downwardVolatility = Math.sqrt(downwardVariance);
            const sortino = downwardVolatility !== 0 ? (avgReturn - riskFreeRate) / downwardVolatility : 0;
            
            // Calmar Ratio (retorno anualizado / max drawdown)
            let maxDrawdown = 0;
            let peak = filteredConsolidatedData[0]["Patrimonio Final"];
            filteredConsolidatedData.forEach(item => {
              const current = item["Patrimonio Final"];
              if (current > peak) peak = current;
              const drawdown = ((peak - current) / peak) * 100;
              if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            });
            
            const annualizedReturn = avgReturn * 12; // Retorno médio mensal * 12
            const calmar = maxDrawdown !== 0 ? annualizedReturn / maxDrawdown : 0;

            const indices = [
              {
                name: 'Sharpe Ratio',
                value: sharpe,
                description: 'Retorno ajustado ao risco total',
                formula: '(Retorno - RF) / Volatilidade',
                interpretation: sharpe > 1 ? 'Excelente' : sharpe > 0.5 ? 'Bom' : sharpe > 0 ? 'Aceitável' : 'Ruim',
                color: sharpe > 1 ? 'text-green-600' : sharpe > 0.5 ? 'text-blue-600' : sharpe > 0 ? 'text-yellow-600' : 'text-red-600',
                bgColor: sharpe > 1 ? 'from-green-500/10 to-green-500/5' : sharpe > 0.5 ? 'from-blue-500/10 to-blue-500/5' : sharpe > 0 ? 'from-yellow-500/10 to-yellow-500/5' : 'from-red-500/10 to-red-500/5',
                borderColor: sharpe > 1 ? 'border-green-500/30' : sharpe > 0.5 ? 'border-blue-500/30' : sharpe > 0 ? 'border-yellow-500/30' : 'border-red-500/30'
              },
              {
                name: 'Sortino Ratio',
                value: sortino,
                description: 'Retorno ajustado ao risco negativo',
                formula: '(Retorno - RF) / Downside Deviation',
                interpretation: sortino > 1.5 ? 'Excelente' : sortino > 1 ? 'Bom' : sortino > 0.5 ? 'Aceitável' : 'Ruim',
                color: sortino > 1.5 ? 'text-green-600' : sortino > 1 ? 'text-blue-600' : sortino > 0.5 ? 'text-yellow-600' : 'text-red-600',
                bgColor: sortino > 1.5 ? 'from-green-500/10 to-green-500/5' : sortino > 1 ? 'from-blue-500/10 to-blue-500/5' : sortino > 0.5 ? 'from-yellow-500/10 to-yellow-500/5' : 'from-red-500/10 to-red-500/5',
                borderColor: sortino > 1.5 ? 'border-green-500/30' : sortino > 1 ? 'border-blue-500/30' : sortino > 0.5 ? 'border-yellow-500/30' : 'border-red-500/30'
              },
              {
                name: 'Calmar Ratio',
                value: calmar,
                description: 'Retorno anualizado / Max Drawdown',
                formula: 'Retorno Anual / Drawdown Máximo',
                interpretation: calmar > 3 ? 'Excelente' : calmar > 1.5 ? 'Bom' : calmar > 0.5 ? 'Aceitável' : 'Ruim',
                color: calmar > 3 ? 'text-green-600' : calmar > 1.5 ? 'text-blue-600' : calmar > 0.5 ? 'text-yellow-600' : 'text-red-600',
                bgColor: calmar > 3 ? 'from-green-500/10 to-green-500/5' : calmar > 1.5 ? 'from-blue-500/10 to-blue-500/5' : calmar > 0.5 ? 'from-yellow-500/10 to-yellow-500/5' : 'from-red-500/10 to-red-500/5',
                borderColor: calmar > 3 ? 'border-green-500/30' : calmar > 1.5 ? 'border-blue-500/30' : calmar > 0.5 ? 'border-yellow-500/30' : 'border-red-500/30'
              }
            ];

            return (
              <div className="space-y-6">
                {/* Cards de Índices */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {indices.map((index, i) => (
                    <div key={i} className={`p-6 rounded-lg border-2 bg-gradient-to-br ${index.bgColor} ${index.borderColor}`}>
                      <h4 className="text-sm font-semibold text-foreground mb-2">{index.name}</h4>
                      <div className={`text-4xl font-bold mb-3 ${index.color}`}>
                        {index.value.toFixed(3)}
                      </div>
                      <Badge variant="outline" className="mb-3">
                        {index.interpretation}
                      </Badge>
                      <p className="text-xs text-muted-foreground mb-2">{index.description}</p>
                      <p className="text-xs text-muted-foreground font-mono bg-background/50 p-2 rounded">
                        {index.formula}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Componentes dos Cálculos */}
                <div className="p-5 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-semibold mb-4 text-foreground">Componentes dos Cálculos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Retorno Médio Mensal</p>
                      <p className="text-lg font-semibold text-foreground">{avgReturn.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Volatilidade</p>
                      <p className="text-lg font-semibold text-foreground">{volatility.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Downside Deviation</p>
                      <p className="text-lg font-semibold text-foreground">{downwardVolatility.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
                      <p className="text-lg font-semibold text-red-600">{maxDrawdown.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* Comparativo Visual */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground">Comparativo de Índices</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={indices} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                                <p className="text-sm font-semibold mb-1">{data.name}</p>
                                <p className="text-lg font-bold text-primary">{data.value.toFixed(3)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{data.interpretation}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {indices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Explicações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">Sharpe Ratio</h5>
                    <p className="text-xs text-muted-foreground">
                      Mede o excesso de retorno por unidade de risco total. Quanto maior, melhor a relação risco-retorno.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">Sortino Ratio</h5>
                    <p className="text-xs text-muted-foreground">
                      Similar ao Sharpe, mas penaliza apenas volatilidade negativa. Mais relevante para investidores avessos a perdas.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h5 className="text-sm font-semibold mb-2 text-foreground">Calmar Ratio</h5>
                    <p className="text-xs text-muted-foreground">
                      Relaciona retorno anualizado com o pior drawdown. Útil para avaliar recuperação de perdas extremas.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Card 14: Simulação Monte Carlo */}
      <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Rocket className="w-6 h-6 text-primary" />
            Simulação Monte Carlo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {(() => {
            if (filteredConsolidatedData.length === 0) {
              return <p className="text-muted-foreground">Dados insuficientes para simulação</p>;
            }

            const returns = filteredConsolidatedData.map(item => item.Rendimento * 100);
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance);

            const currentPatrimonio = filteredConsolidatedData[filteredConsolidatedData.length - 1]["Patrimonio Final"];
            const numSimulations = 1000;
            const periodsAhead = 12; // 12 meses à frente

            // Função para gerar número aleatório de distribuição normal (Box-Muller)
            const randomNormal = () => {
              const u1 = Math.random();
              const u2 = Math.random();
              return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            };

            // Gerar simulações
            const simulations: number[][] = [];
            for (let s = 0; s < numSimulations; s++) {
              const path = [currentPatrimonio];
              for (let p = 0; p < periodsAhead; p++) {
                const randomReturn = avgReturn + volatility * randomNormal();
                const nextValue = path[p] * (1 + randomReturn / 100);
                path.push(nextValue);
              }
              simulations.push(path);
            }

            // Calcular percentis para cada período
            const percentiles = Array.from({ length: periodsAhead + 1 }, (_, period) => {
              const valuesAtPeriod = simulations.map(sim => sim[period]).sort((a, b) => a - b);
              return {
                period: period,
                p5: valuesAtPeriod[Math.floor(numSimulations * 0.05)],
                p25: valuesAtPeriod[Math.floor(numSimulations * 0.25)],
                p50: valuesAtPeriod[Math.floor(numSimulations * 0.50)],
                p75: valuesAtPeriod[Math.floor(numSimulations * 0.75)],
                p95: valuesAtPeriod[Math.floor(numSimulations * 0.95)]
              };
            });

            // Calcular estatísticas finais
            const finalValues = simulations.map(sim => sim[periodsAhead]);
            const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
            const finalMedian = sortedFinalValues[Math.floor(numSimulations * 0.5)];
            const final5th = sortedFinalValues[Math.floor(numSimulations * 0.05)];
            const final95th = sortedFinalValues[Math.floor(numSimulations * 0.95)];
            const finalAvg = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;

            // Probabilidade de crescimento
            const positiveOutcomes = finalValues.filter(v => v > currentPatrimonio).length;
            const probGrowth = (positiveOutcomes / numSimulations) * 100;

            return (
              <div className="space-y-6">
                {/* Estatísticas Principais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">Patrimônio Atual</p>
                    <p className="text-lg font-bold text-foreground">
                      R$ {(currentPatrimonio / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30">
                    <p className="text-xs text-muted-foreground mb-1">Mediana (12m)</p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {(finalMedian / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">Cenário Otimista</p>
                    <p className="text-lg font-bold text-blue-600">
                      R$ {(final95th / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-muted-foreground">95º percentil</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30">
                    <p className="text-xs text-muted-foreground mb-1">Cenário Pessimista</p>
                    <p className="text-lg font-bold text-orange-600">
                      R$ {(final5th / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-muted-foreground">5º percentil</p>
                  </div>
                </div>

                {/* Probabilidade de Crescimento */}
                <div className="p-5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-foreground">Probabilidade de Crescimento (12 meses)</h4>
                    <TrendingUpIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-bold text-primary">{probGrowth.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      de {numSimulations.toLocaleString()} simulações
                    </p>
                  </div>
                  <Progress value={probGrowth} className="h-3 mt-4" />
                </div>

                {/* Gráfico de Percentis */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground">
                    Projeção de Cenários (12 meses à frente)
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={percentiles} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="period" 
                        label={{ value: 'Meses à Frente', position: 'insideBottom', offset: -5 }}
                        stroke="hsl(var(--foreground))"
                      />
                      <YAxis 
                        label={{ value: 'Patrimônio (R$)', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        stroke="hsl(var(--foreground))"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-lg p-4">
                                <p className="text-xs font-semibold mb-2">Mês {data.period}</p>
                                <div className="space-y-1">
                                  <p className="text-xs text-blue-600">95º: R$ {(data.p95 / 1000).toFixed(0)}k</p>
                                  <p className="text-xs text-green-600">75º: R$ {(data.p75 / 1000).toFixed(0)}k</p>
                                  <p className="text-xs font-semibold text-foreground">50º: R$ {(data.p50 / 1000).toFixed(0)}k</p>
                                  <p className="text-xs text-orange-600">25º: R$ {(data.p25 / 1000).toFixed(0)}k</p>
                                  <p className="text-xs text-red-600">5º: R$ {(data.p5 / 1000).toFixed(0)}k</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p95" 
                        stackId="1"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.1}
                        name="95º percentil"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p75" 
                        stackId="2"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        name="75º percentil"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p50" 
                        stackId="3"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.4}
                        strokeWidth={2}
                        name="Mediana"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p25" 
                        stackId="4"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        name="25º percentil"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p5" 
                        stackId="5"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.1}
                        name="5º percentil"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Parâmetros da Simulação */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h5 className="text-sm font-semibold mb-3 text-foreground">Parâmetros</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Simulações</span>
                        <span className="font-semibold text-foreground">{numSimulations.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Períodos</span>
                        <span className="font-semibold text-foreground">{periodsAhead} meses</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retorno Médio</span>
                        <span className="font-semibold text-foreground">{avgReturn.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volatilidade</span>
                        <span className="font-semibold text-foreground">{volatility.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h5 className="text-sm font-semibold mb-3 text-foreground">Resultados Esperados</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Média</span>
                        <span className="font-semibold text-foreground">R$ {(finalAvg / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mediana</span>
                        <span className="font-semibold text-foreground">R$ {(finalMedian / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ganho Médio</span>
                        <span className="font-semibold text-green-600">
                          {(((finalAvg - currentPatrimonio) / currentPatrimonio) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Intervalo 90%</span>
                        <span className="font-semibold text-foreground">
                          {(final5th / 1000).toFixed(0)}k - {(final95th / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explicação */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h5 className="text-sm font-semibold mb-2 text-foreground">O que é Monte Carlo?</h5>
                  <p className="text-xs text-muted-foreground mb-2">
                    Simulação estocástica que gera milhares de cenários futuros possíveis com base no retorno médio 
                    e volatilidade histórica da carteira.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Interpretação:</strong> A área central (50º percentil) representa o resultado mais provável. 
                    Quanto maior a dispersão entre os percentis, maior a incerteza da projeção.
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

    </div>
  );
}

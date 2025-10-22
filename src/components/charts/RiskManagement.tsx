import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Activity, AlertTriangle, Target, Calendar, Settings, Rocket, Check, X, TrendingUp as TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

export function RiskManagement({ consolidadoData, clientTarget = 0.7, marketData = [] }: RiskManagementProps) {
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
    
    // Meses acima e abaixo da meta
    const monthsAboveTarget = returns.filter(r => r >= clientTarget * 100).length;
    const monthsBelowTarget = returns.filter(r => r < clientTarget * 100).length;
    
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
    console.log('📈 Volatilidade mensal (σ):', volatility.toFixed(4) + '%');
    console.log('');
    console.log('📅 Análise mês a mês (usando meta mensal de cada competência):');
    
    returns.forEach((returnValue, index) => {
      const competencia = filteredConsolidatedData[index]?.Competencia;
      
      // Buscar a meta mensal correta para esta competência nos marketData
      const marketDataForCompetencia = marketData.find(m => m.competencia === competencia);
      const monthlyTarget = marketDataForCompetencia?.clientTarget || 0;
      const targetPercent = monthlyTarget * 100; // Converter para %
      const homeRunThreshold = targetPercent + volatility; // Meta mensal + 1σ
      
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
      }
    };
  }, [filteredConsolidatedData, clientTarget]);

  // Dados para o gráfico de Risco x Retorno
  const riskReturnData = useMemo(() => {
    return filteredConsolidatedData.map(item => ({
      name: item.Competencia,
      retorno: item.Rendimento * 100,
      risco: Math.abs(item.Rendimento * 100 - riskMetrics.avgReturn)
    }));
  }, [filteredConsolidatedData, riskMetrics.avgReturn]);

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

  // Dados para meses acima/abaixo da meta
  const targetComparisonData = useMemo(() => {
    return filteredConsolidatedData.map(item => ({
      competencia: item.Competencia,
      retorno: item.Rendimento * 100,
      meta: clientTarget * 100,
      acimaMeta: item.Rendimento * 100 >= clientTarget * 100
    }));
  }, [filteredConsolidatedData, clientTarget]);

  // Cálculo de Drawdown com Pain Index
  const drawdownAnalysis = useMemo(() => {
    if (filteredConsolidatedData.length === 0) return { drawdowns: [], maxPainIndex: 0, chartData: [] };
    
    let peak = filteredConsolidatedData[0]["Patrimonio Final"];
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
    
    const chartData: Array<{
      competencia: string;
      patrimonio: number;
      peak: number;
      drawdown: number;
      drawdownPercent: number;
    }> = [];
    
    let currentDrawdownStart: number | null = null;
    let currentDrawdownDepth = 0;
    let currentDrawdownEnd: number | null = null;
    
    filteredConsolidatedData.forEach((item, index) => {
      const current = item["Patrimonio Final"];
      
      // Atualizar pico
      if (current >= peak) {
        // Se estava em drawdown e recuperou
        if (currentDrawdownStart !== null && currentDrawdownEnd !== null) {
          const startCompetencia = filteredConsolidatedData[currentDrawdownStart].Competencia;
          const endCompetencia = filteredConsolidatedData[currentDrawdownEnd].Competencia;
          const durationMonths = currentDrawdownEnd - currentDrawdownStart + 1;
          const recoveryMonths = index - currentDrawdownEnd;
          const painIndex = (currentDrawdownDepth * (durationMonths + recoveryMonths)) / 100;
          
          drawdowns.push({
            startCompetencia,
            endCompetencia,
            recoveryCompetencia: item.Competencia,
            depth: currentDrawdownDepth,
            durationMonths,
            recoveryMonths,
            painIndex
          });
          
          currentDrawdownStart = null;
          currentDrawdownEnd = null;
          currentDrawdownDepth = 0;
        }
        
        peak = current;
        peakIndex = index;
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
      
      // Adicionar dados para o gráfico
      const drawdownPercent = peak > 0 ? ((peak - current) / peak) * 100 : 0;
      chartData.push({
        competencia: item.Competencia,
        patrimonio: current,
        peak: peak,
        drawdown: peak - current,
        drawdownPercent: -drawdownPercent // Negativo para mostrar queda
      });
    });
    
    // Se ainda está em drawdown
    if (currentDrawdownStart !== null && currentDrawdownEnd !== null) {
      const startCompetencia = filteredConsolidatedData[currentDrawdownStart].Competencia;
      const endCompetencia = filteredConsolidatedData[currentDrawdownEnd].Competencia;
      const durationMonths = currentDrawdownEnd - currentDrawdownStart + 1;
      const recoveryMonths = filteredConsolidatedData.length - 1 - currentDrawdownEnd;
      const painIndex = (currentDrawdownDepth * (durationMonths + recoveryMonths)) / 100;
      
      drawdowns.push({
        startCompetencia,
        endCompetencia,
        recoveryCompetencia: null, // Ainda não recuperou
        depth: currentDrawdownDepth,
        durationMonths,
        recoveryMonths: null,
        painIndex
      });
    }
    
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
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{riskMetrics.sharpe.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {riskMetrics.sharpe >= 1 ? 'Excelente' : riskMetrics.sharpe >= 0.5 ? 'Bom' : 'Moderado'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sortino Ratio</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{riskMetrics.sortino.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {riskMetrics.sortino >= 1 ? 'Excelente' : riskMetrics.sortino >= 0.5 ? 'Bom' : 'Moderado'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volatilidade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{riskMetrics.volatility.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Desvio padrão mensal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queda Máxima</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-{riskMetrics.maxDrawdown.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Drawdown máximo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hit Rate Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="h-5 w-5" />
            Hit Rate Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Performance vs Meta</p>
        </CardHeader>
        <CardContent>
          {/* Centered Donut Chart */}
          <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-8">
            <div className="relative w-full max-w-md">
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Home Run', value: riskMetrics.hitRate.homeRun, color: 'hsl(142, 71%, 45%)' },
                      { name: 'Acerto', value: riskMetrics.hitRate.acerto, color: 'hsl(215, 25%, 60%)' },
                      { name: 'Quase lá', value: riskMetrics.hitRate.quaseLa, color: 'hsl(40, 25%, 70%)' },
                      { name: 'Miss', value: riskMetrics.hitRate.miss, color: 'hsl(220, 15%, 82%)' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={95}
                    outerRadius={150}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {[
                      { name: 'Home Run', value: riskMetrics.hitRate.homeRun, color: 'hsl(142, 71%, 45%)' },
                      { name: 'Acerto', value: riskMetrics.hitRate.acerto, color: 'hsl(215, 25%, 60%)' },
                      { name: 'Quase lá', value: riskMetrics.hitRate.quaseLa, color: 'hsl(40, 25%, 70%)' },
                      { name: 'Miss', value: riskMetrics.hitRate.miss, color: 'hsl(220, 15%, 82%)' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-sm text-muted-foreground mb-2 font-medium">Hit Rate</p>
                <p className="text-6xl font-bold text-foreground">{riskMetrics.hitRate.hitRatePercent}%</p>
              </div>
            </div>
            
            {/* Legend - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 w-full max-w-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded mt-1" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base font-semibold text-foreground">Home Run</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {riskMetrics.hitRate.homeRun} meses ({filteredConsolidatedData.length > 0 ? Math.round((riskMetrics.hitRate.homeRun / filteredConsolidatedData.length) * 100) : 0}%)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded mt-1" style={{ backgroundColor: 'hsl(215, 25%, 60%)' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base font-semibold text-foreground">Acerto</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {riskMetrics.hitRate.acerto} meses ({filteredConsolidatedData.length > 0 ? Math.round((riskMetrics.hitRate.acerto / filteredConsolidatedData.length) * 100) : 0}%)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded mt-1" style={{ backgroundColor: 'hsl(40, 25%, 70%)' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base font-semibold text-foreground">Quase lá</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {riskMetrics.hitRate.quaseLa} meses ({filteredConsolidatedData.length > 0 ? Math.round((riskMetrics.hitRate.quaseLa / filteredConsolidatedData.length) * 100) : 0}%)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded mt-1" style={{ backgroundColor: 'hsl(220, 15%, 82%)' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base font-semibold text-foreground">Miss</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {riskMetrics.hitRate.miss} meses ({filteredConsolidatedData.length > 0 ? Math.round((riskMetrics.hitRate.miss / filteredConsolidatedData.length) * 100) : 0}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Selection - Moved outside Hit Rate card */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Período de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {periodButtons.map((button) => (
              <Button
                key={button.id}
                variant={selectedPeriod === button.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedPeriod(button.id as any);
                  if (button.id === 'custom') {
                    setShowCustomSelector(true);
                  }
                }}
                className="text-xs"
              >
                {button.label}
              </Button>
            ))}
            
            {selectedPeriod === 'custom' && (
              <Popover open={showCustomSelector} onOpenChange={setShowCustomSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Personalizar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
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
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Métricas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Melhor mês</p>
              <p className="text-xl font-bold text-success">+{riskMetrics.bestMonth.return.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">{riskMetrics.bestMonth.competencia}</p>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Pior mês</p>
              <p className="text-xl font-bold text-destructive">{riskMetrics.worstMonth.return.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">{riskMetrics.worstMonth.competencia}</p>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Retorno médio</p>
              <p className="text-xl font-bold text-foreground">{riskMetrics.avgReturn.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">por mês</p>
            </div>
            
            <div className="bg-chart-5/10 border border-chart-5/20 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Consistência</p>
              <p className="text-xl font-bold text-foreground">{riskMetrics.hitRate.positivePercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">meses positivos</p>
            </div>
          </div>
          
          {/* Performance vs Meta Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Meses acima da meta</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-success">{riskMetrics.monthsAboveTarget}</p>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {filteredConsolidatedData.length > 0 
                    ? Math.round((riskMetrics.monthsAboveTarget / filteredConsolidatedData.length) * 100)
                    : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Meses abaixo da meta</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-destructive">{riskMetrics.monthsBelowTarget}</p>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  {filteredConsolidatedData.length > 0 
                    ? Math.round((riskMetrics.monthsBelowTarget / filteredConsolidatedData.length) * 100)
                    : 0}%
                </Badge>
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
                        <label htmlFor="media" className="text-sm">Média Acumulada</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sd1" 
                          checked={selectedIndicators.sd1}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, sd1: checked as boolean }))
                          }
                        />
                        <label htmlFor="sd1" className="text-sm">±1 Desvio Padrão</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sd2" 
                          checked={selectedIndicators.sd2}
                          onCheckedChange={(checked) => 
                            setSelectedIndicators(prev => ({ ...prev, sd2: checked as boolean }))
                          }
                        />
                        <label htmlFor="sd2" className="text-sm">±2 Desvios Padrão</label>
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
              <LineChart 
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
                    minus2sd: 0
                  };
                  
                  let accumulatedReturn = 0;
                  let accumulatedUpsideVol = 0;
                  let accumulatedDownsideVol = 0;
                  const monthReturns: number[] = [];
                  
                  const dataPoints = filteredConsolidatedData.map((item, index) => {
                    const monthReturn = item.Rendimento * 100;
                    
                    // Retorno acumulado composto
                    accumulatedReturn = (1 + accumulatedReturn / 100) * (1 + monthReturn / 100) - 1;
                    accumulatedReturn = accumulatedReturn * 100;
                    
                    monthReturns.push(monthReturn);
                    
                    // Calcular média aritmética dos retornos até o momento
                    const avgReturnArithmetic = monthReturns.reduce((a, b) => a + b, 0) / monthReturns.length;
                    
                    // Separar retornos positivos (acima da média) e negativos (abaixo da média)
                    const positiveReturns = monthReturns.filter(r => r > avgReturnArithmetic);
                    const negativeReturns = monthReturns.filter(r => r <= avgReturnArithmetic);
                    
                    // Calcular volatilidade UPSIDE acumulada
                    const upsideVariance = positiveReturns.length > 0
                      ? positiveReturns.reduce((sum, r) => sum + Math.pow(r - avgReturnArithmetic, 2), 0) / positiveReturns.length
                      : 0;
                    const currentUpsideVol = Math.sqrt(upsideVariance);
                    
                    // Calcular volatilidade DOWNSIDE acumulada
                    const downsideVariance = negativeReturns.length > 0
                      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgReturnArithmetic, 2), 0) / negativeReturns.length
                      : 0;
                    const currentDownsideVol = Math.sqrt(downsideVariance);
                    
                    // Acumular volatilidades ao longo do tempo
                    accumulatedUpsideVol = currentUpsideVol * Math.sqrt(index + 1);
                    accumulatedDownsideVol = currentDownsideVol * Math.sqrt(index + 1);
                    
                    // Média acumulada (soma simples dos retornos médios)
                    const avgAccumulated = avgReturnArithmetic * (index + 1);
                    
                    const [month, year] = item.Competencia.split('/');
                    const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    
                    return {
                      name: `${competenciaDate.toLocaleDateString('pt-BR', { month: '2-digit' })}/${competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}`,
                      retornoAcumulado: accumulatedReturn,
                      mediaAcumulada: avgAccumulated,
                      plus1sd: avgAccumulated + accumulatedUpsideVol,
                      minus1sd: avgAccumulated - accumulatedDownsideVol,
                      plus2sd: avgAccumulated + (2 * accumulatedUpsideVol),
                      minus2sd: avgAccumulated - (2 * accumulatedDownsideVol)
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
                      'mediaAcumulada': 'Média Acumulada',
                      'plus1sd': '+1 Desvio Padrão',
                      'minus1sd': '-1 Desvio Padrão',
                      'plus2sd': '+2 Desvios Padrão',
                      'minus2sd': '-2 Desvios Padrão'
                    };
                    return [`${Number(value).toFixed(2)}%`, labels[name] || name];
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                />
                
                {/* Linhas de desvio padrão */}
                {selectedIndicators.sd2 && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="plus2sd" 
                      stroke="hsl(var(--muted-foreground) / 0.3)" 
                      strokeWidth={1.5}
                      dot={false}
                      name="+2 Desvios Padrão"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minus2sd" 
                      stroke="hsl(var(--muted-foreground) / 0.3)" 
                      strokeWidth={1.5}
                      dot={false}
                      name="-2 Desvios Padrão"
                    />
                  </>
                )}
                {selectedIndicators.sd1 && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="plus1sd" 
                      stroke="hsl(var(--muted-foreground) / 0.5)" 
                      strokeWidth={1.5}
                      dot={false}
                      name="+1 Desvio Padrão"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minus1sd" 
                      stroke="hsl(var(--muted-foreground) / 0.5)" 
                      strokeWidth={1.5}
                      dot={false}
                      name="-1 Desvio Padrão"
                    />
                  </>
                )}
                {selectedIndicators.media && (
                  <Line 
                    type="monotone" 
                    dataKey="mediaAcumulada" 
                    stroke="hsl(var(--muted-foreground) / 0.4)" 
                    strokeWidth={1.5}
                    dot={false}
                    name="Média Acumulada"
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
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Cards de métricas integrados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{riskMetrics.volatility.toFixed(2)}%</p>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                  Mensal
                </Badge>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Positiva (Upside)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {riskMetrics.upsideVolatility.toFixed(2)}%
                </p>
                <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade Negativa (Downside)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-destructive">
                  {riskMetrics.downsideVolatility.toFixed(2)}%
                </p>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
            </div>
            
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

      {/* Gráfico de Risco x Retorno */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Risco x Retorno por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="risco" 
                name="Risco" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Risco (%)', position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="number" 
                dataKey="retorno" 
                name="Retorno" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Retorno (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
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
                name="Períodos" 
                data={riskReturnData} 
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
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
                <LineChart data={drawdownAnalysis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="competencia" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
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
                      if (name === 'drawdownPercent') return [`${Number(value).toFixed(2)}%`, 'Drawdown'];
                      if (name === 'patrimonio') return [
                        new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(value),
                        'Patrimônio'
                      ];
                      if (name === 'peak') return [
                        new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(value),
                        'Pico'
                      ];
                      return [value, name];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="drawdownPercent" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
                    name="Drawdown"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peak" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Pico"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Drawdown Events Table */}
            {drawdownAnalysis.drawdowns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground">Eventos de Drawdown</h4>
                <div className="space-y-3">
                  {drawdownAnalysis.drawdowns
                    .sort((a, b) => b.painIndex - a.painIndex)
                    .slice(0, 5)
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
                
                {drawdownAnalysis.drawdowns.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Mostrando os 5 drawdowns com maior Pain Index de {drawdownAnalysis.drawdowns.length} total
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
    </div>
  );
}

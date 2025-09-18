import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar as CalendarIcon, Settings } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCDIData } from "@/hooks/useCDIData";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";

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
  }>;
  clientName?: string;
}

function decodeClientName(clientName?: string): string | undefined {
  if (!clientName) return undefined;
  return decodeURIComponent(clientName);
}

export function PerformanceChart({ consolidadoData, clientName }: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | '12months' | 'custom'>('12months');
  const [customStartCompetencia, setCustomStartCompetencia] = useState<string>('');
  const [customEndCompetencia, setCustomEndCompetencia] = useState<string>('');
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState({
    cdi: false,
    target: true,
    ibovespa: false,
    ifix: false,
    ipca: true
  });
  
  const { cdiData, loading: cdiLoading, error: cdiError } = useCDIData();
  const decodedClientName = decodeClientName(clientName);
  const { marketData, clientTarget, loading: marketLoading, error: marketError } = useMarketIndicators(decodedClientName);
  
  console.log('PerformanceChart - Debug data:', {
    clientName,
    decodedClientName,
    clientTarget,
    marketLoading,
    marketError
  });

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
      consolidated["Patrimonio Final"] += item["Patrimonio Final"] || 0;
      consolidated["Patrimonio Inicial"] += item["Patrimonio Inicial"] || 0;
      consolidated["Movimentação"] += item["Movimentação"] || 0;
      consolidated["Ganho Financeiro"] += item["Ganho Financeiro"] || 0;
      consolidated.Impostos += item.Impostos || 0;
      
      // For weighted average rendimento
      const patrimonio = item["Patrimonio Final"] || 0;
      const rendimento = item.Rendimento || 0;
      consolidated.rendimentoSum += rendimento * patrimonio;
      consolidated.patrimonioForWeightedAvg += patrimonio;
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

  // Consolidate and sort data by competencia date
  const consolidatedData = consolidateByCompetencia(consolidadoData);
  const sortedData = [...consolidatedData].sort((a, b) => {
    const [monthA, yearA] = a.Competencia.split('/');
    const [monthB, yearB] = b.Competencia.split('/');
    const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
    const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
    return dateA.getTime() - dateB.getTime();
  });

  // Get available competencias for custom selector
  const availableCompetencias = useMemo(() => {
    return [...new Set(consolidatedData.map(item => item.Competencia))].sort();
  }, [consolidatedData]);

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
      case 'custom':
        if (customStartCompetencia && customEndCompetencia) {
          filteredData = sortedData.filter(item => {
            return item.Competencia >= customStartCompetencia && item.Competencia <= customEndCompetencia;
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
      name: previousMonth.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
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
        name: competenciaDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        retornoAcumulado: accumulated * 100,
        retornoMensal: monthlyReturn * 100,
        competencia: item.Competencia
      });
    });
    
    return result;
  };

  const chartData = calculateAccumulatedReturns(filteredData);

  // Add all indicators data to chart data
  const chartDataWithIndicators = chartData.map((point, index) => {
    if (index === 0) {
      // First point (previous month) should be 0 for all indicators
      return {
        ...point,
        cdiRetorno: 0,
        targetRetorno: 0,
        ibovespaRetorno: 0,
        ifixRetorno: 0,
        ipcaRetorno: 0
      };
    } else {
      const firstCompetencia = chartData[1]?.competencia;
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
      let ibovespaRetorno = null;
      let ifixRetorno = null;
      let ipcaRetorno = null;
      
      const firstMarketPoint = marketData.find(m => m.competencia === firstCompetencia);
      const currentMarketPoint = marketData.find(m => m.competencia === currentCompetencia);
      
      if (currentMarketPoint && firstMarketPoint) {
        // Check if we have actual target data (not zero)
        const hasTargetData = currentMarketPoint.clientTarget !== 0 || currentMarketPoint.accumulatedClientTarget !== 0;
        
        if (hasTargetData) {
          if (currentCompetencia === firstCompetencia) {
            targetRetorno = currentMarketPoint.clientTarget * 100;
          } else {
            const targetRelativeReturn = (1 + currentMarketPoint.accumulatedClientTarget) / (1 + firstMarketPoint.accumulatedClientTarget) - 1;
            targetRetorno = targetRelativeReturn * 100;
          }
        }
      }
      
      console.log('Market data processing:', {
        firstCompetencia,
        currentCompetencia,
        firstMarketPoint,
        currentMarketPoint,
        marketDataLength: marketData.length
      });
      
      if (currentMarketPoint && firstMarketPoint) {
        if (currentCompetencia === firstCompetencia) {
          ibovespaRetorno = currentMarketPoint.ibovespa * 100;
          ifixRetorno = currentMarketPoint.ifix * 100;
          // Para IPCA, usar composição mensal como CDI
          const startMarketIndex = marketData.findIndex(m => m.competencia === firstCompetencia);
          const currentMarketIndex = marketData.findIndex(m => m.competencia === currentCompetencia);
          
          if (startMarketIndex !== -1 && currentMarketIndex !== -1) {
            let accumulatedIPCA = 1;
            for (let i = startMarketIndex; i <= currentMarketIndex; i++) {
              accumulatedIPCA *= (1 + marketData[i].ipca);
            }
            ipcaRetorno = (accumulatedIPCA - 1) * 100;
          } else {
            ipcaRetorno = currentMarketPoint.ipca * 100;
          }
        } else {
          const ibovespaRelativeReturn = (1 + currentMarketPoint.accumulatedIbovespa) / (1 + firstMarketPoint.accumulatedIbovespa) - 1;
          const ifixRelativeReturn = (1 + currentMarketPoint.accumulatedIfix) / (1 + firstMarketPoint.accumulatedIfix) - 1;
          
          // Para IPCA, usar composição mensal como CDI
          const startMarketIndex = marketData.findIndex(m => m.competencia === firstCompetencia);
          const currentMarketIndex = marketData.findIndex(m => m.competencia === currentCompetencia);
          
          if (startMarketIndex !== -1 && currentMarketIndex !== -1) {
            let accumulatedIPCA = 1;
            for (let i = startMarketIndex; i <= currentMarketIndex; i++) {
              accumulatedIPCA *= (1 + marketData[i].ipca);
            }
            ipcaRetorno = (accumulatedIPCA - 1) * 100;
          } else {
            const ipcaRelativeReturn = (1 + currentMarketPoint.accumulatedIpca) / (1 + firstMarketPoint.accumulatedIpca) - 1;
            ipcaRetorno = ipcaRelativeReturn * 100;
          }
          
          ibovespaRetorno = ibovespaRelativeReturn * 100;
          ifixRetorno = ifixRelativeReturn * 100;
        }
        
        console.log('Calculated market returns:', {
          ibovespaRetorno,
          ifixRetorno,
          ipcaRetorno
        });
      } else {
        console.log('No market data found for competencias');
      }
      
      return {
        ...point,
        cdiRetorno,
        targetRetorno,
        ibovespaRetorno,
        ifixRetorno,
        ipcaRetorno
      };
    }
  });

  console.log('Chart data with indicators:', chartDataWithIndicators);

  // Calculate optimal Y axis scale with better padding
  const portfolioValues = chartDataWithIndicators.map(item => item.retornoAcumulado);
  const cdiValues = chartDataWithIndicators.map(item => item.cdiRetorno).filter(v => v !== null) as number[];
  const targetValues = chartDataWithIndicators.map(item => item.targetRetorno).filter(v => v !== null) as number[];
  const ibovespaValues = chartDataWithIndicators.map(item => item.ibovespaRetorno).filter(v => v !== null) as number[];
  const ifixValues = chartDataWithIndicators.map(item => item.ifixRetorno).filter(v => v !== null) as number[];
  const ipcaValues = chartDataWithIndicators.map(item => item.ipcaRetorno).filter(v => v !== null) as number[];
  
  // Only include values from selected indicators
  let allValues = [...portfolioValues];
  if (selectedIndicators.cdi) allValues = [...allValues, ...cdiValues];
  if (selectedIndicators.target) allValues = [...allValues, ...targetValues];
  if (selectedIndicators.ibovespa) allValues = [...allValues, ...ibovespaValues];
  if (selectedIndicators.ifix) allValues = [...allValues, ...ifixValues];
  if (selectedIndicators.ipca) allValues = [...allValues, ...ipcaValues];
  
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
    { id: 'custom', label: 'Personalizado' }
  ];

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-foreground text-xl font-semibold">Retorno Acumulado</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Comparativo de performance da carteira com indicadores</p>
              {(cdiLoading || marketLoading) && <p className="text-xs text-muted-foreground">Carregando dados...</p>}
              {(cdiError || marketError) && <p className="text-xs text-destructive">Erro ao carregar dados: {cdiError || marketError}</p>}
            </div>
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
                        id="ibovespa" 
                        checked={selectedIndicators.ibovespa}
                        onCheckedChange={(checked) => 
                          setSelectedIndicators(prev => ({ ...prev, ibovespa: checked as boolean }))
                        }
                      />
                      <label htmlFor="ibovespa" className="text-sm">Ibovespa</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ifix" 
                        checked={selectedIndicators.ifix}
                        onCheckedChange={(checked) => 
                          setSelectedIndicators(prev => ({ ...prev, ifix: checked as boolean }))
                        }
                      />
                      <label htmlFor="ifix" className="text-sm">IFIX</label>
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
                              {competencia}
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
                              {competencia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => setShowCustomSelector(false)}
                      className="w-full"
                    >
                      Aplicar
                    </Button>
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
                   if (name === 'ibovespaRetorno') {
                     return [`${value.toFixed(2)}%`, 'Ibovespa'];
                   }
                   if (name === 'ifixRetorno') {
                     return [`${value.toFixed(2)}%`, 'IFIX'];
                   }
                   if (name === 'ipcaRetorno') {
                     return [`${value.toFixed(2)}%`, 'IPCA'];
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
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ 
                      fill: 'hsl(var(--success))', 
                      strokeWidth: 1, 
                      stroke: 'hsl(var(--background))',
                      r: 3
                   }}
                   activeDot={{ 
                     r: 5, 
                     fill: 'hsl(var(--success))', 
                     strokeWidth: 2, 
                     stroke: 'hsl(var(--background))'
                   }}
                 />
               )}
               
               {selectedIndicators.ibovespa && (
                 <Line 
                   type="monotone" 
                   dataKey="ibovespaRetorno" 
                   stroke="hsl(var(--destructive))"
                   strokeWidth={2}
                   connectNulls={false}
                   dot={{ 
                     fill: 'hsl(var(--destructive))', 
                     strokeWidth: 1, 
                     stroke: 'hsl(var(--background))',
                     r: 3
                   }}
                   activeDot={{ 
                     r: 5, 
                     fill: 'hsl(var(--destructive))', 
                     strokeWidth: 2, 
                     stroke: 'hsl(var(--background))'
                   }}
                 />
               )}
               
               {selectedIndicators.ifix && (
                 <Line 
                   type="monotone" 
                   dataKey="ifixRetorno" 
                   stroke="hsl(var(--warning))"
                   strokeWidth={2}
                   connectNulls={false}
                   dot={{ 
                     fill: 'hsl(var(--warning))', 
                     strokeWidth: 1, 
                     stroke: 'hsl(var(--background))',
                     r: 3
                   }}
                   activeDot={{ 
                     r: 5, 
                     fill: 'hsl(var(--warning))', 
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
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance Metrics */}
        {chartDataWithIndicators.length > 1 && (
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
                  {clientTarget && (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Meta de Retorno</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {clientTarget.meta}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {cdiRelative !== null && (
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
                  
                  {ipcaDifference !== null && (
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
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
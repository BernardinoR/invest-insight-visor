import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from 'recharts';
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Activity, AlertTriangle, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

export function RiskManagement({ consolidadoData, clientTarget = 0.7 }: RiskManagementProps) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Consolidar dados por competência
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
      
      const patrimonio = item["Patrimonio Final"] || 0;
      const rendimento = item.Rendimento || 0;
      consolidated.rendimentoSum += rendimento * patrimonio;
      consolidated.patrimonioForWeightedAvg += patrimonio;
    });
    
    return Array.from(competenciaMap.values()).map(item => ({
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
  };

  const consolidatedData = useMemo(() => consolidateByCompetencia(consolidadoData), [consolidadoData]);

  // Calcular métricas de risco
  const riskMetrics = useMemo(() => {
    if (consolidatedData.length === 0) {
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
        worstMonth: { return: 0, competencia: '' }
      };
    }

    const returns = consolidatedData.map(item => item.Rendimento * 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Volatilidade (desvio padrão)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Sharpe Ratio (assumindo taxa livre de risco de 0.5% ao mês - CDI aproximado)
    const riskFreeRate = 0.5;
    const sharpe = volatility !== 0 ? (avgReturn - riskFreeRate) / volatility : 0;
    
    // Sortino Ratio (usando apenas volatilidade negativa)
    const negativeReturns = returns.filter(r => r < clientTarget * 100);
    const downwardVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r - clientTarget * 100, 2), 0) / negativeReturns.length
      : 0;
    const downwardVolatility = Math.sqrt(downwardVariance);
    const sortino = downwardVolatility !== 0 ? (avgReturn - clientTarget * 100) / downwardVolatility : 0;
    
    // Drawdown máximo
    let maxDrawdown = 0;
    let peak = consolidatedData[0]["Patrimonio Final"];
    consolidatedData.forEach(item => {
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
    
    return {
      sharpe,
      sortino,
      volatility,
      maxDrawdown,
      avgReturn,
      downwardVolatility,
      monthsAboveTarget,
      monthsBelowTarget,
      bestMonth: {
        return: maxReturn,
        competencia: consolidatedData[bestMonthIndex]?.Competencia || ''
      },
      worstMonth: {
        return: minReturn,
        competencia: consolidatedData[worstMonthIndex]?.Competencia || ''
      }
    };
  }, [consolidatedData, clientTarget]);

  // Dados para o gráfico de Risco x Retorno
  const riskReturnData = useMemo(() => {
    return consolidatedData.map(item => ({
      name: item.Competencia,
      retorno: item.Rendimento * 100,
      risco: Math.abs(item.Rendimento * 100 - riskMetrics.avgReturn)
    }));
  }, [consolidatedData, riskMetrics.avgReturn]);

  // Dados para correlação interativa (simulação de correlação entre meses)
  const correlationData = useMemo(() => {
    if (consolidatedData.length < 2) return [];
    
    return consolidatedData.slice(0, -1).map((item, index) => {
      const nextItem = consolidatedData[index + 1];
      return {
        current: item.Rendimento * 100,
        next: nextItem.Rendimento * 100,
        competencia: item.Competencia
      };
    });
  }, [consolidatedData]);

  // Dados para meses acima/abaixo da meta
  const targetComparisonData = useMemo(() => {
    return consolidatedData.map(item => ({
      competencia: item.Competencia,
      retorno: item.Rendimento * 100,
      meta: clientTarget * 100,
      acimaMeta: item.Rendimento * 100 >= clientTarget * 100
    }));
  }, [consolidatedData, clientTarget]);

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

      {/* Meses Acima/Abaixo da Meta e Melhor/Pior Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meses acima da meta</p>
                <p className="text-3xl font-bold text-success">{riskMetrics.monthsAboveTarget}</p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {consolidatedData.length > 0 
                  ? ((riskMetrics.monthsAboveTarget / consolidatedData.length) * 100).toFixed(0)
                  : 0}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meses abaixo da meta</p>
                <p className="text-3xl font-bold text-destructive">{riskMetrics.monthsBelowTarget}</p>
              </div>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {consolidatedData.length > 0 
                  ? ((riskMetrics.monthsBelowTarget / consolidatedData.length) * 100).toFixed(0)
                  : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Extremos de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Melhor mês</p>
                  <p className="text-sm font-medium text-foreground">{riskMetrics.bestMonth.competencia}</p>
                </div>
                <p className="text-2xl font-bold text-success">+{riskMetrics.bestMonth.return.toFixed(2)}%</p>
              </div>
            </div>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pior mês</p>
                  <p className="text-sm font-medium text-foreground">{riskMetrics.worstMonth.competencia}</p>
                </div>
                <p className="text-2xl font-bold text-destructive">{riskMetrics.worstMonth.return.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Volatilidade */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Volatilidade da Carteira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={(() => {
                // Add zero starting point
                const [firstMonth, firstYear] = consolidatedData[0].Competencia.split('/');
                const firstDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, 1);
                const previousMonth = new Date(firstDate);
                previousMonth.setMonth(previousMonth.getMonth() - 1);
                
                const prevMonthNum = String(previousMonth.getMonth() + 1).padStart(2, '0');
                const prevYear = previousMonth.getFullYear().toString().slice(-2);
                
                const startPoint = {
                  competencia: `${prevMonthNum}/${prevYear}`,
                  retornoAcumulado: 0,
                  mediaAcumulada: 0,
                  plus1sd: 0,
                  minus1sd: 0,
                  plus2sd: 0,
                  minus2sd: 0
                };
                
                let accumulated = 0;
                let avgAccumulated = 0;
                
                const dataPoints = consolidatedData.map((item, index) => {
                  const monthReturn = item.Rendimento * 100;
                  accumulated = (1 + accumulated / 100) * (1 + monthReturn / 100) - 1;
                  accumulated = accumulated * 100;
                  
                  avgAccumulated = (1 + avgAccumulated / 100) * (1 + riskMetrics.avgReturn / 100) - 1;
                  avgAccumulated = avgAccumulated * 100;
                  
                  // Bandas de desvio padrão crescentes com sqrt(tempo)
                  const periods = index + 1;
                  const volatilityBand = riskMetrics.volatility * Math.sqrt(periods);
                  
                  const [month, year] = item.Competencia.split('/');
                  const shortYear = year.slice(-2);
                  
                  return {
                    competencia: `${month}/${shortYear}`,
                    retornoAcumulado: accumulated,
                    mediaAcumulada: avgAccumulated,
                    plus1sd: avgAccumulated + volatilityBand,
                    minus1sd: avgAccumulated - volatilityBand,
                    plus2sd: avgAccumulated + (2 * volatilityBand),
                    minus2sd: avgAccumulated - (2 * volatilityBand)
                  };
                });
                
                return [startPoint, ...dataPoints];
              })()}
              margin={{ top: 20, right: 30, bottom: 20, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="competencia" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  padding: '8px 12px'
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
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              
              {/* Linhas de desvio padrão */}
              <Line 
                type="monotone" 
                dataKey="plus2sd" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="+2 Desvios Padrão"
              />
              <Line 
                type="monotone" 
                dataKey="plus1sd" 
                stroke="hsl(var(--warning))" 
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="+1 Desvio Padrão"
              />
              <Line 
                type="monotone" 
                dataKey="mediaAcumulada" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--chart-3))', r: 3 }}
                name="Média Acumulada"
              />
              <Line 
                type="monotone" 
                dataKey="minus1sd" 
                stroke="hsl(var(--warning))" 
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="-1 Desvio Padrão"
              />
              <Line 
                type="monotone" 
                dataKey="minus2sd" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="-2 Desvios Padrão"
              />
              
              {/* Linha de retorno acumulado da carteira */}
              <Line 
                type="monotone" 
                dataKey="retornoAcumulado" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                name="Retorno Acumulado"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Card de Métricas de Volatilidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Volatilidade (Desvio Padrão)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-foreground">{riskMetrics.volatility.toFixed(2)}%</p>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Mensal
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Retorno Médio</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-foreground">{riskMetrics.avgReturn.toFixed(2)}%</p>
                <Badge 
                  variant="outline" 
                  className={
                    riskMetrics.avgReturn >= 1 
                      ? "bg-success/10 text-success border-success/20" 
                      : "bg-muted/10 text-muted-foreground border-muted/20"
                  }
                >
                  {riskMetrics.avgReturn >= 1 ? '↑' : '↓'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

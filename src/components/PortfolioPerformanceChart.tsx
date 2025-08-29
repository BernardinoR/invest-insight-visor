import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface PortfolioPerformanceChartProps {
  clientName: string;
}

export function PortfolioPerformanceChart({ clientName }: PortfolioPerformanceChartProps) {
  const { data, clientTarget, loading, error } = usePortfolioPerformance(clientName);
  const [selectedIndicators, setSelectedIndicators] = useState({
    portfolio: true,
    meta: true,
    monthlyComparison: false
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando dados de performance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Não há dados de performance disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const formatTooltip = (value: number | string | (string | number)[], name: string) => {
    if (typeof value === 'number') {
      return [`${value.toFixed(2)}%`, getIndicatorLabel(name)];
    }
    return [value, name];
  };

  const getIndicatorLabel = (key: string): string => {
    switch (key) {
      case 'portfolioAccumulated': return 'Carteira (Acumulado)';
      case 'metaAccumulated': return `Meta ${clientTarget?.meta || ''} (Acumulado)`;
      case 'portfolioMonthly': return 'Carteira (Mensal)';
      case 'metaMonthly': return `Meta ${clientTarget?.meta || ''} (Mensal)`;
      default: return key;
    }
  };

  const currentPortfolio = data[data.length - 1]?.portfolioAccumulated || 0;
  const currentMeta = data[data.length - 1]?.metaAccumulated || 0;
  const outperformance = currentPortfolio - currentMeta;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Performance da Carteira vs Meta</h3>
            <p className="text-sm text-muted-foreground">
              Comparativo de retorno acumulado com meta {clientTarget?.meta || 'não definida'}
            </p>
          </div>
        </CardTitle>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Carteira</p>
            <p className="text-lg font-semibold text-primary">
              {currentPortfolio.toFixed(2)}%
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-lg font-semibold">
              {currentMeta.toFixed(2)}%
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Diferença</p>
            <p className={`text-lg font-semibold ${outperformance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Indicator Selection */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Visualização:</span>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={selectedIndicators.portfolio}
              onCheckedChange={(checked) => 
                setSelectedIndicators(prev => ({ ...prev, portfolio: !!checked }))
              }
            />
            <span className="text-sm">Carteira (Acumulado)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={selectedIndicators.meta}
              onCheckedChange={(checked) => 
                setSelectedIndicators(prev => ({ ...prev, meta: !!checked }))
              }
            />
            <span className="text-sm">
              Meta {clientTarget ? `(${clientTarget.meta})` : '(Não disponível)'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={selectedIndicators.monthlyComparison}
              onCheckedChange={(checked) => 
                setSelectedIndicators(prev => ({ ...prev, monthlyComparison: !!checked }))
              }
            />
            <span className="text-sm">Retornos Mensais</span>
          </label>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="competencia" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              
              {/* Portfolio Performance (Accumulated) */}
              {selectedIndicators.portfolio && (
                <Line 
                  type="monotone" 
                  dataKey="portfolioAccumulated" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              )}
              
              {/* Meta Performance (Accumulated) */}
              {selectedIndicators.meta && clientTarget && (
                <Line 
                  type="monotone" 
                  dataKey="metaAccumulated" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              )}

              {/* Monthly Returns */}
              {selectedIndicators.monthlyComparison && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="portfolioMonthly" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 1, r: 2 }}
                  />
                  {clientTarget && (
                    <Line 
                      type="monotone" 
                      dataKey="metaMonthly" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      dot={{ fill: 'hsl(var(--success))', strokeWidth: 1, r: 2 }}
                    />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Analysis */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Análise de Performance:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              • A carteira {outperformance >= 0 ? 'superou' : 'não atingiu'} a meta em{' '}
              <span className={`font-medium ${outperformance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {Math.abs(outperformance).toFixed(2)} pontos percentuais
              </span>
            </p>
            <p>• Performance atual da carteira: <span className="font-medium text-primary">{currentPortfolio.toFixed(2)}%</span></p>
            <p>• Meta acumulada: <span className="font-medium">{currentMeta.toFixed(2)}%</span></p>
            {!clientTarget && (
              <p className="text-amber-600">• Meta de retorno não foi definida para este cliente</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, Award, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DashboardOverviewProps {
  totalPatrimonio: number;
  totalRendimento: number;
  consolidadoData: any[];
  dadosData: any[];
  clientTarget: number;
}

export function DashboardOverview({ 
  totalPatrimonio, 
  totalRendimento, 
  consolidadoData,
  dadosData,
  clientTarget 
}: DashboardOverviewProps) {
  
  // Calculate key metrics
  const calculateHitRate = () => {
    if (!consolidadoData.length) return { rate: 0, total: 0, positive: 0 };
    
    const monthsAboveTarget = consolidadoData.filter(item => 
      parseFloat(item.Rentabilidade_percent || "0") >= clientTarget
    ).length;
    
    return {
      rate: (monthsAboveTarget / consolidadoData.length) * 100,
      total: consolidadoData.length,
      positive: monthsAboveTarget
    };
  };

  const calculateReturnMetrics = () => {
    if (!consolidadoData.length) return { best: 0, worst: 0, avg: 0, volatility: 0 };
    
    const returns = consolidadoData.map(item => parseFloat(item.Rentabilidade_percent || "0"));
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    
    return {
      best: Math.max(...returns),
      worst: Math.min(...returns),
      avg,
      volatility: Math.sqrt(variance)
    };
  };

  const calculatePolicyCompliance = () => {
    // Simplified policy compliance calculation
    // In a real scenario, this would compare against actual policy limits
    const strategies = new Set(dadosData.map(item => item.Estrategia));
    const diversification = strategies.size;
    
    // Assume good diversification if > 5 strategies
    const score = Math.min(100, (diversification / 5) * 100);
    
    return {
      score,
      status: score >= 80 ? 'compliant' : score >= 60 ? 'warning' : 'violation'
    };
  };

  const hitRate = calculateHitRate();
  const returnMetrics = calculateReturnMetrics();
  const policyCompliance = calculatePolicyCompliance();
  const returnPercent = totalPatrimonio > 0 ? (totalRendimento / totalPatrimonio) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patrimônio */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3" />
              Patrimônio Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
              }).format(totalPatrimonio)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={returnPercent >= 0 ? 'text-success' : 'text-destructive'}>
                {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
              </span> no período
            </p>
          </CardContent>
        </Card>

        {/* Hit Rate */}
        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Target className="h-3 w-3" />
              Hit Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {hitRate.rate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hitRate.positive} de {hitRate.total} meses acima da meta
            </p>
          </CardContent>
        </Card>

        {/* Rentabilidade Média */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3" />
              Rentabilidade Média
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {returnMetrics.avg.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volatilidade: {returnMetrics.volatility.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        {/* Policy Compliance */}
        <Card className={`border-${policyCompliance.status === 'compliant' ? 'success' : policyCompliance.status === 'warning' ? 'warning' : 'destructive'}/20 bg-gradient-to-br from-${policyCompliance.status === 'compliant' ? 'success' : policyCompliance.status === 'warning' ? 'warning' : 'destructive'}/5 to-transparent`}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Award className="h-3 w-3" />
              Aderência à Política
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {policyCompliance.score.toFixed(0)}%
            </div>
            <div className="mt-2">
              <Progress value={policyCompliance.score} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destaques de Performance</CardTitle>
            <CardDescription>Principais métricas do período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-full">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Melhor Mês</p>
                  <p className="text-xs text-muted-foreground">Maior retorno registrado</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-success">+{returnMetrics.best.toFixed(2)}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pior Mês</p>
                  <p className="text-xs text-muted-foreground">Menor retorno registrado</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-destructive">{returnMetrics.worst.toFixed(2)}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Meta Mensal</p>
                  <p className="text-xs text-muted-foreground">CDI + spread</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{clientTarget.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas e Recomendações</CardTitle>
            <CardDescription>Pontos de atenção da carteira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {policyCompliance.status !== 'compliant' && (
              <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Aderência à Política</p>
                  <p className="text-xs text-muted-foreground">
                    A carteira apresenta desvios em relação à política de investimentos
                  </p>
                </div>
              </div>
            )}

            {returnMetrics.volatility > 2 && (
              <div className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Volatilidade Elevada</p>
                  <p className="text-xs text-muted-foreground">
                    A volatilidade está acima de 2% - considere revisar a exposição ao risco
                  </p>
                </div>
              </div>
            )}

            {hitRate.rate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Hit Rate Abaixo do Esperado</p>
                  <p className="text-xs text-muted-foreground">
                    Apenas {hitRate.rate.toFixed(0)}% dos meses atingiram a meta
                  </p>
                </div>
              </div>
            )}

            {policyCompliance.status === 'compliant' && returnMetrics.volatility <= 2 && hitRate.rate >= 70 && (
              <div className="flex items-start gap-3 p-3 bg-success/5 rounded-lg border border-success/20">
                <Award className="h-4 w-4 text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Carteira em Conformidade</p>
                  <p className="text-xs text-muted-foreground">
                    Todos os indicadores estão dentro dos parâmetros esperados
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

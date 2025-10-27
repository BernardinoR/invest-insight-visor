import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Target, Percent } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface PolicyData {
  estrategia: string;
  percentualAtual: number;
  percentualMinimo: number;
  percentualMaximo: number;
  percentualIdeal?: number;
}

interface InvestmentPolicyComplianceProps {
  dadosData: any[];
  selectedClient: string;
}

export function InvestmentPolicyCompliance({ dadosData, selectedClient }: InvestmentPolicyComplianceProps) {
  
  // Política de investimentos mock - idealmente isso viria do banco de dados
  const investmentPolicy: Record<string, PolicyData> = {
    "Pós Fixado - Liquidez": {
      estrategia: "Pós Fixado - Liquidez",
      percentualMinimo: 5,
      percentualMaximo: 15,
      percentualIdeal: 10,
      percentualAtual: 0
    },
    "Pós Fixado": {
      estrategia: "Pós Fixado",
      percentualMinimo: 20,
      percentualMaximo: 40,
      percentualIdeal: 30,
      percentualAtual: 0
    },
    "Inflação": {
      estrategia: "Inflação",
      percentualMinimo: 15,
      percentualMaximo: 30,
      percentualIdeal: 20,
      percentualAtual: 0
    },
    "Pré Fixado": {
      estrategia: "Pré Fixado",
      percentualMinimo: 5,
      percentualMaximo: 15,
      percentualIdeal: 10,
      percentualAtual: 0
    },
    "Multimercado": {
      estrategia: "Multimercado",
      percentualMinimo: 5,
      percentualMaximo: 20,
      percentualIdeal: 10,
      percentualAtual: 0
    },
    "Ações": {
      estrategia: "Ações",
      percentualMinimo: 5,
      percentualMaximo: 20,
      percentualIdeal: 10,
      percentualAtual: 0
    },
    "Imobiliário": {
      estrategia: "Imobiliário",
      percentualMinimo: 0,
      percentualMaximo: 10,
      percentualIdeal: 5,
      percentualAtual: 0
    },
    "Exterior": {
      estrategia: "Exterior",
      percentualMinimo: 5,
      percentualMaximo: 15,
      percentualIdeal: 10,
      percentualAtual: 0
    }
  };

  // Agrupar estratégias
  const groupStrategy = (strategy: string): string => {
    const strategyLower = strategy.toLowerCase();
    
    if (strategyLower.includes('cdi - liquidez')) return 'Pós Fixado - Liquidez';
    if (strategyLower.includes('cdi - fundos') || strategyLower.includes('cdi - titulos')) return 'Pós Fixado';
    if (strategyLower.includes('inflação - titulos') || strategyLower.includes('inflação - fundos')) return 'Inflação';
    if (strategyLower.includes('pré fixado')) return 'Pré Fixado';
    if (strategyLower.includes('multimercado')) return 'Multimercado';
    if (strategyLower.includes('imobiliário')) return 'Imobiliário';
    if (strategyLower.includes('ações') || strategyLower.includes('long bias')) return 'Ações';
    if (strategyLower.includes('exterior')) return 'Exterior';
    
    return 'Outros';
  };

  // Calcular distribuição atual da carteira
  const getMostRecentData = () => {
    if (dadosData.length === 0) return [];
    
    const competenciaToDate = (competencia: string) => {
      const [month, year] = competencia.split('/');
      return new Date(parseInt(year), parseInt(month) - 1);
    };
    
    const mostRecentCompetencia = dadosData.reduce((latest, current) => {
      const latestDate = competenciaToDate(latest.Competencia);
      const currentDate = competenciaToDate(current.Competencia);
      return currentDate > latestDate ? current : latest;
    }).Competencia;
    
    return dadosData.filter(item => item.Competencia === mostRecentCompetencia);
  };

  const recentData = getMostRecentData();
  const totalPatrimonio = recentData.reduce((sum, item) => sum + (item["Patrimonio Final"] || 0), 0);

  // Calcular percentuais atuais por estratégia
  const strategyDistribution = recentData.reduce((acc, item) => {
    const strategy = groupStrategy(item["Classe do ativo"] || "Outros");
    const patrimonio = item["Patrimonio Final"] || 0;
    
    if (!acc[strategy]) {
      acc[strategy] = 0;
    }
    acc[strategy] += patrimonio;
    return acc;
  }, {} as Record<string, number>);

  // Atualizar percentuais atuais na política
  const updatedPolicy = { ...investmentPolicy };
  Object.keys(updatedPolicy).forEach(key => {
    const currentValue = strategyDistribution[key] || 0;
    updatedPolicy[key].percentualAtual = totalPatrimonio > 0 ? (currentValue / totalPatrimonio) * 100 : 0;
  });

  // Adicionar estratégias não previstas na política
  Object.keys(strategyDistribution).forEach(strategy => {
    if (!updatedPolicy[strategy] && strategy !== 'Outros') {
      updatedPolicy[strategy] = {
        estrategia: strategy,
        percentualMinimo: 0,
        percentualMaximo: 100,
        percentualAtual: (strategyDistribution[strategy] / totalPatrimonio) * 100
      };
    }
  });

  // Calcular status de conformidade
  const getComplianceStatus = (data: PolicyData): 'compliant' | 'warning' | 'violation' => {
    const { percentualAtual, percentualMinimo, percentualMaximo, percentualIdeal } = data;
    
    if (percentualAtual < percentualMinimo || percentualAtual > percentualMaximo) {
      return 'violation';
    }
    
    if (percentualIdeal) {
      const deviation = Math.abs(percentualAtual - percentualIdeal);
      if (deviation > 5) return 'warning';
    }
    
    return 'compliant';
  };

  // Preparar dados para os gráficos
  const policyArray = Object.values(updatedPolicy).filter(p => p.percentualAtual > 0.01 || p.percentualIdeal || 0 > 0);
  
  const complianceData = policyArray.map(item => ({
    name: item.estrategia,
    atual: item.percentualAtual,
    minimo: item.percentualMinimo,
    maximo: item.percentualMaximo,
    ideal: item.percentualIdeal || ((item.percentualMinimo + item.percentualMaximo) / 2),
    status: getComplianceStatus(item)
  }));

  const pieChartData = policyArray.map(item => ({
    name: item.estrategia,
    value: item.percentualAtual,
    ideal: item.percentualIdeal || ((item.percentualMinimo + item.percentualMaximo) / 2)
  }));

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Calcular score geral de aderência
  const calculateOverallScore = (): number => {
    const validPolicies = policyArray.filter(p => p.percentualIdeal);
    if (validPolicies.length === 0) return 100;

    const totalDeviation = validPolicies.reduce((sum, item) => {
      const ideal = item.percentualIdeal || ((item.percentualMinimo + item.percentualMaximo) / 2);
      const deviation = Math.abs(item.percentualAtual - ideal);
      return sum + deviation;
    }, 0);

    const avgDeviation = totalDeviation / validPolicies.length;
    return Math.max(0, 100 - (avgDeviation * 2));
  };

  const overallScore = calculateOverallScore();
  const violations = policyArray.filter(p => getComplianceStatus(p) === 'violation').length;
  const warnings = policyArray.filter(p => getComplianceStatus(p) === 'warning').length;
  const compliant = policyArray.filter(p => getComplianceStatus(p) === 'compliant').length;

  return (
    <div className="space-y-6">
      {/* Header com score geral */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Política de Investimentos</CardTitle>
              <CardDescription>Aderência da carteira atual à política estabelecida</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{overallScore.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Score de Aderência</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">{compliant}</div>
                <div className="text-sm text-muted-foreground">Em conformidade</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <div className="text-2xl font-bold text-warning">{warnings}</div>
                <div className="text-sm text-muted-foreground">Desvios moderados</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{violations}</div>
                <div className="text-sm text-muted-foreground">Fora dos limites</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de comparação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição atual vs ideal */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Distribuição: Atual vs Ideal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparação de faixas */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Limites e Alocação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={complianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip />
                <Bar dataKey="minimo" fill="hsl(var(--muted))" name="Mínimo" />
                <Bar dataKey="ideal" fill="hsl(var(--primary))" name="Ideal" />
                <Bar dataKey="maximo" fill="hsl(var(--muted))" name="Máximo" />
                <Bar dataKey="atual" fill="hsl(var(--chart-1))" name="Atual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por estratégia */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Detalhamento por Estratégia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {complianceData.map((item, index) => {
              const status = item.status;
              const deviation = item.atual - item.ideal;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {status === 'compliant' && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {status === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                      {status === 'violation' && <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Ideal: {item.ideal.toFixed(1)}%
                      </span>
                      <Badge variant={
                        status === 'compliant' ? 'default' :
                        status === 'warning' ? 'secondary' : 'destructive'
                      }>
                        Atual: {item.atual.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress value={item.atual} className="h-3" />
                    <div 
                      className="absolute top-0 h-3 border-l-2 border-primary"
                      style={{ left: `${item.ideal}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mín: {item.minimo.toFixed(1)}%</span>
                    <span className={
                      Math.abs(deviation) < 2 ? 'text-success' :
                      Math.abs(deviation) < 5 ? 'text-warning' : 'text-destructive'
                    }>
                      {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}pp do ideal
                    </span>
                    <span>Máx: {item.maximo.toFixed(1)}%</span>
                  </div>

                  {status !== 'compliant' && (
                    <Alert variant={status === 'violation' ? 'destructive' : 'default'}>
                      <AlertDescription className="text-xs">
                        {status === 'violation' ? (
                          item.atual < item.minimo 
                            ? `Alocação abaixo do mínimo (${item.minimo}%). Considere aumentar exposição.`
                            : `Alocação acima do máximo (${item.maximo}%). Considere reduzir exposição.`
                        ) : (
                          `Desvio de ${Math.abs(deviation).toFixed(1)}pp do ideal. Rebalanceamento pode melhorar aderência.`
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Informações educacionais */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>O que é Política de Investimentos?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A política de investimentos define as diretrizes estratégicas para alocação de recursos, estabelecendo limites mínimos e máximos para cada classe de ativos de acordo com o perfil de risco e objetivos do investidor.
          </p>
          <p>
            <strong className="text-foreground">Score de Aderência:</strong> Indica o quão alinhada sua carteira está com a política estabelecida. Quanto mais próximo de 100%, melhor a aderência.
          </p>
          <p>
            <strong className="text-foreground">Desvios:</strong> Pequenos desvios são normais devido à volatilidade do mercado. Rebalanceamentos periódicos ajudam a manter a carteira alinhada com a política.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

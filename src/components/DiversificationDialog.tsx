import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DiversificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosData: any[];
}

export function DiversificationDialog({ open, onOpenChange, dadosData }: DiversificationDialogProps) {
  // Function to group strategy names (same as StrategyBreakdown)
  const groupStrategy = (strategy: string): string => {
    const strategyLower = strategy.toLowerCase();
    
    if (strategyLower.includes('cdi - liquidez')) {
      return 'Pós Fixado - Liquidez';
    }
    if (strategyLower.includes('cdi - fundos') || strategyLower.includes('cdi - titulos')) {
      return 'Pós Fixado';
    }
    if (strategyLower.includes('inflação - titulos') || strategyLower.includes('inflação - fundos')) {
      return 'Inflação';
    }
    if (strategyLower.includes('pré fixado - titulos') || strategyLower.includes('pré fixado - títulos') || strategyLower.includes('pré fixado - titulo') || strategyLower.includes('pré fixado - fundos')) {
      return 'Pré Fixado';
    }
    if (strategyLower.includes('multimercado')) {
      return 'Multimercado';
    }
    if (strategyLower.includes('imobiliário - ativos') || strategyLower.includes('imobiliário - fundos')) {
      return 'Imobiliário';
    }
    if (strategyLower.includes('ações - ativos') || strategyLower.includes('ações - fundos') || strategyLower.includes('ações - etfs')) {
      return 'Ações';
    }
    if (strategyLower.includes('ações - long bias')) {
      return 'Ações - Long Bias';
    }
    if (strategyLower.includes('private equity') || strategyLower.includes('venture capital') || strategyLower.includes('special sits')) {
      return 'Private Equity';
    }
    if (strategyLower.includes('exterior - ações')) {
      return 'Exterior - Ações';
    }
    if (strategyLower.includes('exterior - renda fixa')) {
      return 'Exterior - Renda Fixa';
    }
    if (strategyLower.includes('coe')) {
      return 'COE';
    }
    if (strategyLower.includes('ouro')) {
      return 'Ouro';
    }
    if (strategyLower.includes('criptoativos')) {
      return 'Criptoativos';
    }
    
    return strategy;
  };

  // Get all unique competencias and sort them
  const allCompetencias = [...new Set(dadosData.map(item => item.Competencia))].sort((a, b) => {
    const [monthA, yearA] = a.split('/').map(Number);
    const [monthB, yearB] = b.split('/').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  // Get all unique strategies across all time (using grouped strategies)
  const allStrategies = [...new Set(
    dadosData
      .map(item => groupStrategy(item["Classe do ativo"] || ""))
      .filter(Boolean)
  )].sort();

  // Define the order for strategies (same as StrategyBreakdown)
  const strategyOrder = [
    'Pós Fixado - Liquidez',
    'Pós Fixado',
    'Inflação',
    'Pré Fixado',
    'Multimercado',
    'Imobiliário',
    'Ações',
    'Ações - Long Bias',
    'Private Equity',
    'Exterior - Renda Fixa',
    'Exterior - Ações',
    'COE',
    'Ouro',
    'Criptoativos'
  ];

  // Sort strategies by the defined order
  const sortedStrategies = allStrategies.sort((a, b) => {
    const indexA = strategyOrder.indexOf(a);
    const indexB = strategyOrder.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });

  // Calculate number of assets per competencia
  const assetsData = allCompetencias.map(competencia => {
    const competenciaData = dadosData.filter(item => item.Competencia === competencia);
    const uniqueAssets = new Set(competenciaData.map(item => item.Ativo)).size;

    return {
      competencia,
      ativos: uniqueAssets,
    };
  });

  // Calculate presence of each strategy per competencia for stacked area chart
  const strategiesData = allCompetencias.map(competencia => {
    const competenciaData = dadosData.filter(item => item.Competencia === competencia);
    const strategiesInMonth = new Set(
      competenciaData
        .map(item => groupStrategy(item["Classe do ativo"] || ""))
        .filter(Boolean)
    );

    const dataPoint: any = { competencia };
    
    // For each strategy, add 1 if present, 0 if absent (for stacked area)
    sortedStrategies.forEach(strategy => {
      dataPoint[strategy] = strategiesInMonth.has(strategy) ? 1 : 0;
    });

    return dataPoint;
  });


  const currentCompetencia = allCompetencias[allCompetencias.length - 1];
  const currentAssets = assetsData[assetsData.length - 1]?.ativos || 0;
  
  // Count current active strategies
  const currentStrategiesData = strategiesData[strategiesData.length - 1];
  const currentStrategiesCount = currentStrategiesData 
    ? Object.keys(currentStrategiesData).filter(key => key !== 'competencia' && currentStrategiesData[key] === 1).length 
    : 0;

  // Generate colors for strategies (same as StrategyBreakdown)
  const COLORS = [
    'hsl(210 16% 82%)', // Light blue-gray
    'hsl(32 25% 72%)',  // Light beige
    'hsl(45 20% 85%)',  // Very light beige
    'hsl(210 11% 71%)', // Medium gray
    'hsl(210 16% 58%)', // Darker gray
    'hsl(207 26% 50%)', // Blue-gray
    'hsl(158 64% 25%)', // Dark forest green
    'hsl(159 61% 33%)', // Medium forest green
    'hsl(210 29% 24%)', // Dark blue-gray
    'hsl(25 28% 53%)',  // Medium brown
    'hsl(40 23% 77%)',  // Light tan
    'hsl(210 14% 53%)', // Medium blue-gray
    'hsl(35 31% 65%)',  // Warm beige
    'hsl(210 24% 40%)', // Darker blue-gray
  ];

  // Assign colors based on strategy order
  const getStrategyColor = (strategy: string) => {
    const index = strategyOrder.indexOf(strategy);
    return index !== -1 ? COLORS[index] : COLORS[COLORS.length - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold">Evolução da Diversificação</DialogTitle>
          <DialogDescription>
            Acompanhamento do número de ativos e estratégias ao longo do tempo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Ativos Atuais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  {currentAssets}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  em {currentCompetencia}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Estratégias Atuais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  {currentStrategiesCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  classes de ativos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {assetsData.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {/* Assets Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Evolução de Ativos</CardTitle>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <ChartContainer
                    config={{
                      ativos: {
                        label: "Ativos",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[250px] md:h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={assetsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="competencia" 
                          className="text-[10px] md:text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          className="text-[10px] md:text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          width={35}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone"
                          dataKey="ativos" 
                          name="Ativos"
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Strategies Stacked Area Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Timeline de Estratégias</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visualize quando cada estratégia entrou e saiu da carteira
                  </p>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <ChartContainer
                    config={Object.fromEntries(
                      sortedStrategies.map((strategy) => [
                        strategy,
                        {
                          label: strategy,
                          color: getStrategyColor(strategy),
                        },
                      ])
                    )}
                    className="h-[300px] md:h-[400px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={strategiesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="competencia" 
                          className="text-[10px] md:text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          className="text-[10px] md:text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          width={35}
                          label={{ 
                            value: 'Estratégias', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }
                          }}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null;
                            
                            const activeStrategies = payload.filter(p => p.value === 1);
                            const totalStrategies = activeStrategies.length;
                            
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-lg max-w-xs">
                                <div className="font-semibold text-sm mb-2 pb-2 border-b">
                                  {payload[0]?.payload?.competencia}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {totalStrategies} estratégia(s) ativa(s)
                                </div>
                                <div className="space-y-1.5">
                                  {activeStrategies.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                      <div 
                                        className="w-3 h-3 rounded-sm flex-shrink-0" 
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      <span className="font-medium">{entry.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }}
                        />
                        {sortedStrategies.map((strategy) => (
                          <Bar
                            key={strategy}
                            dataKey={strategy}
                            stackId="1"
                            fill={getStrategyColor(strategy)}
                            name={strategy}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  
                  {/* Enhanced Legend with insights */}
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {sortedStrategies.map((strategy) => {
                        // Calculate duration for each strategy
                        const firstAppearance = strategiesData.findIndex(d => d[strategy] === 1);
                        const lastAppearance = strategiesData.map((d, i) => d[strategy] === 1 ? i : -1).filter(i => i !== -1).pop();
                        const duration = lastAppearance !== undefined && firstAppearance !== -1 
                          ? lastAppearance - firstAppearance + 1 
                          : 0;
                        const isActive = strategiesData[strategiesData.length - 1][strategy] === 1;
                        
                        return (
                          <div 
                            key={strategy} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                              isActive 
                                ? 'bg-primary/10 border-primary/30' 
                                : 'bg-muted/50 border-muted'
                            }`}
                          >
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: getStrategyColor(strategy) }}
                            />
                            <span className="text-xs font-medium">{strategy}</span>
                            <span className="text-[10px] text-muted-foreground">
                              ({duration} {duration === 1 ? 'mês' : 'meses'})
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                                Ativa
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

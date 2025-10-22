import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DiversificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosData: any[];
}

export function DiversificationDialog({ open, onOpenChange, dadosData }: DiversificationDialogProps) {
  // Get all unique competencias and sort them
  const allCompetencias = [...new Set(dadosData.map(item => item.Competencia))].sort((a, b) => {
    const [monthA, yearA] = a.split('/').map(Number);
    const [monthB, yearB] = b.split('/').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  // Get all unique strategies across all time
  const allStrategies = [...new Set(
    dadosData
      .map(item => item["Classe do ativo"])
      .filter(Boolean)
  )].sort();

  // Calculate number of assets per competencia
  const assetsData = allCompetencias.map(competencia => {
    const competenciaData = dadosData.filter(item => item.Competencia === competencia);
    const uniqueAssets = new Set(competenciaData.map(item => item.Ativo)).size;

    return {
      competencia,
      ativos: uniqueAssets,
    };
  });

  // Calculate presence of each strategy per competencia
  const strategiesData = allCompetencias.map(competencia => {
    const competenciaData = dadosData.filter(item => item.Competencia === competencia);
    const strategiesInMonth = new Set(
      competenciaData
        .map(item => item["Classe do ativo"])
        .filter(Boolean)
    );

    const dataPoint: any = { competencia };
    
    // Add a value of 1 for strategies present, 0 for absent
    allStrategies.forEach(strategy => {
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

  // Generate colors for strategies
  const strategyColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

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

              {/* Strategies Timeline Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Linha do Tempo de Estratégias</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Presença de cada estratégia ao longo do tempo
                  </p>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <ChartContainer
                    config={Object.fromEntries(
                      allStrategies.map((strategy, index) => [
                        strategy,
                        {
                          label: strategy,
                          color: strategyColors[index % strategyColors.length],
                        },
                      ])
                    )}
                    className="h-[300px] md:h-[400px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={strategiesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                          ticks={[0, 1]}
                          domain={[0, 1]}
                          tickFormatter={(value) => value === 1 ? 'Ativa' : ''}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null;
                            
                            const activeStrategies = payload.filter(p => p.value === 1);
                            
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="font-medium text-xs mb-1">
                                  {payload[0]?.payload?.competencia}
                                </div>
                                <div className="space-y-1">
                                  {activeStrategies.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      <span>{entry.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }}
                        />
                        {allStrategies.map((strategy, index) => (
                          <Line
                            key={strategy}
                            type="stepAfter"
                            dataKey={strategy}
                            name={strategy}
                            stroke={strategyColors[index % strategyColors.length]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  
                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                    {allStrategies.map((strategy, index) => (
                      <div key={strategy} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: strategyColors[index % strategyColors.length] }}
                        />
                        <span className="text-xs">{strategy}</span>
                      </div>
                    ))}
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

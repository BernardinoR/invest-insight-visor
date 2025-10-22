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

  // Calculate number of assets and strategies per competencia
  const diversificationData = allCompetencias.map(competencia => {
    const competenciaData = dadosData.filter(item => item.Competencia === competencia);
    
    const uniqueAssets = new Set(competenciaData.map(item => item.Ativo)).size;
    const uniqueStrategies = new Set(
      competenciaData
        .map(item => item["Classe do ativo"])
        .filter(Boolean)
    ).size;

    return {
      competencia,
      ativos: uniqueAssets,
      estrategias: uniqueStrategies
    };
  });

  const currentCompetencia = allCompetencias[allCompetencias.length - 1];
  const currentData = diversificationData[diversificationData.length - 1];

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
                  {currentData?.ativos || 0}
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
                  {currentData?.estrategias || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  classes de ativos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {diversificationData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                      <LineChart data={diversificationData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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

              {/* Strategies Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Evolução de Estratégias</CardTitle>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  <ChartContainer
                    config={{
                      estrategias: {
                        label: "Estratégias",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[250px] md:h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={diversificationData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                          dataKey="estrategias" 
                          name="Estratégias"
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--chart-2))', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Historical Table */}
          {diversificationData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Histórico Detalhado</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {diversificationData.slice().reverse().map((item, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-xs md:text-sm">
                          {item.competencia}
                        </div>
                        <div className="flex gap-4 md:gap-6 text-xs md:text-sm">
                          <div className="text-right">
                            <span className="text-muted-foreground">Ativos: </span>
                            <span className="font-semibold">{item.ativos}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Estratégias: </span>
                            <span className="font-semibold">{item.estrategias}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

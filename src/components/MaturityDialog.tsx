import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaturityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosData: any[];
}

export function MaturityDialog({ open, onOpenChange, dadosData }: MaturityDialogProps) {
  // Get most recent competencia
  const mostRecentCompetencia = dadosData.length > 0
    ? [...new Set(dadosData.map(item => item.Competencia))].sort((a, b) => {
        const [monthA, yearA] = a.split('/').map(Number);
        const [monthB, yearB] = b.split('/').map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      })[0]
    : null;

  // Filter data for most recent competencia
  const filteredData = dadosData.filter(item => item.Competencia === mostRecentCompetencia);

  // Get future maturities and group by year
  const now = new Date();
  const maturityData = filteredData
    .filter(item => item.Vencimento)
    .map(item => ({
      ...item,
      vencimentoDate: new Date(item.Vencimento!)
    }))
    .filter(item => item.vencimentoDate >= now)
    .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime());

  // Group by year for chart
  const yearlyGroups = maturityData.reduce((acc, item) => {
    const year = format(item.vencimentoDate, 'yyyy');
    if (!acc[year]) {
      acc[year] = {
        year: year,
        total: 0,
        count: 0
      };
    }
    acc[year].total += item.Posicao || 0;
    acc[year].count += 1;
    return acc;
  }, {} as Record<string, { year: string; total: number; count: number }>);

  const chartData = (Object.values(yearlyGroups) as Array<{ year: string; total: number; count: number }>)
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  const total = chartData.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold">Cronograma de Vencimentos</DialogTitle>
          <DialogDescription>
            Próximos vencimentos de títulos da carteira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total a Vencer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  {total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Títulos com Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  {maturityData.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Vencimentos por Ano</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <ChartContainer
                  config={{
                    total: {
                      label: "Valor",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[250px] md:h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="year" 
                        className="text-[10px] md:text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-[10px] md:text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => 
                          value >= 1000000 
                            ? `${(value / 1000000).toFixed(1)}M`
                            : `${(value / 1000).toFixed(0)}k`
                        }
                        width={45}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="total" 
                        fill="hsl(var(--primary))" 
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm md:text-base">
                Nenhum vencimento futuro encontrado
              </CardContent>
            </Card>
          )}

          {/* List of upcoming maturities */}
          {maturityData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Próximos Vencimentos</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto">
                  {maturityData.slice(0, 10).map((item, index) => (
                    <div 
                      key={index}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 md:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs md:text-sm truncate">{item.Ativo}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground truncate">{item.Emissor}</div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="font-semibold text-xs md:text-sm">
                          {(item.Posicao || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">
                          {format(item.vencimentoDate, 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

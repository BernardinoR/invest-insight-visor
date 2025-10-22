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

  // Get future maturities and group by month/year
  const now = new Date();
  const maturityData = filteredData
    .filter(item => item.Vencimento)
    .map(item => ({
      ...item,
      vencimentoDate: new Date(item.Vencimento!)
    }))
    .filter(item => item.vencimentoDate >= now)
    .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime());

  // Group by month for chart
  const monthlyGroups = maturityData.reduce((acc, item) => {
    const monthYear = format(item.vencimentoDate, 'MMM/yy', { locale: ptBR });
    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: monthYear,
        total: 0,
        count: 0
      };
    }
    acc[monthYear].total += item.Posicao || 0;
    acc[monthYear].count += 1;
    return acc;
  }, {} as Record<string, { month: string; total: number; count: number }>);

  const chartData = Object.values(monthlyGroups)
    .slice(0, 12) as Array<{ month: string; total: number; count: number }>; // Next 12 months

  const total = chartData.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Cronograma de Vencimentos</DialogTitle>
          <DialogDescription>
            Próximos vencimentos de títulos da carteira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total a Vencer (12 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Títulos com Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {maturityData.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Vencimentos por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    total: {
                      label: "Valor",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => 
                          value >= 1000000 
                            ? `${(value / 1000000).toFixed(1)}M`
                            : `${(value / 1000).toFixed(0)}k`
                        }
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
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum vencimento futuro encontrado
              </CardContent>
            </Card>
          )}

          {/* List of upcoming maturities */}
          {maturityData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Próximos Vencimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {maturityData.slice(0, 10).map((item, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.Ativo}</div>
                        <div className="text-xs text-muted-foreground">{item.Emissor}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          {(item.Posicao || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
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

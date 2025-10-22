import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaturityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosData: any[];
  clientName: string;
}

export function MaturityDialog({ open, onOpenChange, dadosData, clientName }: MaturityDialogProps) {
  // Get the most recent competencia
  const mostRecentCompetencia = dadosData.length > 0 
    ? dadosData.reduce((latest, current) => {
        return current.Competencia > latest.Competencia ? current : latest;
      }).Competencia
    : null;

  // Filter data for the most recent competencia
  const filteredData = mostRecentCompetencia 
    ? dadosData.filter(item => item.Competencia === mostRecentCompetencia)
    : [];

  // Get all maturities and group them by month/year
  const now = new Date();
  const validVencimentos = filteredData
    .filter(item => item.Vencimento)
    .map(item => ({
      ...item,
      vencimentoDate: new Date(item.Vencimento!)
    }))
    .filter(item => item.vencimentoDate >= now);

  // Group by month/year and sum positions
  const maturityByMonth = validVencimentos.reduce((acc, item) => {
    const monthYear = format(item.vencimentoDate, 'MMM/yy', { locale: ptBR });
    const fullDate = format(item.vencimentoDate, 'yyyy-MM', { locale: ptBR });
    
    if (!acc[fullDate]) {
      acc[fullDate] = {
        monthYear,
        total: 0,
        fullDate,
        count: 0
      };
    }
    
    acc[fullDate].total += item.Posicao || 0;
    acc[fullDate].count += 1;
    
    return acc;
  }, {} as Record<string, { monthYear: string; total: number; fullDate: string; count: number }>);

  // Convert to array and sort by date
  type ChartDataItem = { monthYear: string; total: number; fullDate: string; count: number };
  const chartData: ChartDataItem[] = (Object.values(maturityByMonth) as ChartDataItem[])
    .sort((a: ChartDataItem, b: ChartDataItem) => a.fullDate.localeCompare(b.fullDate))
    .slice(0, 12); // Show next 12 months


  // Color gradient for bars
  const getBarColor = (index: number) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--primary) / 0.9)',
      'hsl(var(--primary) / 0.8)',
      'hsl(var(--primary) / 0.7)',
      'hsl(var(--primary) / 0.6)',
    ];
    return colors[index % colors.length];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-text bg-clip-text text-transparent">
            Cronograma de Vencimentos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Distribuição dos vencimentos nos próximos 12 meses
          </p>
        </DialogHeader>

        <div className="mt-6">
          {chartData.length > 0 ? (
            <>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="monthYear" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Bar 
                      dataKey="total" 
                      radius={[8, 8, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-card p-4 rounded-lg border border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">Total a Vencer (12 meses)</div>
                  <div className="text-2xl font-bold text-foreground">
                    R$ {chartData.reduce((sum, item) => sum + item.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">Títulos com Vencimento</div>
                  <div className="text-2xl font-bold text-foreground">
                    {validVencimentos.length}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Próximos Vencimentos</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {validVencimentos
                    .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime())
                    .slice(0, 10)
                    .map((item, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center p-3 bg-gradient-card rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{item.Ativo}</div>
                          <div className="text-sm text-muted-foreground">{item.Emissor}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            R$ {item.Posicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(item.vencimentoDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum vencimento futuro encontrado</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

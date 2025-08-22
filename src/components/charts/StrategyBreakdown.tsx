import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = [
  'hsl(217 71% 53%)', // Blue
  'hsl(25 95% 53%)',  // Orange
  'hsl(142 71% 45%)', // Green  
  'hsl(262 83% 58%)', // Purple
  'hsl(346 87% 43%)', // Red/Pink
  'hsl(47 96% 53%)',  // Yellow
  'hsl(195 93% 46%)', // Cyan
  'hsl(271 81% 56%)', // Violet
];

interface StrategyBreakdownProps {
  dadosData: Array<{
    "Classe do ativo": string;
    Posicao: number;
    Rendimento: number;
  }>;
}

export function StrategyBreakdown({ dadosData }: StrategyBreakdownProps) {
  // Function to group strategy names
  const groupStrategy = (strategy: string): string => {
    const strategyLower = strategy.toLowerCase();
    
    if (strategyLower.includes('cdi - liquidez')) {
      return 'Conta';
    }
    if (strategyLower.includes('cdi - fundos') || strategyLower.includes('cdi - titulos') || 
        strategyLower.includes('inflação') || strategyLower.includes('pré fixado')) {
      return 'Renda Fixa';
    }
    if (strategyLower.includes('multimercado')) {
      return 'Multimercado';
    }
    if (strategyLower.includes('ações') || strategyLower.includes('imobiliário')) {
      return 'Renda Variável';
    }
    if (strategyLower.includes('private equity') || strategyLower.includes('exterior') || 
        strategyLower.includes('coe') || strategyLower.includes('ouro') || 
        strategyLower.includes('criptoativos')) {
      return 'Alternativo';
    }
    
    return 'Outros';
  };

  // Group investments by grouped asset class and calculate totals
  const strategyData = dadosData.reduce((acc, investment) => {
    const originalStrategy = investment["Classe do ativo"] || "Outros";
    const groupedStrategy = groupStrategy(originalStrategy);
    
    if (!acc[groupedStrategy]) {
      acc[groupedStrategy] = { 
        name: groupedStrategy, 
        value: 0, 
        count: 0,
        totalReturn: 0
      };
    }
    acc[groupedStrategy].value += Number(investment.Posicao) || 0;
    acc[groupedStrategy].totalReturn += (Number(investment.Rendimento) || 0) * (Number(investment.Posicao) || 0);
    acc[groupedStrategy].count += 1;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number; totalReturn: number }>);

  const totalPatrimonio = Object.values(strategyData).reduce((sum, item) => sum + item.value, 0);

  const chartData = Object.values(strategyData).map((item, index) => ({
    ...item,
    percentage: (item.value / totalPatrimonio) * 100,
    avgReturn: item.value > 0 ? (item.totalReturn / item.value) * 100 : 0,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground text-lg">Classes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b border-border/30 pb-2">
              <div>Nome</div>
              <div className="text-center">Alocação</div>
              <div className="text-right">Saldo Bruto</div>
              <div className="text-right">Mês</div>
              <div className="text-right">Ano</div>
              <div className="text-right">Início</div>
            </div>
            
            {chartData.map((item, index) => (
              <div key={item.name} className="grid grid-cols-6 gap-2 text-sm py-2 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="text-center text-foreground font-medium">
                  {item.percentage.toFixed(2)}%
                </div>
                <div className="text-right text-foreground">
                  {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-right text-foreground">
                  {item.avgReturn > 0 ? `${item.avgReturn.toFixed(2)}%` : '-'}
                </div>
                <div className="text-right text-foreground">
                  {item.avgReturn > 0 ? `${(item.avgReturn * 12).toFixed(2)}%` : '-'}
                </div>
                <div className="text-right text-foreground">
                  {item.avgReturn > 0 ? `${item.avgReturn.toFixed(2)}%` : '-'}
                </div>
              </div>
            ))}
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute flex flex-col items-center justify-center">
              <div className="text-xs text-muted-foreground mb-1">Patrimônio Bruto</div>
              <div className="text-xl font-bold text-foreground">
                {totalPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
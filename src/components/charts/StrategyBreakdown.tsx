import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(217 71% 53%)', // Blue - Pós Fixado - Liquidez
  'hsl(25 95% 53%)',  // Orange - Pós Fixado
  'hsl(142 71% 45%)', // Green - Inflação
  'hsl(262 83% 58%)', // Purple - Pré Fixado
  'hsl(346 87% 43%)', // Red - Multimercado
  'hsl(47 96% 53%)',  // Yellow - Imobiliário
  'hsl(195 93% 46%)', // Cyan - Ações
  'hsl(271 81% 56%)', // Violet - Ações Long Bias
  'hsl(160 84% 39%)', // Teal - Private Equity
  'hsl(24 70% 52%)',  // Brown - Exterior Ações
  'hsl(43 74% 49%)',  // Gold - Exterior Renda Fixa
  'hsl(291 47% 51%)', // Purple2 - COE
  'hsl(48 89% 60%)',  // Gold2 - Ouro
  'hsl(14 83% 53%)',  // Orange2 - Criptoativos
];

interface StrategyBreakdownProps {
  dadosData: Array<{
    "Classe do ativo": string;
    Posicao: number;
    Rendimento: number;
  }>;
}

export function StrategyBreakdown({ dadosData }: StrategyBreakdownProps) {
  // Function to group strategy names according to original specification
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
    if (strategyLower.includes('pré fixado - titulos') || strategyLower.includes('pré fixado - fundos')) {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md backdrop-blur-sm">
          <p className="text-foreground font-semibold">{data.name}</p>
          <p className="text-primary text-sm">
            R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted-foreground text-xs">
            {data.percentage.toFixed(2)}% do patrimônio
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground text-lg">Classes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground border-b border-border/30 pb-2">
              <div>Nome</div>
              <div className="text-center">Alocação</div>
              <div className="text-right">Saldo Bruto</div>
            </div>
            
            {chartData.map((item, index) => (
              <div key={item.name} className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-border/10 hover:bg-muted/30 transition-colors rounded-sm px-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
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
              </div>
            ))}
          </div>

          {/* Enhanced Donut Chart */}
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <defs>
                    {chartData.map((item, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={item.color} stopOpacity={1}/>
                        <stop offset="100%" stopColor={item.color} stopOpacity={0.8}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={110}
                    outerRadius={135}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#gradient-${index})`}
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Content with backdrop */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="bg-card/80 backdrop-blur-sm rounded-full px-4 py-3 border border-border/30 shadow-elegant-sm">
                  <div className="text-xs text-muted-foreground mb-1 text-center font-medium">
                    Patrimônio Bruto
                  </div>
                  <div className="text-lg font-bold text-foreground text-center">
                    {totalPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
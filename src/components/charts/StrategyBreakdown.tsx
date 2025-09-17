import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

interface StrategyBreakdownProps {
  dadosData: Array<{
    "Classe do ativo": string;
    Posicao: number;
    Rendimento: number;
    Competencia: string;
  }>;
}

export function StrategyBreakdown({ dadosData }: StrategyBreakdownProps) {
  // Filter to get only the most recent competencia within the filtered period (same logic as consolidated performance)
  const getMostRecentData = (data: typeof dadosData) => {
    if (data.length === 0) return [];
    
    // Convert competencia string to date for proper comparison
    const competenciaToDate = (competencia: string) => {
      const [month, year] = competencia.split('/');
      return new Date(parseInt(year), parseInt(month) - 1);
    };
    
    // Find the most recent competencia using date comparison
    const mostRecentCompetencia = data.reduce((latest, current) => {
      const latestDate = competenciaToDate(latest.Competencia);
      const currentDate = competenciaToDate(current.Competencia);
      return currentDate > latestDate ? current : latest;
    }).Competencia;
    
    // Return all records with the most recent competencia
    return data.filter(item => item.Competencia === mostRecentCompetencia);
  };

  const filteredData = getMostRecentData(dadosData);

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

  // Group investments by grouped asset class and calculate totals using filtered data
  const strategyData = filteredData.reduce((acc, investment) => {
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

  // Define the order for strategies
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

  const chartData = Object.values(strategyData)
    .map((item, index) => ({
      ...item,
      percentage: (item.value / totalPatrimonio) * 100,
      avgReturn: item.value > 0 ? (item.totalReturn / item.value) * 100 : 0,
      color: COLORS[strategyOrder.indexOf(item.name) !== -1 ? strategyOrder.indexOf(item.name) : index % COLORS.length]
    }))
    .sort((a, b) => {
      const indexA = strategyOrder.indexOf(a.name);
      const indexB = strategyOrder.indexOf(b.name);
      
      // If both strategies are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the array, maintain original order
      return 0;
    });

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
                    className="w-1 h-4 rounded-sm shadow-sm" 
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
              <ResponsiveContainer width="100%" height={400} minWidth={350}>
                <PieChart width={400} height={400}>
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
                    innerRadius={120}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
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
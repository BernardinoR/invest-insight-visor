import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PerformanceChart } from "./charts/PerformanceChart";
import { StrategyBreakdown } from "./charts/StrategyBreakdown";
import { MaturityTimeline } from "./charts/MaturityTimeline";
import { IssuerExposure } from "./charts/IssuerExposure";
import { PortfolioTable } from "./PortfolioTable";
import { InvestmentDetailsTable } from "./InvestmentDetailsTable";
import { ClientDataDisplay } from "./ClientDataDisplay";
import { useClientData } from "@/hooks/useClientData";
import { TrendingUp, DollarSign, Target, Building2, Calendar } from "lucide-react";

interface InvestmentDashboardProps {
  selectedClient: string;
}

export function InvestmentDashboard({ selectedClient }: InvestmentDashboardProps) {
  const { consolidadoData, dadosData, loading, totalPatrimonio, totalRendimento, hasData } = useClientData(selectedClient);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Investment Insight Visor</h1>
                <p className="text-sm text-muted-foreground">Relatório de Performance de Investimentos</p>
              </div>
            </div>
            <Button variant="outline" className="bg-card/50 border-primary/20 hover:bg-primary/10">
              Exportar Relatório
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">

        {/* Portfolio Overview */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Portfolio Performance</h2>
          <p className="text-muted-foreground">
            {selectedClient || "Selecione um cliente para visualizar os dados"}
            {selectedClient && hasData && " - Dados carregados"}
            {selectedClient && !hasData && loading && " - Carregando..."}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Total</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {hasData ? `R$ ${totalPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ --"}
              </div>
              <p className="text-xs text-success">
                {hasData ? "+0,58% no período" : "Aguardando dados"}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidade no mês</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {hasData ? `${(totalRendimento * 100).toFixed(2)}%` : "--%"}
              </div>
              <p className="text-xs text-success">
                {hasData ? "vs CDI: 4,4%" : "Aguardando dados"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Diversificação</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {hasData ? dadosData.length : "--"}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasData ? "Ativos na carteira" : "Aguardando dados"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Vencimento</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(() => {
                  if (!hasData || dadosData.length === 0) return "--";
                  
                  const now = new Date();
                  const validVencimentos = dadosData
                    .filter(item => item.Vencimento)
                    .map(item => ({ 
                      ...item, 
                      vencimentoDate: new Date(item.Vencimento!) 
                    }))
                    .filter(item => item.vencimentoDate >= now)
                    .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime());
                    
                  return validVencimentos.length > 0 
                    ? validVencimentos[0].vencimentoDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                    : "--";
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  if (!hasData || dadosData.length === 0) return "Aguardando dados";
                  
                  const now = new Date();
                  const validVencimentos = dadosData
                    .filter(item => item.Vencimento)
                    .map(item => ({ 
                      ...item, 
                      vencimentoDate: new Date(item.Vencimento!) 
                    }))
                    .filter(item => item.vencimentoDate >= now)
                    .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime());
                    
                  return validVencimentos.length > 0 
                    ? `R$ ${validVencimentos[0].Posicao.toLocaleString('pt-BR')}`
                    : "Nenhum vencimento futuro";
                })()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Data Display */}
        <ClientDataDisplay 
          consolidadoData={consolidadoData}
          dadosData={dadosData}
          loading={loading}
          clientName={selectedClient}
        />

        {/* Portfolio Table */}
        <div className="mb-8">
          <PortfolioTable selectedClient={selectedClient} />
        </div>

        {/* Strategy Breakdown */}
        {dadosData.length > 0 && (
          <div className="mb-8">
            <StrategyBreakdown dadosData={dadosData} />
          </div>
        )}

        {/* Investment Details Table */}
        <div className="mb-8">
          <InvestmentDetailsTable dadosData={dadosData} selectedClient={selectedClient} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MaturityTimeline />
          <IssuerExposure />
        </div>


        {/* Investment Details Table - moved to end */}
        {dadosData.length > 0 && (
          <div className="mb-8 mt-8">
            <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Retorno por Ativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // Function to group strategy names
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

                    // Group data by strategy
                    const groupedData = dadosData.reduce((acc, item) => {
                      const originalStrategy = item["Classe do ativo"] || "Outros";
                      const groupedStrategy = groupStrategy(originalStrategy);
                      
                      if (!acc[groupedStrategy]) {
                        acc[groupedStrategy] = [];
                      }
                      acc[groupedStrategy].push(item);
                      return acc;
                    }, {} as Record<string, typeof dadosData>);

                    // Calculate totals for each strategy
                    const strategyTotals = Object.entries(groupedData).map(([strategy, assets]) => {
                      const totalPosition = assets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                      const totalReturn = assets.reduce((sum, asset) => sum + ((asset.Rendimento || 0) * (asset.Posicao || 0)), 0);
                      const avgReturn = totalPosition > 0 ? (totalReturn / totalPosition) * 100 : 0;
                      
                      return {
                        strategy,
                        assets,
                        totalPosition,
                        avgReturn,
                        percentage: totalPatrimonio > 0 ? (totalPosition / totalPatrimonio) * 100 : 0
                      };
                    }).sort((a, b) => b.totalPosition - a.totalPosition);

                    return strategyTotals.map(({ strategy, assets, totalPosition, avgReturn, percentage }) => (
                      <div key={strategy} className="border border-border/50 rounded-lg bg-card/30">
                        {/* Strategy Header */}
                        <div className="p-4 border-b border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {percentage.toFixed(1)}%
                                </div>
                                <span className="font-semibold text-foreground">{strategy}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-right">
                                <div className="font-medium text-foreground">Posição</div>
                                <div className="text-muted-foreground">R$ {totalPosition.toLocaleString('pt-BR')}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-foreground">Rentabilidade</div>
                                <div className={avgReturn >= 0 ? "text-success" : "text-destructive"}>
                                  {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Assets List */}
                        <div className="divide-y divide-border/50">
                          {assets.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-foreground">{item.Ativo}</div>
                                    <div className="text-sm text-muted-foreground">{item.Emissor}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-right">
                                    <div className="font-medium text-foreground">R$ {item.Posicao.toLocaleString('pt-BR')}</div>
                                    <div className="text-muted-foreground">{item.Taxa}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-medium ${item.Rendimento >= 0 ? "text-success" : "text-destructive"}`}>
                                      {item.Rendimento >= 0 ? "+" : ""}{(item.Rendimento * 100).toFixed(2)}%
                                    </div>
                                    <div className="text-muted-foreground">
                                      {item.Vencimento ? new Date(item.Vencimento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : "-"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
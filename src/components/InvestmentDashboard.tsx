import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerformanceChart } from "./charts/PerformanceChart";
import { StrategyBreakdown } from "./charts/StrategyBreakdown";
import { MaturityTimeline } from "./charts/MaturityTimeline";
import { IssuerExposure } from "./charts/IssuerExposure";
import { PortfolioTable } from "./PortfolioTable";
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidade Média</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {hasData ? `${totalRendimento.toFixed(1)}%` : "--%"}
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
                {hasData && dadosData.length > 0 ? 
                  new Date(dadosData[0].Vencimento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : 
                  "--"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {hasData && dadosData.length > 0 ? 
                  `R$ ${dadosData[0].Posicao.toLocaleString('pt-BR')}` : 
                  "Aguardando dados"
                }
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PerformanceChart consolidadoData={consolidadoData} />
          <StrategyBreakdown dadosData={dadosData} />
          <MaturityTimeline />
          <IssuerExposure />
        </div>

        {/* Portfolio Table */}
        <PortfolioTable />
      </main>
    </div>
  );
}
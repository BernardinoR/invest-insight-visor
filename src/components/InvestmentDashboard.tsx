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

        {/* Strategy Breakdown */}
        {dadosData.length > 0 && (
          <div className="mb-8">
            <StrategyBreakdown dadosData={dadosData} />
          </div>
        )}

        {/* Investment Details Table */}
        <div className="mb-8">
          <InvestmentDetailsTable dadosData={dadosData} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MaturityTimeline />
          <IssuerExposure />
        </div>

        {/* Portfolio Table */}
        <PortfolioTable />

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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Rendimento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Emissor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.Ativo}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item["Classe do ativo"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          R$ {item.Posicao.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.Taxa}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.Rendimento >= 0 ? "default" : "destructive"}>
                            {(item.Rendimento * 100).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.Vencimento ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(item.Vencimento).toLocaleDateString('pt-BR')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.Emissor}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
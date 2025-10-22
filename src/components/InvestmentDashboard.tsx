import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Target, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useClientData } from "@/hooks/useClientData";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";
import { PortfolioTable } from "@/components/PortfolioTable";
import { CompetenciaSeletor } from "@/components/CompetenciaSeletor";
import { InvestmentDetailsTable } from "@/components/InvestmentDetailsTable";
import { StrategyBreakdown } from "@/components/charts/StrategyBreakdown";
import { MaturityTimeline } from "@/components/charts/MaturityTimeline";
import { IssuerExposure } from "@/components/charts/IssuerExposure";
import { StrategyScatterChart } from "@/components/charts/StrategyScatterChart";
import { ClientDataDisplay } from "@/components/ClientDataDisplay";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import { MaturityDialog } from "@/components/MaturityDialog";
import { DiversificationDialog } from "@/components/DiversificationDialog";
import { RiskManagement } from "@/components/charts/RiskManagement";

interface InvestmentDashboardProps {
  selectedClient: string;
}

export function InvestmentDashboard({ selectedClient }: InvestmentDashboardProps) {
  const { consolidadoData, dadosData, loading, totalPatrimonio, totalRendimento, hasData } = useClientData(selectedClient);
  const { marketData, clientTarget } = useMarketIndicators(selectedClient);
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());
  const [filteredRange, setFilteredRange] = useState<{ inicio: string; fim: string }>({ inicio: "", fim: "" });
  const [yearTotals, setYearTotals] = useState<{ totalPatrimonio: number; totalRendimento: number } | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [institutionCardData, setInstitutionCardData] = useState<any>(null);
  const [maturityDialogOpen, setMaturityDialogOpen] = useState(false);
  const [diversificationDialogOpen, setDiversificationDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'performance' | 'risk'>('performance');

  // Helper function to convert competencia string to comparable date
  const competenciaToDate = (competencia: string) => {
    const [month, year] = competencia.split('/');
    return new Date(parseInt(year), parseInt(month) - 1);
  };

  // Filter data based on selected competencia range and institution
  const getFilteredDadosData = (data: typeof dadosData) => {
    let filtered = data;
    
    // Apply date filter
    if (filteredRange.inicio && filteredRange.fim) {
      const startDate = competenciaToDate(filteredRange.inicio);
      const endDate = competenciaToDate(filteredRange.fim);
      
      filtered = filtered.filter(item => {
        const itemDate = competenciaToDate(item.Competencia);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    // Apply institution filter
    if (selectedInstitution) {
      filtered = filtered.filter(item => item.Instituicao === selectedInstitution);
    }
    
    return filtered;
  };

  const getFilteredConsolidadoData = (data: typeof consolidadoData) => {
    let filtered = data;
    
    // Apply date filter
    if (filteredRange.inicio && filteredRange.fim) {
      const startDate = competenciaToDate(filteredRange.inicio);
      const endDate = competenciaToDate(filteredRange.fim);
      
      filtered = filtered.filter(item => {
        const itemDate = competenciaToDate(item.Competencia);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    // Apply institution filter
    if (selectedInstitution) {
      filtered = filtered.filter(item => item.Instituicao === selectedInstitution);
    }
    
    return filtered;
  };

  const filteredDadosData = getFilteredDadosData(dadosData);
  const filteredConsolidadoData = getFilteredConsolidadoData(consolidadoData);

  const handleFilterChange = useCallback((inicioCompetencia: string, fimCompetencia: string) => {
    console.log('Filter changed:', { inicioCompetencia, fimCompetencia });
    setFilteredRange({ inicio: inicioCompetencia, fim: fimCompetencia });
  }, []);

  const handleYearTotalsChange = useCallback((totals: { totalPatrimonio: number; totalRendimento: number } | null) => {
    console.log('=== YEAR TOTALS RECEIVED IN DASHBOARD ===');
    console.log('Year totals received:', totals);
    setYearTotals(totals);
  }, []);

  // Calculate rendimento from the most recent competencia available - weighted average across all institutions
  const getRendimentoFromFinalCompetencia = () => {
    if (consolidadoData.length === 0) {
      return totalRendimento;
    }
    
    // Find the most recent competencia from all data (not filtered)
    const allCompetencias = consolidadoData.map(item => item.Competencia).filter(Boolean);
    if (allCompetencias.length === 0) {
      return totalRendimento;
    }
    
    // Sort by competencia (MM/YYYY format) to get the most recent
    const sortedCompetencias = allCompetencias.sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
    
    const mostRecentCompetencia = sortedCompetencias[0];
    
    // Find all entries with the most recent competencia
    const finalCompetenciaEntries = consolidadoData.filter(
      item => item.Competencia === mostRecentCompetencia
    );
    
    if (finalCompetenciaEntries.length === 0) {
      return totalRendimento;
    }
    
    // Calculate weighted average using patrimônio as weight
    const totalPatrimonioWeighted = finalCompetenciaEntries.reduce((sum, entry) => {
      return sum + (entry["Patrimonio Final"] || 0);
    }, 0);
    
    if (totalPatrimonioWeighted === 0) {
      return totalRendimento;
    }
    
    const weightedRendimento = finalCompetenciaEntries.reduce((sum, entry) => {
      const patrimonio = entry["Patrimonio Final"] || 0;
      const rendimento = entry.Rendimento || 0;
      return sum + (rendimento * patrimonio);
    }, 0);
    
    return weightedRendimento / totalPatrimonioWeighted;
  };

  

  // Calculate patrimônio from the final competencia selected - sum across all institutions
  const getPatrimonioFromFinalCompetencia = () => {
    if (!filteredRange.fim || filteredConsolidadoData.length === 0) {
      return totalPatrimonio; // fallback to original
    }
    
    // Find all entries with the final competencia and sum their patrimônio
    const finalCompetenciaEntries = filteredConsolidadoData.filter(
      item => item.Competencia === filteredRange.fim
    );
    
    const sumPatrimonio = finalCompetenciaEntries.reduce((sum, entry) => {
      return sum + (entry["Patrimonio Final"] || 0);
    }, 0);
    
    return sumPatrimonio > 0 ? sumPatrimonio : totalPatrimonio;
  };

  const copyShareLink = () => {
    const currentHost = window.location.origin;
    
    try {
      // Encode the client name properly for URL
      const encodedClient = encodeURIComponent(selectedClient);
      const shareUrl = `${currentHost}/client/${encodedClient}`;
      
      console.log('InvestmentDashboard - Original client name:', selectedClient);
      console.log('InvestmentDashboard - Encoded client name:', encodedClient);
      console.log('InvestmentDashboard - Generated share URL:', shareUrl);
      
      // Test the URL by creating a test URL object
      const testUrl = new URL(shareUrl);
      console.log('InvestmentDashboard - URL validation successful');
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Link copiado para o clipboard!");
        console.log('InvestmentDashboard - Link copied successfully');
      }).catch((err) => {
        console.error('InvestmentDashboard - Erro ao copiar o link:', err);
        toast.error("Erro ao copiar o link");
      });
      
    } catch (error) {
      console.error('InvestmentDashboard - Error generating share link:', error);
      toast.error("Erro ao gerar o link de compartilhamento");
    }
  };

  // Use yearTotals if available, otherwise fallback to original calculation
  const displayPatrimonio = yearTotals?.totalPatrimonio || getPatrimonioFromFinalCompetencia();
  const displayRendimentoValue = yearTotals?.totalRendimento !== undefined ? yearTotals.totalRendimento : getRendimentoFromFinalCompetencia();

  // Calculate patrimônio growth from previous month
  const getPatrimonioGrowth = () => {
    if (consolidadoData.length === 0) {
      return { growth: 0, hasData: false, previousPatrimonio: 0 };
    }

    // Apply institution filter if one is selected (to match displayPatrimonio calculation)
    const dataToUse = selectedInstitution 
      ? consolidadoData.filter(item => item.Instituicao === selectedInstitution)
      : consolidadoData;

    // Get all unique competencias and sort them CORRECTLY by date
    const allCompetencias = [...new Set(dataToUse.map(item => item.Competencia))].sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
    
    // Determine which competencia to use (filtered or latest available)
    const targetCompetencia = filteredRange.fim || allCompetencias[allCompetencias.length - 1];
    const currentCompetenciaIndex = allCompetencias.indexOf(targetCompetencia);
    
    if (currentCompetenciaIndex <= 0) {
      return { growth: 0, hasData: false, previousPatrimonio: 0 };
    }

    const previousCompetencia = allCompetencias[currentCompetenciaIndex - 1];
    
    // Calculate current month patrimônio - sum ALL entries for this competencia
    const currentMonthEntries = dataToUse.filter(item => item.Competencia === targetCompetencia);
    const currentPatrimonio = currentMonthEntries.reduce((sum, entry) => {
      const valor = Number(entry["Patrimonio Final"]) || 0;
      return sum + valor;
    }, 0);
    
    // Calculate previous month patrimônio - sum ALL entries for this competencia
    const previousMonthEntries = dataToUse.filter(item => item.Competencia === previousCompetencia);
    const previousPatrimonio = previousMonthEntries.reduce((sum, entry) => {
      const valor = Number(entry["Patrimonio Final"]) || 0;
      return sum + valor;
    }, 0);
    
    console.log('Patrimônio Growth Calculation:', {
      targetCompetencia,
      previousCompetencia,
      currentPatrimonio,
      previousPatrimonio,
      currentMonthEntriesCount: currentMonthEntries.length,
      previousMonthEntriesCount: previousMonthEntries.length,
      selectedInstitution,
      allCompetencias
    });
    
    if (previousPatrimonio === 0) {
      return { growth: 0, hasData: false, previousPatrimonio: 0 };
    }
    
    const growth = ((currentPatrimonio - previousPatrimonio) / previousPatrimonio) * 100;
    console.log('Final growth calculation:', { growth, currentPatrimonio, previousPatrimonio });
    return { growth, hasData: true, previousPatrimonio };
  };

  const patrimonioGrowth = getPatrimonioGrowth();

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
            <Button 
              variant="outline" 
              className="bg-card/50 border-primary/20 hover:bg-primary/10"
              onClick={copyShareLink}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar Link
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">

        {/* Portfolio Overview */}
        <div className="mb-8">
          <div 
            onClick={() => setViewMode(viewMode === 'performance' ? 'risk' : 'performance')}
            className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
          >
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {viewMode === 'performance' ? 'Portfolio Performance' : 'Gestão de Riscos'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {selectedClient || "Selecione um cliente para visualizar os dados"}
            {selectedClient && hasData && " - Dados carregados"}
            {selectedClient && !hasData && loading && " - Carregando..."}
          </p>
        </div>

        {/* Competencia Seletor */}
        <CompetenciaSeletor 
          selectedClient={selectedClient}
          onFilterChange={handleFilterChange}
        />
        
        {viewMode === 'performance' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Total</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-foreground">
                 {hasData ? `R$ ${displayPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ --"}
               </div>
               <p className={`text-xs ${patrimonioGrowth.hasData && patrimonioGrowth.growth >= 0 ? "text-success" : patrimonioGrowth.hasData ? "text-destructive" : "text-muted-foreground"}`}>
                 {patrimonioGrowth.hasData 
                   ? `${patrimonioGrowth.growth >= 0 ? "+" : ""}${patrimonioGrowth.growth.toFixed(2)}% em relação ao mês anterior`
                   : hasData ? "Sem mês anterior para comparar" : "Aguardando dados"
                 }
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
                 {(() => {
                   if (!hasData || consolidadoData.length === 0) return "--%";
                   
                   // Get all competencias and sort them properly
                   const allCompetencias = consolidadoData.map(item => item.Competencia).filter(Boolean);
                   if (allCompetencias.length === 0) return "--%";
                   
                   // Sort by competencia (MM/YYYY format) to get the most recent
                   const sortedCompetencias = allCompetencias.sort((a, b) => {
                     const [monthA, yearA] = a.split('/').map(Number);
                     const [monthB, yearB] = b.split('/').map(Number);
                     if (yearA !== yearB) return yearB - yearA;
                     return monthB - monthA;
                   });
                   
                   const mostRecentCompetencia = sortedCompetencias[0];
                   
                   // Get all entries for the most recent competencia
                   const mostRecentEntries = consolidadoData.filter(
                     item => item.Competencia === mostRecentCompetencia
                   );
                   
                   // Calculate weighted average rendimento
                   const totalPatrimonioWeighted = mostRecentEntries.reduce((sum, entry) => 
                     sum + (entry["Patrimonio Final"] || 0), 0);
                   
                   if (totalPatrimonioWeighted === 0) return "--%";
                   
                   const weightedRendimento = mostRecentEntries.reduce((sum, entry) => {
                     const patrimonio = entry["Patrimonio Final"] || 0;
                     const rendimento = entry.Rendimento || 0;
                     return sum + (rendimento * patrimonio);
                   }, 0);
                   
                   const avgRendimento = weightedRendimento / totalPatrimonioWeighted;
                   return `${(avgRendimento * 100).toFixed(2)}%`;
                 })()}
               </div>
                <p className="text-xs text-success">
                  {(() => {
                    if (!hasData) return "Aguardando dados";
                    
                    // Get the most recent competencia from consolidado data
                    const mostRecentCompetencia = consolidadoData.length > 0 
                      ? [...new Set(consolidadoData.map(item => item.Competencia))].sort((a, b) => {
                          const [monthA, yearA] = a.split('/').map(Number);
                          const [monthB, yearB] = b.split('/').map(Number);
                          if (yearA !== yearB) return yearB - yearA;
                          return monthB - monthA;
                        })[0]
                      : null;
                    
                    if (!mostRecentCompetencia) return "vs Meta: --";
                    
                    // Get the client target for this month
                    const targetData = marketData.find(item => item.competencia === mostRecentCompetencia);
                    
                    if (targetData && targetData.clientTarget !== 0) {
                      // Calculate actual monthly return
                      const mostRecentEntries = consolidadoData.filter(item => item.Competencia === mostRecentCompetencia);
                      const totalPatrimonioWeighted = mostRecentEntries.reduce((sum, entry) => sum + (entry["Patrimonio Final"] || 0), 0);
                      const weightedRendimento = mostRecentEntries.reduce((sum, entry) => {
                        const patrimonio = entry["Patrimonio Final"] || 0;
                        const rendimento = entry.Rendimento || 0;
                        return sum + (rendimento * patrimonio);
                      }, 0);
                      const avgRendimento = weightedRendimento / totalPatrimonioWeighted;
                      
                      // Calculate difference from target
                      const diff = (avgRendimento - targetData.clientTarget) * 100;
                      
                      return `Meta: ${(targetData.clientTarget * 100).toFixed(2)}% (${diff >= 0 ? "+" : ""}${diff.toFixed(2)}pp)`;
                    }
                    
                    return "vs Meta: --";
                  })()}
                </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-card border-border/50 shadow-elegant-md cursor-pointer hover:shadow-elegant-lg transition-all duration-300 group relative overflow-hidden"
            onClick={() => setDiversificationDialogOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Diversificação</CardTitle>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-foreground">
                 {(() => {
                   if (!hasData || filteredDadosData.length === 0) return "--";
                   
                   // Count unique assets for the selected competencia range
                   const finalCompetencia = filteredRange.fim;
                   if (!finalCompetencia) {
                     return filteredDadosData.length;
                   }
                   
                   // Filter data for the final competencia and count unique assets
                   const assetsInFinalCompetencia = filteredDadosData.filter(
                     item => item.Competencia === finalCompetencia
                   );
                   
                   return assetsInFinalCompetencia.length;
                 })()}
               </div>
              <p className="text-xs text-muted-foreground">
                {hasData ? "Ativos na carteira" : "Aguardando dados"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-card border-border/50 shadow-elegant-md cursor-pointer hover:shadow-elegant-lg transition-all duration-300 group relative overflow-hidden"
            onClick={() => setMaturityDialogOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Vencimento</CardTitle>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(() => {
                  if (!hasData || dadosData.length === 0) return "--";
                  
                  // Filter to get only the most recent competencia
                  const mostRecentCompetencia = dadosData.reduce((latest, current) => {
                    return current.Competencia > latest.Competencia ? current : latest;
                  }).Competencia;
                  
                  const filteredData = dadosData.filter(item => item.Competencia === mostRecentCompetencia);
                  
                  const now = new Date();
                  const validVencimentos = filteredData
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
                  
                  // Filter to get only the most recent competencia
                  const mostRecentCompetencia = dadosData.reduce((latest, current) => {
                    return current.Competencia > latest.Competencia ? current : latest;
                  }).Competencia;
                  
                  const filteredData = dadosData.filter(item => item.Competencia === mostRecentCompetencia);
                  
                  const now = new Date();
                  const validVencimentos = filteredData
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

        {/* Client Data Display - includes Performance chart, Consolidado Performance, Portfolio Table placeholder, and Institution Allocation placeholder */}
        <ClientDataDisplay 
          consolidadoData={filteredConsolidadoData}
          dadosData={filteredDadosData}
          loading={loading}
          clientName={selectedClient}
          originalConsolidadoData={consolidadoData}
          institutionCardData={institutionCardData}
          selectedInstitution={selectedInstitution}
          onInstitutionClick={(institution) => setSelectedInstitution(institution === selectedInstitution ? null : institution)}
          portfolioTableComponent={
            <PortfolioTable 
              selectedClient={selectedClient}
              onYearTotalsChange={handleYearTotalsChange}
              filteredConsolidadoData={filteredConsolidadoData}
              filteredRange={filteredRange}
              selectedInstitution={selectedInstitution}
              onInstitutionClick={(institution) => setSelectedInstitution(institution === selectedInstitution ? null : institution)}
              showInstitutionCard={false}
              onInstitutionCardRender={setInstitutionCardData}
            />
          }
        />
        </>
        )}

        {viewMode === 'performance' && (
          <>
            {/* Strategy Breakdown */}
            {filteredDadosData.length > 0 && (
              <div className="mb-8">
                <StrategyBreakdown dadosData={filteredDadosData} />
              </div>
            )}

            {/* Investment Details Table */}
            <div className="mb-8">
              <InvestmentDetailsTable 
                dadosData={filteredDadosData} 
                selectedClient={selectedClient} 
                filteredRange={filteredRange}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <MaturityTimeline selectedClient={selectedClient} dadosData={filteredDadosData} />
            </div>

            {/* Issuer Exposure Chart - Full Width */}
            <div className="mb-8">
              <IssuerExposure clientName={selectedClient} dadosData={filteredDadosData} />
            </div>

            {/* Strategy Scatter Chart */}
            <div className="mb-8">
              <StrategyScatterChart />
            </div>

            {/* Investment Details Table - moved to end */}
            {filteredDadosData.length > 0 && (
              <div className="mb-8 mt-8">
            <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Retorno por Ativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    // Strategy colors mapping
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

                    const getStrategyColor = (strategyName: string) => {
                      const index = strategyOrder.indexOf(strategyName);
                      return index !== -1 ? COLORS[index] : COLORS[0];
                    };

                    const toggleStrategy = (strategy: string) => {
                      const newExpanded = new Set(expandedStrategies);
                      if (newExpanded.has(strategy)) {
                        newExpanded.delete(strategy);
                      } else {
                        newExpanded.add(strategy);
                      }
                      setExpandedStrategies(newExpanded);
                    };

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

                    // Filter to get only data from the most recent competencia within the filtered period (same logic as consolidated performance)
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

                    const finalCompetenciaData = getMostRecentData(filteredDadosData);

                     // Group data by strategy using final competencia data only
                     const groupedData = finalCompetenciaData.reduce((acc, item) => {
                       const originalStrategy = item["Classe do ativo"] || "Outros";
                       const groupedStrategy = groupStrategy(originalStrategy);
                       
                       if (!acc[groupedStrategy]) {
                         acc[groupedStrategy] = [];
                       }
                       acc[groupedStrategy].push(item);
                       return acc;
                     }, {} as Record<string, typeof finalCompetenciaData>);

                    // Function to calculate compound returns
                    const calculateCompoundReturn = (monthlyReturns: number[]): number => {
                      if (monthlyReturns.length === 0) return 0;
                      return monthlyReturns.reduce((acc, monthReturn) => {
                        return (1 + acc) * (1 + monthReturn) - 1;
                      }, 0);
                    };

                    // Calculate returns for strategies
                    const calculateStrategyReturns = (strategy: string) => {
                      // Get all data for this strategy (using filteredDadosData which already respects the date filter)
                      const allStrategyData = filteredDadosData.filter(item => groupStrategy(item["Classe do ativo"] || "Outros") === strategy);
                      
                      if (allStrategyData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Convert competencia string to date for proper comparison
                      const competenciaToDate = (competencia: string) => {
                        const [month, year] = competencia.split('/');
                        return new Date(parseInt(year), parseInt(month) - 1);
                      };
                      
                      // Find the most recent competencia using date comparison (same logic as other components)
                      const mostRecentCompetencia = allStrategyData.reduce((latest, current) => {
                        const latestDate = competenciaToDate(latest.Competencia);
                        const currentDate = competenciaToDate(current.Competencia);
                        return currentDate > latestDate ? current : latest;
                      }).Competencia;
                      
                      // Get only assets from the most recent competencia for monthly return calculation
                      const lastMonthAssets = allStrategyData.filter(item => item.Competencia === mostRecentCompetencia);
                      const lastMonthTotalPosition = lastMonthAssets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                      const lastMonthTotalReturn = lastMonthAssets.reduce((sum, asset) => sum + ((asset.Rendimento || 0) * (asset.Posicao || 0)), 0);
                      const monthReturn = lastMonthTotalPosition > 0 ? (lastMonthTotalReturn / lastMonthTotalPosition) : 0;
                      
                      // Group by competencia for year and inception calculations
                      const competenciaGroups = allStrategyData.reduce((acc, item) => {
                        if (!acc[item.Competencia]) {
                          acc[item.Competencia] = [];
                        }
                        acc[item.Competencia].push(item);
                        return acc;
                      }, {} as Record<string, typeof allStrategyData>);
                      
                      const sortedCompetencias = Object.keys(competenciaGroups).sort();
                      
                      if (sortedCompetencias.length === 0) return { monthReturn, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Year return: compound return for the year of the most recent competencia (within filter)
                      const lastYear = mostRecentCompetencia.substring(3);
                      const yearCompetenciasInFilter = sortedCompetencias.filter(comp => comp.endsWith(lastYear));
                      
                      const yearReturns = yearCompetenciasInFilter.map(competencia => {
                        const competenciaAssets = competenciaGroups[competencia];
                        const totalPosition = competenciaAssets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                        const totalReturn = competenciaAssets.reduce((sum, asset) => sum + ((asset.Rendimento || 0) * (asset.Posicao || 0)), 0);
                        return totalPosition > 0 ? (totalReturn / totalPosition) : 0;
                      });
                      const yearReturn = calculateCompoundReturn(yearReturns);
                      
                      // Inception return: compound return for all competencias in filter
                      const monthlyReturns = sortedCompetencias.map(competencia => {
                        const competenciaAssets = competenciaGroups[competencia];
                        const totalPosition = competenciaAssets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                        const totalReturn = competenciaAssets.reduce((sum, asset) => sum + ((asset.Rendimento || 0) * (asset.Posicao || 0)), 0);
                        return totalPosition > 0 ? (totalReturn / totalPosition) : 0;
                      });
                      const inceptionReturn = calculateCompoundReturn(monthlyReturns);
                      
                      console.log(`${strategy} - Strategy Calculation:`, {
                        filteredRange,
                        sortedCompetencias,
                        mostRecentCompetencia,
                        yearCompetenciasInFilter,
                        monthReturn: (monthReturn * 100).toFixed(2) + '%',
                        yearReturn: (yearReturn * 100).toFixed(2) + '%',
                        inceptionReturn: (inceptionReturn * 100).toFixed(2) + '%'
                      });
                      
                      return { monthReturn, yearReturn, inceptionReturn };
                    };

                    // Calculate returns for individual assets
                    const calculateAssetReturns = (assetName: string) => {
                      // Get all data for this asset from filtered data
                      const allAssetData = filteredDadosData.filter(item => item.Ativo === assetName);
                      
                      if (allAssetData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Convert competencia string to date for proper comparison
                      const competenciaToDate = (competencia: string) => {
                        const [month, year] = competencia.split('/');
                        return new Date(parseInt(year), parseInt(month) - 1);
                      };
                      
                      // Find the most recent competencia using date comparison
                      const mostRecentCompetencia = allAssetData.reduce((latest, current) => {
                        const latestDate = competenciaToDate(latest.Competencia);
                        const currentDate = competenciaToDate(current.Competencia);
                        return currentDate > latestDate ? current : latest;
                      }).Competencia;
                      
                      // Get data from the most recent competencia for "Mês"
                      const lastMonthData = allAssetData.find(item => item.Competencia === mostRecentCompetencia);
                      const monthReturn = lastMonthData ? lastMonthData.Rendimento : 0;
                      
                       const sortedCompetencias = [...new Set(allAssetData.map(item => item.Competencia))].sort();
                       
                       if (sortedCompetencias.length === 0) return { monthReturn, yearReturn: 0, inceptionReturn: 0 };
                       
                       // Year return: compound return for the year of the most recent competencia
                       const lastYear = mostRecentCompetencia.substring(3);
                       const yearCompetenciasInFilter = sortedCompetencias.filter(comp => comp.endsWith(lastYear));
                       
                       const yearReturns = yearCompetenciasInFilter.map(competencia => {
                         const assetData = allAssetData.find(item => item.Competencia === competencia);
                         return assetData ? assetData.Rendimento : 0;
                       });
                       const yearReturn = calculateCompoundReturn(yearReturns);
                       
                       // Inception return: compound return for all competencias in filter
                       const monthlyReturns = sortedCompetencias.map(competencia => {
                         const assetData = allAssetData.find(item => item.Competencia === competencia);
                         return assetData ? assetData.Rendimento : 0;
                       });
                       const inceptionReturn = calculateCompoundReturn(monthlyReturns);
                       
                       return { monthReturn, yearReturn, inceptionReturn };
                    };

                    // Calculate totals for each strategy
                    const strategyTotals = Object.entries(groupedData).map(([strategy, assets]) => {
                      const totalPosition = assets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                      const returns = calculateStrategyReturns(strategy);
                      
                      return {
                        strategy,
                        assets,
                        totalPosition,
                        monthReturn: returns.monthReturn,
                        yearReturn: returns.yearReturn,
                        inceptionReturn: returns.inceptionReturn,
                        percentage: displayPatrimonio > 0 ? (totalPosition / displayPatrimonio) * 100 : 0
                      };
                    }).sort((a, b) => {
                      const indexA = strategyOrder.indexOf(a.strategy);
                      const indexB = strategyOrder.indexOf(b.strategy);
                      
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

                    return strategyTotals.map(({ strategy, assets, totalPosition, monthReturn, yearReturn, inceptionReturn, percentage }) => {
                      const isExpanded = expandedStrategies.has(strategy);
                      const strategyColor = getStrategyColor(strategy);
                      
                      return (
                        <Collapsible key={strategy} open={isExpanded} onOpenChange={() => toggleStrategy(strategy)}>
                          <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50">
                            {/* Strategy Header */}
                            <CollapsibleTrigger asChild>
                              <div 
                                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors border-l-4" 
                                style={{ borderLeftColor: strategyColor }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: strategyColor }}
                                      ></div>
                                      <span className="font-semibold text-foreground text-lg">{strategy}</span>
                                      <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {percentage.toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">Saldo</div>
                                      <div className="font-semibold text-foreground">R$ {totalPosition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                     <div className="text-right">
                                       <div className="text-sm text-muted-foreground">Rentabilidade</div>
                                       <div className={`font-semibold ${monthReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                         {monthReturn >= 0 ? "+" : ""}{(monthReturn * 100).toFixed(2)}%
                                       </div>
                                     </div>
                                    <div className="ml-2">
                                      {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            {/* Assets List */}
                            <CollapsibleContent className="animate-accordion-down">
                              <div className="border-t border-border/50 bg-muted/10">
                                {/* Table Header */}
                                <div className="grid grid-cols-9 gap-4 p-3 border-b border-border/30 bg-muted/20 text-xs font-medium text-muted-foreground">
                                  <div></div>
                                  <div className="text-center">Alocação / Qtd.</div>
                                  <div className="text-center">Saldo Bruto</div>
                                  <div className="text-center">Mês</div>
                                  <div className="text-center">Ano</div>
                                  <div className="text-center">Início</div>
                                  <div className="text-center">Emissor</div>
                                  <div className="text-center">Instituição</div>
                                  <div className="text-center">Vencimento</div>
                                </div>
                                
                                {/* Strategy Summary Row */}
                                <div className="grid grid-cols-9 gap-4 p-3 border-b border-border/30 bg-muted/30 text-sm font-semibold">
                                  <div className="text-foreground">{strategy}</div>
                                  <div className="text-center text-foreground">{percentage.toFixed(2)}%</div>
                                  <div className="text-center text-foreground">{totalPosition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-center">
                                    <div className="text-xs text-muted-foreground">Rent.</div>
                                    <div className={`font-medium ${monthReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                      {monthReturn >= 0 ? "+" : ""}{(monthReturn * 100).toFixed(2)}%
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-muted-foreground">Rent.</div>
                                    <div className={`font-medium ${yearReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                      {yearReturn >= 0 ? "+" : ""}{(yearReturn * 100).toFixed(2)}%
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-muted-foreground">Rent.</div>
                                    <div className={`font-medium ${inceptionReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                      {inceptionReturn >= 0 ? "+" : ""}{(inceptionReturn * 100).toFixed(2)}%
                                    </div>
                                  </div>
                                  <div className="text-center text-foreground">-</div>
                                  <div className="text-center text-foreground">-</div>
                                  <div className="text-center text-foreground">-</div>
                                </div>

                                {/* Benchmark Row */}
                                <div className="grid grid-cols-9 gap-4 p-3 border-b border-border/30 bg-muted/10 text-sm">
                                  <div className="text-muted-foreground">
                                    {(() => {
                                      switch (strategy) {
                                        case 'Pós Fixado - Liquidez':
                                        case 'Pós Fixado':
                                          return '% CDI';
                                        case 'Inflação':
                                          return '± IPCA';
                                        case 'Pré Fixado':
                                          return '± IRF-M';
                                        case 'Multimercado':
                                          return '% CDI';
                                        case 'Imobiliário':
                                          return '± IFIX';
                                        case 'Ações':
                                        case 'Ações - Long Bias':
                                          return '± IBOV';
                                        case 'Private Equity':
                                          return '% CDI';
                                        case 'Exterior - Renda Fixa':
                                          return '± T-Bond';
                                        case 'Exterior - Ações':
                                          return '± S&P500';
                                        case 'COE':
                                          return '% CDI';
                                        case 'Ouro':
                                          return '± Gold';
                                        case 'Criptoativos':
                                          return '± BTC';
                                        default:
                                          return '% CDI';
                                      }
                                    })()}
                                  </div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                  <div className="text-center text-muted-foreground">-</div>
                                </div>

                                 {/* Individual Assets */}
                                 {assets.map((item, index) => {
                                   const assetReturns = calculateAssetReturns(item.Ativo);
                                   return (
                                   <div key={item.id}>
                                      <div className="grid grid-cols-9 gap-4 p-3 hover:bg-muted/20 transition-colors text-sm">
                                        <div>
                                          <div className="font-medium text-foreground text-xs">{item.Ativo}</div>
                                        </div>
                                        <div className="text-center text-foreground text-xs">
                                          {displayPatrimonio > 0 ? `${((item.Posicao / displayPatrimonio) * 100).toFixed(2)}%` : "-"}
                                        </div>
                                        <div className="text-center text-foreground">{item.Posicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        <div className="text-center">
                                          <div className={`font-medium ${assetReturns.monthReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                            {assetReturns.monthReturn >= 0 ? "+" : ""}{(assetReturns.monthReturn * 100).toFixed(2)}%
                                          </div>
                                          <div className="text-xs text-muted-foreground">-</div>
                                        </div>
                                        <div className="text-center">
                                          <div className={`font-medium ${assetReturns.yearReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                            {assetReturns.yearReturn >= 0 ? "+" : ""}{(assetReturns.yearReturn * 100).toFixed(2)}%
                                          </div>
                                          <div className="text-xs text-muted-foreground">-</div>
                                        </div>
                                        <div className="text-center">
                                          <div className={`font-medium ${assetReturns.inceptionReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                            {assetReturns.inceptionReturn >= 0 ? "+" : ""}{(assetReturns.inceptionReturn * 100).toFixed(2)}%
                                          </div>
                                          <div className="text-xs text-muted-foreground">-</div>
                                        </div>
                                       <div className="text-center text-foreground text-xs">{item.Emissor || "-"}</div>
                                       <div className="text-center text-foreground text-xs">{item.Instituicao || "-"}</div>
                                       <div className="text-center text-foreground text-xs">
                                         {item.Vencimento ? new Date(item.Vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                       </div>
                                      </div>
                                     {index < assets.length - 1 && (
                                       <div className="border-b border-border/20"></div>
                                     )}
                                   </div>
                                   );
                  })}
               </div>
             </CollapsibleContent>
           </div>
         </Collapsible>
       );
     });
   })()}
 </div>
               </CardContent>
             </Card>
           </div>
            )}
          </>
        )}
        
        {/* Risk Management View */}
        {viewMode === 'risk' && (
          <div className="space-y-6">
            <RiskManagement 
              consolidadoData={filteredConsolidadoData}
              clientTarget={(clientTarget?.targetValue || 0) / 100}
            />
          </div>
        )}
      </main>

      <MaturityDialog
        open={maturityDialogOpen}
        onOpenChange={setMaturityDialogOpen}
        dadosData={dadosData}
      />

      <DiversificationDialog 
        open={diversificationDialogOpen}
        onOpenChange={setDiversificationDialogOpen}
        dadosData={dadosData}
      />
    </div>
  );
}
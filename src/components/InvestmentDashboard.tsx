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

interface InvestmentDashboardProps {
  selectedClient: string;
}

export function InvestmentDashboard({ selectedClient }: InvestmentDashboardProps) {
  const { consolidadoData, dadosData, loading, totalPatrimonio, totalRendimento, hasData } = useClientData(selectedClient);
  const { marketData } = useMarketIndicators(selectedClient);
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());
  const [filteredRange, setFilteredRange] = useState<{ inicio: string; fim: string }>({ inicio: "", fim: "" });

  // Helper function to convert competencia string to comparable date
  const competenciaToDate = (competencia: string) => {
    const [month, year] = competencia.split('/');
    return new Date(parseInt(year), parseInt(month) - 1);
  };

  // Filter data based on selected competencia range
  const getFilteredDadosData = (data: typeof dadosData) => {
    if (!filteredRange.inicio || !filteredRange.fim) return data;
    
    const startDate = competenciaToDate(filteredRange.inicio);
    const endDate = competenciaToDate(filteredRange.fim);
    
    return data.filter(item => {
      const itemDate = competenciaToDate(item.Competencia);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const getFilteredConsolidadoData = (data: typeof consolidadoData) => {
    if (!filteredRange.inicio || !filteredRange.fim) return data;
    
    const startDate = competenciaToDate(filteredRange.inicio);
    const endDate = competenciaToDate(filteredRange.fim);
    
    return data.filter(item => {
      const itemDate = competenciaToDate(item.Competencia);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredDadosData = getFilteredDadosData(dadosData);
  const filteredConsolidadoData = getFilteredConsolidadoData(consolidadoData);

  const handleFilterChange = useCallback((inicioCompetencia: string, fimCompetencia: string) => {
    console.log('Filter changed:', { inicioCompetencia, fimCompetencia });
    setFilteredRange({ inicio: inicioCompetencia, fim: fimCompetencia });
  }, []);

  // Calculate rendimento from the final competencia selected - weighted average across all institutions
  const getRendimentoFromFinalCompetencia = () => {
    if (!filteredRange.fim || filteredConsolidadoData.length === 0) {
      return totalRendimento; // fallback to original
    }
    
    // Find all entries with the final competencia
    const finalCompetenciaEntries = filteredConsolidadoData.filter(
      item => item.Competencia === filteredRange.fim
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

  const displayRendimento = getRendimentoFromFinalCompetencia();

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

  const displayPatrimonio = getPatrimonioFromFinalCompetencia();

  // Calculate patrimônio growth from previous month
  const getPatrimonioGrowth = () => {
    if (!filteredRange.fim || filteredConsolidadoData.length === 0) {
      return { growth: 0, hasData: false };
    }

    // Get all unique competencias and sort them
    const allCompetencias = [...new Set(filteredConsolidadoData.map(item => item.Competencia))].sort();
    const currentCompetenciaIndex = allCompetencias.indexOf(filteredRange.fim);
    
    if (currentCompetenciaIndex <= 0) {
      return { growth: 0, hasData: false };
    }

    const previousCompetencia = allCompetencias[currentCompetenciaIndex - 1];
    
    // Calculate current month patrimônio
    const currentMonthEntries = filteredConsolidadoData.filter(item => item.Competencia === filteredRange.fim);
    const currentPatrimonio = currentMonthEntries.reduce((sum, entry) => sum + (entry["Patrimonio Final"] || 0), 0);
    
    // Calculate previous month patrimônio
    const previousMonthEntries = filteredConsolidadoData.filter(item => item.Competencia === previousCompetencia);
    const previousPatrimonio = previousMonthEntries.reduce((sum, entry) => sum + (entry["Patrimonio Final"] || 0), 0);
    
    if (previousPatrimonio === 0) {
      return { growth: 0, hasData: false };
    }
    
    const growth = ((currentPatrimonio - previousPatrimonio) / previousPatrimonio) * 100;
    return { growth, hasData: true };
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Portfolio Performance</h2>
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
                   ? `${patrimonioGrowth.growth >= 0 ? "+" : ""}${patrimonioGrowth.growth.toFixed(2)}% vs mês anterior`
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
                 {hasData ? `${(displayRendimento * 100).toFixed(2)}%` : "--%"}
               </div>
               <p className="text-xs text-success">
                 {(() => {
                   if (!hasData) return "Aguardando dados";
                   
                   // Get IPCA for the selected month from marketData
                   const targetCompetencia = filteredRange.fim || 
                     (consolidadoData.length > 0 ? consolidadoData.reduce((latest, current) => {
                       return current.Competencia > latest.Competencia ? current : latest;
                     }).Competencia : null);
                   
                   if (!targetCompetencia) return "vs IPCA: --";
                   
                   const ipcaData = marketData.find(item => item.competencia === targetCompetencia);
                   if (ipcaData && ipcaData.ipca !== 0) {
                     return `vs IPCA: ${ipcaData.ipca >= 0 ? "+" : ""}${(ipcaData.ipca * 100).toFixed(2)}%`;
                   }
                   
                   return "vs IPCA: --";
                 })()}
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

          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Vencimento</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
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

        {/* Client Data Display */}
        <ClientDataDisplay 
          consolidadoData={filteredConsolidadoData}
          dadosData={filteredDadosData}
          loading={loading}
          clientName={selectedClient}
          originalConsolidadoData={consolidadoData}
        />

        {/* Portfolio Table */}
        <div className="mb-8">
          <PortfolioTable 
            selectedClient={selectedClient} 
            filteredConsolidadoData={consolidadoData}
            filteredRange={filteredRange}
          />
        </div>

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
          <IssuerExposure clientName={selectedClient} />
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

                    // Filter to get only data from the final competencia selected in filter
                    const getFilteredFinalCompetenciaData = (data: typeof dadosData) => {
                      if (data.length === 0) return [];
                      
                      // Use the final competencia from filter if available, otherwise use the most recent
                      const targetCompetencia = filteredRange.fim || data.reduce((latest, current) => {
                        return current.Competencia > latest.Competencia ? current : latest;
                      }).Competencia;
                      
                      // Return all records with the target competencia
                      return data.filter(item => item.Competencia === targetCompetencia);
                    };

                    const finalCompetenciaData = getFilteredFinalCompetenciaData(filteredDadosData);

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
                      // Get all data for this strategy (using original dadosData to respect filter)
                      const allStrategyData = filteredDadosData.filter(item => groupStrategy(item["Classe do ativo"] || "Outros") === strategy);
                      
                      if (allStrategyData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Apply filter to get filtered data
                      const filteredStrategyData = filteredRange.inicio && filteredRange.fim 
                        ? allStrategyData.filter(item => item.Competencia >= filteredRange.inicio && item.Competencia <= filteredRange.fim)
                        : allStrategyData;
                      
                      if (filteredStrategyData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Group by competencia
                      const competenciaGroups = filteredStrategyData.reduce((acc, item) => {
                        if (!acc[item.Competencia]) {
                          acc[item.Competencia] = [];
                        }
                        acc[item.Competencia].push(item);
                        return acc;
                      }, {} as Record<string, typeof filteredStrategyData>);
                      
                      const sortedCompetencias = Object.keys(competenciaGroups).sort();
                      
                      if (sortedCompetencias.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Last competencia for "Mês"
                      const lastCompetencia = sortedCompetencias[sortedCompetencias.length - 1];
                      const lastMonthAssets = competenciaGroups[lastCompetencia];
                      const lastMonthTotalPosition = lastMonthAssets.reduce((sum, asset) => sum + (asset.Posicao || 0), 0);
                      const lastMonthTotalReturn = lastMonthAssets.reduce((sum, asset) => sum + ((asset.Rendimento || 0) * (asset.Posicao || 0)), 0);
                      const monthReturn = lastMonthTotalPosition > 0 ? (lastMonthTotalReturn / lastMonthTotalPosition) : 0;
                      
                      // Year return: compound return for the year of the last competencia (within filter)
                      const lastYear = lastCompetencia.substring(3);
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
                        lastCompetencia,
                        yearCompetenciasInFilter,
                        monthReturn: (monthReturn * 100).toFixed(2) + '%',
                        yearReturn: (yearReturn * 100).toFixed(2) + '%',
                        inceptionReturn: (inceptionReturn * 100).toFixed(2) + '%'
                      });
                      
                      return { monthReturn, yearReturn, inceptionReturn };
                    };

                    // Calculate returns for individual assets
                    const calculateAssetReturns = (assetName: string) => {
                      // Get all data for this asset (using original dadosData to respect filter)
                      const allAssetData = dadosData.filter(item => item.Ativo === assetName);
                      
                      if (allAssetData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Apply filter to get filtered data
                      const filteredAssetData = filteredRange.inicio && filteredRange.fim 
                        ? allAssetData.filter(item => item.Competencia >= filteredRange.inicio && item.Competencia <= filteredRange.fim)
                        : allAssetData;
                      
                      if (filteredAssetData.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      const sortedCompetencias = [...new Set(filteredAssetData.map(item => item.Competencia))].sort();
                      
                      if (sortedCompetencias.length === 0) return { monthReturn: 0, yearReturn: 0, inceptionReturn: 0 };
                      
                      // Last competencia for "Mês"
                      const lastCompetencia = sortedCompetencias[sortedCompetencias.length - 1];
                      const lastMonthData = filteredAssetData.find(item => item.Competencia === lastCompetencia);
                      const monthReturn = lastMonthData ? lastMonthData.Rendimento : 0;
                      
                      // Year return: compound return for the year of the last competencia (within filter)
                      const lastYear = lastCompetencia.substring(3);
                      const yearCompetenciasInFilter = sortedCompetencias.filter(comp => comp.endsWith(lastYear));
                      
                      const yearReturns = yearCompetenciasInFilter.map(competencia => {
                        const assetData = filteredAssetData.find(item => item.Competencia === competencia);
                        return assetData ? assetData.Rendimento : 0;
                      });
                      const yearReturn = calculateCompoundReturn(yearReturns);
                      
                      // Inception return: compound return for all competencias in filter
                      const monthlyReturns = sortedCompetencias.map(competencia => {
                        const assetData = filteredAssetData.find(item => item.Competencia === competencia);
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
      </main>
    </div>
  );
}
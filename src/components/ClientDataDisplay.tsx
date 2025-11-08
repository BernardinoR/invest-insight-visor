import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, TrendingUp, Calendar, Target } from "lucide-react";
import { InstitutionAllocationCard } from "./InstitutionAllocationCard";
import { useCurrency } from "@/contexts/CurrencyContext";

const PerformanceChart = lazy(() => import('./charts/PerformanceChart').then(m => ({ default: m.PerformanceChart })));

interface ConsolidadoPerformance {
  id: number;
  Data: string;
  Competencia: string;
  "Patrimonio Inicial": number;
  "Movimentação": number;
  Impostos: number;
  "Patrimonio Final": number;
  "Ganho Financeiro": number;
  Rendimento: number;
  Nome: string;
  Instituicao: string;
  Moeda?: string;
  nomeConta?: string;
}

interface DadosPerformance {
  id: number;
  Data: string;
  Posicao: number;
  Vencimento: string;
  Competencia: string;
  Rendimento: number;
  Taxa: string;
  Ativo: string;
  Emissor: string;
  "Classe do ativo": string;
  Nome: string;
  Instituicao: string;
  nomeConta?: string;
}

interface ClientDataDisplayProps {
  consolidadoData: ConsolidadoPerformance[];
  dadosData: DadosPerformance[];
  loading: boolean;
  clientName: string;
  originalConsolidadoData?: ConsolidadoPerformance[]; // Original unfiltered data for latest month display
  portfolioTableComponent?: React.ReactNode; // Portfolio Table to be inserted
  institutionCardData?: {
    allInstitutionData: Array<{
      institution: string;
      patrimonio: number;
      rendimento: number;
      percentage: number;
      color: string;
      nomeConta?: string;
      moedaOrigem?: string;
    }>;
    filteredInstitutionData: Array<{
      institution: string;
      patrimonio: number;
      rendimento: number;
      percentage: number;
      color: string;
      nomeConta?: string;
      moedaOrigem?: string;
    }>;
    totalPatrimonio: number;
    filteredTotalPatrimonio: number;
  };
  selectedRows?: string[];
  onToggleRow?: (institution: string, account?: string) => void;
  onClearFilters?: () => void;
  totalPatrimonio?: number;
  marketData?: any;
  clientTarget?: any;
}

export const ClientDataDisplay = React.memo(({ 
  consolidadoData, 
  dadosData, 
  loading, 
  clientName, 
  originalConsolidadoData, 
  portfolioTableComponent, 
  institutionCardData, 
  selectedRows = [],
  onToggleRow,
  onClearFilters,
  totalPatrimonio = 0,
  marketData, 
  clientTarget 
}: ClientDataDisplayProps) => {
  const { convertValue, adjustReturnWithFX, convertGanhoFinanceiro, getGanhoFinanceiroBreakdown, formatCurrency, getCompetenciaAnterior, currency } = useCurrency();
  
  if (!clientName) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Carregando dados...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter to get only the most recent competencia
  const getMostRecentData = (data: ConsolidadoPerformance[]) => {
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

  // Use filtered data to get the most recent competencia within the selected period
  const filteredConsolidadoData = getMostRecentData(consolidadoData);

  return (
    <div className="space-y-6 mb-8">
      {/* Performance Chart - positioned FIRST */}
      {filteredConsolidadoData.length > 0 && (
        <Suspense fallback={
          <Card className="bg-gradient-card border-border/50 shadow-elegant-md h-96 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando gráfico...</div>
          </Card>
        }>
          <PerformanceChart consolidadoData={consolidadoData} clientName={clientName} marketData={marketData} clientTarget={clientTarget} />
        </Suspense>
      )}

      {/* Consolidado Performance */}
      {filteredConsolidadoData.length > 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Consolidada - Competência Mais Recente
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Competência: {filteredConsolidadoData[0]?.Competencia} - Diferentes Instituições
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Patrimônio Inicial</TableHead>
                  <TableHead>Movimentação</TableHead>
                  <TableHead>Impostos</TableHead>
                  <TableHead>Ganho Financeiro</TableHead>
                  <TableHead>Patrimônio Final</TableHead>
                  <TableHead>Rendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsolidadoData.map((item) => {
                  const moedaOriginal = item.Moeda === 'Dolar' ? 'USD' : 'BRL';
                  const competenciaAnterior = getCompetenciaAnterior(item.Competencia);
                  
                  const patrimonioInicial = convertValue(
                    item["Patrimonio Inicial"], 
                    competenciaAnterior, 
                    moedaOriginal
                  );
                  const movimentacao = convertValue(
                    item["Movimentação"], 
                    item.Competencia, 
                    moedaOriginal
                  );
                  const impostos = convertValue(
                    item.Impostos, 
                    item.Competencia, 
                    moedaOriginal
                  );
                  const ganhoFinanceiro = convertGanhoFinanceiro(
                    item["Ganho Financeiro"],
                    item["Patrimonio Inicial"],
                    item.Competencia,
                    moedaOriginal
                  );
                  const patrimonioFinal = convertValue(
                    item["Patrimonio Final"], 
                    item.Competencia, 
                    moedaOriginal
                  );
                  
                  const rendimentoAjustado = adjustReturnWithFX(
                    item.Rendimento, 
                    item.Competencia, 
                    moedaOriginal
                  );
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.Instituicao}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(patrimonioInicial)}
                      </TableCell>
                      <TableCell className={movimentacao >= 0 ? "text-success" : "text-destructive"}>
                        {formatCurrency(movimentacao)}
                      </TableCell>
                      <TableCell className={impostos >= 0 ? "text-muted-foreground" : "text-destructive"}>
                        {formatCurrency(impostos)}
                      </TableCell>
                      <TableCell className={ganhoFinanceiro >= 0 ? "text-success" : "text-destructive"}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">
                                {formatCurrency(ganhoFinanceiro)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {(() => {
                                const breakdown = getGanhoFinanceiroBreakdown(
                                  item["Ganho Financeiro"],
                                  item["Patrimonio Inicial"],
                                  item.Competencia,
                                  moedaOriginal
                                );
                                
                                const isConversao = moedaOriginal !== currency;
                                
                                return (
                                  <div className="space-y-1.5">
                                    <div className="font-semibold text-sm border-b pb-1">
                                      Decomposição do Ganho
                                    </div>
                                    <div className="flex justify-between gap-4 text-xs">
                                      <span className="text-muted-foreground">Rentabilidade:</span>
                                      <span className="font-medium">{formatCurrency(breakdown.rentabilidade)}</span>
                                    </div>
                                    {isConversao && (
                                      <div className="flex justify-between gap-4 text-xs">
                                        <span className="text-muted-foreground">Efeito Cambial:</span>
                                        <span className={breakdown.efeitoCambial >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                                          {formatCurrency(breakdown.efeitoCambial)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between gap-4 text-xs border-t pt-1 mt-1">
                                      <span className="font-semibold">Total:</span>
                                      <span className="font-semibold">{formatCurrency(breakdown.total)}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(patrimonioFinal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rendimentoAjustado >= 0 ? "default" : "destructive"}>
                          {(rendimentoAjustado * 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Table - Resumo do Patrimônio */}
      {portfolioTableComponent && (
        <div className="mb-6">
          {portfolioTableComponent}
        </div>
      )}

      {/* Institution allocation with inline filters */}
      {institutionCardData && (
        <div className="space-y-4">
          {(() => {
            console.log('📊 ClientDataDisplay - Renderizando InstitutionAllocationCard:', {
              allCount: institutionCardData.allInstitutionData.length,
              filteredCount: institutionCardData.filteredInstitutionData.length,
              totalGeral: institutionCardData.totalPatrimonio,
              totalFiltrado: institutionCardData.filteredTotalPatrimonio
            });
            return null;
          })()}
          
          <InstitutionAllocationCard
            allInstitutionData={institutionCardData.allInstitutionData}
            filteredInstitutionData={institutionCardData.filteredInstitutionData}
            totalPatrimonio={institutionCardData.totalPatrimonio}
            filteredTotalPatrimonio={institutionCardData.filteredTotalPatrimonio}
            selectedRows={selectedRows}
            onToggleRow={onToggleRow}
          />
        </div>
      )}

      {consolidadoData.length === 0 && dadosData.length === 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              Nenhum dado encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Não foram encontrados dados para o cliente "{clientName}".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparar institutionCardData profundamente
  const institutionDataEqual = 
    prevProps.institutionCardData?.allInstitutionData?.length === 
    nextProps.institutionCardData?.allInstitutionData?.length &&
    prevProps.institutionCardData?.filteredInstitutionData?.length === 
    nextProps.institutionCardData?.filteredInstitutionData?.length &&
    prevProps.institutionCardData?.totalPatrimonio === 
    nextProps.institutionCardData?.totalPatrimonio &&
    prevProps.institutionCardData?.filteredTotalPatrimonio === 
    nextProps.institutionCardData?.filteredTotalPatrimonio;

  return (
    prevProps.loading === nextProps.loading &&
    prevProps.clientName === nextProps.clientName &&
    prevProps.consolidadoData.length === nextProps.consolidadoData.length &&
    prevProps.dadosData.length === nextProps.dadosData.length &&
    prevProps.selectedRows?.length === nextProps.selectedRows?.length &&
    prevProps.marketData?.length === nextProps.marketData?.length &&
    prevProps.clientTarget?.targetValue === nextProps.clientTarget?.targetValue &&
    institutionDataEqual
  );
});

ClientDataDisplay.displayName = 'ClientDataDisplay';
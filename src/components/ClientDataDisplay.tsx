import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, TrendingUp, Calendar, Target } from "lucide-react";
import { PerformanceChart } from "./charts/PerformanceChart";
import { InstitutionAllocationCard } from "./InstitutionAllocationCard";

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
}

interface ClientDataDisplayProps {
  consolidadoData: ConsolidadoPerformance[];
  dadosData: DadosPerformance[];
  loading: boolean;
  clientName: string;
  originalConsolidadoData?: ConsolidadoPerformance[]; // Original unfiltered data for latest month display
  portfolioTableComponent?: React.ReactNode; // Portfolio Table to be inserted
  institutionCardData?: {
    institutionData: Array<{
      institution: string;
      patrimonio: number;
      rendimento: number;
      percentage: number;
      color: string;
    }>;
    totalPatrimonio: number;
  };
  selectedInstitution?: string | null;
  onInstitutionClick?: (institution: string) => void;
  marketData?: any;
  clientTarget?: any;
}

export function ClientDataDisplay({ consolidadoData, dadosData, loading, clientName, originalConsolidadoData, portfolioTableComponent, institutionCardData, selectedInstitution, onInstitutionClick, marketData, clientTarget }: ClientDataDisplayProps) {
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
        <PerformanceChart consolidadoData={consolidadoData} clientName={clientName} marketData={marketData} clientTarget={clientTarget} />
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
                {filteredConsolidadoData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.Instituicao}
                    </TableCell>
                    <TableCell>
                      R$ {item["Patrimonio Inicial"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={item["Movimentação"] >= 0 ? "text-success" : "text-destructive"}>
                      R$ {item["Movimentação"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={item.Impostos >= 0 ? "text-muted-foreground" : "text-destructive"}>
                      R$ {item.Impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={item["Ganho Financeiro"] >= 0 ? "text-success" : "text-destructive"}>
                      R$ {item["Ganho Financeiro"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {item["Patrimonio Final"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.Rendimento >= 0 ? "default" : "destructive"}>
                        {(item.Rendimento * 100).toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Alocação por Instituição */}
      {institutionCardData && (
        <InstitutionAllocationCard
          institutionData={institutionCardData.institutionData}
          totalPatrimonio={institutionCardData.totalPatrimonio}
          selectedInstitution={selectedInstitution}
          onInstitutionClick={onInstitutionClick}
        />
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
}
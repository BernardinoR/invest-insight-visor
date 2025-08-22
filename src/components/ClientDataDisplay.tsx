import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, TrendingUp, Calendar, Target } from "lucide-react";
import { PerformanceChart } from "./charts/PerformanceChart";
import { StrategyBreakdown } from "./charts/StrategyBreakdown";

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
}

export function ClientDataDisplay({ consolidadoData, dadosData, loading, clientName }: ClientDataDisplayProps) {
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

  return (
    <div className="space-y-6 mb-8">
      {/* Consolidado Performance */}
      {consolidadoData.length > 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Consolidada - {clientName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Patrimônio Inicial</TableHead>
                  <TableHead>Movimentação</TableHead>
                  <TableHead>Patrimônio Final</TableHead>
                  <TableHead>Rendimento</TableHead>
                  <TableHead>Instituição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidadoData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.Data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {item.Competencia}
                    </TableCell>
                    <TableCell>
                      R$ {item["Patrimonio Inicial"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={item["Movimentação"] >= 0 ? "text-success" : "text-destructive"}>
                      R$ {item["Movimentação"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {item["Patrimonio Final"].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.Rendimento >= 0 ? "default" : "destructive"}>
                        {(item.Rendimento * 100).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.Instituicao}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Performance Chart - positioned after Consolidado Performance */}
      {consolidadoData.length > 0 && (
        <PerformanceChart consolidadoData={consolidadoData} />
      )}

      {/* Strategy Breakdown - positioned after Performance Chart */}
      {dadosData.length > 0 && (
        <StrategyBreakdown dadosData={dadosData} />
      )}

      {/* Dados Performance */}
      {dadosData.length > 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Detalhes dos Investimentos - {clientName}
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
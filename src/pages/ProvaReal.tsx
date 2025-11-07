import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePTAXData } from "@/hooks/usePTAXData";
import { useCDIData } from "@/hooks/useCDIData";
import { useMarketIndicators } from "@/hooks/useMarketIndicators";

interface ProvaRealData {
  competencia: string;
  ptaxCotacao: number | null;
  ptaxData: string | null;
  cdiMensal: number | null;
  cdiAcumulado: number | null;
  ipcaMensal: number | null;
  ipcaAcumulado: number | null;
  ibovespaMensal: number | null;
  ibovespaAcumulado: number | null;
  ifixMensal: number | null;
  ifixAcumulado: number | null;
  metaCliente: number | null;
}

export default function ProvaReal() {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const decodedClientName = clientName ? decodeURIComponent(clientName) : "";

  // Fetch data from all sources
  const { ptaxData, loading: ptaxLoading, error: ptaxError } = usePTAXData();
  const { cdiData, loading: cdiLoading, error: cdiError } = useCDIData();
  const { marketData, clientTarget, loading: marketLoading, error: marketError } = useMarketIndicators(decodedClientName);

  // Consolidate all data by competencia
  const consolidatedData: ProvaRealData[] = (() => {
    const dataMap = new Map<string, ProvaRealData>();

    // Add PTAX data
    ptaxData.forEach(item => {
      if (!dataMap.has(item.competencia)) {
        dataMap.set(item.competencia, {
          competencia: item.competencia,
          ptaxCotacao: null,
          ptaxData: null,
          cdiMensal: null,
          cdiAcumulado: null,
          ipcaMensal: null,
          ipcaAcumulado: null,
          ibovespaMensal: null,
          ibovespaAcumulado: null,
          ifixMensal: null,
          ifixAcumulado: null,
          metaCliente: null,
        });
      }
      const data = dataMap.get(item.competencia)!;
      data.ptaxCotacao = item.cotacao;
      data.ptaxData = item.data;
    });

    // Add CDI data
    cdiData.forEach(item => {
      if (!dataMap.has(item.competencia)) {
        dataMap.set(item.competencia, {
          competencia: item.competencia,
          ptaxCotacao: null,
          ptaxData: null,
          cdiMensal: null,
          cdiAcumulado: null,
          ipcaMensal: null,
          ipcaAcumulado: null,
          ibovespaMensal: null,
          ibovespaAcumulado: null,
          ifixMensal: null,
          ifixAcumulado: null,
          metaCliente: null,
        });
      }
      const data = dataMap.get(item.competencia)!;
      data.cdiMensal = item.cdiRate;
      data.cdiAcumulado = item.cdiAccumulated;
    });

    // Add market indicators data
    marketData.forEach(item => {
      if (!dataMap.has(item.competencia)) {
        dataMap.set(item.competencia, {
          competencia: item.competencia,
          ptaxCotacao: null,
          ptaxData: null,
          cdiMensal: null,
          cdiAcumulado: null,
          ipcaMensal: null,
          ipcaAcumulado: null,
          ibovespaMensal: null,
          ibovespaAcumulado: null,
          ifixMensal: null,
          ifixAcumulado: null,
          metaCliente: null,
        });
      }
      const data = dataMap.get(item.competencia)!;
      data.ipcaMensal = item.ipca;
      data.ipcaAcumulado = item.accumulatedIpca;
      data.ibovespaMensal = item.ibovespa;
      data.ibovespaAcumulado = item.accumulatedIbovespa;
      data.ifixMensal = item.ifix;
      data.ifixAcumulado = item.accumulatedIfix;
      data.metaCliente = item.clientTarget;
    });

    // Convert to array and sort by competencia (descending)
    return Array.from(dataMap.values()).sort((a, b) => {
      const [monthA, yearA] = a.competencia.split('/').map(Number);
      const [monthB, yearB] = b.competencia.split('/').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
  })();

  const isLoading = ptaxLoading || cdiLoading || marketLoading;
  const hasError = ptaxError || cdiError || marketError;

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return date;
  };

  const getStatusIcon = (loading: boolean, error: string | null) => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/data-management/${encodeURIComponent(decodedClientName)}`)}
              className="bg-card/50 border-primary/20 hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Gerenciar Dados
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Prova Real - Dados das APIs
              </h1>
              <p className="text-muted-foreground">
                Auditoria de dados de mercado por competência {decodedClientName && `- ${decodedClientName}`}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">PTAX (Dólar)</CardTitle>
                    {getStatusIcon(ptaxLoading, ptaxError)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {ptaxError ? `Erro: ${ptaxError}` : `${ptaxData.length} competências carregadas`}
                  </p>
                </CardContent>
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">API do PTAX</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Fonte:</p>
                    <a 
                      href="https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/aplicacao#!/recursos" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Banco Central do Brasil - PTAX
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Endpoint:</p>
                    <code className="text-xs bg-muted p-1 rounded block break-all mt-1">
                      https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo
                    </code>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">CDI</CardTitle>
                    {getStatusIcon(cdiLoading, cdiError)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {cdiError ? `Erro: ${cdiError}` : `${cdiData.length} competências carregadas`}
                  </p>
                </CardContent>
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">API do CDI</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Fonte:</p>
                    <a 
                      href="https://www3.bcb.gov.br/sgspub/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Banco Central - SGS (Série 12)
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Endpoint:</p>
                    <code className="text-xs bg-muted p-1 rounded block break-all mt-1">
                      https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json
                    </code>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Indicadores de Mercado</CardTitle>
                    {getStatusIcon(marketLoading, marketError)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {marketError ? `Erro: ${marketError}` : `${marketData.length} competências carregadas`}
                  </p>
                </CardContent>
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">APIs dos Indicadores de Mercado</h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-medium">IPCA</p>
                    <a 
                      href="https://www3.bcb.gov.br/sgspub/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs"
                    >
                      Banco Central - SGS (Série 433)
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <code className="text-xs bg-muted p-1 rounded block break-all mt-1">
                      https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json
                    </code>
                  </div>
                  <div>
                    <p className="font-medium">Ibovespa</p>
                    <a 
                      href="https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-amplos/ibovespa.htm" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs"
                    >
                      B3 - Bolsa de Valores
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <code className="text-xs bg-muted p-1 rounded block break-all mt-1">
                      https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IBOV
                    </code>
                  </div>
                  <div>
                    <p className="font-medium">IFIX</p>
                    <a 
                      href="https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/ifix-indice-de-fundos-de-investimentos-imobiliarios.htm" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs"
                    >
                      B3 - Fundos Imobiliários
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <code className="text-xs bg-muted p-1 rounded block break-all mt-1">
                      https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IFIX
                    </code>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Error Alert */}
        {hasError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Alguns dados podem estar incompletos devido a erros ao buscar informações das APIs.
              {ptaxError && <div className="mt-1">PTAX: {ptaxError}</div>}
              {cdiError && <div className="mt-1">CDI: {cdiError}</div>}
              {marketError && <div className="mt-1">Indicadores: {marketError}</div>}
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Consolidados por Competência</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Carregando dados...</span>
              </div>
            ) : consolidatedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Competência</TableHead>
                      <TableHead className="min-w-[120px]">PTAX (R$/USD)</TableHead>
                      <TableHead className="min-w-[100px]">Data PTAX</TableHead>
                      <TableHead className="min-w-[100px]">CDI Mensal</TableHead>
                      <TableHead className="min-w-[120px]">CDI Acumulado</TableHead>
                      <TableHead className="min-w-[120px]">IPCA Mensal</TableHead>
                      <TableHead className="min-w-[130px]">IPCA Acumulado</TableHead>
                      <TableHead className="min-w-[130px]">Ibovespa Mensal</TableHead>
                      <TableHead className="min-w-[150px]">Ibovespa Acumulado</TableHead>
                      <TableHead className="min-w-[110px]">IFIX Mensal</TableHead>
                      <TableHead className="min-w-[130px]">IFIX Acumulado</TableHead>
                      {clientTarget && <TableHead className="min-w-[130px]">Meta Cliente</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedData.map((row) => (
                      <TableRow key={row.competencia}>
                        <TableCell className="font-medium">{row.competencia}</TableCell>
                        <TableCell>{formatCurrency(row.ptaxCotacao)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(row.ptaxData)}</TableCell>
                        <TableCell className={row.cdiMensal !== null && row.cdiMensal > 0 ? "text-green-600 dark:text-green-400" : ""}>{formatPercent(row.cdiMensal)}</TableCell>
                        <TableCell className={row.cdiAcumulado !== null && row.cdiAcumulado > 0 ? "text-green-600 dark:text-green-400" : ""}>{formatPercent(row.cdiAcumulado)}</TableCell>
                        <TableCell className={row.ipcaMensal !== null && row.ipcaMensal > 0 ? "text-green-600 dark:text-green-400" : row.ipcaMensal !== null && row.ipcaMensal < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ipcaMensal)}</TableCell>
                        <TableCell className={row.ipcaAcumulado !== null && row.ipcaAcumulado > 0 ? "text-green-600 dark:text-green-400" : row.ipcaAcumulado !== null && row.ipcaAcumulado < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ipcaAcumulado)}</TableCell>
                        <TableCell className={row.ibovespaMensal !== null && row.ibovespaMensal > 0 ? "text-green-600 dark:text-green-400" : row.ibovespaMensal !== null && row.ibovespaMensal < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ibovespaMensal)}</TableCell>
                        <TableCell className={row.ibovespaAcumulado !== null && row.ibovespaAcumulado > 0 ? "text-green-600 dark:text-green-400" : row.ibovespaAcumulado !== null && row.ibovespaAcumulado < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ibovespaAcumulado)}</TableCell>
                        <TableCell className={row.ifixMensal !== null && row.ifixMensal > 0 ? "text-green-600 dark:text-green-400" : row.ifixMensal !== null && row.ifixMensal < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ifixMensal)}</TableCell>
                        <TableCell className={row.ifixAcumulado !== null && row.ifixAcumulado > 0 ? "text-green-600 dark:text-green-400" : row.ifixAcumulado !== null && row.ifixAcumulado < 0 ? "text-red-600 dark:text-red-400" : ""}>{formatPercent(row.ifixAcumulado)}</TableCell>
                        {clientTarget && <TableCell className="text-blue-600 dark:text-blue-400">{formatPercent(row.metaCliente)}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Info */}
        {!isLoading && consolidatedData.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Informações sobre os Dados</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>PTAX:</strong> Cotação de venda do dólar americano no último dia útil da competência (fonte: Banco Central do Brasil)</p>
              <p><strong>CDI:</strong> Certificado de Depósito Interbancário - taxa de juros média praticada entre bancos (fonte: Banco Central do Brasil)</p>
              <p><strong>IPCA:</strong> Índice Nacional de Preços ao Consumidor Amplo - inflação oficial do Brasil (fonte: B3)</p>
              <p><strong>Ibovespa:</strong> Índice da Bolsa de Valores de São Paulo - principal indicador do mercado de ações brasileiro (fonte: B3)</p>
              <p><strong>IFIX:</strong> Índice de Fundos de Investimentos Imobiliários - indicador do mercado de FIIs (fonte: B3)</p>
              {clientTarget && <p><strong>Meta Cliente:</strong> Meta de retorno mensal definida na política de investimentos do cliente</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

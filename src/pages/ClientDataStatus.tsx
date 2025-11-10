import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, CheckCircle2, AlertCircle, Settings2, ArrowRight, ArrowLeft, Database } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ClientCompetenciaStatus {
  cliente: string;
  ultimaCompetencia: string | null;
  totalCompetencias: number;
  estaAtualizado: boolean;
  competenciaEsperada: string;
  mesesAtrasados: number;
}

export default function ClientDataStatus() {
  const [clientsStatus, setClientsStatus] = useState<ClientCompetenciaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getExpectedCompetencia = (): string => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${mes}/${ano}`;
  };

  const calculateMonthsDifference = (competencia: string, expectedCompetencia: string): number => {
    if (!competencia) return 999;
    
    const [mesComp, anoComp] = competencia.split('/').map(Number);
    const [mesExp, anoExp] = expectedCompetencia.split('/').map(Number);
    
    const diffAnos = anoExp - anoComp;
    const diffMeses = mesExp - mesComp;
    
    return (diffAnos * 12) + diffMeses;
  };

  useEffect(() => {
    fetchClientsCompetenciaStatus();
  }, []);

  const fetchClientsCompetenciaStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('ConsolidadoPerformance')
        .select('Nome, Competencia');
      
      if (error) {
        console.error('Erro ao buscar status de competências:', error);
        setLoading(false);
        return;
      }
      
      const clientesMap = new Map<string, { competencias: string[] }>();
      
      data?.forEach((row: any) => {
        const cliente = row.Nome;
        const competencia = row.Competencia;
        
        if (!clientesMap.has(cliente)) {
          clientesMap.set(cliente, { competencias: [] });
        }
        
        clientesMap.get(cliente)!.competencias.push(competencia);
      });
      
      const competenciaEsperada = getExpectedCompetencia();
      
      const statusList: ClientCompetenciaStatus[] = Array.from(clientesMap.entries()).map(([cliente, data]) => {
        const competencias = data.competencias;
        const totalCompetencias = new Set(competencias).size;
        
        const sortedCompetencias = Array.from(new Set(competencias)).sort((a, b) => {
          const [mesA, anoA] = a.split('/').map(Number);
          const [mesB, anoB] = b.split('/').map(Number);
          return (anoA * 12 + mesA) - (anoB * 12 + mesB);
        });
        
        const ultimaCompetencia = sortedCompetencias[sortedCompetencias.length - 1] || null;
        const estaAtualizado = ultimaCompetencia === competenciaEsperada;
        const mesesAtrasados = ultimaCompetencia 
          ? calculateMonthsDifference(ultimaCompetencia, competenciaEsperada)
          : 999;
        
        return {
          cliente,
          ultimaCompetencia,
          totalCompetencias,
          estaAtualizado,
          competenciaEsperada,
          mesesAtrasados
        };
      });
      
      statusList.sort((a, b) => {
        if (a.estaAtualizado && !b.estaAtualizado) return 1;
        if (!a.estaAtualizado && b.estaAtualizado) return -1;
        return b.mesesAtrasados - a.mesesAtrasados;
      });
      
      setClientsStatus(statusList);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao processar status de competências:', error);
      setLoading(false);
    }
  };

  const handleManageDataClick = (clientName: string) => {
    navigate(`/data-management/${encodeURIComponent(clientName)}`);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const totalClientes = clientsStatus.length;
  const clientesAtualizados = clientsStatus.filter(c => c.estaAtualizado).length;
  const clientesDesatualizados = totalClientes - clientesAtualizados;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Investment Insight Visor</h1>
                <p className="text-sm text-muted-foreground">Gestão de dados e competências dos clientes</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleBackClick}
              className="hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Gestão de Dados dos Clientes</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Acompanhe o status de atualização dos dados e gerencie as competências de cada cliente
          </p>

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
                      <p className="text-3xl font-bold text-foreground">{totalClientes}</p>
                    </div>
                    <Database className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-success/30 shadow-elegant-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Atualizados</p>
                      <p className="text-3xl font-bold text-success">{clientesAtualizados}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-destructive/30 shadow-elegant-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Desatualizados</p>
                      <p className="text-3xl font-bold text-destructive">{clientesDesatualizados}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-destructive opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Separator className="my-8" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gradient-card border-border/50 shadow-elegant-md">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-10 bg-muted rounded animate-pulse w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientsStatus.map((status) => {
              const IconStatus = status.estaAtualizado ? CheckCircle2 : AlertCircle;
              const statusColor = status.estaAtualizado ? 'text-success' : 'text-destructive';
              const borderColor = status.estaAtualizado ? 'border-success/30' : 'border-destructive/30';
              
              return (
                <Card 
                  key={status.cliente}
                  className={`bg-gradient-card ${borderColor} shadow-elegant-md hover:shadow-glow transition-all duration-300 cursor-pointer group border-2`}
                  onClick={() => handleManageDataClick(status.cliente)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                          {status.cliente}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <IconStatus className={`h-4 w-4 ${statusColor}`} />
                          <span className={`text-xs font-medium ${statusColor}`}>
                            {status.estaAtualizado ? 'Atualizado' : `${status.mesesAtrasados} ${status.mesesAtrasados === 1 ? 'mês' : 'meses'} atrasado`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Última Competência:</span>
                        <span className={`font-medium ${status.estaAtualizado ? 'text-success' : 'text-foreground'}`}>
                          {status.ultimaCompetencia || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Esperada:</span>
                        <span className="font-medium text-foreground">{status.competenciaEsperada}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total de Competências:</span>
                        <span className="font-medium text-foreground">{status.totalCompetencias}</span>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                      onClick={() => handleManageDataClick(status.cliente)}
                    >
                      <Settings2 className="mr-2 h-3 w-3" />
                      Gerenciar Dados
                      <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && clientsStatus.length === 0 && (
          <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum dado encontrado</h3>
              <p className="text-muted-foreground">
                Não há dados de competências cadastrados no momento.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

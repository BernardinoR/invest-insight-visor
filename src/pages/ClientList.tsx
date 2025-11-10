import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, ArrowRight, Search, Database, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Client {
  Cliente: string;
  "Meta de Retorno": string;
}

interface ClientCompetenciaStatus {
  cliente: string;
  ultimaCompetencia: string | null;
  totalCompetencias: number;
  estaAtualizado: boolean;
  competenciaEsperada: string;
  mesesAtrasados: number;
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'clientes' | 'gestao'>('clientes');
  const [clientsStatus, setClientsStatus] = useState<ClientCompetenciaStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Usando a função get_unique_clients criada no Supabase
      const { data, error } = await supabase
        .rpc('get_unique_clients');
      
      if (error) {
        console.error('Erro ao buscar clientes via RPC:', error);
        // Fallback para dados mock se houver erro
        const mockClients: Client[] = [
          { Cliente: "João Silva", "Meta de Retorno": "CDI + 2%" },
          { Cliente: "Maria Santos", "Meta de Retorno": "IPCA + 5%" },
          { Cliente: "Pedro Oliveira", "Meta de Retorno": "CDI + 1.5%" },
          { Cliente: "Ana Costa", "Meta de Retorno": "IPCA + 4%" },
          { Cliente: "Carlos Ferreira", "Meta de Retorno": "CDI + 3%" },
        ];
      setClients(mockClients);
      setFilteredClients(mockClients);
      setLoading(false);
        return;
      }

      // Garantir que os dados estão no formato correto
      const clientsData = (data as Client[]) || [];
      setClients(clientsData);
      setFilteredClients(clientsData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      // Usar dados mock como fallback
      const mockClients: Client[] = [
        { Cliente: "João Silva", "Meta de Retorno": "CDI + 2%" },
        { Cliente: "Maria Santos", "Meta de Retorno": "IPCA + 5%" },
        { Cliente: "Pedro Oliveira", "Meta de Retorno": "CDI + 1.5%" },
        { Cliente: "Ana Costa", "Meta de Retorno": "IPCA + 4%" },
        { Cliente: "Carlos Ferreira", "Meta de Retorno": "CDI + 3%" },
      ];
      setClients(mockClients);
      setFilteredClients(mockClients);
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = clients.filter((client) =>
      client.Cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);


  const handleClientClick = (clientName: string) => {
    navigate(`/dashboard/${encodeURIComponent(clientName)}`);
  };

  const getExpectedCompetencia = (): string => {
    const hoje = new Date();
    // Subtrai 1 mês para obter a competência esperada (mês anterior)
    hoje.setMonth(hoje.getMonth() - 1);
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

  const fetchClientsCompetenciaStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase
        .from('ConsolidadoPerformance')
        .select('Nome, Competencia');
      
      if (error) {
        console.error('Erro ao buscar status de competências:', error);
        setLoadingStatus(false);
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
      setLoadingStatus(false);
    } catch (error) {
      console.error('Erro ao processar status de competências:', error);
      setLoadingStatus(false);
    }
  };

  const handleManageDataClick = (clientName: string) => {
    navigate(`/data-management/${encodeURIComponent(clientName)}`);
  };

  const handleToggleView = () => {
    if (viewMode === 'clientes') {
      if (clientsStatus.length === 0) {
        fetchClientsCompetenciaStatus();
      }
      setViewMode('gestao');
    } else {
      setViewMode('clientes');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Investment Insight Visor</h1>
              <p className="text-sm text-muted-foreground">Selecione um cliente para visualizar o relatório de performance</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={handleToggleView}
            >
              {viewMode === 'clientes' ? (
                <Users className="h-6 w-6 text-primary" />
              ) : (
                <Database className="h-6 w-6 text-primary" />
              )}
              <h2 className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                {viewMode === 'clientes' ? 'Lista de Clientes' : 'Gestão de Dados dos Clientes'}
              </h2>
              {viewMode === 'clientes' ? (
                <ChevronDown className="h-6 w-6 text-primary group-hover:translate-y-1 transition-transform" />
              ) : (
                <ChevronUp className="h-6 w-6 text-primary group-hover:-translate-y-1 transition-transform" />
              )}
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            {viewMode === 'clientes' 
              ? 'Clique em um cliente para acessar seu relatório detalhado de investimentos'
              : 'Acompanhe o status de atualização dos dados e gerencie as competências de cada cliente'
            }
          </p>
        </div>

        {/* Conteúdo da Lista de Clientes */}
        {viewMode === 'clientes' && (
          <>
            {/* Search Input */}
            <div className="max-w-md relative mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border/50 focus:border-primary"
              />
            </div>

            {loading ? (
          <div className="max-w-4xl space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gradient-card border-border/50 shadow-elegant-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                    </div>
                    <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-4">
            {filteredClients.map((client) => (
              <Card 
                key={client.Cliente}
                className="bg-gradient-card border-border/50 shadow-elegant-md hover:shadow-glow transition-all duration-300 cursor-pointer group"
                onClick={() => handleClientClick(client.Cliente)}
              >
                <CardContent className="p-6 px-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {client.Cliente}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-muted-foreground">Meta de Retorno:</span>
                        <span className="text-success font-medium">{client["Meta de Retorno"]}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                    >
                      <span>Ver Dashboard</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredClients.length === 0 && searchTerm && (
          <div className="max-w-4xl">
            <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente encontrado</h3>
                <p className="text-muted-foreground">
                  Nenhum cliente corresponde à sua busca "{searchTerm}".
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && clients.length === 0 && (
          <div className="max-w-4xl">
            <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">
                Não há clientes cadastrados no momento.
              </p>
            </CardContent>
            </Card>
          </div>
        )}
          </>
        )}

        {/* Conteúdo da Gestão de Dados */}
        {viewMode === 'gestao' && (
          <>
            {/* Estatísticas */}
            {!loadingStatus && clientsStatus.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
                        <p className="text-3xl font-bold text-foreground">{clientsStatus.length}</p>
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
                        <p className="text-3xl font-bold text-success">
                          {clientsStatus.filter(c => c.estaAtualizado).length}
                        </p>
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
                        <p className="text-3xl font-bold text-destructive">
                          {clientsStatus.length - clientsStatus.filter(c => c.estaAtualizado).length}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-destructive opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator className="my-8" />

            {/* Grid de Clientes com Status */}
            {loadingStatus ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-gradient-card border-border/50 shadow-elegant-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-8">
                          <div className="h-6 bg-muted rounded animate-pulse w-48" />
                          <div className="h-5 bg-muted rounded animate-pulse w-32" />
                          <div className="h-5 bg-muted rounded animate-pulse w-24" />
                          <div className="h-5 bg-muted rounded animate-pulse w-24" />
                          <div className="h-5 bg-muted rounded animate-pulse w-32" />
                        </div>
                        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {clientsStatus.map((status) => {
                  const IconStatus = status.estaAtualizado ? CheckCircle2 : AlertCircle;
                  const statusColor = status.estaAtualizado ? 'text-success' : 'text-destructive';
                  const borderColor = status.estaAtualizado ? 'border-success' : 'border-destructive';
                  
                  return (
                    <Card 
                      key={status.cliente}
                      className={`bg-gradient-card ${borderColor} shadow-elegant-md hover:shadow-glow transition-all duration-300 cursor-pointer group border-l-4`}
                      onClick={() => handleManageDataClick(status.cliente)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between gap-6">
                          {/* Nome do Cliente + Status */}
                          <div className="flex items-center gap-4 min-w-[280px]">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                                {status.cliente}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <IconStatus className={`h-4 w-4 ${statusColor}`} />
                                <span className={`text-sm font-medium ${statusColor}`}>
                                  {status.estaAtualizado ? 'Atualizado' : `${status.mesesAtrasados} ${status.mesesAtrasados === 1 ? 'mês' : 'meses'} atrasado`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Informações em linha */}
                          <div className="flex items-center gap-8 flex-1">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">Última Competência</p>
                              <p className={`text-sm font-semibold ${status.estaAtualizado ? 'text-success' : 'text-foreground'}`}>
                                {status.ultimaCompetencia || 'N/A'}
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">Esperada</p>
                              <p className="text-sm font-semibold text-foreground">
                                {status.competenciaEsperada}
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">Total</p>
                              <p className="text-sm font-semibold text-foreground">
                                {status.totalCompetencias}
                              </p>
                            </div>
                          </div>

                          {/* Botão de Ação */}
                          <div className="ml-auto">
                            <Button 
                              variant="outline" 
                              size="default"
                              className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageDataClick(status.cliente);
                              }}
                            >
                              <Settings2 className="mr-2 h-4 w-4" />
                              Gerenciar Dados
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loadingStatus && clientsStatus.length === 0 && (
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
          </>
        )}
      </main>
    </div>
  );
}
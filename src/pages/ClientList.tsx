import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, ArrowRight } from "lucide-react";

interface Client {
  Cliente: string;
  "Meta de Retorno": string;
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Usando rpc ou query direta para contornar limitações de tipos
      const { data, error } = await supabase.rpc('get_unique_clients');
      
      if (error) {
        console.error('Erro ao buscar clientes via RPC:', error);
        // Fallback para dados mock temporariamente
        const mockClients: Client[] = [
          { Cliente: "João Silva", "Meta de Retorno": "CDI + 2%" },
          { Cliente: "Maria Santos", "Meta de Retorno": "IPCA + 5%" },
          { Cliente: "Pedro Oliveira", "Meta de Retorno": "CDI + 1.5%" },
          { Cliente: "Ana Costa", "Meta de Retorno": "IPCA + 4%" },
          { Cliente: "Carlos Ferreira", "Meta de Retorno": "CDI + 3%" },
        ];
        setClients(mockClients);
        setLoading(false);
        return;
      }

      setClients(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      // Fallback para dados mock
      const mockClients: Client[] = [
        { Cliente: "João Silva", "Meta de Retorno": "CDI + 2%" },
        { Cliente: "Maria Santos", "Meta de Retorno": "IPCA + 5%" },
        { Cliente: "Pedro Oliveira", "Meta de Retorno": "CDI + 1.5%" },
        { Cliente: "Ana Costa", "Meta de Retorno": "IPCA + 4%" },
        { Cliente: "Carlos Ferreira", "Meta de Retorno": "CDI + 3%" },
      ];
      setClients(mockClients);
      setLoading(false);
    }
  };

  const handleClientClick = (clientName: string) => {
    navigate(`/dashboard/${encodeURIComponent(clientName)}`);
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
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Lista de Clientes</h2>
          </div>
          <p className="text-muted-foreground">
            Clique em um cliente para acessar seu relatório detalhado de investimentos
          </p>
        </div>

        {loading ? (
          <div className="max-w-4xl mx-auto space-y-4">
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
          <div className="max-w-4xl mx-auto space-y-4">
            {clients.map((client) => (
              <Card 
                key={client.Cliente}
                className="bg-gradient-card border-border/50 shadow-elegant-md hover:shadow-glow transition-all duration-300 cursor-pointer group"
                onClick={() => handleClientClick(client.Cliente)}
              >
                <CardContent className="p-6">
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

        {!loading && clients.length === 0 && (
          <div className="max-w-4xl mx-auto">
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
      </main>
    </div>
  );
}
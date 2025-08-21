import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  Cliente: string;
  "Meta de Retorno": string;
}

interface ClientSelectorProps {
  onClientChange?: (client: string) => void;
  selectedClient?: string;
}

export function ClientSelector({ onClientChange, selectedClient }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Use supabase read query with proper casting to bypass types
      const query = `SELECT DISTINCT "Cliente", "Meta de Retorno" FROM "PoliticaInvestimentos" WHERE "Cliente" IS NOT NULL ORDER BY "Cliente"`;
      
      // Mock data for now since table types are not properly configured
      const mockClients = [
        { Cliente: "Bianca Monique Soares Marcellini", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Antonio Augusto Martins Mendes Marcellini", "Meta de Retorno": "IPCA+5.5%" },
        { Cliente: "ANTONIO AUGUSTO MOREIRA MARCELLINI", "Meta de Retorno": "IPCA+6%" },
        { Cliente: "Ademar João Grieger", "Meta de Retorno": "IPCA+4%" },
        { Cliente: "Adriana de Farias", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Alessandro Cuçulin Mazer", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Alisson JOSE CUNHA CARNEIRO", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Ana Elizabeth Da Silva Laranjeira", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Andre Do Valle Abreu", "Meta de Retorno": "IPCA+5%" },
        { Cliente: "Andres Machado Ritter", "Meta de Retorno": "IPCA+5%" }
      ];

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setClients(mockClients);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (value: string) => {
    onClientChange?.(value);
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Seleção de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedClient}
          onValueChange={handleClientChange}
          disabled={loading}
        >
          <SelectTrigger className="w-full bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
            <SelectValue 
              placeholder={loading ? "Carregando clientes..." : "Selecione um cliente"} 
            />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50 shadow-elegant-lg">
            {clients.map((client) => (
              <SelectItem 
                key={client.Cliente} 
                value={client.Cliente}
                className="hover:bg-muted/50 focus:bg-muted/50"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{client.Cliente}</span>
                  {client["Meta de Retorno"] && (
                    <span className="text-xs text-muted-foreground">
                      Meta: {client["Meta de Retorno"]}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedClient && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm text-muted-foreground">Cliente selecionado:</p>
            <p className="font-medium text-foreground">{selectedClient}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
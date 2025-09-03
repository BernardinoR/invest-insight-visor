import { useParams, useNavigate, useLocation } from "react-router-dom";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Dashboard() {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const decodedClientName = clientName ? decodeURIComponent(clientName) : "";
  const isClientView = location.pathname.startsWith('/client/');

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            {!isClientView && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="bg-card/50 border-primary/20 hover:bg-primary/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Lista
              </Button>
            )}
            {!isClientView && (
              <Button 
                variant="default" 
                onClick={() => navigate(`/data-management/${encodeURIComponent(decodedClientName)}`)}
                className="bg-primary hover:bg-primary/90"
              >
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar Dados
              </Button>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
      <InvestmentDashboard selectedClient={decodedClientName} />
    </div>
  );
}
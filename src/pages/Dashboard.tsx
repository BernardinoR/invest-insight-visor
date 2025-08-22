import { useParams, useNavigate } from "react-router-dom";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Dashboard() {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();

  const decodedClientName = clientName ? decodeURIComponent(clientName) : "";

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-6 py-4">
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          className="mb-4 bg-card/50 border-primary/20 hover:bg-primary/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à Lista
        </Button>
      </div>
      <InvestmentDashboard selectedClient={decodedClientName} />
    </div>
  );
}
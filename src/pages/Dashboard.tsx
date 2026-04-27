import { useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, FileDown, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exportDashboardToPDF } from "@/lib/pdfExport";
import { toast } from "sonner";

export default function Dashboard() {
  const { clientName } = useParams<{ clientName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExporting, setIsExporting] = useState(false);

  // Extrair contas selecionadas da URL
  const accountsFromUrl = searchParams.get('accounts');
  const initialSelectedRows = accountsFromUrl 
    ? accountsFromUrl.split(',').map(decodeURIComponent) 
    : [];

  // Handle URL decoding more safely
  let decodedClientName = "";
  
  if (clientName) {
    try {
      // Try to decode the client name properly
      decodedClientName = decodeURIComponent(clientName);
      console.log('Dashboard - Raw clientName from URL:', clientName);
      console.log('Dashboard - After decodeURIComponent:', decodedClientName);
      
      // Additional handling for spaces encoded as %20 or +
      decodedClientName = decodedClientName.replace(/\+/g, ' ');
      console.log('Dashboard - After replacing + with space:', decodedClientName);
      
    } catch (error) {
      console.error('Dashboard - Error decoding client name:', error);
      console.log('Dashboard - Using raw clientName as fallback');
      decodedClientName = clientName;
    }
  }
  
  console.log('Dashboard - Final decoded client name:', decodedClientName);
  console.log('Dashboard - Current location pathname:', location.pathname);
  
  const isClientView = location.pathname.startsWith('/client/');

  // Redirect to home if no client name is provided
  if (!decodedClientName || decodedClientName.trim() === "") {
    console.error('No client name provided, redirecting to home');
    navigate("/");
    return null;
  }

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const loadingToast = toast.loading("Gerando PDF do relatório…");
    try {
      // Wait two frames so any pending render flushes.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      await exportDashboardToPDF({
        clientName: decodedClientName,
      });

      toast.success("PDF gerado com sucesso!", { id: loadingToast });
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(error?.message || "Erro ao gerar o PDF.", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-card/50 border-primary/20 hover:bg-primary/10"
              title="Baixar relatório completo em PDF"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {isExporting ? "Gerando…" : "Exportar PDF"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <InvestmentDashboard selectedClient={decodedClientName} initialSelectedRows={initialSelectedRows} />
    </div>
  );
}

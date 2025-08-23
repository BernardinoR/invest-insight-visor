import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CompetenciaSeletorProps {
  selectedClient: string;
  onFilterChange: (inicioCompetencia: string, fimCompetencia: string) => void;
}

export function CompetenciaSeletor({ selectedClient, onFilterChange }: CompetenciaSeletorProps) {
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [inicioCompetencia, setInicioCompetencia] = useState<string>("");
  const [fimCompetencia, setFimCompetencia] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch available competencias
  useEffect(() => {
    const fetchCompetencias = async () => {
      if (!selectedClient) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('DadosPerformance')
          .select('Competencia')
          .eq('Nome', selectedClient);

        if (error) {
          console.error('Error fetching competencias:', error);
          return;
        }

        // Get unique competencias and sort them
        const uniqueCompetencias = Array.from(new Set(data?.map(item => item.Competencia) || []))
          .sort((a, b) => {
            const [monthA, yearA] = a.split('/');
            const [monthB, yearB] = b.split('/');
            const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
            const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
            return dateA.getTime() - dateB.getTime();
          });

        setCompetencias(uniqueCompetencias);
        
        // Set default values to first and last competencias
        if (uniqueCompetencias.length > 0) {
          setInicioCompetencia(uniqueCompetencias[0]);
          setFimCompetencia(uniqueCompetencias[uniqueCompetencias.length - 1]);
          onFilterChange(uniqueCompetencias[0], uniqueCompetencias[uniqueCompetencias.length - 1]);
        }
      } catch (error) {
        console.error('Error fetching competencias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetencias();
  }, [selectedClient, onFilterChange]);

  const handleInicioChange = (value: string) => {
    setInicioCompetencia(value);
    onFilterChange(value, fimCompetencia);
  };

  const handleFimChange = (value: string) => {
    setFimCompetencia(value);
    onFilterChange(inicioCompetencia, value);
  };

  const formatCompetenciaDisplay = (competencia: string) => {
    const [month, year] = competencia.split('/');
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  if (loading || competencias.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md mb-6">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Filtrar por Período:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">De:</span>
            <Select value={inicioCompetencia} onValueChange={handleInicioChange}>
              <SelectTrigger className="w-32 bg-background/50">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                {competencias.map((competencia) => (
                  <SelectItem key={competencia} value={competencia}>
                    {formatCompetenciaDisplay(competencia)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Até:</span>
            <Select value={fimCompetencia} onValueChange={handleFimChange}>
              <SelectTrigger className="w-32 bg-background/50">
                <SelectValue placeholder="Fim" />
              </SelectTrigger>
              <SelectContent>
                {competencias.map((competencia) => (
                  <SelectItem key={competencia} value={competencia}>
                    {formatCompetenciaDisplay(competencia)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
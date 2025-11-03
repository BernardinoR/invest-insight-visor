import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  Vencimento: string | null;
  Competencia: string;
  Rendimento: number;
  Taxa: string;
  Ativo: string;
  Emissor: string;
  "Classe do ativo": string;
  Nome: string;
  Instituicao: string;
}

export function useClientData(clientName: string) {
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoPerformance[]>([]);
  const [dadosData, setDadosData] = useState<DadosPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientName) {
      fetchClientData();
    } else {
      setConsolidadoData([]);
      setDadosData([]);
    }
  }, [clientName]);

  const fetchClientData = async () => {
    if (!clientName) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch ConsolidadoPerformance data from Supabase
      const { data: consolidadoData, error: consolidadoError } = await supabase
        .from('ConsolidadoPerformance')
        .select('*')
        .eq('Nome', clientName)
        .order('Data', { ascending: true });

      if (consolidadoError) {
        throw new Error(consolidadoError.message);
      }

      // Fetch DadosPerformance data from Supabase
      const { data: dadosData, error: dadosError } = await supabase
        .from('DadosPerformance')
        .select('*')
        .eq('Nome', clientName)
        .order('Data', { ascending: true });

      if (dadosError) {
        throw new Error(dadosError.message);
      }

      console.log('=== DEBUG FETCH (useClientData) ===');
      console.log('Client Name:', clientName);
      console.log('dadosData fetched:', dadosData?.length);
      console.log('Competencias únicas:', [...new Set(dadosData?.map(d => d.Competencia))]);
      console.log('05/2025 records:', dadosData?.filter(d => d.Competencia === '05/2025').length);
      console.log('Sample 05/2025 data:', dadosData?.filter(d => d.Competencia === '05/2025').slice(0, 3));

      setConsolidadoData(consolidadoData || []);
      setDadosData(dadosData || []);

    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  // Get the most recent competencia data
  const getMostRecentData = () => {
    if (consolidadoData.length === 0) return { patrimonio: 0, rendimento: 0 };
    
    // Find the most recent competencia
    const mostRecentEntry = consolidadoData.reduce((latest, current) => {
      return current.Competencia > latest.Competencia ? current : latest;
    });
    
    return {
      patrimonio: mostRecentEntry["Patrimonio Final"] || 0,
      rendimento: mostRecentEntry.Rendimento || 0
    };
  };

  const { patrimonio: totalPatrimonio, rendimento: totalRendimento } = getMostRecentData();

  return {
    consolidadoData,
    dadosData,
    loading,
    error,
    totalPatrimonio,
    totalRendimento,
    hasData: consolidadoData.length > 0 || dadosData.length > 0
  };
}
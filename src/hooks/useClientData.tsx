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
  Vencimento: string;
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

      setConsolidadoData(consolidadoData || []);
      setDadosData(dadosData || []);

    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const totalPatrimonio = consolidadoData.reduce((sum, item) => sum + (item["Patrimonio Final"] || 0), 0);
  const totalRendimento = dadosData.reduce((sum, item) => sum + (item.Rendimento || 0), 0) / Math.max(dadosData.length, 1);

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
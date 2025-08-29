import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioPerformanceData {
  competencia: string;
  portfolioAccumulated: number;
  metaAccumulated: number;
  portfolioMonthly: number;
  metaMonthly: number;
  ipca: number;
}

interface ClientTarget {
  meta: string;
  targetValue: number;
}

export function usePortfolioPerformance(clientName: string) {
  const [data, setData] = useState<PortfolioPerformanceData[]>([]);
  const [clientTarget, setClientTarget] = useState<ClientTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientName) {
      fetchPortfolioPerformance();
    } else {
      setData([]);
      setClientTarget(null);
    }
  }, [clientName]);

  const fetchPortfolioPerformance = async () => {
    if (!clientName) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar meta do cliente
      const { data: politicaData, error: politicaError } = await supabase
        .from('PoliticaInvestimentos')
        .select('"Meta de Retorno"')
        .eq('Cliente', clientName)
        .single();

      if (politicaError && politicaError.code !== 'PGRST116') {
        throw new Error(politicaError.message);
      }

      let clientTargetValue: ClientTarget | null = null;
      if (politicaData && politicaData["Meta de Retorno"]) {
        const metaString = politicaData["Meta de Retorno"];
        const targetValue = extractTargetValue(metaString);
        clientTargetValue = {
          meta: metaString,
          targetValue: targetValue
        };
      }

      setClientTarget(clientTargetValue);

      // 2. Buscar dados consolidados da carteira
      const { data: consolidadoData, error: consolidadoError } = await supabase
        .from('ConsolidadoPerformance')
        .select('*')
        .eq('Nome', clientName)
        .order('Competencia', { ascending: true });

      if (consolidadoError) {
        throw new Error(consolidadoError.message);
      }

      if (!consolidadoData || consolidadoData.length === 0) {
        setData([]);
        return;
      }

      // 3. Buscar dados do IPCA
      const ipcaResponse = await fetch(
        'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2020&dataFinal=31/12/2024'
      );
      const ipcaData = await ipcaResponse.json();

      // 4. Processar e calcular performance acumulada
      const processedData = calculateAccumulatedPerformance(
        consolidadoData,
        ipcaData,
        clientTargetValue
      );

      setData(processedData);

    } catch (err) {
      console.error('Error fetching portfolio performance:', err);
      setError('Erro ao carregar dados de performance');
    } finally {
      setLoading(false);
    }
  };

  const extractTargetValue = (metaString: string): number => {
    const match = metaString.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) / 100 : 0;
  };

  const calculateAccumulatedPerformance = (
    portfolioData: any[],
    ipcaData: any[],
    clientTarget: ClientTarget | null
  ): PortfolioPerformanceData[] => {
    if (!clientTarget) return [];

    let accumulatedPortfolio = 1;
    let accumulatedMeta = 1;

    return portfolioData.map((month, index) => {
      const competencia = month.Competencia;
      const portfolioMonthlyReturn = month.Rendimento / 100 || 0;
      
      // Encontrar IPCA do mês correspondente
      const monthlyIPCA = findMonthlyIPCA(competencia, ipcaData);
      
      // Calcular meta mensal se temos IPCA
      let metaMonthlyReturn = 0;
      if (monthlyIPCA !== null) {
        const annualTargetRate = clientTarget.targetValue;
        const monthlyTargetRate = Math.pow(1 + annualTargetRate, 1/12) - 1;
        metaMonthlyReturn = monthlyIPCA + monthlyTargetRate;
      }

      // Acumular retornos
      accumulatedPortfolio *= (1 + portfolioMonthlyReturn);
      if (metaMonthlyReturn > 0) {
        accumulatedMeta *= (1 + metaMonthlyReturn);
      }

      return {
        competencia,
        portfolioAccumulated: (accumulatedPortfolio - 1) * 100,
        metaAccumulated: metaMonthlyReturn > 0 ? (accumulatedMeta - 1) * 100 : 0,
        portfolioMonthly: portfolioMonthlyReturn * 100,
        metaMonthly: metaMonthlyReturn * 100,
        ipca: monthlyIPCA !== null ? monthlyIPCA * 100 : 0
      };
    });
  };

  const findMonthlyIPCA = (competencia: string, ipcaData: any[]): number | null => {
    // Converter competencia (YYYY-MM) para formato da API do BC (MM/YYYY)
    if (!competencia || !competencia.includes('-')) return null;
    
    const [year, month] = competencia.split('-');
    const targetDate = `01/${month}/${year}`;
    
    const ipcaEntry = ipcaData.find(item => item.data === targetDate);
    return ipcaEntry ? parseFloat(ipcaEntry.valor) / 100 : null;
  };

  return {
    data,
    clientTarget,
    loading,
    error
  };
}
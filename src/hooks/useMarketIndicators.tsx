import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketIndicatorData {
  competencia: string;
  ibovespa: number;
  ifix: number;
  accumulatedIbovespa: number;
  accumulatedIfix: number;
}

interface ClientTarget {
  meta: string;
  targetValue: number; // extracted numeric value from meta (e.g., 5 from "IPCA+5%")
}

export function useMarketIndicators(clientName?: string) {
  const [marketData, setMarketData] = useState<MarketIndicatorData[]>([]);
  const [clientTarget, setClientTarget] = useState<ClientTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real market data from APIs
  const fetchMarketData = async (): Promise<MarketIndicatorData[]> => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2); // Last 2 years

      const formatDate = (date: Date) => {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      };

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      // Fetch data from Banco Central APIs in parallel
      const [ibovespaResponse, ifixResponse] = await Promise.all([
        // Ibovespa - Série 7
        fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.7/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`),
        // IFIX - Série 26004 
        fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.26004/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`)
      ]);

      const [ibovespaData, ifixData] = await Promise.all([
        ibovespaResponse.json(),
        ifixResponse.json()
      ]);

      // Process and consolidate data by competencia
      const competenciaMap = new Map<string, {
        ibovespa: number[];
        ifix: number[];
      }>();

      // Helper to convert date to competencia (MM/YYYY)
      const dateToCompetencia = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return `${month}/${year}`;
      };

      // Process Ibovespa data
      ibovespaData.forEach((item: any) => {
        const competencia = dateToCompetencia(item.data);
        if (!competenciaMap.has(competencia)) {
          competenciaMap.set(competencia, { ibovespa: [], ifix: [] });
        }
        const value = parseFloat(item.valor);
        if (!isNaN(value)) {
          competenciaMap.get(competencia)!.ibovespa.push(value);
        }
      });

      // Process IFIX data
      ifixData.forEach((item: any) => {
        const competencia = dateToCompetencia(item.data);
        if (!competenciaMap.has(competencia)) {
          competenciaMap.set(competencia, { ibovespa: [], ifix: [] });
        }
        const value = parseFloat(item.valor);
        if (!isNaN(value)) {
          competenciaMap.get(competencia)!.ifix.push(value);
        }
      });

      // Calculate monthly returns and accumulated returns
      const result: MarketIndicatorData[] = [];
      let ibovespaAccumulated = 0;
      let ifixAccumulated = 0;

      // Sort competencias chronologically
      const sortedCompetencias = Array.from(competenciaMap.keys()).sort((a, b) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
        return dateA.getTime() - dateB.getTime();
      });

      let previousIbovespa: number | null = null;
      let previousIfix: number | null = null;

      sortedCompetencias.forEach(competencia => {
        const data = competenciaMap.get(competencia)!;
        
        // Calculate average values for the month
        const avgIbovespa = data.ibovespa.length > 0 ? 
          data.ibovespa.reduce((sum, val) => sum + val, 0) / data.ibovespa.length : null;
        
        const avgIfix = data.ifix.length > 0 ? 
          data.ifix.reduce((sum, val) => sum + val, 0) / data.ifix.length : null;

        // Calculate monthly returns (percentage change from previous month)
        let ibovespaMonthly = 0;
        let ifixMonthly = 0;

        if (previousIbovespa !== null && avgIbovespa !== null) {
          ibovespaMonthly = (avgIbovespa - previousIbovespa) / previousIbovespa;
        }

        if (previousIfix !== null && avgIfix !== null) {
          ifixMonthly = (avgIfix - previousIfix) / previousIfix;
        }

        // Update accumulated returns
        if (previousIbovespa !== null) {
          ibovespaAccumulated = (1 + ibovespaAccumulated) * (1 + ibovespaMonthly) - 1;
        }
        
        if (previousIfix !== null) {
          ifixAccumulated = (1 + ifixAccumulated) * (1 + ifixMonthly) - 1;
        }

        result.push({
          competencia,
          ibovespa: ibovespaMonthly,
          ifix: ifixMonthly,
          accumulatedIbovespa: ibovespaAccumulated,
          accumulatedIfix: ifixAccumulated
        });

        // Update previous values for next iteration
        if (avgIbovespa !== null) previousIbovespa = avgIbovespa;
        if (avgIfix !== null) previousIfix = avgIfix;
      });

      return result;

    } catch (error) {
      console.error('Erro ao buscar dados de mercado:', error);
      throw error;
    }
  };

  const fetchClientTarget = async (clientName: string) => {
    try {
      const { data, error } = await supabase
        .from('PoliticaInvestimentos')
        .select('Meta de Retorno')
        .eq('Cliente', clientName)
        .limit(1);

      if (error) {
        console.error('Erro ao buscar meta do cliente:', error);
        return null;
      }

      if (data && data.length > 0) {
        const meta = data[0]['Meta de Retorno'];
        
        // Extract numeric value from meta (e.g., "IPCA+5%" -> 5)
        const match = meta?.match(/(\d+(?:\.\d+)?)/);
        const targetValue = match ? parseFloat(match[1]) : 0;
        
        return {
          meta: meta || '',
          targetValue
        };
      }
      
      return null;
    } catch (err) {
      console.error('Erro ao buscar meta do cliente:', err);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch real market data from APIs
        const realData = await fetchMarketData();
        setMarketData(realData);
        
        // Fetch client target if clientName is provided
        if (clientName) {
          const target = await fetchClientTarget(clientName);
          setClientTarget(target);
        }
      } catch (err) {
        setError('Erro ao carregar dados de mercado');
        console.error('Erro ao carregar dados de mercado:', err);
        
        // Fallback: set empty data instead of mock data
        setMarketData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientName]);

  return {
    marketData,
    clientTarget,
    loading,
    error
  };
}
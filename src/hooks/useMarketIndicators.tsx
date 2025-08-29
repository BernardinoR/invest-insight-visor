import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketIndicatorData {
  competencia: string;
  ibovespa: number;
  ifix: number;
  ipca: number;
  accumulatedIbovespa: number;
  accumulatedIfix: number;
  accumulatedIpca: number;
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

  // Fetch real market data from B3 and Banco Central APIs
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

      // Headers for B3 API
      const b3Headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json'
      };

      // Fetch data from B3 and Banco Central APIs in parallel
      const [ibovespaResponse, ifixResponse, ipcaResponse] = await Promise.allSettled([
        // Ibovespa - B3 API
        fetch('https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IBOV', {
          headers: b3Headers
        }),
        // IFIX - B3 API
        fetch('https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IFIX', {
          headers: b3Headers
        }),
        // IPCA - Banco Central (continua igual)
        fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`)
      ]);

      console.log('API responses:', {
        ibovespaStatus: ibovespaResponse.status,
        ifixStatus: ifixResponse.status,
        ipcaStatus: ipcaResponse.status
      });

      // Handle responses more gracefully
      let ibovespaData = null;
      let ifixData = null;
      let ipcaData = [];

      // Process B3 data (current day data)
      if (ibovespaResponse.status === 'fulfilled' && ibovespaResponse.value.ok) {
        const ibovData = await ibovespaResponse.value.json();
        console.log('Ibovespa B3 data:', ibovData);
        ibovespaData = ibovData;
      }

      if (ifixResponse.status === 'fulfilled' && ifixResponse.value.ok) {
        const ifixJson = await ifixResponse.value.json();
        console.log('IFIX B3 data:', ifixJson);
        ifixData = ifixJson;
      }

      // Process IPCA data from Banco Central (historical data)
      if (ipcaResponse.status === 'fulfilled' && ipcaResponse.value.ok) {
        ipcaData = await ipcaResponse.value.json();
      }

      console.log('Market data fetched:', {
        ibovespaDataExists: !!ibovespaData,
        ifixDataExists: !!ifixData,
        ipcaDataLength: ipcaData.length
      });

      // Process and consolidate data by competencia
      const competenciaMap = new Map<string, {
        ibovespa: number[];
        ifix: number[];
        ipca: number[];
      }>();

      // Helper to convert date to competencia (MM/YYYY)
      const dateToCompetencia = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return `${month}/${year}`;
      };

      // Current competencia (for B3 current data)
      const currentDate = new Date();
      const currentCompetencia = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

      // Process B3 current data for current competencia
      if (ibovespaData?.index) {
        if (!competenciaMap.has(currentCompetencia)) {
          competenciaMap.set(currentCompetencia, { ibovespa: [], ifix: [], ipca: [] });
        }
        // Get percentage variation from B3 data
        const variation = parseFloat(ibovespaData.index.oscilacao) / 100; // Convert percentage to decimal
        if (!isNaN(variation)) {
          competenciaMap.get(currentCompetencia)!.ibovespa.push(variation);
        }
      }

      if (ifixData?.index) {
        if (!competenciaMap.has(currentCompetencia)) {
          competenciaMap.set(currentCompetencia, { ibovespa: [], ifix: [], ipca: [] });
        }
        // Get percentage variation from B3 data
        const variation = parseFloat(ifixData.index.oscilacao) / 100; // Convert percentage to decimal
        if (!isNaN(variation)) {
          competenciaMap.get(currentCompetencia)!.ifix.push(variation);
        }
      }

      // Process IPCA historical data (monthly values)
      ipcaData.forEach((item: any) => {
        const competencia = dateToCompetencia(item.data);
        if (!competenciaMap.has(competencia)) {
          competenciaMap.set(competencia, { ibovespa: [], ifix: [], ipca: [] });
        }
        const value = parseFloat(item.valor) / 100; // Convert percentage to decimal
        if (!isNaN(value)) {
          competenciaMap.get(competencia)!.ipca.push(value);
        }
      });

      // Calculate monthly returns and accumulated returns
      const result: MarketIndicatorData[] = [];
      let ibovespaAccumulated = 0;
      let ifixAccumulated = 0;
      let ipcaAccumulated = 0;

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

        // IPCA is typically one value per month
        const monthlyIpca = data.ipca.length > 0 ? data.ipca[0] : 0;

        // For B3 data, use the variation directly as monthly return
        let ibovespaMonthly = avgIbovespa || 0;
        let ifixMonthly = avgIfix || 0;

        // Update accumulated returns
        if (ibovespaMonthly !== 0) {
          ibovespaAccumulated = (1 + ibovespaAccumulated) * (1 + ibovespaMonthly) - 1;
        }
        
        if (ifixMonthly !== 0) {
          ifixAccumulated = (1 + ifixAccumulated) * (1 + ifixMonthly) - 1;
        }

        // IPCA accumulation
        ipcaAccumulated = (1 + ipcaAccumulated) * (1 + monthlyIpca) - 1;

        result.push({
          competencia,
          ibovespa: ibovespaMonthly,
          ifix: ifixMonthly,
          ipca: monthlyIpca,
          accumulatedIbovespa: ibovespaAccumulated,
          accumulatedIfix: ifixAccumulated,
          accumulatedIpca: ipcaAccumulated
        });

        console.log(`Processed ${competencia}:`, {
          ibovespaMonthly,
          ifixMonthly,
          monthlyIpca,
          ibovespaAccumulated,
          ifixAccumulated,
          ipcaAccumulated
        });

        // Update previous values for next iteration (not needed for B3 current data)
        // This logic was for historical price comparison, B3 gives us direct variation
      });

      // Only return data if we have actual market data - no fallback
      console.log('Final result length:', result.length);
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
        console.log('Market data loaded:', realData);
        setMarketData(realData);
        
        // Fetch client target if clientName is provided
        if (clientName) {
          const target = await fetchClientTarget(clientName);
          setClientTarget(target);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de mercado:', err);
        // Don't set error, and don't set fallback data - just empty
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
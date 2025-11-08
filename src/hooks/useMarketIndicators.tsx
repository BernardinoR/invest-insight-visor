import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketIndicatorData {
  competencia: string;
  ibovespa: number;
  ifix: number;
  ipca: number;
  clientTarget: number;
  accumulatedIbovespa: number;
  accumulatedIfix: number;
  accumulatedIpca: number;
  accumulatedClientTarget: number;
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
  const fetchMarketData = async (clientTargetValue?: ClientTarget | null): Promise<MarketIndicatorData[]> => {
    console.log('=== fetchMarketData called with clientTargetValue ===', clientTargetValue);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years

      const formatDate = (date: Date) => {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      };

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      console.log('Fetching market data...');

      // Try to fetch IPCA data from Banco Central (this one usually works)
      let ipcaData = [];
      try {
        const ipcaResponse = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`);
        if (ipcaResponse.ok) {
          ipcaData = await ipcaResponse.json();
          console.log('IPCA data fetched successfully:', ipcaData.length, 'records');
        } else {
          console.error('IPCA API error:', ipcaResponse.status);
        }
      } catch (ipcaError) {
        console.error('Error fetching IPCA:', ipcaError);
      }

      console.log('IPCA data fetched:', ipcaData.length, 'records');

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
      let clientTargetAccumulated = 0;

      // Sort competencias chronologically
      const sortedCompetencias = Array.from(competenciaMap.keys()).sort((a, b) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
        return dateA.getTime() - dateB.getTime();
      });

      sortedCompetencias.forEach(competencia => {
        const data = competenciaMap.get(competencia)!;
        
        // IPCA is typically one value per month
        const monthlyIpca = data.ipca.length > 0 ? data.ipca[0] : 0;

        // Set B3 data to 0 (removed API calls)
        const ibovespaMonthly = 0;
        const ifixMonthly = 0;

        // Calculate client target return ONLY if we have both IPCA data and target value
        let clientTargetMonthly = 0;
        
        console.log(`=== TARGET CALCULATION DEBUG for ${competencia} ===`, {
          monthlyIpca,
          monthlyIpcaNotZero: monthlyIpca !== 0,
          clientTargetValue: !!clientTargetValue,
          targetValue: clientTargetValue?.targetValue,
          targetValueGreaterThanZero: (clientTargetValue?.targetValue || 0) > 0
        });
        
        if (monthlyIpca !== 0 && clientTargetValue && clientTargetValue.targetValue > 0) {
          clientTargetMonthly = calculateMonthlyTarget(monthlyIpca, clientTargetValue.targetValue);
          console.log(`Calculated target for ${competencia}:`, {
            monthlyIpca: monthlyIpca * 100,
            targetValue: clientTargetValue.targetValue,
            clientTargetMonthly: clientTargetMonthly * 100,
            meta: clientTargetValue.meta
          });
        } else {
          console.log(`No target calculated for ${competencia}:`, {
            monthlyIpca: monthlyIpca * 100,
            hasIPCA: monthlyIpca !== 0,
            hasTargetValue: !!(clientTargetValue?.targetValue),
            targetValue: clientTargetValue?.targetValue
          });
        }

        // IPCA accumulation
        if (monthlyIpca !== 0) {
          ipcaAccumulated = (1 + ipcaAccumulated) * (1 + monthlyIpca) - 1;
        }

        // Client target accumulation - always accumulate if we have a target
        if (clientTargetMonthly !== 0) {
          clientTargetAccumulated = (1 + clientTargetAccumulated) * (1 + clientTargetMonthly) - 1;
        }

        result.push({
          competencia,
          ibovespa: ibovespaMonthly,
          ifix: ifixMonthly,
          ipca: monthlyIpca,
          clientTarget: clientTargetMonthly,
          accumulatedIbovespa: ibovespaAccumulated,
          accumulatedIfix: ifixAccumulated,
          accumulatedIpca: ipcaAccumulated,
          accumulatedClientTarget: clientTargetAccumulated
        });

        console.log(`Processed ${competencia}:`, {
          monthlyIpca,
          clientTargetMonthly,
          ipcaAccumulated,
          clientTargetAccumulated
        });
      });

      console.log('Final result length:', result.length);
      return result;

    } catch (error) {
      console.error('Erro ao buscar dados de mercado:', error);
      throw error;
    }
  };

  const fetchClientTarget = async (clientName: string) => {
    try {
      console.log('Buscando meta para cliente:', clientName);
      console.log('Tipo do clientName:', typeof clientName);
      console.log('ClientName encoded:', encodeURIComponent(clientName));
      
      const { data, error } = await supabase
        .from('PoliticaInvestimentos')
        .select('Cliente, "Meta de Retorno"')
        .eq('Cliente', clientName)
        .limit(1);

      console.log('Resultado da busca de meta:', { data, error });

      if (error) {
        console.error('Erro ao buscar meta do cliente:', error);
        return null;
      }

      if (data && data.length > 0) {
        const meta = data[0]['Meta de Retorno'];
        console.log('Meta encontrada:', meta);
        
        // Extract numeric value from meta (e.g., "IPCA+5%" -> 5)
        const match = meta?.match(/IPCA\+\s*(\d+(?:\.\d+)?)/i);
        const targetValue = match ? parseFloat(match[1]) : 0;
        
        console.log('Valor da meta extraído:', targetValue);
        
        return {
          meta: meta || '',
          targetValue
        };
      }
      
      console.log('Nenhuma meta encontrada para o cliente');
      return null;
    } catch (err) {
      console.error('Erro ao buscar meta do cliente:', err);
      return null;
    }
  };

  // Calculate monthly target return based on IPCA + annual target
  const calculateMonthlyTarget = (ipcaMonthly: number, annualTarget: number): number => {
    // Convert annual target to monthly: (1 + annual%)^(1/12) - 1
    // Por exemplo, se annualTarget é 6, então (1.06^(1/12)) - 1
    const monthlyTargetRate = Math.pow(1 + (annualTarget / 100), 1/12) - 1;
    
    // Meta mensal = (1 + IPCA) × (1 + Target_mensal) - 1
    // Por exemplo: (1 + 0.0048) × (1 + 0.004867) - 1 = 0.00968 = 0.97%
    const totalMonthlyReturn = (1 + ipcaMonthly) * (1 + monthlyTargetRate) - 1;
    
    console.log('Cálculo da meta mensal:', {
      ipcaMonthly: (ipcaMonthly * 100).toFixed(4) + '%',
      annualTarget: annualTarget + '%',
      monthlyTargetRate: (monthlyTargetRate * 100).toFixed(4) + '%',
      totalMonthlyReturn: (totalMonthlyReturn * 100).toFixed(4) + '%'
    });
    
    return totalMonthlyReturn;
  };

  useEffect(() => {
    console.log('=== useMarketIndicators useEffect triggered ===');
    console.log('clientName received:', clientName);
    console.log('clientName type:', typeof clientName);
    console.log('clientName length:', clientName?.length);
    
    const loadData = async () => {
      console.log('=== loadData function started ===');
      setLoading(true);
      setError(null);
      
      try {
        // Fetch client target first if clientName is provided
        let targetData = null;
        if (clientName) {
          console.log('=== About to fetch client target ===');
          console.log('Fetching client target for:', clientName);
          targetData = await fetchClientTarget(clientName);
          console.log('=== Client target fetched result ===');
          console.log('Client target fetched:', targetData);
          setClientTarget(targetData);
        } else {
          console.log('=== No clientName provided ===');
        }
        
        // Fetch real market data from APIs with client target data
        console.log('=== About to fetch market data ===');
        const realData = await fetchMarketData(targetData);
        console.log('=== Market data loaded ===');
        console.log('Market data loaded:', realData);
        setMarketData(realData);
        
      } catch (err) {
        console.error('=== Error loading market data ===');
        console.error('Erro ao carregar dados de mercado:', err);
        // Don't set error, and don't set fallback data - just empty
        setMarketData([]);
      } finally {
        console.log('=== Setting loading to false ===');
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
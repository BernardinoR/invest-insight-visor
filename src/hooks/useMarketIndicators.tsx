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

  // Fetch real market data from InvestTester and Banco Central APIs
  const fetchMarketData = async (clientTargetValue?: ClientTarget | null): Promise<MarketIndicatorData[]> => {
    console.log('=== fetchMarketData called with clientTargetValue ===', clientTargetValue);
    try {
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0); // Ensure start of day
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2); // Last 2 years
      startDate.setHours(0, 0, 0, 0);

      // Format for Banco Central API (DD/MM/YYYY)
      const formatDateBacen = (date: Date) => {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      };

      // Format for InvestTester API (YYYY-MM-DD)
      const formatDateInvestTester = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      const startDateBacen = formatDateBacen(startDate);
      const endDateBacen = formatDateBacen(endDate);
      const startDateIT = formatDateInvestTester(startDate);
      const endDateIT = formatDateInvestTester(endDate);

      console.log('Fetching market data...');

      // Try to fetch IPCA data from Banco Central
      let ipcaData = [];
      try {
        const ipcaUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${startDateBacen}&dataFinal=${endDateBacen}`;
        console.log('Fetching IPCA from:', ipcaUrl);
        
        const ipcaResponse = await fetch(ipcaUrl);
        if (ipcaResponse.ok) {
          const ipcaJson = await ipcaResponse.json();
          
          // Validate response is not an error object
          if (!ipcaJson.erro && Array.isArray(ipcaJson)) {
            ipcaData = ipcaJson;
            console.log('IPCA data fetched successfully:', ipcaData.length, 'records');
          } else {
            console.error('IPCA API returned error:', ipcaJson);
          }
        } else {
          console.error('IPCA API error:', ipcaResponse.status);
        }
      } catch (ipcaError) {
        console.error('Error fetching IPCA:', ipcaError);
      }

      // Fetch Ibovespa and IFIX from InvestTester API
      let ibovespaData = null;
      let ifixData = null;

      // Try to fetch Ibovespa data from brapi.dev
      try {
        console.log('Attempting to fetch Ibovespa data from brapi.dev...');
        const ibovUrl = `https://brapi.dev/api/quote/%5EBVSP?range=2y&interval=1mo`;
        console.log('Ibovespa URL:', ibovUrl);
        
        const ibovResponse = await fetch(ibovUrl);
        if (ibovResponse.ok) {
          ibovespaData = await ibovResponse.json();
          console.log('Ibovespa data fetched successfully:', ibovespaData);
        } else {
          console.error('Ibovespa API error:', ibovResponse.status);
        }
      } catch (ibovError) {
        console.error('Error fetching Ibovespa:', ibovError);
      }

      // Try to fetch IFIX data from brapi.dev
      try {
        console.log('Attempting to fetch IFIX data from brapi.dev...');
        const ifixUrl = `https://brapi.dev/api/quote/IFIX?range=2y&interval=1mo`;
        console.log('IFIX URL:', ifixUrl);
        
        const ifixResponse = await fetch(ifixUrl);
        if (ifixResponse.ok) {
          ifixData = await ifixResponse.json();
          console.log('IFIX data fetched successfully:', ifixData);
        } else {
          console.error('IFIX API error:', ifixResponse.status);
        }
      } catch (ifixError) {
        console.error('Error fetching IFIX:', ifixError);
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

      // Process brapi.dev historical data
      // Ibovespa data processing
      if (ibovespaData?.results && Array.isArray(ibovespaData.results) && ibovespaData.results.length > 0) {
        console.log('Processing Ibovespa historical data from brapi.dev');
        
        const firstResult = ibovespaData.results[0];
        if (firstResult?.historicalDataPrice && Array.isArray(firstResult.historicalDataPrice)) {
          // Group by month and calculate monthly returns
          const monthlyReturns = new Map<string, { firstPrice: number; lastPrice: number }>();
          
          firstResult.historicalDataPrice.forEach((point: any) => {
            if (!point.date || !point.close) return;
            
            const date = new Date(point.date * 1000); // Convert timestamp to date
            const competencia = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            if (!monthlyReturns.has(competencia)) {
              monthlyReturns.set(competencia, { firstPrice: point.close, lastPrice: point.close });
            } else {
              monthlyReturns.get(competencia)!.lastPrice = point.close;
            }
          });
          
          // Calculate monthly percentage returns
          monthlyReturns.forEach((prices, competencia) => {
            if (!competenciaMap.has(competencia)) {
              competenciaMap.set(competencia, { ibovespa: [], ifix: [], ipca: [] });
            }
            
            const monthlyReturn = (prices.lastPrice - prices.firstPrice) / prices.firstPrice;
            competenciaMap.get(competencia)!.ibovespa.push(monthlyReturn);
          });
          
          console.log('Ibovespa monthly returns calculated for', monthlyReturns.size, 'months');
        }
      }

      // IFIX data processing
      if (ifixData?.results && Array.isArray(ifixData.results) && ifixData.results.length > 0) {
        console.log('Processing IFIX historical data from brapi.dev');
        
        const firstResult = ifixData.results[0];
        if (firstResult?.historicalDataPrice && Array.isArray(firstResult.historicalDataPrice)) {
          // Group by month and calculate monthly returns
          const monthlyReturns = new Map<string, { firstPrice: number; lastPrice: number }>();
          
          firstResult.historicalDataPrice.forEach((point: any) => {
            if (!point.date || !point.close) return;
            
            const date = new Date(point.date * 1000); // Convert timestamp to date
            const competencia = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            if (!monthlyReturns.has(competencia)) {
              monthlyReturns.set(competencia, { firstPrice: point.close, lastPrice: point.close });
            } else {
              monthlyReturns.get(competencia)!.lastPrice = point.close;
            }
          });
          
          // Calculate monthly percentage returns
          monthlyReturns.forEach((prices, competencia) => {
            if (!competenciaMap.has(competencia)) {
              competenciaMap.set(competencia, { ibovespa: [], ifix: [], ipca: [] });
            }
            
            const monthlyReturn = (prices.lastPrice - prices.firstPrice) / prices.firstPrice;
            competenciaMap.get(competencia)!.ifix.push(monthlyReturn);
          });
          
          console.log('IFIX monthly returns calculated for', monthlyReturns.size, 'months');
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
        
        // Calculate average values for the month
        const avgIbovespa = data.ibovespa.length > 0 ? 
          data.ibovespa.reduce((sum, val) => sum + val, 0) / data.ibovespa.length : null;
        
        const avgIfix = data.ifix.length > 0 ? 
          data.ifix.reduce((sum, val) => sum + val, 0) / data.ifix.length : null;

        // IPCA is typically one value per month
        const monthlyIpca = data.ipca.length > 0 ? data.ipca[0] : 0;

        // For B3 data, use the variation directly as monthly return, but only if we have real data
        let ibovespaMonthly = avgIbovespa !== null ? avgIbovespa : 0;
        let ifixMonthly = avgIfix !== null ? avgIfix : 0;

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

        // Update accumulated returns only when we have non-zero data
        if (ibovespaMonthly !== 0) {
          ibovespaAccumulated = (1 + ibovespaAccumulated) * (1 + ibovespaMonthly) - 1;
        }
        
        if (ifixMonthly !== 0) {
          ifixAccumulated = (1 + ifixAccumulated) * (1 + ifixMonthly) - 1;
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
          ibovespaMonthly,
          ifixMonthly,
          monthlyIpca,
          clientTargetMonthly,
          ibovespaAccumulated,
          ifixAccumulated,
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
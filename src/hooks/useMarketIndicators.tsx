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
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2); // Last 2 years

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

      // For B3 APIs, we'll use a CORS proxy service to bypass CORS restrictions
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      
      let ibovespaData = null;
      let ifixData = null;

      // Try to fetch Ibovespa data with CORS proxy
      try {
        console.log('Attempting to fetch Ibovespa data...');
        const ibovUrl = `${corsProxy}${encodeURIComponent('https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IBOV')}`;
        const ibovResponse = await fetch(ibovUrl);
        if (ibovResponse.ok) {
          const ibovText = await ibovResponse.text();
          try {
            ibovespaData = JSON.parse(ibovText);
            console.log('Ibovespa data fetched successfully:', ibovespaData);
          } catch (parseError) {
            console.error('Error parsing Ibovespa JSON:', parseError);
          }
        } else {
          console.error('Ibovespa API error:', ibovResponse.status);
        }
      } catch (ibovError) {
        console.error('Error fetching Ibovespa:', ibovError);
      }

      // Try to fetch IFIX data with CORS proxy
      try {
        console.log('Attempting to fetch IFIX data...');
        const ifixUrl = `${corsProxy}${encodeURIComponent('https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/IFIX')}`;
        const ifixResponse = await fetch(ifixUrl);
        if (ifixResponse.ok) {
          const ifixText = await ifixResponse.text();
          try {
            ifixData = JSON.parse(ifixText);
            console.log('IFIX data fetched successfully:', ifixData);
          } catch (parseError) {
            console.error('Error parsing IFIX JSON:', parseError);
          }
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

      // Current competencia (for B3 current data)
      const currentDate = new Date();
      const currentCompetencia = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

      // Process B3 current data for current competencia
      if (ibovespaData?.index) {
        console.log('Processing Ibovespa data:', ibovespaData.index);
        if (!competenciaMap.has(currentCompetencia)) {
          competenciaMap.set(currentCompetencia, { ibovespa: [], ifix: [], ipca: [] });
        }
        // Get percentage variation from B3 data
        const oscilacao = ibovespaData.index.oscilacao;
        console.log('Ibovespa oscilacao:', oscilacao);
        
        if (oscilacao !== undefined && oscilacao !== null) {
          const variation = parseFloat(oscilacao.toString().replace(',', '.')) / 100; // Convert percentage to decimal
          if (!isNaN(variation)) {
            competenciaMap.get(currentCompetencia)!.ibovespa.push(variation);
            console.log('Added Ibovespa variation:', variation);
          }
        }
      }

      if (ifixData?.index) {
        console.log('Processing IFIX data:', ifixData.index);
        if (!competenciaMap.has(currentCompetencia)) {
          competenciaMap.set(currentCompetencia, { ibovespa: [], ifix: [], ipca: [] });
        }
        // Get percentage variation from B3 data
        const oscilacao = ifixData.index.oscilacao;
        console.log('IFIX oscilacao:', oscilacao);
        
        if (oscilacao !== undefined && oscilacao !== null) {
          const variation = parseFloat(oscilacao.toString().replace(',', '.')) / 100; // Convert percentage to decimal
          if (!isNaN(variation)) {
            competenciaMap.get(currentCompetencia)!.ifix.push(variation);
            console.log('Added IFIX variation:', variation);
          }
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

        // Calculate client target return if we have both IPCA and target value
        let clientTargetMonthly = 0;
        if (monthlyIpca !== 0 && clientTargetValue && clientTargetValue.targetValue > 0) {
          clientTargetMonthly = calculateMonthlyTarget(monthlyIpca, clientTargetValue.targetValue);
          console.log(`Calculated target for ${competencia}:`, {
            monthlyIpca,
            targetValue: clientTargetValue.targetValue,
            clientTargetMonthly
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

        // Client target accumulation
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

  // Calculate monthly target return based on IPCA + annual target
  const calculateMonthlyTarget = (ipcaMonthly: number, annualTarget: number): number => {
    // Convert annual target to monthly: (1 + annual%)^(1/12) - 1
    const monthlyTargetRate = Math.pow(1 + (annualTarget / 100), 1/12) - 1;
    // Add IPCA monthly + monthly target rate
    return ipcaMonthly + monthlyTargetRate;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch client target first if clientName is provided
        let targetData = null;
        if (clientName) {
          console.log('Fetching client target for:', clientName);
          targetData = await fetchClientTarget(clientName);
          console.log('Client target fetched:', targetData);
          setClientTarget(targetData);
        }
        
        // Fetch real market data from APIs with client target data
        const realData = await fetchMarketData(targetData);
        console.log('Market data loaded:', realData);
        setMarketData(realData);
        
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
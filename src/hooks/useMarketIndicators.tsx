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

  // Mock data for Ibovespa and IFIX with more realistic historical patterns
  const generateMockMarketData = (): MarketIndicatorData[] => {
    const data: MarketIndicatorData[] = [];
    
    // Fixed realistic data based on Brazilian market patterns
    // Each competencia represents: Month N = from day 30 of month N-1 to day 31 of month N
    const marketReturns = [
      // 2023 data
      { competencia: '01/2023', ibovespa: 0.0234, ifix: 0.0156 }, // Jan 2023
      { competencia: '02/2023', ibovespa: -0.0187, ifix: 0.0089 }, // Feb 2023
      { competencia: '03/2023', ibovespa: 0.0298, ifix: 0.0201 }, // Mar 2023
      { competencia: '04/2023', ibovespa: 0.0145, ifix: -0.0034 }, // Apr 2023
      { competencia: '05/2023', ibovespa: -0.0067, ifix: 0.0178 }, // May 2023
      { competencia: '06/2023', ibovespa: 0.0456, ifix: 0.0234 }, // Jun 2023
      { competencia: '07/2023', ibovespa: 0.0234, ifix: 0.0123 }, // Jul 2023
      { competencia: '08/2023', ibovespa: -0.0298, ifix: -0.0156 }, // Aug 2023
      { competencia: '09/2023', ibovespa: 0.0189, ifix: 0.0089 }, // Sep 2023
      { competencia: '10/2023', ibovespa: -0.0123, ifix: 0.0045 }, // Oct 2023
      { competencia: '11/2023', ibovespa: 0.0367, ifix: 0.0167 }, // Nov 2023
      { competencia: '12/2023', ibovespa: 0.0289, ifix: 0.0134 }, // Dec 2023
      
      // 2024 data
      { competencia: '01/2024', ibovespa: -0.0145, ifix: 0.0078 }, // Jan 2024
      { competencia: '02/2024', ibovespa: 0.0267, ifix: 0.0156 }, // Feb 2024
      { competencia: '03/2024', ibovespa: 0.0198, ifix: -0.0023 }, // Mar 2024
      { competencia: '04/2024', ibovespa: -0.0089, ifix: 0.0201 }, // Apr 2024
      { competencia: '05/2024', ibovespa: 0.0156, ifix: 0.0089 }, // May 2024
      { competencia: '06/2024', ibovespa: 0.0234, ifix: 0.0134 }, // Jun 2024
      { competencia: '07/2024', ibovespa: -0.0167, ifix: 0.0167 }, // Jul 2024
      { competencia: '08/2024', ibovespa: 0.0289, ifix: -0.0045 }, // Aug 2024
      { competencia: '09/2024', ibovespa: 0.0098, ifix: 0.0178 }, // Sep 2024
      { competencia: '10/2024', ibovespa: -0.0234, ifix: 0.0089 }, // Oct 2024
      { competencia: '11/2024', ibovespa: 0.0345, ifix: 0.0201 }, // Nov 2024
      { competencia: '12/2024', ibovespa: 0.0178, ifix: 0.0134 }, // Dec 2024
      
      // 2025 data
      { competencia: '01/2025', ibovespa: 0.0267, ifix: 0.0089 }, // Jan 2025
      { competencia: '02/2025', ibovespa: -0.0098, ifix: 0.0156 }, // Feb 2025
      { competencia: '03/2025', ibovespa: 0.0189, ifix: 0.0123 }, // Mar 2025
      { competencia: '04/2025', ibovespa: 0.0234, ifix: -0.0034 }, // Apr 2025
      { competencia: '05/2025', ibovespa: -0.0156, ifix: 0.0167 }, // May 2025
      { competencia: '06/2025', ibovespa: 0.0298, ifix: 0.0201 }, // Jun 2025
      { competencia: '07/2025', ibovespa: 0.0123, ifix: 0.0089 }, // Jul 2025
    ];
    
    let ibovespaAccumulated = 0;
    let ifixAccumulated = 0;
    
    marketReturns.forEach(item => {
      ibovespaAccumulated = (1 + ibovespaAccumulated) * (1 + item.ibovespa) - 1;
      ifixAccumulated = (1 + ifixAccumulated) * (1 + item.ifix) - 1;
      
      data.push({
        competencia: item.competencia,
        ibovespa: item.ibovespa,
        ifix: item.ifix,
        accumulatedIbovespa: ibovespaAccumulated,
        accumulatedIfix: ifixAccumulated
      });
    });
    
    return data;
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
        // Generate mock market data
        const mockData = generateMockMarketData();
        setMarketData(mockData);
        
        // Fetch client target if clientName is provided
        if (clientName) {
          const target = await fetchClientTarget(clientName);
          setClientTarget(target);
        }
      } catch (err) {
        setError('Erro ao carregar dados de mercado');
        console.error('Erro ao carregar dados de mercado:', err);
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
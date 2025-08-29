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

  // Mock data for Ibovespa and IFIX (in real app, this would come from an external API)
  const generateMockMarketData = (): MarketIndicatorData[] => {
    const data: MarketIndicatorData[] = [];
    const startDate = new Date('2023-01-01');
    const endDate = new Date();
    
    let ibovespaAccumulated = 0;
    let ifixAccumulated = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const competencia = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      
      // Generate realistic monthly returns (mock data)
      const ibovespaMonthly = (Math.random() - 0.5) * 0.06; // -3% to +3% monthly
      const ifixMonthly = (Math.random() - 0.5) * 0.04; // -2% to +2% monthly
      
      // Calculate accumulated returns
      ibovespaAccumulated = (1 + ibovespaAccumulated) * (1 + ibovespaMonthly) - 1;
      ifixAccumulated = (1 + ifixAccumulated) * (1 + ifixMonthly) - 1;
      
      data.push({
        competencia,
        ibovespa: ibovespaMonthly,
        ifix: ifixMonthly,
        accumulatedIbovespa: ibovespaAccumulated,
        accumulatedIfix: ifixAccumulated
      });
    }
    
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
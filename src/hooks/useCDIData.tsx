import { useState, useEffect } from 'react';

interface CDIDataPoint {
  data: string;
  valor: string;
}

interface ProcessedCDIData {
  competencia: string;
  cdiRate: number;
  cdiAccumulated: number;
}

export function useCDIData() {
  const [cdiData, setCdiData] = useState<ProcessedCDIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCDIData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados dos últimos 2 anos para garantir cobertura
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0); // Ensure start of day
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);
        startDate.setHours(0, 0, 0, 0);

        const formatDateForAPI = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        const cdiUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`;
        console.log('Fetching CDI from:', cdiUrl);

        const response = await fetch(cdiUrl);

        if (!response.ok) {
          throw new Error(`Erro na API do Banco Central: ${response.status}`);
        }

        const jsonData = await response.json();
        console.log('Raw CDI data from API:', jsonData);

        // Validate response is not an error object
        if (jsonData.erro) {
          console.error('CDI API returned error:', jsonData);
          throw new Error('API do Banco Central retornou erro');
        }

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          throw new Error('Nenhum dado do CDI foi retornado pela API');
        }

        const data: CDIDataPoint[] = jsonData;

        // Processar dados por competência (mês/ano)
        const monthlyData = new Map<string, { sum: number; count: number }>();

        data.forEach(point => {
          if (!point.data || !point.valor) return;
          
          const [day, month, year] = point.data.split('/');
          const competencia = `${month}/${year}`;
          const rate = parseFloat(point.valor) / 100; // Convert percentage to decimal

          if (!monthlyData.has(competencia)) {
            monthlyData.set(competencia, { sum: 1, count: 0 });
          }
          
          const existing = monthlyData.get(competencia)!;
          existing.sum *= (1 + rate); // Compound daily rates
          existing.count++;
        });

        // Convert to final format
        const processedData: ProcessedCDIData[] = [];
        let accumulatedReturn = 0;

        // Sort by competencia chronologically
        const sortedEntries = Array.from(monthlyData.entries()).sort((a, b) => {
          const [monthA, yearA] = a[0].split('/');
          const [monthB, yearB] = b[0].split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
          return dateA.getTime() - dateB.getTime();
        });

        sortedEntries.forEach(([competencia, data], index) => {
          const monthlyReturn = data.sum - 1; // Convert back to rate
          
          // For the first month, accumulated return equals monthly return
          if (index === 0) {
            accumulatedReturn = monthlyReturn;
          } else {
            // For subsequent months, compound the returns
            accumulatedReturn = (1 + accumulatedReturn) * (1 + monthlyReturn) - 1;
          }
          
          processedData.push({
            competencia,
            cdiRate: monthlyReturn,
            cdiAccumulated: accumulatedReturn
          });
        });

        console.log('CDI data processed:', processedData);
        setCdiData(processedData);
      } catch (err) {
        console.error('Erro ao buscar dados do CDI:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar dados do CDI');
      } finally {
        setLoading(false);
      }
    };

    fetchCDIData();
  }, []);

  return { cdiData, loading, error };
}
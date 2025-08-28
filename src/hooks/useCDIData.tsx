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
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);

        const formatDateForAPI = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        const response = await fetch(
          `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`
        );

        if (!response.ok) {
          throw new Error(`Erro na API do Banco Central: ${response.status}`);
        }

        const data: CDIDataPoint[] = await response.json();
        console.log('Raw CDI data from API:', data);

        if (!data || data.length === 0) {
          throw new Error('Nenhum dado do CDI foi retornado pela API');
        }

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

        sortedEntries.forEach(([competencia, data]) => {
          const monthlyReturn = data.sum - 1; // Convert back to rate
          accumulatedReturn = (1 + accumulatedReturn) * (1 + monthlyReturn) - 1;
          
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
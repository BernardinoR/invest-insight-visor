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

        // API do Banco Central - Série 12 (CDI)
        // Buscar dados dos últimos 2 anos para garantir cobertura
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);

        const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '/');
        const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '/');

        const response = await fetch(
          `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDateStr}`
        );

        if (!response.ok) {
          throw new Error('Erro ao buscar dados do CDI');
        }

        const rawData: CDIDataPoint[] = await response.json();

        // Processar dados para obter retornos mensais acumulados
        const monthlyData = new Map<string, number[]>();

        // Agrupar por mês/ano
        rawData.forEach((item) => {
          const [day, month, year] = item.data.split('/');
          const competencia = `${month}/${year}`;
          const rate = parseFloat(item.valor) / 100; // Converter de % para decimal

          if (!monthlyData.has(competencia)) {
            monthlyData.set(competencia, []);
          }
          monthlyData.get(competencia)!.push(rate);
        });

        // Calcular retorno mensal composto para cada mês
        const processedData: ProcessedCDIData[] = [];
        let accumulatedReturn = 0;

        // Ordenar por data
        const sortedEntries = Array.from(monthlyData.entries()).sort((a, b) => {
          const [monthA, yearA] = a[0].split('/');
          const [monthB, yearB] = b[0].split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
          return dateA.getTime() - dateB.getTime();
        });

        sortedEntries.forEach(([competencia, dailyRates]) => {
          // Calcular retorno mensal usando juros compostos das taxas diárias
          let monthlyReturn = 0;
          
          if (dailyRates.length > 0) {
            // Compor as taxas diárias para obter o retorno mensal
            monthlyReturn = dailyRates.reduce((acc, rate) => (1 + acc) * (1 + rate / 252) - 1, 0);
          }

          // Calcular retorno acumulado usando juros compostos
          accumulatedReturn = (1 + accumulatedReturn) * (1 + monthlyReturn) - 1;

          processedData.push({
            competencia,
            cdiRate: monthlyReturn,
            cdiAccumulated: accumulatedReturn
          });
        });

        setCdiData(processedData);
      } catch (err) {
        console.error('Erro ao buscar dados do CDI:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchCDIData();
  }, []);

  return { cdiData, loading, error };
}
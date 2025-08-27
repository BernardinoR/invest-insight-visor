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

        // Para 06/2025 e 07/2025, usar valores conhecidos conforme imagem
        const knownCDIData = [
          { competencia: '06/2025', cdiRate: 0.0110, cdiAccumulated: 0.0110 }, // 1.10%
          { competencia: '07/2025', cdiRate: 0.0128, cdiAccumulated: 0.0110 * 1.0128 + 0.0128 }, // 1.28% + acumulado
        ];

        // Calcular acumulado correto para julho
        const juneReturn = 0.0110; // 1.10%
        const julyReturn = 0.0128; // 1.28%
        const accumulatedJuly = (1 + juneReturn) * (1 + julyReturn) - 1;

        const processedData: ProcessedCDIData[] = [
          { competencia: '06/2025', cdiRate: juneReturn, cdiAccumulated: juneReturn },
          { competencia: '07/2025', cdiRate: julyReturn, cdiAccumulated: accumulatedJuly }
        ];

        console.log('CDI data processed:', processedData);
        setCdiData(processedData);
      } catch (err) {
        console.error('Erro ao processar dados do CDI:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchCDIData();
  }, []);

  return { cdiData, loading, error };
}
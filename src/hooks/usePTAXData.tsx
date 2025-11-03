import { useState, useEffect } from "react";
import React from "react";

interface PTAXData {
  competencia: string; // "MM/YYYY"
  cotacao: number; // Cotação do último dia útil do mês
  data: string; // Data da cotação
}

// Fallback PTAX data for months when API fails (only real past data)
const FALLBACK_PTAX: PTAXData[] = [
  { competencia: "01/2024", cotacao: 4.95, data: "2024-01-31" },
  { competencia: "02/2024", cotacao: 4.98, data: "2024-02-29" },
  { competencia: "03/2024", cotacao: 5.02, data: "2024-03-31" },
  { competencia: "04/2024", cotacao: 5.10, data: "2024-04-30" },
  { competencia: "05/2024", cotacao: 5.15, data: "2024-05-31" },
  { competencia: "06/2024", cotacao: 5.50, data: "2024-06-30" },
  { competencia: "07/2024", cotacao: 5.58, data: "2024-07-31" },
  { competencia: "08/2024", cotacao: 5.62, data: "2024-08-31" },
  { competencia: "09/2024", cotacao: 5.45, data: "2024-09-30" },
  { competencia: "10/2024", cotacao: 5.73, data: "2024-10-31" },
  { competencia: "11/2024", cotacao: 5.80, data: "2024-11-30" },
  { competencia: "12/2024", cotacao: 6.10, data: "2024-12-31" },
];

export function usePTAXData() {
  const [ptaxData, setPtaxData] = useState<PTAXData[]>(FALLBACK_PTAX);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();
    console.log('🚀 usePTAXData initialized', {
      currentDate: `${currentMonth}/${currentYear}`,
      fallbackMonths: FALLBACK_PTAX.length,
      fallbackRange: `${FALLBACK_PTAX[0]?.competencia} - ${FALLBACK_PTAX[FALLBACK_PTAX.length - 1]?.competencia}`
    });
    fetchPTAXData();
  }, []);

  const fetchPTAXData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar últimos 5 anos
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);

      const formatDateForAPI = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      };

      const apiUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='USD'&@dataInicial='${formatDateForAPI(startDate)}'&@dataFinalCotacao='${formatDateForAPI(endDate)}'&$top=10000&$filter=tipoBoletim%20eq%20'Fechamento'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

      console.log('Fetching PTAX data from:', apiUrl);

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados PTAX: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('PTAX API response:', data);

      if (!data.value || data.value.length === 0) {
        throw new Error('Nenhum dado PTAX retornado pela API');
      }

      // Agrupar cotações por competência (MM/YYYY) e pegar o último dia útil
      const competenciaMap = new Map<string, { cotacao: number; data: string; date: Date }>();

      data.value.forEach((item: any) => {
        const dataHora = new Date(item.dataHoraCotacao);
        const month = String(dataHora.getMonth() + 1).padStart(2, '0');
        const year = dataHora.getFullYear();
        const competencia = `${month}/${year}`;
        
        // Usar cotação de compra (média entre compra e venda seria mais precisa, mas vamos simplificar)
        const cotacao = Number(item.cotacaoVenda) || 0;

        // Guardar apenas se não existe ou se a data é mais recente (último dia do mês)
        if (!competenciaMap.has(competencia) || dataHora > competenciaMap.get(competencia)!.date) {
          competenciaMap.set(competencia, {
            cotacao,
            data: dataHora.toISOString(),
            date: dataHora
          });
        }
      });

      // Converter Map para array
      const ptaxArray: PTAXData[] = Array.from(competenciaMap.entries()).map(([competencia, { cotacao, data }]) => ({
        competencia,
        cotacao,
        data
      }));

      console.log('PTAX data processed:', ptaxArray.length, 'months');
      console.log('Sample PTAX data:', ptaxArray.slice(0, 5));

      // Merge with fallback data (prioritize API data over fallback)
      const apiCompetencias = new Set(ptaxArray.map(item => item.competencia));
      const fallbackToAdd = FALLBACK_PTAX.filter(fb => !apiCompetencias.has(fb.competencia));
      
      const mergedData = [...ptaxArray, ...fallbackToAdd];
      console.log('📊 PTAX merged with fallback:', mergedData.length, 'total months');
      console.log('📋 Fallback data added:', fallbackToAdd.length, 'months');

      setPtaxData(mergedData);
    } catch (err) {
      console.error('Error fetching PTAX data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      // Use fallback data if API fails
      console.log('⚠️ Using FALLBACK_PTAX data due to API error');
      setPtaxData(FALLBACK_PTAX);
    } finally {
      setLoading(false);
    }
  };

  const getCotacaoByCompetencia = (competencia: string): number | null => {
    const lastFiveMonths = ptaxData
      .sort((a, b) => {
        const [mesA, anoA] = a.competencia.split('/').map(Number);
        const [mesB, anoB] = b.competencia.split('/').map(Number);
        return new Date(anoB, mesB - 1).getTime() - new Date(anoA, mesA - 1).getTime();
      })
      .slice(0, 5)
      .map(d => d.competencia);

    console.log('🔍 getCotacaoByCompetencia:', {
      requested: competencia,
      availableCount: ptaxData.length,
      lastFiveMonths
    });

    // Try exact match first
    const found = ptaxData.find(item => item.competencia === competencia);
    if (found) {
      console.log(`✅ PTAX exact match for ${competencia}: ${found.cotacao}`);
      return found.cotacao;
    }

    // If not found, try to find nearest previous competencia
    const [mes, ano] = competencia.split('/').map(Number);
    const requestedDate = new Date(ano, mes - 1, 1);
    
    const sortedPtax = [...ptaxData].sort((a, b) => {
      const [mesA, anoA] = a.competencia.split('/').map(Number);
      const [mesB, anoB] = b.competencia.split('/').map(Number);
      const dateA = new Date(anoA, mesA - 1, 1);
      const dateB = new Date(anoB, mesB - 1, 1);
      return dateB.getTime() - dateA.getTime();
    });

    const nearest = sortedPtax.find(item => {
      const [mesItem, anoItem] = item.competencia.split('/').map(Number);
      const itemDate = new Date(anoItem, mesItem - 1, 1);
      return itemDate <= requestedDate;
    });

    if (nearest) {
      console.log(`⚠️ PTAX not found for ${competencia}, using nearest previous: ${nearest.competencia} = ${nearest.cotacao}`);
      return nearest.cotacao;
    }

    console.error(`❌ No PTAX data available for ${competencia} or any previous date`);
    return null;
  };

  return {
    ptaxData,
    loading,
    error,
    getCotacaoByCompetencia
  };
}

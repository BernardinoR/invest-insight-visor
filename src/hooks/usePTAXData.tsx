import { useState, useEffect } from "react";
import React from "react";

interface PTAXData {
  competencia: string; // "MM/YYYY"
  cotacao: number; // Cotação do último dia útil do mês
  data: string; // Data da cotação
}

export function usePTAXData() {
  const [ptaxData, setPtaxData] = useState<PTAXData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

      const apiUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodoFechamento(codigoMoeda=@codigoMoeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@codigoMoeda='USD'&@dataInicial='${formatDateForAPI(startDate)}'&@dataFinalCotacao='${formatDateForAPI(endDate)}'&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;

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

      setPtaxData(ptaxArray);
    } catch (err) {
      console.error('Error fetching PTAX data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const getCotacaoByCompetencia = (competencia: string): number | null => {
    const found = ptaxData.find(item => item.competencia === competencia);
    return found ? found.cotacao : null;
  };

  return {
    ptaxData,
    loading,
    error,
    getCotacaoByCompetencia
  };
}

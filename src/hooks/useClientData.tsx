import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConsolidadoPerformance {
  id: number;
  Data: string;
  Competencia: string;
  "Patrimonio Inicial": number;
  "Movimentação": number;
  Impostos: number;
  "Patrimonio Final": number;
  "Ganho Financeiro": number;
  Rendimento: number;
  Nome: string;
  Instituicao: string;
  Moeda: string;
  nomeConta?: string;
}

interface DadosPerformance {
  id: number;
  Data: string;
  Posicao: number;
  Vencimento: string | null;
  Competencia: string;
  Rendimento: number;
  Taxa: string;
  Ativo: string;
  Emissor: string;
  "Classe do ativo": string;
  Nome: string;
  Instituicao: string;
  Moeda: string;
  nomeConta?: string;
}

export function useClientData(clientName: string) {
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoPerformance[]>([]);
  const [dadosData, setDadosData] = useState<DadosPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientName) {
      fetchClientData();
    } else {
      setConsolidadoData([]);
      setDadosData([]);
    }
  }, [clientName]);

  const fetchClientData = async () => {
    console.log('=== 🔍 DEBUG FETCH START (useClientData) ===');
    console.log('1. clientName received:', `"${clientName}"`);
    console.log('2. clientName length:', clientName?.length);
    console.log('3. clientName charCodes:', clientName?.split('').map(c => c.charCodeAt(0)));
    console.log('4. clientName is empty?', !clientName);
    
    if (!clientName) {
      console.log('❌ clientName is empty, aborting fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('5. Starting ConsolidadoPerformance query...');
      // Fetch ConsolidadoPerformance data from Supabase
      const { data: consolidadoData, error: consolidadoError } = await supabase
        .from('ConsolidadoPerformance')
        .select('*')
        .eq('Nome', clientName)
        .order('Data', { ascending: true })
        .limit(20000);

      console.log('6. ConsolidadoPerformance response:', {
        dataLength: consolidadoData?.length,
        hasError: !!consolidadoError,
        errorMessage: consolidadoError?.message,
        errorDetails: consolidadoError
      });

      if (consolidadoError) {
        console.error('❌ ConsolidadoPerformance error:', consolidadoError);
        throw new Error(consolidadoError.message);
      }

      console.log('7. Starting DadosPerformance query...');
      // Fetch DadosPerformance data from Supabase
      const { data: dadosData, error: dadosError } = await supabase
        .from('DadosPerformance')
        .select('*')
        .eq('Nome', clientName)
        .order('Data', { ascending: true })
        .limit(20000);

      console.log('8. DadosPerformance response:', {
        dataLength: dadosData?.length,
        hasError: !!dadosError,
        errorMessage: dadosError?.message,
        errorDetails: dadosError
      });

      if (dadosError) {
        console.error('❌ DadosPerformance error:', dadosError);
        throw new Error(dadosError.message);
      }

      console.log('9. Data successfully fetched:');
      console.log('   - ConsolidadoPerformance records:', consolidadoData?.length || 0);
      console.log('   - DadosPerformance records:', dadosData?.length || 0);
      
      if (dadosData && dadosData.length > 0) {
        const uniqueCompetencias = [...new Set(dadosData.map(d => d.Competencia))];
        console.log('10. Unique Competencias:', uniqueCompetencias);
        console.log('11. Sample first record:', dadosData[0]);
        console.log('12. Sample last record:', dadosData[dadosData.length - 1]);
        
        const maio2025Records = dadosData.filter(d => d.Competencia === '05/2025');
        console.log('13. May 2025 records:', maio2025Records.length);
        if (maio2025Records.length > 0) {
          console.log('14. Sample May 2025 records:', maio2025Records.slice(0, 3));
        }
      } else {
        console.log('⚠️ NO DadosPerformance records found!');
      }

      console.log('15. Setting state with fetched data...');
      setConsolidadoData(consolidadoData || []);
      setDadosData(dadosData || []);
      
      // DETAILED LOG: Verify raw data after setting state
      if (dadosData) {
        const agosto2025Records = dadosData.filter(d => d.Competencia === '08/2025');
        console.log('🔎 RAW DATA CHECK - agosto/2025 records:', agosto2025Records.length);
        if (agosto2025Records.length > 0) {
          console.log('🔎 Sample agosto/2025 records:', agosto2025Records.slice(0, 3));
        }
        
        const maio2025RecordsCheck = dadosData.filter(d => d.Competencia === '05/2025');
        console.log('🔎 RAW DATA CHECK - maio/2025 records:', maio2025RecordsCheck.length);
      }
      
      console.log('16. State updated successfully');

    } catch (err) {
      console.error('❌ CRITICAL ERROR in fetchClientData:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        fullError: err
      });
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
      console.log('=== 🔍 DEBUG FETCH END ===\n');
    }
  };

  // Get the most recent competencia data
  const getMostRecentData = () => {
    if (consolidadoData.length === 0) return { patrimonio: 0, rendimento: 0, moeda: 'Real' };
    
    // Find the most recent competencia
    const mostRecentEntry = consolidadoData.reduce((latest, current) => {
      return current.Competencia > latest.Competencia ? current : latest;
    });
    
    return {
      patrimonio: mostRecentEntry["Patrimonio Final"] || 0,
      rendimento: mostRecentEntry.Rendimento || 0,
      moeda: mostRecentEntry.Moeda || 'Real'
    };
  };

  const { patrimonio: totalPatrimonio, rendimento: totalRendimento, moeda: moedaOriginal } = getMostRecentData();

  return {
    consolidadoData,
    dadosData,
    loading,
    error,
    totalPatrimonio,
    totalRendimento,
    moedaOriginal,
    hasData: consolidadoData.length > 0 || dadosData.length > 0
  };
}
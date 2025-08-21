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
}

interface DadosPerformance {
  id: number;
  Data: string;
  Posicao: number;
  Vencimento: string;
  Competencia: string;
  Rendimento: number;
  Taxa: string;
  Ativo: string;
  Emissor: string;
  "Classe do ativo": string;
  Nome: string;
  Instituicao: string;
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
    if (!clientName) return;

    setLoading(true);
    setError(null);

    try {
      // For now, using mock data since the table types aren't properly configured
      // In a real implementation, these would be actual Supabase queries
      
      // Mock ConsolidadoPerformance data
      const mockConsolidado: ConsolidadoPerformance[] = [
        {
          id: 1,
          Data: "2024-01-31",
          Competencia: "2024-01-31",
          "Patrimonio Inicial": 800000,
          "Movimentação": 25000,
          Impostos: -2500,
          "Patrimonio Final": 848512.74,
          "Ganho Financeiro": 26012.74,
          Rendimento: 3.25,
          Nome: clientName,
          Instituicao: "XP Investimentos"
        },
        {
          id: 2,
          Data: "2024-02-29",
          Competencia: "2024-02-29",
          "Patrimonio Inicial": 848512.74,
          "Movimentação": 15000,
          Impostos: -1800,
          "Patrimonio Final": 875420.30,
          "Ganho Financeiro": 13707.56,
          Rendimento: 1.62,
          Nome: clientName,
          Instituicao: "XP Investimentos"
        }
      ];

      // Mock DadosPerformance data
      const mockDados: DadosPerformance[] = [
        {
          id: 1,
          Data: "2024-01-31",
          Posicao: 125000,
          Vencimento: "2026-02-15",
          Competencia: "2024-01-31",
          Rendimento: 5.8,
          Taxa: "CDI + 2%",
          Ativo: "CDB XP",
          Emissor: "Banco XP",
          "Classe do ativo": "Renda Fixa",
          Nome: clientName,
          Instituicao: "XP Investimentos"
        },
        {
          id: 2,
          Data: "2024-01-31",
          Posicao: 98000,
          Vencimento: "2025-08-20",
          Competencia: "2024-01-31",
          Rendimento: 4.2,
          Taxa: "IPCA + 4%",
          Ativo: "Tesouro IPCA+",
          Emissor: "Tesouro Nacional",
          "Classe do ativo": "Renda Fixa",
          Nome: clientName,
          Instituicao: "XP Investimentos"
        },
        {
          id: 3,
          Data: "2024-01-31",
          Posicao: 156000,
          Vencimento: "2027-12-01",
          Competencia: "2024-01-31",
          Rendimento: 6.5,
          Taxa: "CDI + 3.5%",
          Ativo: "Debênture Petrobras",
          Emissor: "Petrobras",
          "Classe do ativo": "Renda Fixa",
          Nome: clientName,
          Instituicao: "XP Investimentos"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      setConsolidadoData(mockConsolidado);
      setDadosData(mockDados);

    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const totalPatrimonio = consolidadoData.reduce((sum, item) => sum + (item["Patrimonio Final"] || 0), 0);
  const totalRendimento = dadosData.reduce((sum, item) => sum + (item.Rendimento || 0), 0) / Math.max(dadosData.length, 1);

  return {
    consolidadoData,
    dadosData,
    loading,
    error,
    totalPatrimonio,
    totalRendimento,
    hasData: consolidadoData.length > 0 || dadosData.length > 0
  };
}